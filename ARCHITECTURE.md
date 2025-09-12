# Architecture Documentation

## System Overview

Sands is a full-stack Next.js application that combines AI-powered content generation with real-time user interaction to create an immersive murder mystery gaming experience.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (React/Next)  │    │   (API Routes)  │    │   Services      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Landing Page  │◄──►│ • Chat API      │◄──►│ • OpenAI GPT-4  │
│ • Game UI       │    │ • Verify API    │    │ • Clerk Auth    │
│ • Auth Flow     │    │ • Middleware    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Component Architecture

### Frontend Components

#### Pages Layer

- **`pages/index.tsx`**: Main landing page with authentication flow
- **`pages/_app.tsx`**: Application wrapper with Clerk provider
- **`pages/_document.tsx`**: Custom document structure

#### Component Layer

- **`components/play/`**: Core game interface
  - Chat interface with streaming AI responses
  - Markdown rendering for rich content
  - Auto-scrolling message history
- **`components/signin/`**: Authentication components
- **`components/utils/`**: Shared utilities and constants

### Backend Architecture

#### API Routes

- **`/api/chat`**: Primary game interaction endpoint
  - Handles streaming AI responses
  - Integrates with OpenAI GPT-4
  - Requires authentication
- **`/api/verify`**: Content verification endpoint
  - Uses GPT-3.5-turbo for classification
  - Validates query relevance

#### Middleware

- **`middleware.ts`**: Clerk authentication middleware
  - Protects all routes
  - Handles session management
  - Redirects unauthenticated users

## Data Flow

### Authentication Flow

1. User visits application
2. Clerk middleware checks authentication status
3. Unauthenticated users see sign-in interface
4. Authenticated users access game interface

### Game Interaction Flow

1. User submits message via chat interface
2. Frontend sends request to `/api/chat`
3. Backend validates authentication
4. OpenAI API generates response
5. Response streams back to frontend
6. UI updates with new message

### AI Integration

- **System Prompt**: Defines game rules and behavior
- **Message History**: Maintains conversation context
- **Streaming**: Real-time response delivery
- **Error Handling**: Graceful failure management

## Security Architecture

### Authentication

- **Clerk Integration**: Industry-standard authentication
- **Route Protection**: Middleware-based access control
- **Session Management**: Automatic token handling

### API Security

- **Authentication Required**: All game endpoints protected
- **Input Validation**: Request body validation
- **Rate Limiting**: Implicit through Clerk and OpenAI

### Data Privacy

- **No Persistent Storage**: Game state exists only in session
- **Minimal Data Collection**: Only authentication data stored
- **Third-party Integration**: Secure API communication

## Performance Considerations

### Frontend Optimization

- **Next.js Optimization**: Automatic code splitting and optimization
- **Font Optimization**: Google Fonts with next/font
- **CSS Optimization**: Tailwind CSS with purging
- **Component Lazy Loading**: Dynamic imports where applicable

### Backend Optimization

- **Streaming Responses**: Reduces perceived latency
- **Efficient API Calls**: Minimal OpenAI token usage
- **Caching Strategy**: Static assets cached by Next.js

### Scalability

- **Stateless Design**: No server-side session storage
- **API Rate Limits**: Managed by external services
- **Horizontal Scaling**: Vercel serverless functions

## Technology Decisions

### Framework Choice: Next.js

- **Reasoning**: Full-stack React framework with API routes
- **Benefits**: SSR, automatic optimization, deployment simplicity
- **Trade-offs**: Vendor lock-in with Vercel ecosystem

### Authentication: Clerk

- **Reasoning**: Managed authentication service
- **Benefits**: Security, compliance, ease of integration
- **Trade-offs**: External dependency, cost considerations

### AI Provider: OpenAI

- **Reasoning**: Best-in-class language models
- **Benefits**: High-quality responses, streaming support
- **Trade-offs**: Cost per request, API rate limits

### Styling: Tailwind CSS

- **Reasoning**: Utility-first CSS framework
- **Benefits**: Rapid development, consistent design
- **Trade-offs**: Learning curve, class name verbosity

## Deployment Architecture

### Vercel Platform

- **Frontend**: Static site generation with dynamic routes
- **API Routes**: Serverless functions
- **Edge Network**: Global CDN distribution
- **Environment Variables**: Secure configuration management

### Environment Configuration

- **Development**: Local environment with hot reloading
- **Production**: Optimized build with environment variables
- **Staging**: Preview deployments for testing

## Monitoring and Observability

### Error Tracking

- **Frontend Errors**: Browser console and user feedback
- **API Errors**: Server logs and response codes
- **External Service Errors**: OpenAI and Clerk status monitoring

### Performance Monitoring

- **Core Web Vitals**: Next.js built-in analytics
- **API Response Times**: Vercel function metrics
- **User Experience**: Real user monitoring

## Future Architecture Considerations

### Potential Enhancements

- **Database Integration**: Persistent game state and user progress
- **Real-time Features**: WebSocket integration for multiplayer
- **Caching Layer**: Redis for improved performance
- **Analytics**: User behavior tracking and game metrics

### Scalability Improvements

- **Microservices**: Separate game logic from authentication
- **Event-Driven Architecture**: Async processing for complex operations
- **CDN Optimization**: Static asset distribution
- **Load Balancing**: Multiple region deployment
