import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  userId: string;
  username: string;
  text: string;
  timestamp: number;
  isSystem: boolean;
}

interface ChatProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSend: (text: string) => void;
}

export default function Chat({ messages, currentUserId, onSend }: ChatProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-700">
      <div className="px-3 py-2 bg-neutral-800 border-b border-neutral-700">
        <span className="text-xs text-neutral-400">chat</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.isSystem ? (
              <p className="text-xs text-neutral-500 text-center">{msg.text}</p>
            ) : (
              <div
                className={`flex flex-col ${msg.userId === currentUserId ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-xs text-neutral-500">
                    {msg.userId === currentUserId ? "you" : msg.username}
                  </span>
                  <span className="text-xs text-neutral-600">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div
                  className={`text-sm px-3 py-1.5 rounded-lg max-w-xs wrap-break-word ${
                    msg.userId === currentUserId
                      ? "bg-blue-600 text-white"
                      : "bg-neutral-700 text-neutral-100"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-neutral-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="message..."
            maxLength={500}
            className="flex-1 text-sm bg-neutral-800 text-white border border-neutral-600 rounded px-3 py-1.5 focus:outline-none focus:border-neutral-400 placeholder-neutral-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded"
          >
            send
          </button>
        </div>
      </div>
    </div>
  );
}
