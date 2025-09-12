import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { NextApiRequest, NextApiResponse } from "next";
import { presets, systemPrompt } from "../../../components/utils/constants";
import { getAuth } from "@clerk/nextjs/server";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  try {
    const { userId } = getAuth(request);

    if (!userId) {
      return response.status(401).json({ error: "Not authenticated" });
    }

    if (request.method !== "POST") {
      return response.status(405).json({ error: "Method not allowed" });
    }

    const { messages } = request.body;

    if (!messages || !Array.isArray(messages)) {
      return response.status(400).json({ error: "Invalid messages format" });
    }

    const result = await streamText({
      model: openai("gpt-4o"),
      messages,
      system: systemPrompt,
      ...presets,
    });

    // Stream the AI response
    return result.pipeAIStreamToResponse(response);
  } catch (error) {
    console.error("Chat API error:", error);
    return response.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
