# Project Structure & Organization

## Directory Layout

```
├── components/           # React components organized by feature
│   ├── play/            # Main game interface components
│   ├── signin/          # Authentication UI components
│   └── utils/           # Shared utilities and constants
├── pages/               # Next.js pages and API routes
│   ├── api/             # Backend API endpoints
│   │   ├── chat/        # Main game interaction endpoint
│   │   └── verify/      # Content verification endpoint
│   ├── index.tsx        # Landing page with auth flow
│   ├── _app.tsx         # App wrapper with Clerk provider
│   └── _document.tsx    # Custom document structure
├── public/              # Static assets
├── styles/              # Global CSS and Tailwind styles
│   └── globals.css      # Main stylesheet
└── middleware.ts        # Clerk authentication middleware
```

## Component Organization

### Feature-Based Structure
- Components are grouped by feature/domain rather than type
- Each feature folder contains related components and utilities
- Shared utilities go in `components/utils/`

### Page Structure
- **Pages**: Follow Next.js file-based routing
- **API Routes**: RESTful endpoints in `pages/api/`
- **Layouts**: App-level configuration in `_app.tsx` and `_document.tsx`

## File Naming Conventions

### Components
- Use PascalCase for component files: `GameInterface.tsx`
- Use camelCase for utility files: `gameConstants.ts`
- Use kebab-case for API routes: `chat.ts`, `verify.ts`

### Pages
- Follow Next.js conventions: lowercase with underscores for special pages
- `index.tsx` for root routes
- `_app.tsx` and `_document.tsx` for Next.js special files

## Architecture Patterns

### Component Patterns
- **Functional Components**: Use React hooks exclusively
- **TypeScript**: All components must be typed
- **Props Interface**: Define explicit interfaces for component props
- **Default Exports**: Use default exports for page components

### API Patterns
- **Route Handlers**: Use Next.js API route format
- **Authentication**: All game endpoints require Clerk authentication
- **Error Handling**: Consistent error response format
- **Streaming**: Use Vercel AI SDK for streaming responses

### State Management
- **Local State**: React hooks for component-level state
- **Authentication State**: Managed by Clerk provider
- **Game State**: Maintained in chat conversation context

## Import Conventions

### Path Aliases
- Use `@/*` for src directory imports (configured in tsconfig.json)
- Relative imports for same-directory files
- Absolute imports for cross-feature dependencies

### Import Order
1. External libraries (React, Next.js, etc.)
2. Internal utilities and constants
3. Component imports
4. Type imports (using `import type`)

## Code Organization Rules

### Component Structure
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use TypeScript interfaces for all props and data structures

### API Structure
- One endpoint per file in `pages/api/`
- Consistent request/response patterns
- Proper HTTP status codes and error handling

### Styling Approach
- Tailwind CSS classes for all styling
- No custom CSS modules or styled-components
- Responsive design using Tailwind breakpoints
- Consistent spacing and color schemes