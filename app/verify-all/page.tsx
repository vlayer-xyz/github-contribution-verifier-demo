'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Contributor {
  username: string;
  contributions: number;
  avatar: string;
  githubUrl: string;
  verified: boolean;
  repoOwner?: string;
  repoName?: string;
  repoUrl?: string;
}

interface VerifyAllResponse {
  success: boolean;
  contributors: Contributor[];
  totalVerified: number;
  filesProcessed: number;
  error?: string;
}

export default function VerifyAllPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerifyAllResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVerifications = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/verify-all');
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to verify webproofs');
        }
        
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchVerifications();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Header */}
        <div className="mb-12">
          <Link 
            href="/"
            className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          
          <h1 className="text-4xl font-light mb-4">Verified Contributors</h1>
          <p className="text-gray-400 text-lg">
            Cryptographically verified GitHub contributions from stored webproofs
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Each card represents one webproof verification
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7235e5] mb-4"></div>
            <p className="text-gray-400">Verifying webproofs...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-6 bg-red-900/20 border border-red-700 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-6 bg-gray-900 border border-gray-700 rounded-lg">
                <p className="text-gray-400 text-sm mb-2">Webproofs Verified</p>
                <p className="text-3xl font-light text-white">{data.totalVerified}</p>
              </div>
              <div className="p-6 bg-gray-900 border border-gray-700 rounded-lg">
                <p className="text-gray-400 text-sm mb-2">Files in Folder</p>
                <p className="text-3xl font-light text-white">{data.filesProcessed}</p>
              </div>
              <div className="p-6 bg-gray-900 border border-gray-700 rounded-lg">
                <p className="text-gray-400 text-sm mb-2">Total Verified Contributions</p>
                <p className="text-3xl font-light text-white">
                  {data.contributors.reduce((sum, c) => sum + c.contributions, 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Contributors List */}
            {data.contributors.length === 0 ? (
              <div className="p-12 bg-gray-900 border border-gray-700 rounded-lg text-center">
                <p className="text-gray-400 text-lg mb-2">No webproofs found</p>
                <p className="text-gray-500 text-sm">Add webproof JSON files to the <code className="px-2 py-1 bg-gray-800 rounded">/app/webproofs</code> folder</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-2xl font-light mb-6">
                  Verified Webproofs ({data.contributors.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.contributors.map((contributor) => (
                    <div
                      key={contributor.username}
                      className="p-6 bg-gray-900 border border-gray-700 rounded-lg"
                    >
                      <div className="flex items-start space-x-4 mb-4">
                        <img
                          src={contributor.avatar}
                          alt={contributor.username}
                          className="w-16 h-16 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <a
                              href={contributor.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white font-medium truncate hover:text-[#7235e5] transition-colors"
                            >
                              @{contributor.username}
                            </a>
                            {contributor.verified && (
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="h-5 w-5 text-green-500 flex-shrink-0" 
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                              >
                                <path 
                                  fillRule="evenodd" 
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                                  clipRule="evenodd" 
                                />
                              </svg>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm">GitHub Contributor</p>
                        </div>
                      </div>
                      
                      {contributor.repoOwner && contributor.repoName && (
                        <a
                          href={contributor.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mb-3 p-2 bg-gray-800 border border-gray-700 rounded hover:border-gray-600 transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                            </svg>
                            <span className="text-gray-300 text-sm truncate">
                              {contributor.repoOwner}/{contributor.repoName}
                            </span>
                          </div>
                        </a>
                      )}
                      
                      <div className="bg-[#7235e5]/10 border border-[#7235e5]/20 rounded px-3 py-2">
                        <p className="text-[#7235e5] font-semibold text-lg">
                          {contributor.contributions.toLocaleString()}
                        </p>
                        <p className="text-gray-400 text-xs">contributions verified</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
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

