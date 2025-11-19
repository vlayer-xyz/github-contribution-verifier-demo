import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Configure max duration for Vercel (up to 90 seconds)
export const maxDuration = 90;

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { proof, username } = body;

    // Validate input
    if (!proof) {
      return NextResponse.json(
        { error: 'Proof is required' },
        { status: 400 }
      );
    }

    if (!username || !username.trim()) {
      return NextResponse.json(
        { error: 'GitHub username is required' },
        { status: 400 }
      );
    }

    // Run verification logic (reuse from verify route)
    const verifyResponse = await fetch('https://web-prover.vlayer.xyz/api/v1/verify', {
      method: 'POST',
      headers: {
        'x-client-id': process.env.WEB_PROVER_API_CLIENT_ID || '',
        'Authorization': 'Bearer ' + process.env.WEB_PROVER_API_SECRET,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proof),
      signal: AbortSignal.timeout(85000) // 85 seconds (less than maxDuration)
    });

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.error('Verification failed:', verifyResponse.status, errorText);
      return NextResponse.json(
        { error: `Verification failed: ${verifyResponse.status} - ${errorText}` },
        { status: verifyResponse.status }
      );
    }

    const verifyData = await verifyResponse.json();
    
    // Extract repository info from the verified response
    let repoOwner: string | null = null;
    let repoName: string | null = null;
    
    try {
      // Try multiple locations where the URL might be
      let urlToMatch = null;
      
      if (verifyData?.response?.url) {
        urlToMatch = verifyData.response.url;
      } else if (verifyData?.request?.url) {
        urlToMatch = verifyData.request.url;
      } else if (verifyData?.response?.request) {
        urlToMatch = verifyData.response.request;
      }
      
      if (urlToMatch) {
        const urlMatch = urlToMatch.match(/\/repos\/([^\/]+)\/([^\/]+)\/contributors/);
        if (urlMatch) {
          repoOwner = urlMatch[1];
          repoName = urlMatch[2];
        }
      }
    } catch (e) {
      console.error('Could not extract repo info from response:', e);
    }

    if (!repoOwner || !repoName) {
      return NextResponse.json(
        { error: 'Could not extract repository information from verification response' },
        { status: 400 }
      );
    }

    // Parse the response body to extract contributor data
    let githubUsername: string | null = null;
    let contributionCount: number | null = null;
    let avatarUrl: string | null = null;
    let githubUrl: string | null = null;

    if (verifyData.response && verifyData.response.body) {
      try {
        const contributorsData = JSON.parse(verifyData.response.body);
        
        if (Array.isArray(contributorsData)) {
          // Find the contributor matching the provided username
          const targetContributor = contributorsData.find((c: any) => 
            c.login && c.login.toLowerCase() === username.trim().toLowerCase()
          );
          
          if (!targetContributor) {
            return NextResponse.json(
              { error: `No contributions found for username: ${username.trim()}` },
              { status: 404 }
            );
          }

          githubUsername = targetContributor.login;
          contributionCount = targetContributor.contributions;
          avatarUrl = targetContributor.avatar_url || null;
          githubUrl = targetContributor.html_url || null;
        } else {
          return NextResponse.json(
            { error: 'Invalid contributors data format' },
            { status: 400 }
          );
        }
      } catch (parseError) {
        console.error('Failed to parse contributor data:', parseError);
        return NextResponse.json(
          { error: 'Failed to parse contribution data from verification response' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Verification response does not contain contributor data' },
        { status: 400 }
      );
    }

    if (!githubUsername || contributionCount === null) {
      return NextResponse.json(
        { error: 'Could not extract username or contribution count from verification response' },
        { status: 400 }
      );
    }

    // Store in NeonDB using UPSERT
    try {
      const result = await sql`
        INSERT INTO verified_contributions (
          github_username,
          repo_owner,
          repo_name,
          contribution_count,
          proof,
          avatar_url,
          github_url,
          created_at,
          updated_at
        ) VALUES (
          ${githubUsername},
          ${repoOwner},
          ${repoName},
          ${contributionCount},
          ${JSON.stringify(proof)}::jsonb,
          ${avatarUrl},
          ${githubUrl},
          NOW(),
          NOW()
        )
        ON CONFLICT (github_username, repo_owner, repo_name)
        DO UPDATE SET
          contribution_count = EXCLUDED.contribution_count,
          proof = EXCLUDED.proof,
          avatar_url = EXCLUDED.avatar_url,
          github_url = EXCLUDED.github_url,
          updated_at = NOW()
        RETURNING id, github_username, repo_owner, repo_name, contribution_count, created_at, updated_at
      `;

      return NextResponse.json({
        success: true,
        message: 'Proof uploaded and verified successfully',
        data: {
          id: result[0].id,
          github_username: result[0].github_username,
          repo_owner: result[0].repo_owner,
          repo_name: result[0].repo_name,
          contribution_count: result[0].contribution_count,
          created_at: result[0].created_at,
          updated_at: result[0].updated_at
        }
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // Check if it's a table doesn't exist error
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error';
      if (errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
        return NextResponse.json(
          { error: 'Database table not found. Please run the schema migration first. See lib/schema.sql' },
          { status: 500 }
        );
      }
      
      // Check if it's a connection error
      if (errorMessage.includes('connection') || errorMessage.includes('DATABASE_URL')) {
        return NextResponse.json(
          { error: 'Database connection failed. Please check your DATABASE_URL environment variable.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: `Database error: ${errorMessage}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Upload proof API error:', error);
    
    // Handle timeout errors specifically
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Request timed out. Verification took too long to complete. Please try again.' },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload proof' },
      { status: 500 }
    );
  }
}

