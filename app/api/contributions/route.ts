import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Public endpoint - no authentication required
export async function GET() {
  try {
    // Fetch all verified contributions from database (excluding proof field)
    const results = await sql`
      SELECT 
        id,
        github_username,
        repo_owner,
        repo_name,
        contribution_count,
        avatar_url,
        github_url,
        created_at,
        updated_at
      FROM verified_contributions
      ORDER BY contribution_count DESC, created_at DESC
    `;

    // Transform database results to match the ContributorData interface
    const contributors = results.map((row: any) => {
      // Construct GitHub avatar URL if not stored
      let avatar = row.avatar_url;
      if (!avatar && row.github_username) {
        avatar = `https://github.com/${row.github_username}.png`;
      }
      
      // Construct GitHub profile URL if not stored
      let githubUrl = row.github_url;
      if (!githubUrl && row.github_username) {
        githubUrl = `https://github.com/${row.github_username}`;
      }
      
      return {
        username: row.github_username,
        contributions: row.contribution_count,
        avatar: avatar,
        githubUrl: githubUrl,
        verified: true,
        repoOwner: row.repo_owner || undefined,
        repoName: row.repo_name || undefined,
        repoUrl: row.repo_owner && row.repo_name 
          ? `https://github.com/${row.repo_owner}/${row.repo_name}` 
          : undefined
      };
    });

    return NextResponse.json({
      success: true,
      contributors: contributors,
      totalVerified: contributors.length,
      filesProcessed: contributors.length // For consistency with verify-all format
    });
    
  } catch (error) {
    console.error('Contributions API error:', error);
    
    // Check if it's a table doesn't exist error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Database table not found. Please run the schema migration first.',
          contributors: []
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch contributions',
        contributors: []
      },
      { status: 500 }
    );
  }
}

