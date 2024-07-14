import { useChat } from "ai/react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents = {
  // Styling a paragraph
  p: ({ node }: { node: any }, ...props: any) => (
    <p className="text-base text-gray-800 mb-4 mt-2" {...props} />
  ),
  // Styling headings
  h1: ({ node }: { node: any } & React.HTMLAttributes<HTMLHeadingElement>, ...props: any) => (
    <h1 className="text-2xl font-bold text-gray-900 my-4" {...props} />
  ),
  h2: ({ node }: { node: any }, ...props: any) => (
    <h2 className="text-xl font-semibold text-gray-800 my-3" {...props} />
  ),
  // Style for ordered lists
  ol: ({ node }: { node: any }, ...props: any) => (
    <ol className="list-decimal list-inside space-y-2 pl-4 my-2" {...props} />
  ),
   // Style for unordered lists
   ul: ({ node }: { node: any }, ...props: any) => (
    <ul className="list-disc list-inside space-y-2 pl-4" {...props} />
  ),
  // Style for list items
  li: ({ node }: { node: any }, ...props: any) => (
    <li className="text-base text-gray-700 m-2" {...props} />
  ),
  // Add more custom components as needed
};

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
    });

  return (
    <div className="w-[60vw] mx-auto h-[90vh] overflow-y-scroll">
      <div className="p-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className="rounded-lg border-2 border-slate-200 mt-5 py-2 px-4"
          >
            <div className="w-24 text-zinc-500">{`${message.role}: `}</div>
            <div className="w-full">
              <Markdown
                remarkPlugins={[remarkGfm]}
                //@ts-expect-error
                components={markdownComponents}
                className="prose"
              >
                {message.content}
              </Markdown>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <form
          onSubmit={handleSubmit}
          className="fixed bottom-0 p-2 mb-5 w-[60vw]"
        >
          <input
            autoFocus
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
