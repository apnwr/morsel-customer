# Morsel Customer App

A modern restaurant ordering application built with Next.js, featuring real-time session management, collaborative ordering, and intelligent bill splitting.

> **"Enjoy every meal, not the math"**

## Quick Start

```bash
# Install dependencies
yarn install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your API base URL

# Run development server
yarn dev
```

Open [http://localhost:3000](http://localhost:3000)

## Documentation

All project documentation is consolidated in a single file:

**[documentation/PROJECT_FLOW.md](./documentation/PROJECT_FLOW.md)**

This includes:
- Complete project structure
- Application flow (QR scan → menu → cart → order → payment)
- API reference with request/response examples
- State management (5 React Context providers)
- Component architecture
- Real-time synchronization (Firebase + polling fallback)
- Data types & models
- LocalStorage keys
- Environment variables
- Pricing model & calculation logic

## Tech Stack

- **Next.js** 16.0.8 (App Router) | **React** 19.2.0 | **TypeScript** 5
- **Tailwind CSS** 4 | **Framer Motion** 12 | **Firebase** (Realtime DB + Auth)
