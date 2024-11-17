"use client";

import { useChat } from "ai/react";
import { useEffect, useRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents = {
  p: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <p className="text-base text-gray-800 mb-4 mt-2" {...props}>
      {children}
    </p>
  ),
  h1: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <h1 className="text-2xl font-bold text-gray-900 my-4" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <h2 className="text-xl font-semibold text-gray-800 my-3" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <h2 className="text-lg font-semibold text-gray-800 my-3" {...props}>
      {children}
    </h2>
  ),
  hr: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <hr className="my-5" {...props}>
      {children}
    </hr>
  ),
  ol: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <ol className="list-decimal list-inside space-y-2 pl-4 my-2" {...props}>
      {children}
    </ol>
  ),
  ul: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <ul className="list-disc list-inside space-y-2 pl-4" {...props}>
      {children}
    </ul>
  ),
  li: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <li className="text-base text-gray-700 m-2" {...props}>
      <div style={{ display: "inline-block" }}>{children}</div>
    </li>
  ),
};

export default function Chat() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const chatContainerRef = useRef<HTMLInputElement | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
    });

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

  return (
    <div
      ref={chatContainerRef}
      className="w-[60vw] mx-auto h-[80vh] overflow-y-scroll"
    >
      {/* <div className="fixed top-0 p-2 mb-5 w-[60vw] text-2xl font-bold text-gray-900 my-4">Sands - Murder Mystery Simulator</div> */}
      <div className="p-2">
        <div className="rounded-lg border-2 border-slate-200 mt-5 py-2 px-4">
          <div className="w-24 text-zinc-500"></div>
          <div className="w-full">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {`### Hello!

Sands is a murder mystery simulation game where you are the detective tasked with solving a case! Each case is randomly generated with unique stories and unique cases (save for the repetitive murder weapons).

Type "start" to begin playing.`}
            </Markdown>
          </div>
        </div>
      </div>

      <div className="p-2">
        {messages.map((message, index) => (
          <>
            <div
              key={message.id}
              className="rounded-lg border-2 border-slate-200 mt-5 py-2 px-4"
            >
              <div className="w-24 text-zinc-500">{`${
                message.role === "user" ? "You" : "Sim"
              }: `}</div>
              <div className="w-full">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {message.content}
                </Markdown>
              </div>
            </div>
            {/* Check if this is the last message and isLoading is true */}
            {index === messages.length - 1 && isLoading && (
              <div className="rounded-lg border-2 bg-slate-100 mt-5 py-5 px-4 flex justify-start">
                <div className="rounded-full bg-slate-300 animate-bounce w-2 h-2 mr-1" />
                <div className="rounded-full bg-slate-300 animate-bounce w-2 h-2 duration-75 mr-1" />
                <div className="rounded-full bg-slate-300 animate-bounce w-2 h-2 duration-100" />
                {/* Replace this with your preferred loading indicator */}
              </div>
            )}
          </>
        ))}
      </div>

      <div className="flex justify-center">
        <form
          onSubmit={handleSubmit}
          className="fixed bottom-0 p-2 mb-5 w-[60vw]"
        >
          <input
            ref={inputRef}
            value={input}
            placeholder="Send message..."
            onChange={handleInputChange}
            className="bg-zinc-100 w-full p-2"
            disabled={isLoading}
          />
        </form>
      </div>
    </div>
  );
}
