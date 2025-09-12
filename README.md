# Sands - Murder Mystery Simulator

A Next.js-powered interactive murder mystery game where players take on the role of a detective solving closed-circle mysteries. Built with AI-driven storytelling and user authentication.

## Overview

Sands is an AI-powered murder mystery simulation game that generates unique closed-circle mysteries for players to solve. Each case features randomly generated suspects, motives, opportunities, and means, creating a fresh detective experience every time.

## Features

- **AI-Generated Mysteries**: Powered by OpenAI GPT-4 for dynamic story generation
- **Closed-Circle Mysteries**: Classic detective fiction format with limited suspects
- **Interactive Gameplay**: Choose-your-own-adventure style investigation
- **User Authentication**: Secure sign-in with Clerk
- **Responsive Design**: Modern UI with Tailwind CSS
- **Real-time Chat**: Streaming AI responses for immersive gameplay

## Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Authentication**: Clerk
- **AI Integration**: OpenAI GPT-4 via Vercel AI SDK
- **Styling**: Tailwind CSS
- **Markdown Rendering**: react-markdown with GitHub Flavored Markdown
- **Development**: ESLint, TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm/yarn/pnpm
- OpenAI API key
- Clerk account for authentication

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env.local file with:
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── components/
│   ├── play/           # Main game interface
│   ├── signin/         # Authentication components
│   └── utils/          # Constants and utilities
├── pages/
│   ├── api/
│   │   ├── chat/       # AI chat endpoint
│   │   └── verify/     # Content verification endpoint
│   ├── _app.tsx        # App wrapper with Clerk provider
│   └── index.tsx       # Main landing page
├── styles/
│   └── globals.css     # Global styles with Tailwind
└── middleware.ts       # Clerk authentication middleware
```

## Game Mechanics

### Settings Available
- Country House
- Boat  
- Aircraft
- Island
- Cabin
- Train

### Suspect Count
- 2-10 suspects per mystery
- Each suspect has unique motive, opportunity, and means
- Clues are embedded in the narrative

### Gameplay Flow
1. User signs in via Clerk authentication
2. Player types "start" to begin
3. AI prompts for setting and suspect count selection
4. Dynamic mystery generation with embedded clues
5. Interactive investigation through chat interface
6. Player deduces the solution based on collected evidence

## API Endpoints

### `/api/chat`
- **Method**: POST
- **Purpose**: Main game interaction endpoint
- **Authentication**: Required (Clerk)
- **AI Model**: GPT-4
- **Features**: Streaming responses, system prompt integration

### `/api/verify`
- **Method**: POST  
- **Purpose**: Content relevance verification
- **AI Model**: GPT-3.5-turbo
- **Features**: Binary classification for query relevance

## Configuration

### AI Settings
- **Temperature**: 0.6 (balanced creativity/consistency)
- **Max Tokens**: 517
- **Top P**: 1
- **Frequency Penalty**: 0
- **Presence Penalty**: 0

### Authentication
- Clerk middleware protects all routes
- User authentication required for game access
- Automatic session management

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style
- TypeScript strict mode enabled
- ESLint with Next.js configuration
- Tailwind CSS for styling
- Component-based architecture

## Deployment

The application is optimized for deployment on Vercel:

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

For other platforms, ensure environment variables are properly configured and the build process completes successfully.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is private and proprietary.
