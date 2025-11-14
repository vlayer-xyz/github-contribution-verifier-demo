'use client';

import { useState } from 'react';

export default function Home() {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [username, setUsername] = useState('');
  const [isProving, setIsProving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [presentation, setPresentation] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProve = async () => {
    if (!owner.trim()) {
      setError('Please enter the repository owner');
      return;
    }

    if (!repo.trim()) {
      setError('Please enter the repository name');
      return;
    }

    setIsProving(true);
    setError(null);
    setResult(null);

    // Construct the GitHub API URL
    const url = `https://api.github.com/repos/${owner.trim()}/${repo.trim()}/contributors`;

    try {
      const response = await fetch('/api/prove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          headers: [
            "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
            "Accept: application/vnd.github+json",
            ...(githubToken.trim() ? [`Authorization: Bearer ${githubToken.trim()}`] : [])
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPresentation(data);
      setResult({ type: 'prove', data });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prove URL');
    } finally {
      setIsProving(false);
    }
  };

  const handleVerify = async () => {
    if (!presentation) {
      setError('Please prove a URL first');
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
      
      // Parse GitHub contributors data
      let contributionData = null;
      if (data.response && data.response.body) {
        try {
          const contributors = JSON.parse(data.response.body);
          const userContributions = contributors.find((contributor: any) => 
            contributor.login && contributor.login.toLowerCase() === username.trim().toLowerCase()
          );
          
          if (userContributions) {
            contributionData = {
              username: userContributions.login,
              total: userContributions.contributions,
              avatar: userContributions.avatar_url
            };
          } else {
            setError(`No contributions found for username: ${username.trim()}`);
            return;
          }
        } catch (parseError) {
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
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light mb-4">vlayer GitHub Prover</h1>
          <p className="text-gray-400 text-lg">Prove contributions to GitHub repositories</p>
          <div className="mt-6">
            <a
              href="/verify-all"
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
          {owner && repo && (
            <div className="text-sm text-gray-500 -mt-4 text-center">
              Checking: <span className="text-gray-400 font-mono">https://api.github.com/repos/{owner}/{repo}/contributors</span>
            </div>
          )}

          {/* GitHub Token Input */}
          <div className="space-y-4">
            <label htmlFor="token" className="block text-sm font-medium text-gray-300">
              GitHub Personal Access Token (for private repos)
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
              Required for private repositories. Generate one at{' '}
              <a href="https://github.com/settings/personal-access-tokens" target="_blank" rel="noopener noreferrer" className="text-[#7235e5] hover:underline">
                GitHub Settings → Developer settings → Personal access tokens
              </a>
            </p>
          </div>

          {/* Username Input */}
          <div className="space-y-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">
              Your GitHub Username
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
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleProve}
              disabled={isProving || isVerifying}
              className="flex-1 px-6 py-3 bg-[#7235e5] hover:bg-[#5d2bc7] disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {isProving ? 'Proving...' : 'Prove Contributions'}
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