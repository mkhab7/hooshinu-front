"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Globe,
  Brain,
  Square,
  Sparkles,
  ImagePlus,
  X,
  User,
  MessageSquarePlus,
} from "lucide-react";
import { useModelsByCategory } from "@/features/models/hooks";
import { streamChatCompletion } from "@/lib/sse";
import { useMe } from "@/features/profile/hooks";
import { useQueryClient } from "@tanstack/react-query";
import type {
  ChatCompletionMessage,
  ReasoningEffort,
  ChatContentPart,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

type UIMessage = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
};

export default function ChatPage() {
  const { data: textModels, isLoading } = useModelsByCategory("text");
  const toast = useToast();
  const qc = useQueryClient();
  const { data: me } = useMe();

  const [model, setModel] = useState<string>("");
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageField, setShowImageField] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [reasoning, setReasoning] = useState<ReasoningEffort | "">("");
  const [streaming, setStreaming] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Default to the first unlocked text model.
  useEffect(() => {
    if (!model && textModels && textModels.length) {
      const firstUnlocked = textModels.find((m) => !m.locked) ?? textModels[0];
      setModel(firstUnlocked.id);
    }
  }, [textModels, model]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streaming]);

  function buildApiMessages(history: UIMessage[]): ChatCompletionMessage[] {
    return history.map((m) => {
      if (m.role === "user" && m.imageUrl) {
        const parts: ChatContentPart[] = [
          { type: "text", text: m.content },
          { type: "image_url", image_url: { url: m.imageUrl } },
        ];
        return { role: "user", content: parts };
      }
      return { role: m.role, content: m.content };
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming || !model) return;

    const userMsg: UIMessage = {
      role: "user",
      content: text,
      imageUrl: imageUrl.trim() || undefined,
    };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setImageUrl("");
    setShowImageField(false);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    await streamChatCompletion(
      {
        model,
        messages: buildApiMessages(history),
        ...(webSearch ? { web_search: true } : {}),
        ...(reasoning ? { reasoning_effort: reasoning } : {}),
      },
      {
        onDelta: (delta) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant")
              next[next.length - 1] = {
                ...last,
                content: last.content + delta,
              };
            return next;
          });
        },
        onDone: () => {
          setStreaming(false);
          abortRef.current = null;
          // Reply consumed credits — refresh wallet/profile.
          qc.invalidateQueries({ queryKey: ["wallet"] });
          qc.invalidateQueries({ queryKey: ["me"] });
        },
        onError: (err) => {
          setStreaming(false);
          abortRef.current = null;
          toast.error(err.message);
          // Drop the empty assistant bubble if nothing streamed.
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last.content === "")
              return prev.slice(0, -1);
            return prev;
          });
        },
      },
      controller.signal
    );
  }

  function stop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }

  function newChat() {
    stop();
    setMessages([]);
  }

  return (
    <div className="flex h-[calc(100vh-3.75rem)] flex-col md:h-screen">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white/60 px-4 py-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-surface-1/50">
        <Select
          value={model}
          onChange={setModel}
          disabled={isLoading}
          className="max-w-xs"
          placeholder={isLoading ? "در حال بارگذاری…" : "انتخاب مدل"}
          options={(textModels ?? []).map((m) => ({
            value: m.id,
            label: m.name,
            disabled: m.locked,
            hint: m.locked ? "نیازمند ارتقای پلن" : undefined,
          }))}
        />
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={newChat}>
          <MessageSquarePlus className="size-4" />
          گفتگوی جدید
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="animate-blob mb-5 flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-400 to-violet-600 text-white shadow-2xl shadow-brand-600/40">
                <Sparkles className="size-10" />
              </div>
              <h2 className="text-2xl font-bold">گفتگو را شروع کنید</h2>
              <p className="mt-2 max-w-md text-sm text-gray-500">
                سؤالتان را بنویسید. تاریخچهٔ این گفتگو به‌صورت محلی نگه داشته
                می‌شود (حالت استریم، بدون ذخیره روی سرور).
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m, i) => (
                <MessageBubble
                  key={i}
                  msg={m}
                  streaming={
                    streaming &&
                    i === messages.length - 1 &&
                    m.role === "assistant"
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-gray-200 bg-white/60 px-4 py-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-surface-1/50">
        <div className="mx-auto max-w-3xl space-y-2.5">
          {showImageField && (
            <div className="animate-fade-in flex items-center gap-2">
              <input
                dir="ltr"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://.../image.jpg"
                className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
              />
              <button
                onClick={() => {
                  setShowImageField(false);
                  setImageUrl("");
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10"
              >
                <X className="size-5" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 rounded-2xl border border-gray-300 bg-white p-2 shadow-sm transition-colors focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-white/10 dark:bg-white/[0.04]">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="پیام خود را بنویسید…"
              className="max-h-40 min-h-[2.5rem] flex-1 border-0 bg-transparent focus:ring-0 dark:bg-transparent"
              maxLength={8000}
            />
            {streaming ? (
              <Button
                variant="danger"
                size="md"
                onClick={stop}
                className="shrink-0"
              >
                <Square className="size-4" />
                توقف
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={send}
                disabled={!input.trim() || !model}
                className="shrink-0"
                aria-label="ارسال"
              >
                <Send className="size-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Toggle
              active={webSearch}
              onClick={() => setWebSearch((v) => !v)}
              icon={<Globe className="size-4" />}
              label="جستجوی وب"
            />
            <Toggle
              active={showImageField}
              onClick={() => setShowImageField((v) => !v)}
              icon={<ImagePlus className="size-4" />}
              label="تصویر"
            />
            <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 dark:border-white/[0.06] dark:bg-white/[0.04]">
              <Brain className="size-4 text-gray-400" />
              <select
                value={reasoning}
                onChange={(e) =>
                  setReasoning(e.target.value as ReasoningEffort | "")
                }
                className="cursor-pointer bg-transparent text-xs font-medium outline-none dark:[&>option]:bg-surface-3"
              >
                <option value="">استدلال: پیش‌فرض</option>
                <option value="low">کم</option>
                <option value="medium">متوسط</option>
                <option value="high">زیاد</option>
                <option value="xhigh">خیلی زیاد</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all active:scale-95",
        active
          ? "border-brand-500 bg-brand-500/15 text-brand-600 dark:text-brand-300"
          : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-white/[0.06] dark:bg-white/[0.04] dark:text-gray-300 dark:hover:bg-white/10"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function MessageBubble({
  msg,
  streaming,
}: {
  msg: UIMessage;
  streaming: boolean;
}) {
  const isUser = msg.role === "user";
  return (
    <div
      className={cn("animate-fade-in flex gap-3", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-xl shadow-sm",
          isUser
            ? "bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-300"
            : "bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-brand-600/30"
        )}
      >
        {isUser ? <User className="size-4" /> : <Sparkles className="size-4" />}
      </div>
      <div
        className={cn(
          "min-w-0 max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-brand-600/20"
            : "border border-gray-200/60 bg-white text-gray-900 dark:border-white/[0.06] dark:bg-white/[0.04] dark:text-gray-100"
        )}
      >
        {msg.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={msg.imageUrl}
            alt="پیوست تصویر"
            className="mb-2 max-h-60 rounded-lg"
          />
        )}
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : msg.content ? (
          <div className="prose-chat">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        ) : streaming ? (
          <Spinner className="size-4 text-gray-400" />
        ) : null}
      </div>
    </div>
  );
}
