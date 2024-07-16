import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { NextApiRequest, NextApiResponse } from "next";
import { presets, systemPrompt } from "../../../components/utils/constants";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const { messages } = await request.body;

  const result = await streamText({
    model: openai("gpt-3.5-turbo"),
    messages,
    system: `You will receive a user query and your task is to classify if a given user request is related to {APPLICATION_OBJECTIVE}. If it is relevant, return 1. Else, return 0 ${systemPrompt}`,
    temperature: 0,
    maxTokens: 1
  });

  // write the AI stream to the response
  // Note: this is sent as a single response, not a stream
  return result.pipeAIStreamToResponse(response);
}
