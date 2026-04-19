import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  message: ChatMessage;
  isStreaming?: boolean;
}

export const MessageBubble = ({ message, isStreaming }: Props) => {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex w-full gap-2.5 animate-float-up", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft">
          <Heart className="h-4 w-4" strokeWidth={2.5} />
        </span>
      )}

      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-soft sm:max-w-[75%]",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-card text-card-foreground border border-border/60",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div
            className={cn(
              "prose prose-sm max-w-none break-words",
              "prose-p:my-2 prose-p:leading-relaxed",
              "prose-strong:text-foreground prose-strong:font-semibold",
              "prose-ul:my-2 prose-li:my-0.5",
              "prose-a:text-primary prose-a:underline",
            )}
          >
            {message.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            ) : isStreaming ? (
              <TypingDots />
            ) : null}
            {isStreaming && message.content && (
              <span className="ml-0.5 inline-block h-4 w-0.5 -mb-0.5 animate-pulse bg-primary align-middle" />
            )}
          </div>
        )}
      </div>

      {isUser && (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground shadow-soft">
          <User className="h-4 w-4" />
        </span>
      )}
    </div>
  );
};

const TypingDots = () => (
  <span className="inline-flex items-center gap-1 py-1" aria-label="Aidly is typing">
    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
  </span>
);
