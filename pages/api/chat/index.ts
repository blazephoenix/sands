import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { NextApiRequest, NextApiResponse } from "next";
import { presets, systemPrompt } from "../../../components/utils/constants";
import { auth, getAuth } from "@clerk/nextjs/server";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const { userId } = getAuth(request);

  if (!userId) {
    return response.status(401).json({ error: "Not authenticated" });
  }
  const { messages } = await request.body;

  const result = await streamText({
    model: openai("gpt-4o"),
    messages,
    system: systemPrompt,
    ...presets,
  });

  // write the AI stream to the response
  // Note: this is sent as a single response, not a stream
  return result.pipeAIStreamToResponse(response);
}
