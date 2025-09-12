"use client";

import { useChat } from "ai/react";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CaseBriefing from "./CaseBriefing";
import {
  GameState,
  initialGameState,
  updateGameState,
  calculateScore,
  extractGameInfo,
} from "../utils/gameState";

const markdownComponents = {
  p: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <p
      className="text-sm sm:text-base text-slate-700 mb-3 leading-relaxed"
      {...props}
    >
      {children}
    </p>
  ),
  h1: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <h1
      className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 mt-2"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <h2
      className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 mt-4"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <h3
      className="text-base sm:text-lg font-semibold text-slate-800 mb-2 mt-3"
      {...props}
    >
      {children}
    </h3>
  ),
  hr: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <hr className="my-4 border-slate-200" {...props} />
  ),
  ol: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <ol
      className="list-decimal list-inside space-y-1 pl-2 sm:pl-4 my-3 text-sm sm:text-base"
      {...props}
    >
      {children}
    </ol>
  ),
  ul: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <ul
      className="list-disc list-inside space-y-1 pl-2 sm:pl-4 my-3 text-sm sm:text-base"
      {...props}
    >
      {children}
    </ul>
  ),
  li: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <li className="text-slate-700 leading-relaxed" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <strong className="font-semibold text-slate-900" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <em className="italic text-slate-800" {...props}>
      {children}
    </em>
  ),
  blockquote: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <blockquote
      className="border-l-4 border-orange-200 pl-4 py-2 my-4 bg-orange-50 text-slate-700 italic"
      {...props}
    >
      {children}
    </blockquote>
  ),
};

const setupButtons = [
  { label: "🏚️ Country House", action: "Country House" },
  { label: "🚢 Boat", action: "Boat" },
  { label: "✈️ Aircraft", action: "Aircraft" },
  { label: "🏝️ Island", action: "Island" },
  { label: "🏕️ Cabin", action: "Cabin" },
  { label: "🚂 Train", action: "Train" },
];

const suspectButtons = [
  { label: "2 Suspects", action: "2" },
  { label: "3 Suspects", action: "3" },
  { label: "4 Suspects", action: "4" },
  { label: "5 Suspects", action: "5" },
  { label: "6 Suspects", action: "6" },
  { label: "7+ Suspects", action: "7" },
];

const investigationButtons = [
  { label: "🔍 Investigate", action: "I want to investigate further" },
  { label: "❓ Question", action: "I want to question someone" },
  { label: "🔎 Examine", action: "I want to examine the evidence" },
  { label: "🚪 Move", action: "I want to go to a different location" },
  { label: "💭 Review", action: "Let me review what I know so far" },
  { label: "⚖️ Accuse", action: "I want to make an accusation" },
];

