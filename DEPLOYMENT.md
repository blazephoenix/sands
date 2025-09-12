# Deployment Guide

## Overview

This guide covers deploying the Sands murder mystery application to various platforms, with primary focus on Vercel deployment.

## Prerequisites

- Node.js 18 or higher
- npm/yarn/pnpm package manager
- Git repository
- OpenAI API account
- Clerk authentication account

## Environment Variables

### Required Environment Variables

Create a `.env.local` file for local development:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-publishable-key
CLERK_SECRET_KEY=sk_test_your-clerk-secret-key

# Optional: Custom domain for Clerk
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### Environment Variable Setup

#### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Generate a new API key
5. Copy the key (starts with `sk-`)

#### Clerk Configuration
1. Visit [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application
3. Copy the publishable key and secret key
4. Configure allowed domains in Clerk dashboard

## Vercel Deployment (Recommended)

### Automatic Deployment

1. **Connect Repository**
   ```bash
   # Push your code to GitHub/GitLab/Bitbucket
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**
   - Visit [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your repository
   - Vercel auto-detects Next.js configuration

3. **Configure Environment Variables**
   - In Vercel dashboard, go to Project Settings
   - Navigate to Environment Variables
   - Add all required environment variables
   - Ensure they're available for all environments

4. **Deploy**
   - Vercel automatically builds and deploys
   - Subsequent pushes trigger automatic deployments

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
vercel

# Follow prompts to configure project
# Set environment variables when prompted
```

### Vercel Configuration

Create `vercel.json` for advanced configuration:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "pages/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "OPENAI_API_KEY": "@openai-api-key",
    "CLERK_SECRET_KEY": "@clerk-secret-key"
  }
}
```

## Alternative Deployment Platforms

### Netlify

1. **Build Configuration**
   ```toml
   # netlify.toml
   [build]
     command = "npm run build"
     publish = ".next"
   
   [build.environment]
     NODE_VERSION = "18"
   
   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200
   ```

2. **Environment Variables**
   - Set in Netlify dashboard under Site Settings > Environment Variables
   - Add all required variables

### Railway

1. **Deploy from GitHub**
   ```bash
   # Connect Railway to your repository
   # Railway auto-detects Next.js
   ```

2. **Environment Variables**
   ```bash
   # Set via Railway dashboard or CLI
   railway variables set OPENAI_API_KEY=your-key
   railway variables set CLERK_SECRET_KEY=your-key
   ```

### DigitalOcean App Platform

1. **App Spec Configuration**
   ```yaml
   # .do/app.yaml
   name: sands-murder-mystery
   services:
   - name: web
     source_dir: /
     github:
       repo: your-username/your-repo
       branch: main
     run_command: npm start
     build_command: npm run build
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: OPENAI_API_KEY
       value: your-openai-key
       type: SECRET
     - key: CLERK_SECRET_KEY
       value: your-clerk-key
       type: SECRET
   ```

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
      - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    env_file:
      - .env.local
```

### Build and Run

```bash
# Build Docker image
docker build -t sands-app .

# Run container
docker run -p 3000:3000 --env-file .env.local sands-app

# Or use Docker Compose
docker-compose up --build
```

## Production Optimizations

### Next.js Configuration

```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['react-markdown', 'remark-gfm']
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
```

### Performance Monitoring

```javascript
// Add to _app.tsx for production monitoring
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider {...pageProps}>
      <Component {...pageProps} />
      <Analytics />
    </ClerkProvider>
  );
}
```

## Domain Configuration

### Custom Domain Setup

1. **DNS Configuration**
   ```
   Type: CNAME
   Name: www
   Value: your-app.vercel.app
   
   Type: A
   Name: @
   Value: 76.76.19.61 (Vercel IP)
   ```

2. **Vercel Domain Settings**
   - Add domain in Vercel dashboard
   - Configure SSL certificate (automatic)
   - Set up redirects if needed

### Clerk Domain Configuration

1. **Update Clerk Settings**
   - Add production domain to allowed origins
   - Update redirect URLs
   - Configure CORS settings

## Monitoring and Maintenance

### Health Checks

```javascript
// pages/api/health.ts
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
}
```

### Error Monitoring

```javascript
// Add error boundary and monitoring
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Backup and Recovery

- **Code**: Git repository with multiple remotes
- **Environment Variables**: Secure backup of configuration
- **Dependencies**: Lock file version control
- **Deployment**: Multiple environment setup

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

2. **Environment Variable Issues**
   ```bash
   # Verify variables are set
   echo $OPENAI_API_KEY
   
   # Check Vercel deployment logs
   vercel logs
   ```

3. **Authentication Problems**
   - Verify Clerk domain configuration
   - Check API key validity
   - Confirm redirect URLs

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run dev

# Vercel function logs
vercel logs --follow
```

## Security Checklist

- [ ] Environment variables secured
- [ ] API keys rotated regularly
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Dependencies updated
- [ ] Error messages sanitized
- [ ] Rate limiting implemented
- [ ] Input validation enabled