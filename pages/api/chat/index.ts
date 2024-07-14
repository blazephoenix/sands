import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const { messages } = await request.body;

  const result = await streamText({
    model: openai('gpt-4'),
    messages,
  });

  // write the AI stream to the response
  // Note: this is sent as a single response, not a stream
  return result.pipeAIStreamToResponse(response);
}