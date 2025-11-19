/**
 * Utility functions to transform GraphQL PR responses to contributor format
 */

interface GraphQLPRResponse {
  data?: {
    repository?: {
      pullRequests?: {
        nodes?: Array<{
          number: number;
          author?: {
            login: string;
            avatarUrl: string;
            url: string;
          };
          mergedAt: string;
          title: string;
        }>;
        pageInfo?: {
          hasNextPage: boolean;
          endCursor: string;
        };
        totalCount?: number;
      };
    };
  };
  errors?: Array<{
    message: string;
    type?: string;
  }>;
}

interface ContributorData {
  username: string;
  contributions: number;
  avatar: string;
  githubUrl: string;
}

/**
 * Transform GraphQL PR response to contributor format
 * Handles both GraphQL response structure and legacy formats for backward compatibility
 */
export function transformGraphQLPRResponse(
  responseBody: string | object,
  fallbackUsername?: string
): ContributorData | null {
  try {
    // Parse if string (handle cases where body might be a JSON string with newlines)
    let parsed;
    if (typeof responseBody === 'string') {
      // Trim whitespace and newlines before parsing
      const trimmedBody = responseBody.trim();
      parsed = JSON.parse(trimmedBody);
    } else {
      parsed = responseBody;
    }

    // Check for GraphQL errors
    if (parsed.errors && Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      console.error('GraphQL errors:', parsed.errors);
      return null;
    }

    // Handle GraphQL search query response (filtered by author)
    if (parsed.data?.search?.issueCount !== undefined) {
      const issueCount = parsed.data.search.issueCount;
      
      if (issueCount === 0) {
        console.log('Search query returned 0 issueCount');
        return null;
      }

      // Use fallback username since search query doesn't return author details in response
      // The author is already filtered in the query string, so we use the provided username
      const username = fallbackUsername || 'unknown';
      console.log(`Search query returned ${issueCount} merged PRs for ${username}`);
      
      return {
        username,
        contributions: issueCount,
        avatar: `https://github.com/${username}.png`,
        githubUrl: `https://github.com/${username}`
      };
    }

    // Handle GraphQL PR response structure with totalCount (legacy format)
    if (parsed.data?.repository?.pullRequests?.totalCount !== undefined) {
      const totalCount = parsed.data.repository.pullRequests.totalCount;
      
      if (totalCount === 0) {
        return null;
      }

      // Use fallback username since we don't have author info in this format
      const username = fallbackUsername || 'unknown';
      return {
        username,
        contributions: totalCount,
        avatar: `https://github.com/${username}.png`,
        githubUrl: `https://github.com/${username}`
      };
    }

    // Handle GraphQL PR response structure with nodes
    if (parsed.data?.repository?.pullRequests?.nodes) {
      const allPRs = parsed.data.repository.pullRequests.nodes;

      if (allPRs.length === 0) {
        return null;
      }

      // Filter PRs by author if fallbackUsername is provided
      let prs = allPRs;
      if (fallbackUsername) {
        const targetUsername = fallbackUsername.toLowerCase();
        prs = allPRs.filter((pr: { author?: { login?: string } }) => {
          const authorLogin = pr.author?.login?.toLowerCase();
          return authorLogin === targetUsername;
        });
      }

      if (prs.length === 0) {
        return null;
      }

      // Get author info from first matching PR
      const firstPR = prs[0];
      const author = firstPR.author;

      if (!author || !author.login) {
        // Fallback to provided username if author info is missing
        const username = fallbackUsername || 'unknown';
        return {
          username,
          contributions: prs.length,
          avatar: `https://github.com/${username}.png`,
          githubUrl: `https://github.com/${username}`
        };
      }

      return {
        username: author.login,
        contributions: prs.length,
        avatar: author.avatarUrl || `https://github.com/${author.login}.png`,
        githubUrl: author.url || `https://github.com/${author.login}`
      };
    }

    // Handle legacy contributors format (for backward compatibility)
    if (Array.isArray(parsed)) {
      const firstItem = parsed[0];
      
      if (firstItem && firstItem.login) {
        // Contributors format
        const targetContributor = parsed.find((c: { login?: string }) => 
          c.login && fallbackUsername && c.login.toLowerCase() === fallbackUsername.toLowerCase()
        ) || firstItem;

        return {
          username: targetContributor.login,
          contributions: targetContributor.contributions || parsed.length,
          avatar: targetContributor.avatar_url || `https://github.com/${targetContributor.login}.png`,
          githubUrl: targetContributor.html_url || `https://github.com/${targetContributor.login}`
        };
      } else if (firstItem && (firstItem.sha || firstItem.commit)) {
        // Commits format (legacy)
        const username = fallbackUsername || firstItem.author?.login || firstItem.committer?.login || 'unknown';
        const avatar = firstItem.author?.avatar_url || 
                      firstItem.committer?.avatar_url || 
                      `https://github.com/${username}.png`;

        return {
          username,
          contributions: parsed.length,
          avatar,
          githubUrl: `https://github.com/${username}`
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error transforming GraphQL PR response:', error);
    return null;
  }
}

/**
 * Extract repository info from GraphQL response or verification response
 */
export function extractRepoInfo(verifyData: { request?: { body?: string; url?: string }; response?: { url?: string } }): { owner: string | null; name: string | null } {
  let repoOwner: string | null = null;
  let repoName: string | null = null;

  try {
    // Try to extract from GraphQL request body (search query or variables)
    if (verifyData?.request?.body) {
      try {
        const requestBody = JSON.parse(verifyData.request.body);
        
        // Try GraphQL variables first (legacy format)
        if (requestBody.variables) {
          repoOwner = requestBody.variables.owner || null;
          repoName = requestBody.variables.name || null;
        }
        
        // If no variables, try to extract from GraphQL query string (search query format)
        if ((!repoOwner || !repoName) && requestBody.query) {
          // Parse search query like: repo:owner/name is:pr is:merged author:username
          // Match pattern: repo:owner/name (handles cases where name might have special chars)
          const searchQueryMatch = requestBody.query.match(/repo:([^\/\s"']+)\/([^\s"']+)/);
          if (searchQueryMatch) {
            repoOwner = searchQueryMatch[1];
            // Remove any trailing characters that might be part of the query (like quotes or spaces)
            repoName = searchQueryMatch[2].replace(/["']/g, '').trim();
            console.log(`Extracted repo info from search query: ${repoOwner}/${repoName}`);
          } else {
            console.log('Could not extract repo from search query:', requestBody.query.substring(0, 100));
          }
        }
      } catch {
        // Not JSON, continue
      }
    }

    // Try to extract from URL (for backward compatibility with REST API)
    if (!repoOwner || !repoName) {
      let urlToMatch = null;
      
      if (verifyData?.response?.url) {
        urlToMatch = verifyData.response.url;
      } else if (verifyData?.request?.url) {
        urlToMatch = verifyData.request.url;
      }

      if (urlToMatch) {
        const contributorsMatch = urlToMatch.match(/\/repos\/([^\/]+)\/([^\/]+)\/contributors/);
        const commitsMatch = urlToMatch.match(/\/repos\/([^\/]+)\/([^\/]+)\/commits/);
        
        if (contributorsMatch) {
          repoOwner = contributorsMatch[1];
          repoName = contributorsMatch[2];
        } else if (commitsMatch) {
          repoOwner = commitsMatch[1];
          repoName = commitsMatch[2];
        }
      }
    }
  } catch (e) {
    console.error('Could not extract repo info from response:', e);
  }

  return { owner: repoOwner, name: repoName };
}
