'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UploadPage() {
  const router = useRouter();
  const [proof, setProof] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        setProof(parsed);
        setError(null);
      } catch (err) {
        setError('Invalid JSON file. Please upload a valid webproof JSON file.');
        setProof(null);
      }
    };
    reader.readAsText(file);
  };

  const handleUploadProof = async () => {
    if (!proof) {
      setError('Please upload a webproof file first');
      return;
    }

    if (!username.trim()) {
      setError('Please enter your GitHub username');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/upload-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proof: proof,
          username: username.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setSuccess(data.message || 'Proof uploaded successfully!');
      
      // Redirect to contributions page after a short delay
      setTimeout(() => {
        router.push('/contributions');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload proof');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16 max-w-2xl">
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
          
          <h1 className="text-4xl font-light mb-4">Upload Webproof</h1>
          <p className="text-gray-400 text-lg">
            Upload and verify your GitHub contribution webproof
          </p>
        </div>

        <div className="space-y-8">
          {/* File Upload */}
          <div className="space-y-4">
            <label htmlFor="proof-file" className="block text-sm font-medium text-gray-300">
              Webproof JSON File
            </label>
            <div className="flex items-center space-x-4">
              <label
                htmlFor="proof-file"
                className="flex-1 px-6 py-3 bg-gray-900 border border-gray-700 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>{proof ? 'File selected' : 'Choose webproof file'}</span>
              </label>
              <input
                id="proof-file"
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
            </div>
            {proof && (
              <p className="text-sm text-green-400 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Webproof file loaded successfully
              </p>
            )}
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
              disabled={isUploading}
            />
            <p className="text-xs text-gray-500">
              Enter the GitHub username that matches the webproof you're uploading
            </p>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUploadProof}
            disabled={!proof || !username.trim() || isUploading}
            className="w-full px-6 py-3 bg-[#7235e5] hover:bg-[#5d2bc7] disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Upload & Verify Proof</span>
              </>
            )}
          </button>

          {/* Success Message */}
          {success && (
            <div className="p-6 bg-green-900/20 border border-green-700 rounded-lg">
              <h3 className="text-lg font-medium text-green-400 mb-2">✅ Upload Successful</h3>
              <p className="text-green-300 text-sm">{success}</p>
              <p className="text-green-400 text-xs mt-2">Redirecting to contributions page...</p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg">
            <h3 className="text-sm font-medium text-gray-300 mb-2">How to use:</h3>
            <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
              <li>Generate a webproof on the home page using "Prove Contributions"</li>
              <li>Download the webproof JSON file</li>
              <li>Upload it here along with your GitHub username</li>
              <li>Your verified contributions will be stored in the database</li>
            </ol>
          </div>
        </div>

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

