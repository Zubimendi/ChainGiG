# ChainGig — Decentralized Freelance Escrow & Credential Platform

> "Get paid fairly. Build trust on-chain."

ChainGig is a decentralized escrow and credentialing platform built on **Base L2** (Ethereum Layer 2). It enables milestone-based USDC payments between clients and freelancers, with tamper-proof SoulBound Token (SBT) credentials and community-driven dispute resolution.

## Architecture

```
┌──────────────────────────────────────────┐
│          Frontend (Next.js 16)           │
│  wagmi v2 + viem + RainbowKit            │
│  TailwindCSS + TypeScript                │
└──────────────┬───────────────────────────┘
               │ Contract calls via viem
               ▼
┌──────────────────────────────────────────┐
│          Base L2 Blockchain              │
│                                          │
│  ChainGigEscrow.sol     (USDC escrow)    │
│  ChainGigReputation.sol (ERC-5192 SBT)   │
│  ChainGigDispute.sol    (Arbitration)     │
│                                          │
│  USDC (Base): 0x833589fC...bdA02913      │
└──────────────────────────────────────────┘
```

## Smart Contracts

| Contract | Purpose | Key Features |
|----------|---------|-------------|
| `ChainGigEscrow.sol` | Core escrow logic | Milestone payments, auto-approve (7d), cancellation, dispute integration |
| `ChainGigReputation.sol` | SoulBound Token (ERC-5192) | Non-transferable credentials, 1-5 star ratings, reputation score |
| `ChainGigDispute.sol` | Community arbitration | 3-arbitrator voting, 72h window, 2-of-3 majority resolution |
| `MockUSDC.sol` | Test token | 6 decimals, faucet function (testnet only) |

## Tech Stack

- **Smart Contracts**: Solidity 0.8.20, Hardhat, OpenZeppelin 5.x
- **Frontend**: Next.js 16, TypeScript, wagmi v2, viem, RainbowKit
- **Chain**: Base Sepolia (testnet) → Base Mainnet
- **Payments**: USDC (6 decimals), 2.5% platform fee

## Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone and install (contracts)
cd chain-gig
npm install

# Install frontend
cd frontend
npm install
```

### Environment Setup

```bash
# Root — contracts
cp .env.example .env
# Fill in: PRIVATE_KEY, BASE_SEPOLIA_RPC, BASESCAN_API_KEY

# Frontend
cp frontend/.env.example frontend/.env.local
# Fill in contract addresses after deployment
```

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
# All tests
npm test

# With gas report
npm run test:gas

# Coverage (target >80%)
npm run coverage
```

### Local Development

```bash
# Terminal 1: Start local Hardhat node
npm run node

# Terminal 2: Deploy contracts locally
npm run deploy:local

# Terminal 3: Start frontend
cd frontend && npm run dev
```

### Deploy to Base Sepolia

```bash
npm run deploy:sepolia
npm run verify:sepolia
```

### Deploy Frontend

```bash
cd frontend
npm run build
# Deploy to Vercel or your hosting provider
```

## Test Results

- **122 tests passing, 0 failing**
- **Coverage**: 96.47% statements, 84.44% branches, 88% functions, 93.39% lines

## Security

- ReentrancyGuard on all fund-transfer functions
- Checks-Effects-Interactions pattern throughout
- Custom errors for gas optimization
- Pausable circuit breaker (owner emergency stop)
- Locked pragma: `solidity 0.8.20`
- All USDC transfer return values checked
- No `tx.origin` usage
- Access control on all privileged functions

## Project Structure

```
chain-gig/
├── contracts/
│   ├── ChainGigEscrow.sol
│   ├── ChainGigReputation.sol
│   ├── ChainGigDispute.sol
│   ├── interfaces/
│   │   ├── IChainGigEscrow.sol
│   │   ├── IChainGigReputation.sol
│   │   └── IChainGigDispute.sol
│   └── mocks/
│       ├── MockUSDC.sol
│       └── MockReentrancyAttacker.sol
├── scripts/
│   ├── deploy.ts
│   └── verify.ts
├── test/
│   ├── ChainGigEscrow.test.ts
│   ├── ChainGigReputation.test.ts
│   ├── ChainGigDispute.test.ts
│   ├── security.test.ts
│   └── integration/
│       └── fullFlow.test.ts
├── deployments/
├── frontend/
│   ├── src/
│   │   ├── app/          (pages)
│   │   ├── components/   (UI components)
│   │   ├── hooks/        (contract hooks)
│   │   ├── constants/    (ABIs, addresses)
│   │   └── lib/          (wagmi config, utils)
│   └── ...
├── hardhat.config.ts
└── package.json
```

## License

MIT
