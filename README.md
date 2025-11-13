# GitHub Contribution Verifier

A Next.js application that uses web proofs / zkTLS to verify GitHub contributions through vlayer's Web Prover API.

## Overview

This tool allows users to cryptographically prove and verify their contributions to GitHub repositories. It creates tamper-proof attestations of contributor data from GitHub's API.

## Prerequisites

- Node.js 20+
- npm or pnpm
- vlayer Web Prover API credentials

## Installation

```bash
npm install
```

## Configuration

Create a `.env.local` file with your vlayer API credentials:

```
WEB_PROVER_API_CLIENT_ID=your_client_id
WEB_PROVER_API_SECRET=your_api_secret
```

## Usage

1. Start the development server:
```bash
npm run dev
```

2. Open http://localhost:3000

3. Enter a GitHub API contributors URL (e.g., `https://api.github.com/repos/owner/repo/contributors`)

4. For private repositories, provide a GitHub Personal Access Token

5. Enter your GitHub username

6. Click "Prove Contributions" to generate a cryptographic proof

7. Click "Verify Proof" to verify your contributions

## API Endpoints

- `POST /api/prove` - Generate cryptographic proof of GitHub API data
- `POST /api/verify` - Verify the generated proof and extract contribution data

## Documentation

For more information about vlayer and the Web Prover API, visit the official documentation:

https://docs.vlayer.xyz/