export default function Chat() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [gameState, setGameState] = useState<GameState>(initialGameState);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
    error,
    reload,
  } = useChat({
    api: "/api/chat",
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  const handleActionClick = (actionText: string) => {
    append({ role: "user", content: actionText });

    // Update action count and score
    const newActionCount = gameState.actionsCount + 1;
    const newScore = calculateScore({
      ...gameState,
      actionsCount: newActionCount,
    });

    setGameState((prev) =>
      updateGameState(prev, {
        actionsCount: newActionCount,
        score: newScore,
      })
    );
  };

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  });

  // Update game state based on messages
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "assistant") {
      const content = lastMessage.content.toLowerCase();

      // Check for game phase transitions
      if (
        content.includes("choose your mystery location") ||
        content.includes("setting")
      ) {
        setGameState((prev) => updateGameState(prev, { phase: "setup" }));
      } else if (
        content.includes("suspects should be involved") ||
        content.includes("how many")
      ) {
        // Still in setup phase, but mark that we're asking for suspect count
        setGameState((prev) => updateGameState(prev, { phase: "setup" }));
      } else if (
        content.includes("crime scene") ||
        content.includes("murder") ||
        content.includes("investigation") ||
        content.includes("body") ||
        content.includes("victim") ||
        content.includes("detective")
      ) {
        setGameState((prev) =>
          updateGameState(prev, { phase: "investigation" })
        );
      }

      // Check for game over states
      if (
        content.includes("game over") ||
        content.includes("case goes cold") ||
        content.includes("removed from the case")
      ) {
        const isSuccess =
          content.includes("case solved") ||
          content.includes("congratulations");
        setGameState((prev) =>
          updateGameState(prev, {
            phase: "ended",
            gameResult: isSuccess ? "success" : "failure",
            endReason: lastMessage.content.split("**")[1] || "Case ended",
          })
        );
      }

      // Extract game information
      const gameInfo = extractGameInfo(lastMessage.content);
      if (Object.keys(gameInfo).length > 0) {
        setGameState((prev) => {
          const updates: Partial<GameState> = {};

          if (gameInfo.clues) {
            const combinedClues = [...prev.clues, ...gameInfo.clues];
            updates.clues = Array.from(new Set(combinedClues));
          }
          if (gameInfo.suspects) {
            const combinedSuspects = [...prev.suspects, ...gameInfo.suspects];
            updates.suspects = Array.from(new Set(combinedSuspects));
          }
          if (gameInfo.locations) {
            const combinedLocations = [
              ...prev.locations,
              ...gameInfo.locations,
            ];
            updates.locations = Array.from(new Set(combinedLocations));
          }
          if (gameInfo.evidence) {
            const combinedEvidence = [...prev.evidence, ...gameInfo.evidence];
            updates.evidence = Array.from(new Set(combinedEvidence));
          }

          return updateGameState(prev, updates);
        });
      }
    }

    // Handle user messages for setting/suspect selection
    if (lastMessage.role === "user") {
      const content = lastMessage.content;

      // Check if user selected a setting
      const settings = [
        "Country House",
        "Boat",
        "Aircraft",
        "Island",
        "Cabin",
        "Train",
      ];
      const selectedSetting = settings.find((setting) =>
        content.toLowerCase().includes(setting.toLowerCase())
      );

      if (selectedSetting && !gameState.setting) {
        setGameState((prev) =>
          updateGameState(prev, { setting: selectedSetting })
        );
      }

      // Check if user selected suspect count
      const suspectMatch = content.match(/(\d+)/);
      if (suspectMatch && !gameState.suspectCount && gameState.setting) {
        const count = parseInt(suspectMatch[1]);
        if (count >= 2 && count <= 10) {
          setGameState((prev) =>
            updateGameState(prev, {
              suspectCount: count,
              // If we have both setting and suspect count, we're likely moving to investigation soon
              phase: "setup",
            })
          );
        }
      }
    }
  }, [messages, gameState.setting, gameState.suspectCount]);

  // Auto-transition to investigation when both setup parameters are provided and we get a new AI response
  useEffect(() => {
    if (
      gameState.setting &&
      gameState.suspectCount &&
      gameState.phase === "setup" &&
      messages.length > 0
    ) {
      const lastMessage = messages[messages.length - 1];
      if (
        lastMessage.role === "assistant" &&
        !lastMessage.content.toLowerCase().includes("choose") &&
        !lastMessage.content.toLowerCase().includes("how many")
      ) {
        // This is likely the start of the mystery
        setGameState((prev) =>
          updateGameState(prev, { phase: "investigation" })
        );
      }
    }
  }, [gameState.setting, gameState.suspectCount, gameState.phase, messages]);

  // Get current action buttons based on game state
  const getCurrentActionButtons = () => {
    if (gameState.phase === "setup") {
      // If we haven't selected a setting yet, show location buttons
      if (!gameState.setting) {
        return setupButtons;
      }
      // If we have a setting but no suspect count, show suspect buttons
      else if (!gameState.suspectCount) {
        return suspectButtons;
      }
      // If we have both, we're transitioning to investigation
      else {
        return [];
      }
    } else if (gameState.phase === "investigation") {
      return investigationButtons;
    }
    return [];
  };

  const currentActionButtons = getCurrentActionButtons();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-2">
            <div ref={chatContainerRef} className="space-y-4">
              {/* Welcome Message */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 font-semibold text-sm">
                        🎭
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 mb-2">
                      Detective Briefing
                    </div>
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {`### Welcome, Detective!

You've been called to investigate a murder mystery. Each case is uniquely generated with different suspects, locations, and clues.

Your job is to gather evidence, question suspects, and solve the case using your deductive skills.

**Type "start" to begin your investigation.**`}
                    </Markdown>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              {messages.map((message, index) => (
                <div key={message.id}>
                  <div
                    className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 ${
                      message.role === "user" ? "ml-4 sm:ml-8" : ""
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            message.role === "user"
                              ? "bg-blue-100"
                              : "bg-orange-100"
                          }`}
                        >
                          <span
                            className={`font-semibold text-sm ${
                              message.role === "user"
                                ? "text-blue-600"
                                : "text-orange-600"
                            }`}
                          >
                            {message.role === "user" ? "🕵️" : "📋"}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 mb-2">
                          {message.role === "user" ? "Detective" : "Case File"}
                        </div>
                        <div className="prose prose-slate max-w-none">
                          <Markdown
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                          >
                            {message.content}
                          </Markdown>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Loading indicator */}
                  {index === messages.length - 1 && isLoading && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 mt-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" />
                          <div
                            className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <div
                            className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                        <span className="text-sm text-slate-500">
                          Analyzing evidence...
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Error handling */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 font-semibold text-sm">
                          ⚠️
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-red-900 mb-2">
                        Connection Error
                      </div>
                      <p className="text-sm text-red-700 mb-3">
                        There was an issue processing your request. This might
                        be due to a network problem or server overload.
                      </p>
                      <button
                        onClick={() => reload()}
                        className="bg-red-100 hover:bg-red-200 text-red-800 text-sm px-3 py-2 rounded-lg transition-colors duration-200"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Case Briefing Sidebar */}
          <div className="lg:col-span-1">
            <CaseBriefing gameState={gameState} />
          </div>
        </div>
      </div>

      {/* Fixed Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Action Buttons */}
          {currentActionButtons.length > 0 &&
            !isLoading &&
            gameState.phase !== "ended" && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2 justify-center">
                  {currentActionButtons.map((button, index) => (
                    <button
                      key={index}
                      onClick={() => handleActionClick(button.action)}
                      className={`text-sm px-3 py-2 rounded-lg transition-colors duration-200 border ${
                        gameState.phase === "setup"
                          ? "bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-300"
                          : button.label.includes("Accuse")
                          ? "bg-red-100 hover:bg-red-200 text-red-700 border-red-300"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                      }`}
                    >
                      {button.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <div className="flex-1">
              <input
                ref={inputRef}
                value={input}
                placeholder={
                  gameState.phase === "ended"
                    ? "Game has ended. Start a new game to continue."
                    : "Type your message or use action buttons above..."
                }
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-slate-900 placeholder-slate-500"
                disabled={isLoading || gameState.phase === "ended"}
              />
            </div>
            {gameState.phase === "ended" ? (
              <button
                type="button"
                onClick={() => {
                  window.location.reload();
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                New Game
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                Send
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
