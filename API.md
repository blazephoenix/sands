# API Documentation

## Overview

The Sands application provides RESTful API endpoints for game interaction and content verification. All endpoints require authentication via Clerk.

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

All API endpoints require authentication through Clerk. The middleware automatically validates user sessions.

### Headers
```
Authorization: Bearer <clerk-session-token>
Content-Type: application/json
```

## Endpoints

### POST /api/chat

Primary endpoint for game interaction and AI-powered responses.

#### Request

```typescript
interface ChatRequest {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}
```

#### Example Request
```json
{
  "messages": [
    {
      "id": "1",
      "role": "user", 
      "content": "start"
    }
  ]
}
```

#### Response

Streaming response with AI-generated content.

```typescript
// Streaming response format
interface ChatResponse {
  // Streamed text chunks
  content: string;
  // Response metadata
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

#### Response Codes
- `200`: Success - streaming response
- `401`: Unauthorized - invalid or missing authentication
- `400`: Bad Request - invalid message format
- `500`: Internal Server Error - AI service unavailable

#### Configuration
- **Model**: GPT-4
- **Temperature**: 0.6
- **Max Tokens**: 517
- **Top P**: 1.0
- **Frequency Penalty**: 0
- **Presence Penalty**: 0

### POST /api/verify

Content verification endpoint for query relevance classification.

#### Request

```typescript
interface VerifyRequest {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
  }>;
}
```

#### Example Request
```json
{
  "messages": [
    {
      "id": "1",
      "role": "user",
      "content": "What's the weather like?"
    }
  ]
}
```

#### Response

Binary classification result (0 or 1).

```typescript
interface VerifyResponse {
  result: 0 | 1; // 0 = not relevant, 1 = relevant
}
```

#### Response Codes
- `200`: Success - classification complete
- `400`: Bad Request - invalid message format
- `500`: Internal Server Error - AI service unavailable

#### Configuration
- **Model**: GPT-3.5-turbo
- **Temperature**: 0
- **Max Tokens**: 1

## Error Handling

### Error Response Format
```typescript
interface ErrorResponse {
  error: string;
  message?: string;
  code?: string;
}
```

### Common Error Responses

#### 401 Unauthorized
```json
{
  "error": "Not authenticated"
}
```

#### 400 Bad Request
```json
{
  "error": "Invalid request format",
  "message": "Messages array is required"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "AI service temporarily unavailable"
}
```

## Rate Limiting

Rate limiting is handled by external services:
- **Clerk**: Authentication rate limits
- **OpenAI**: API usage limits based on plan
- **Vercel**: Function execution limits

## Usage Examples

### Starting a New Game

```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      {
        id: '1',
        role: 'user',
        content: 'start'
      }
    ]
  })
});

// Handle streaming response
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  console.log(chunk);
}
```

### Continuing Conversation

```javascript
const messages = [
  { id: '1', role: 'user', content: 'start' },
  { id: '2', role: 'assistant', content: 'Welcome! What setting would you like?' },
  { id: '3', role: 'user', content: 'Country House' }
];

const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ messages })
});
```

### Verifying Content Relevance

```javascript
const response = await fetch('/api/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      {
        id: '1',
        role: 'user',
        content: 'Tell me about the suspects'
      }
    ]
  })
});

const result = await response.json();
console.log(result.result); // 1 (relevant) or 0 (not relevant)
```

## Integration with Frontend

### Using Vercel AI SDK

The frontend uses the Vercel AI SDK's `useChat` hook for seamless integration:

```typescript
import { useChat } from 'ai/react';

const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
  api: '/api/chat',
});
```

### Custom Fetch Implementation

For custom implementations without the AI SDK:

```typescript
async function sendMessage(messages: Message[]) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
}
```

## Security Considerations

### Input Validation
- All requests validated for proper message format
- Content length limits enforced
- Malicious input detection

### Authentication
- Clerk session validation on every request
- Automatic token refresh handling
- Secure session management

### Data Privacy
- No message persistence on server
- Minimal data logging
- Secure API communication

## Monitoring and Debugging

### Request Logging
```javascript
// Enable debug logging in development
console.log('API Request:', {
  endpoint: '/api/chat',
  messages: messages.length,
  timestamp: new Date().toISOString()
});
```

### Error Tracking
```javascript
try {
  const response = await fetch('/api/chat', options);
} catch (error) {
  console.error('API Error:', error);
  // Handle error appropriately
}
```

### Performance Monitoring
- Track response times
- Monitor token usage
- Analyze user interaction patterns