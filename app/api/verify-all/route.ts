import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

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
        let repoOwner: string | null = null;
        let repoName: string | null = null;
        try {
          // Try multiple locations where the URL might be
          let urlToMatch = null;
          
          // Check different possible locations
          if (verifyData?.response?.url) {
            urlToMatch = verifyData.response.url;
          } else if (verifyData?.request?.url) {
            urlToMatch = verifyData.request.url;
          } else if (verifyData?.response?.request) {
            urlToMatch = verifyData.response.request;
          }
          
          console.log('URL to match:', urlToMatch);
          
          if (urlToMatch) {
            const urlMatch = urlToMatch.match(/\/repos\/([^\/]+)\/([^\/]+)\/contributors/);
            if (urlMatch) {
              repoOwner = urlMatch[1];
              repoName = urlMatch[2];
              console.log(`Extracted repo: ${repoOwner}/${repoName}`);
            }
          }
        } catch (e) {
          console.log('Could not extract repo info from response:', e);
        }
        
        // Parse the response body to extract contributor data
        if (verifyData.response && verifyData.response.body) {
          try {
            const contributorsData = JSON.parse(verifyData.response.body);
            
            // Extract only the specific contributor that was verified
            if (Array.isArray(contributorsData)) {
              let targetContributor = null;
              
              console.log(`Found ${contributorsData.length} contributors in data`);
              
              if (targetUsername) {
                // Find the contributor matching the username from filename
                console.log(`Looking for username: ${targetUsername}`);
                targetContributor = contributorsData.find((c: any) => 
                  c.login && c.login.toLowerCase() === targetUsername.toLowerCase()
                );
                console.log(`Found contributor:`, targetContributor ? targetContributor.login : 'NOT FOUND');
              } else {
                // Fallback: use the first contributor if no username in filename
                console.log('No username in filename, using first contributor');
                targetContributor = contributorsData[0];
              }
              
              if (targetContributor && targetContributor.login) {
                console.log(`Adding contributor: ${targetContributor.login} with ${targetContributor.contributions} contributions`);
                const repoUrl = repoOwner && repoName ? `https://github.com/${repoOwner}/${repoName}` : undefined;
                contributors.push({
                  username: targetContributor.login,
                  contributions: targetContributor.contributions,
                  avatar: targetContributor.avatar_url,
                  githubUrl: targetContributor.html_url,
                  verified: true,
                  repoOwner: repoOwner || undefined,
                  repoName: repoName || undefined,
                  repoUrl
                });
              } else {
                console.log(`No valid contributor found for ${file}`);
              }
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

