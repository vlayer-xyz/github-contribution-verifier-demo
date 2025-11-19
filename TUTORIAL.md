# zkTLS Day at Devconnect 2025

Welcome to the vlayer GitHub Contribution Verifier tutorial! This hands-on session will guide you through creating vlayer web proofs of your GitHub contributions using vlayer's Web Prover API.

## Prerequisites

- Node.js 20+ installed
- npm or pnpm package manager
- A GitHub account

## Getting Started

### Step 1: Learn the Basics

Review the [vlayer getting started documentation](https://docs.vlayer.xyz/) to understand the fundamentals of vlayer web proofs and zkTLS technology.

### Step 2: Explore Bounties

Check out vlayer's [EthGlobal bounties](https://ethglobal.com/events/buenosaires/prizes/vlayer) and brainstorm potential application ideas for your project.

### Step 3: Clone and Install

Clone the repository to your machine:

```bash
git clone https://github.com/vlayer-xyz/github-contribution-verifier-demo.git
cd github-contribution-verifier-demo
```

Install the project dependencies:

```bash
npm install
```

### Step 4: Configure Environment Variables

Obtain your vlayer API credentials (`WEB_PROVER_API_CLIENT_ID` and `WEB_PROVER_API_SECRET`) from the vlayer table at the event after filling out [this form](https://gplxanr6y5w.typeform.com/vlayer-hack)

Create a `.env.local` file in the project root:

```bash
WEB_PROVER_API_CLIENT_ID=your_client_id
WEB_PROVER_API_SECRET=your_api_secret
```

> 💡 **Tip:** This is a great time to ask questions about vlayer web proofs and the available bounties!

### Step 5: Run the Application

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

### Step 6: Generate Your Webproof

1. Enter a GitHub API contributors URL (e.g., `https://api.github.com/repos/owner/repo/contributors`)
2. For private repositories, provide your GitHub Personal Access Token
3. Enter your GitHub username
4. Click **"Prove Contributions"** to generate your web proof

### Step 7: Submit Your Proof

Download your webproof locally and add upload the webproof file to the [verified contributors page](https://github-contribution-verifier-demo.vercel.app/) 

### Step 8: Claim Your POAP

Once your web proof is uploaded and displayed on the [verified contributors page](https://github-contribution-verifier-demo.vercel.app/), you'll be eligible to receive a vlayer/zkTLS POAP as proof of your participation!

## Next Steps

- Explore the `/verify-all` page to see all verified contributors
- Experiment with different GitHub repositories
- Build your own applications using vlayer's Web Prover API
- Check out the [vlayer documentation](https://docs.vlayer.xyz/) for advanced features

---

╭(ʘ̆~◞౪◟~ʘ̆)╮  🎉
  (  Celebration Panda  )
