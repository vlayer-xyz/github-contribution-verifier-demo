'use client';

import { useState } from 'react';

export default function Home() {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [username, setUsername] = useState('');
  const [isProving, setIsProving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [presentation, setPresentation] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<{ 
    type: string; 
    data: Record<string, unknown> & { 
      contributionData?: { username: string; total: number; avatar: string } 
    } 
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUploadInstructions, setShowUploadInstructions] = useState(false);
  
  // Get upload URL from environment variable or default to /upload
  const uploadUrl = process.env.NEXT_PUBLIC_UPLOAD_URL || 'https://github-contribution-verifier-demo.vercel.app/upload';

  const handleProve = async () => {
    if (!owner.trim()) {
      setError('Please enter the repository owner');
      return;
    }

    if (!repo.trim()) {
      setError('Please enter the repository name');
      return;
    }

    if (!username.trim()) {
      setError('Please enter your GitHub username first');
      return;
    }

    if (!githubToken.trim()) {
      setError('GitHub token is required for GraphQL API');
      return;
    }

    setIsProving(true);
    setError(null);
    setResult(null);

    // Construct GraphQL query for merged PR count filtered by author
    // Using search query since pullRequests doesn't support author filtering
    // Note: GraphQL variables can't be used in string literals, so we build the query string in JavaScript
    const searchQuery = `repo:${owner.trim()}/${repo.trim()} is:pr is:merged author:${username.trim()}`;
    
    const graphqlQuery = `
      query MergedPrCount {
        search(
          query: "${searchQuery}"
          type: ISSUE
          first: 1
        ) {
          issueCount
        }
      }
    `;
    
    console.log('GraphQL Query:', graphqlQuery);
    console.log('Search Query String:', searchQuery);

    try {
      const response = await fetch('/api/prove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: graphqlQuery,
          githubToken: githubToken.trim()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPresentation(data);
      setResult({ type: 'prove', data });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prove GraphQL query');
    } finally {
      setIsProving(false);
    }
  };

  const handleVerify = async () => {
    if (!presentation) {
      setError('Please prove merged PRs first');
      return;
    }

    if (!username.trim()) {
      setError('Please enter your GitHub username');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(presentation)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse GraphQL PR response and transform to contributor format
      let contributionData = null;
      if (data.response && data.response.body) {
        try {
          const responseBody = JSON.parse(data.response.body);
          
          // Debug: Log the full response structure to verify what we're getting
          console.log('GraphQL Response Body:', JSON.stringify(responseBody, null, 2));
          
          // Handle GraphQL search query response (filtered by author)
          let prCount = 0;
          
          if (responseBody.data?.search?.issueCount !== undefined) {
            // Search query returns issueCount for filtered results
            prCount = responseBody.data.search.issueCount;
            console.log(`Found ${prCount} merged PRs by ${username.trim()} in repository`);
          } else if (responseBody.data?.repository?.pullRequests?.nodes) {
            // Fallback: if using old repository.pullRequests query, filter nodes by author
            const targetUsername = username.trim().toLowerCase();
            const matchingPRs = responseBody.data.repository.pullRequests.nodes.filter((pr: { author?: { login?: string } }) => {
              const authorLogin = pr.author?.login?.toLowerCase();
              return authorLogin === targetUsername;
            });
            prCount = matchingPRs.length;
            console.log(`Found ${prCount} merged PRs by ${username.trim()} out of ${responseBody.data.repository.pullRequests.nodes.length} total PRs`);
          } else if (responseBody.data?.repository?.pullRequests?.totalCount !== undefined) {
            // Fallback: if only totalCount available (shouldn't happen with search query)
            console.warn('WARNING: Only totalCount available, cannot filter by author.');
            prCount = responseBody.data.repository.pullRequests.totalCount;
          } else if (Array.isArray(responseBody)) {
            // Fallback: if it's already an array
            prCount = responseBody.length;
            console.log('Using array length:', prCount);
          }
          
          if (prCount === 0) {
            setError(`No merged PRs found for @${username.trim()} in repository`);
            return;
          }

          // Construct avatar URL from username
          const avatar = `https://github.com/${username.trim()}.png`;

          contributionData = {
            username: username.trim(),
            total: prCount,
            avatar: avatar
          };
        } catch {
          setError('Failed to parse contribution data');
          return;
        }
      }

      setResult({ 
        type: 'verify', 
        data: { ...data, contributionData }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify presentation');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownloadProof = () => {
    if (!presentation) return;
    
    const dataStr = JSON.stringify(presentation, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    // Include username in filename if available
    const usernameStr = username.trim() ? `-${username.trim()}` : '';
    link.download = `github-webproof-${new Date().toISOString().split('T')[0]}${usernameStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Show upload instructions after download
    setShowUploadInstructions(true);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light mb-4">vlayer GitHub Prover</h1>
          <p className="text-gray-400 text-lg">Prove contributions to GitHub repositories</p>
          <div className="mt-6">
            <a
              href="/contributions"
              className="inline-flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              View All Verified Contributors
            </a>
          </div>
        </div>

        <div className="space-y-8">
          {/* GitHub Repository Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <label htmlFor="owner" className="block text-sm font-medium text-gray-300">
                Repository Owner
              </label>
              <input
                id="owner"
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="vlayer-xyz"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7235e5] focus:border-transparent text-white placeholder-gray-500"
                disabled={isProving || isVerifying}
              />
            </div>
            <div className="space-y-4">
              <label htmlFor="repo" className="block text-sm font-medium text-gray-300">
                Repository Name
              </label>
              <input
                id="repo"
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="vlayer"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7235e5] focus:border-transparent text-white placeholder-gray-500"
                disabled={isProving || isVerifying}
              />
            </div>
          </div>
          {owner && repo && username && (
            <div className="text-sm text-gray-500 -mt-4 text-center">
              Checking: <span className="text-gray-400 font-mono">Merged PRs by @{username} in {owner}/{repo}</span>
            </div>
          )}

          {/* GitHub Token Input */}
          <div className="space-y-4">
            <label htmlFor="token" className="block text-sm font-medium text-gray-300">
              GitHub Personal Access Token <span className="text-red-400">*</span>
            </label>
            <input
              id="token"
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="github_pat_..."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7235e5] focus:border-transparent text-white placeholder-gray-500"
              disabled={isProving || isVerifying}
            />
            <p className="text-xs text-gray-500">
              Required for GraphQL API access. Generate one at{' '}
              <a href="https://github.com/settings/personal-access-tokens" target="_blank" rel="noopener noreferrer" className="text-[#7235e5] hover:underline">
                GitHub Settings → Developer settings → Personal access tokens
              </a>
            </p>
          </div>

          {/* Username Input */}
          <div className="space-y-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">
              Your GitHub Username <span className="text-red-400">*</span>
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7235e5] focus:border-transparent text-white placeholder-gray-500"
              disabled={isProving || isVerifying}
            />
            <p className="text-xs text-gray-500">
              Required to filter merged PRs by your GitHub username.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleProve}
              disabled={!username.trim() || !githubToken.trim() || isProving || isVerifying}
              className="flex-1 px-6 py-3 bg-[#7235e5] hover:bg-[#5d2bc7] disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {isProving ? 'Proving...' : 'Prove Merged PRs'}
            </button>
            
            <button
              onClick={handleVerify}
              disabled={!presentation || !username.trim() || isProving || isVerifying}
              className="flex-1 px-6 py-3 bg-[#7235e5] hover:bg-[#5d2bc7] disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {isVerifying ? 'Verifying...' : 'Verify Proof'}
            </button>
          </div>

          {/* Download Proof Button */}
          {presentation && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <button
                  onClick={handleDownloadProof}
                  disabled={isProving || isVerifying}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors border border-gray-600 hover:border-gray-500 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Webproof
                </button>
              </div>

              {/* Upload Instructions */}
              {showUploadInstructions && (
                <div className="p-6 bg-[#7235e5]/10 border border-[#7235e5]/30 rounded-lg">
                  <div className="flex items-start space-x-3 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#7235e5] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-white mb-2">Next Step: Upload Your Proof</h3>
                      <p className="text-gray-300 text-sm mb-4">
                        Your webproof has been downloaded. To store it in the database and verify your contributions, upload it using the link below.
                      </p>
                      <a
                        href={uploadUrl}
                        className="inline-flex items-center px-4 py-2 bg-[#7235e5] hover:bg-[#5d2bc7] text-white font-medium rounded-lg transition-colors gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Go to Upload Page
                      </a>
                      <p className="text-gray-400 text-xs mt-3">
                        Upload URL: <code className="px-2 py-1 bg-gray-800 rounded text-gray-300">{uploadUrl}</code>
                      </p>
                    </div>
                    <button
                      onClick={() => setShowUploadInstructions(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                      aria-label="Close instructions"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}


          {/* Results Display */}
          {result && (
            <div className="space-y-4">
              {result.type === 'verify' && result.data.contributionData ? (
                <>
                  {/* Detailed verification modal with profile picture */}
                  <div className="p-6 bg-gray-900 border border-gray-700 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-300 mb-4">✅ Verification Successful</h3>
                    <div className="flex items-center space-x-4 mb-4">
                      <img 
                        src={result.data.contributionData.avatar} 
                        alt={result.data.contributionData.username}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <p className="text-white font-medium">@{result.data.contributionData.username}</p>
                        <p className="text-gray-400 text-sm">GitHub Contributor</p>
                      </div>
                    </div>
                    <div className="bg-[#7235e5]/10 border border-[#7235e5]/20 rounded-lg p-4">
                      <p className="text-[#7235e5] font-semibold text-xl">
                        {result.data.contributionData.total} contributions verified
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Your contributions to this repository have been cryptographically verified
                      </p>
                    </div>
                  </div>
                  
                  {/* Full verification response */}
                  <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-300 mb-2">Full Verification Response</h3>
                    <pre className="text-xs text-gray-400 overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">
                    {result.type === 'prove' ? 'GitHub Contribution Proof' : 'Verification Result'}
                  </h3>
                  <pre className="text-xs text-gray-400 overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Powered by vlayer Footer */}
        <div className="mt-16 pt-8 border-t border-gray-800">
          <div className="flex justify-center items-center space-x-2 text-gray-500">
            <span className="text-sm">Powered by</span>
            <img 
              src="/powered-by-vlayer.svg" 
              alt="Vlayer" 
              className="h-5"
            />
          </div>
        </div>
      </div>
    </div>
  );
}