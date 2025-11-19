import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { transformGraphQLPRResponse, extractRepoInfo } from '@/lib/graphql-transformer';

// Configure max duration for Vercel
export const maxDuration = 300;

interface ContributorData {
  username: string;
  contributions: number;
  avatar: string;
  githubUrl: string;
  verified: boolean;
  repoOwner?: string;
  repoName?: string;
  repoUrl?: string;
  error?: string;
}

export async function GET() {
  try {
    // Path to webproofs folder
    const webproofsPath = join(process.cwd(), 'app', 'webproofs');
    
    // Read all files in the webproofs directory
    const files = await readdir(webproofsPath);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      return NextResponse.json({ 
        success: true,
        contributors: [],
        message: 'No webproofs found'
      });
    }
    
    // Process each webproof file
    const contributors: ContributorData[] = [];
    
    for (const file of jsonFiles) {
      try {
        // Extract username from filename pattern: github-webproof-YYYY-MM-DD-username.json
        let targetUsername: string | null = null;
        const filenameParts = file.replace('.json', '').split('-');
        // Pattern: github-webproof-YYYY-MM-DD-username
        // Parts: [0]github [1]webproof [2]year [3]month [4]day [5+]username
        if (filenameParts.length > 5) {
          targetUsername = filenameParts.slice(5).join('-');
        }
        
        console.log(`Processing file: ${file}`);
        console.log(`Extracted username: ${targetUsername}`);
        
        // Read the webproof file
        const filePath = join(webproofsPath, file);
        const fileContent = await readFile(filePath, 'utf-8');
        const webproof = JSON.parse(fileContent);
        
        // Verify the webproof using vlayer API
        const verifyResponse = await fetch('https://web-prover.vlayer.xyz/api/v1/verify', {
          method: 'POST',
          headers: {
            'x-client-id': process.env.WEB_PROVER_API_CLIENT_ID || '',
            'Authorization': 'Bearer ' + process.env.WEB_PROVER_API_SECRET,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webproof),
        });
        
        if (!verifyResponse.ok) {
          console.error(`Verification failed for ${file}:`, verifyResponse.status);
          continue;
        }
        
        const verifyData = await verifyResponse.json();
        
        console.log(`Verification successful for ${file}`);
        console.log('Verify response structure:', JSON.stringify(verifyData, null, 2));
        
        // Extract repository info from the verified response
        const { owner: repoOwner, name: repoName } = extractRepoInfo(verifyData);
        console.log(`Extracted repo: ${repoOwner}/${repoName}`);
        
        // Parse the response body to extract contributor data
        // Handle GraphQL PR response, contributors API, and commits API (for backward compatibility)
        if (verifyData.response && verifyData.response.body) {
          try {
            const responseBody = verifyData.response.body;
            const contributorData = transformGraphQLPRResponse(responseBody, targetUsername || undefined);
            
            if (contributorData) {
              console.log(`Adding contributor: ${contributorData.username} with ${contributorData.contributions} contributions`);
              const repoUrl = repoOwner && repoName ? `https://github.com/${repoOwner}/${repoName}` : undefined;
              contributors.push({
                username: contributorData.username,
                contributions: contributorData.contributions,
                avatar: contributorData.avatar,
                githubUrl: contributorData.githubUrl,
                verified: true,
                repoOwner: repoOwner || undefined,
                repoName: repoName || undefined,
                repoUrl
              });
            } else {
              console.log(`No valid contributor data found for ${file}`);
            }
          } catch (parseError) {
            console.error(`Failed to parse contributor data from ${file}:`, parseError);
          }
        }
      } catch (fileError) {
        console.error(`Error processing file ${file}:`, fileError);
      }
    }
    
    // Sort by contributions (highest first)
    contributors.sort((a, b) => b.contributions - a.contributions);
    
    return NextResponse.json({
      success: true,
      contributors: contributors,
      totalVerified: contributors.length,
      filesProcessed: jsonFiles.length
    });
    
  } catch (error) {
    console.error('Verify all API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify webproofs',
        contributors: []
      },
      { status: 500 }
    );
  }
}

