This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### 1. Environment Setup

Copy the `.env.example` file to `.env.local`:

```bash
cp .env.example .env.local
```

The `.env.local` file contains necessary environment variables including the API base URL.

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Run the Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## API Documentation

Comprehensive API documentation is available in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

This document includes:
- Base URL configuration
- All API endpoints with request/response structures
- Type definitions
- Integration flow
- Usage examples
- Error handling

**Always update this documentation when making API-related changes.**

## Project Structure

```
src/
├── app/                    # Next.js app router pages
├── components/            # React components
├── contexts/              # React contexts for state management
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and configurations
│   ├── api/              # API client and endpoints
│   └── config.ts         # Environment configuration
├── services/             # API services
├── types/                # TypeScript type definitions
└── mocks/                # Mock data for development
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
