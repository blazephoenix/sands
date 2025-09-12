# Technology Stack

## Framework & Runtime
- **Next.js 14** with TypeScript - Full-stack React framework with API routes
- **Node.js 18+** - Runtime environment
- **React 18** - Frontend library with React DOM

## Key Dependencies
- **@clerk/nextjs** - Authentication and user management
- **@ai-sdk/openai & ai** - Vercel AI SDK for OpenAI integration
- **openai** - Direct OpenAI API client
- **react-markdown** - Markdown rendering with GitHub Flavored Markdown support
- **remark-gfm** - GitHub Flavored Markdown plugin
- **zod** - Runtime type validation

## Styling & UI
- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS** - CSS processing
- Custom gradient utilities and responsive design

## Development Tools
- **TypeScript** - Static type checking with strict mode enabled
- **ESLint** - Code linting with Next.js core web vitals config
- **React Strict Mode** - Development mode checks

## Build System & Commands

### Development
```bash
npm run dev          # Start development server on localhost:3000
```

### Production
```bash
npm run build        # Build optimized production bundle
npm run start        # Start production server
```

### Code Quality
```bash
npm run lint         # Run ESLint checks
```

## Configuration Standards
- **TypeScript**: Strict mode enabled, path aliases with `@/*` for src directory
- **ESLint**: Extends `next/core-web-vitals` for performance and accessibility
- **Tailwind**: Configured for pages and components directories
- **Next.js**: React strict mode enabled

## Environment Variables Required
```bash
OPENAI_API_KEY=                    # OpenAI API access
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= # Clerk public key
CLERK_SECRET_KEY=                  # Clerk private key
```

## Deployment
- Optimized for **Vercel** deployment
- Serverless functions for API routes
- Automatic environment variable configuration