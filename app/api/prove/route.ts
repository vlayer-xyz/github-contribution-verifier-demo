import { NextRequest, NextResponse } from 'next/server';

// Configure max duration for Vercel (up to 90 seconds)
export const maxDuration = 160;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if this is a GraphQL request (has query) or legacy REST request (has url)
    let requestBody;
    
    if (body.query) {
      // GraphQL request
      const graphqlUrl = 'https://api.github.com/graphql';
      const graphqlBody = JSON.stringify({
        query: body.query,
        ...(body.variables && Object.keys(body.variables).length > 0 && { variables: body.variables })
      });
      
      // Construct headers for GraphQL request
      const headers = [
        "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
        "Content-Type: application/json",
        "Accept: application/vnd.github+json"
      ];
      
      if (body.githubToken) {
        headers.push(`Authorization: Bearer ${body.githubToken}`);
      }
      
      requestBody = {
        url: graphqlUrl,
        method: 'POST',
        headers: headers,
        body: graphqlBody
      };
      
      console.log('Sending GraphQL request to vlayer API');
      console.log('GraphQL URL:', graphqlUrl);
      console.log('Variables:', JSON.stringify(body.variables, null, 2));
    } else if (body.url) {
      // Legacy REST request (for backward compatibility)
      requestBody = {
        url: body.url,
        headers: body.headers || [
          "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
          "Accept: application/vnd.github+json"
        ]
      };
      
      console.log('Sending REST request to vlayer API');
      console.log('URL being proved:', requestBody.url);
    } else {
      return NextResponse.json(
        { error: 'Either query (GraphQL) or url (REST) must be provided' },
        { status: 400 }
      );
    }
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('https://web-prover.vlayer.xyz/api/v1/prove', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.WEB_PROVER_API_CLIENT_ID || '',
        'Authorization': 'Bearer ' + process.env.WEB_PROVER_API_SECRET,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vlayer API error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Prove API error:', error);
    
    // Handle timeout errors specifically
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Request timed out. GitHub API took too long to respond. Please try again.' },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to prove request' },
      { status: 500 }
    );
  }
}
