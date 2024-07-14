import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextApiRequest, NextApiResponse } from 'next';
import { presets, systemPrompt } from '../../../components/utils/constants';

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const { messages } = await request.body;

  const result = await streamText({
    model: openai('gpt-4o'),
    messages,
    system: systemPrompt,
    ...presets
  });

  // write the AI stream to the response
  // Note: this is sent as a single response, not a stream
  return result.pipeAIStreamToResponse(response);
}