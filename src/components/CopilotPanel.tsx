"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, X, Loader2, MessageSquare, ChevronDown, ThumbsUp, ThumbsDown, BookOpen, Mic, MicOff, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  entities_cited?: { id: string; title: string; type: string }[];
  entities_retrieved?: { id: string; title: string; type: string }[];
  timestamp: Date;
  feedback?: "positive" | "negative" | null;
  is_mock?: boolean;
}

interface CopilotPanelProps {
  jurisdiction?: string;
  buildingType?: string;
  projectContext?: Record<string, unknown>;
}

export default function CopilotPanel({ jurisdiction, buildingType, projectContext }: CopilotPanelProps) {
  const { canUseAI, aiQueriesUsedToday, tier, incrementAIQuery, upgrade } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check for Web Speech API support
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SR);
  }, []);

  const toggleVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);

      // If final result, auto-focus the input
      if (event.results[event.results.length - 1].isFinal) {
        setIsListening(false);
        inputRef.current?.focus();
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamText, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = async () => {
    const q = input.trim();
    if (!q || streaming) return;

    // Rate limit check
    if (!canUseAI) {
      const limitMsg: Message = {
        id: `limit-${Date.now()}`,
        role: "assistant",
        content: `You've used ${aiQueriesUsedToday} of ${tier.limits.aiQueriesPerDay} AI queries today on the ${tier.name} plan. Upgrade to Pro ($49/mo) for unlimited queries.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", content: q, timestamp: new Date() }, limitMsg]);
      setInput("");
      return;
    }

    incrementAIQuery();

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: q,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setStreamText("");

    try {
      const res = await fetch("/api/v1/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          jurisdiction,
          lane: typeof window !== "undefined" ? localStorage.getItem("bkg-lane") : undefined,
          project_context: projectContext,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream reader");

      const decoder = new TextDecoder();
      let fullText = "";
      let meta: { entities_retrieved?: { id: string; title: string; type: string }[] } | null = null;
      let doneData: { entities_cited?: string[]; _mock?: boolean } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "meta") {
              meta = data;
            } else if (data.type === "chunk") {
              fullText += data.text;
              setStreamText(fullText);
            } else if (data.type === "done") {
              doneData = data;
            } else if (data.type === "error") {
              fullText += `\n\n⚠️ Error: ${data.message}`;
              setStreamText(fullText);
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }

      // Create final assistant message
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: fullText,
        entities_retrieved: meta?.entities_retrieved,
        entities_cited: meta?.entities_retrieved?.filter((e) =>
          doneData?.entities_cited?.includes(e.id)
        ),
        timestamp: new Date(),
        is_mock: doneData?._mock ?? false,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }

    setStreaming(false);
    setStreamText("");
  };

  const handleFeedback = (msgId: string, feedback: "positive" | "negative") => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback } : m))
    );
    // RSI Loop 5: Log feedback signal
    // In production, POST to /api/v1/copilot/feedback
    console.log("[RSI Loop 5] Feedback:", { msgId, feedback });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format message content — convert entity citations to styled spans
  const formatContent = (text: string) => {
    // Replace [Title](entity:N) with styled citation badges
    const parts = text.split(/(\[[^\]]+\]\(entity:\d+\))/g);
    return parts.map((part, i) => {
      const match = part.match(/\[([^\]]+)\]\(entity:(\d+)\)/);
      if (match) {
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-help"
            style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
            title={`Knowledge Entity: ${match[1]}`}
          >
            <BookOpen size={10} />
            {match[1]}
          </span>
        );
      }
      // Handle markdown bold
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bp, j) => {
        if (bp.startsWith("**") && bp.endsWith("**")) {
          return <strong key={`${i}-${j}`}>{bp.slice(2, -2)}</strong>;
        }
        return <span key={`${i}-${j}`}>{bp}</span>;
      });
    });
  };

  // Suggested questions based on context
  const suggestions = [
    buildingType
      ? `What codes apply to ${buildingType} construction?`
      : "What are the fire exit requirements for a 10-story office?",
    "What fall protection is required for roof work?",
    jurisdiction
      ? `What permits do I need in ${jurisdiction}?`
      : "What permits do I need for a commercial buildout?",
    "Compare CLT vs steel framing for mid-rise construction",
  ];

  // Floating action button when closed
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-110 z-50"
        style={{
          background: "linear-gradient(135deg, #1D9E75, #0F6E56)",
          boxShadow: "0 4px 20px rgba(29, 158, 117, 0.4)",
        }}
      >
        <Sparkles size={22} />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-0 right-0 w-full sm:w-[420px] sm:bottom-6 sm:right-6 flex flex-col z-50 sm:rounded-2xl overflow-hidden"
      style={{
        height: "min(85vh, 640px)",
        background: "var(--bg)",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{ background: "linear-gradient(135deg, #1D9E75, #0F6E56)" }}
          >
            <Sparkles size={16} />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">AI Construction Copilot</div>
            <div className="text-[10px]" style={{ color: "var(--fg-tertiary)" }}>
              40K+ entities · 142+ jurisdictions · cited answers
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
            style={{ color: "var(--fg-tertiary)" }}
          >
            <ChevronDown size={16} />
          </button>
          <button
            onClick={() => { setOpen(false); setMessages([]); setStreamText(""); }}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
            style={{ color: "var(--fg-tertiary)" }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollBehavior: "smooth" }}>
        {messages.length === 0 && !streaming ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "var(--accent-bg)" }}
            >
              <MessageSquare size={24} style={{ color: "var(--accent)" }} />
            </div>
            <div className="text-sm font-medium mb-1">Ask me anything about construction</div>
            <div className="text-[11px] mb-6" style={{ color: "var(--fg-tertiary)" }}>
              Codes, materials, methods, safety, permits — any jurisdiction, any building type
            </div>
            <div className="w-full space-y-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(s);
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-[11px] transition-all hover:scale-[1.01]"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    color: "var(--fg-secondary)",
                  }}
                >
                  <span style={{ color: "var(--accent)" }}>→</span> {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-3 ${msg.role === "user" ? "flex justify-end" : ""}`}
              >
                {msg.role === "user" ? (
                  <div
                    className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-br-md text-sm"
                    style={{ background: "var(--accent)", color: "#222" }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[95%]">
                    {/* Entity badges */}
                    {msg.entities_cited && msg.entities_cited.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {msg.entities_cited.map((e) => (
                          <span
                            key={e.id}
                            className="text-[9px] px-2 py-0.5 rounded-full"
                            style={{
                              background: "var(--accent-bg)",
                              color: "var(--accent)",
                            }}
                          >
                            {e.type === "code_section" ? "📋" : e.type === "safety_rule" ? "⚠️" : "📦"}{" "}
                            {e.title.length > 30 ? e.title.slice(0, 30) + "…" : e.title}
                          </span>
                        ))}
                      </div>
                    )}
                    <div
                      className="px-3.5 py-2.5 rounded-2xl rounded-bl-md text-[13px] leading-relaxed whitespace-pre-wrap"
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {formatContent(msg.content)}
                    </div>
                    {/* Feedback buttons */}
                    <div className="flex items-center gap-2 mt-1.5 ml-1">
                      <button
                        onClick={() => handleFeedback(msg.id, "positive")}
                        className="p-1 rounded transition-colors"
                        style={{
                          color: msg.feedback === "positive" ? "var(--accent)" : "var(--fg-tertiary)",
                          background: msg.feedback === "positive" ? "var(--accent-bg)" : "transparent",
                        }}
                      >
                        <ThumbsUp size={12} />
                      </button>
                      <button
                        onClick={() => handleFeedback(msg.id, "negative")}
                        className="p-1 rounded transition-colors"
                        style={{
                          color: msg.feedback === "negative" ? "var(--danger)" : "var(--fg-tertiary)",
                          background: msg.feedback === "negative" ? "#fecaca" : "transparent",
                        }}
                      >
                        <ThumbsDown size={12} />
                      </button>
                      {msg.is_mock && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: "var(--fg-tertiary)", background: "var(--bg-tertiary)" }}>
                          mock response
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Streaming indicator */}
            {streaming && (
              <div className="mb-3">
                <div
                  className="px-3.5 py-2.5 rounded-2xl rounded-bl-md text-[13px] leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {streamText ? (
                    formatContent(streamText)
                  ) : (
                    <span className="flex items-center gap-2" style={{ color: "var(--fg-tertiary)" }}>
                      <Loader2 size={14} className="animate-spin" />
                      Searching knowledge base...
                    </span>
                  )}
                  <span className="inline-block w-0.5 h-4 ml-0.5 animate-pulse" style={{ background: "var(--accent)" }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t" style={{ borderColor: "var(--border)" }}>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Ask about codes, materials, safety..."}
            disabled={streaming}
            className="flex-1 bg-transparent text-sm outline-none placeholder-opacity-50"
            style={{ color: "var(--fg)" }}
          />
          {voiceSupported && (
            <button
              onClick={toggleVoice}
              disabled={streaming}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{
                background: isListening ? "#dc3545" : "var(--bg-tertiary)",
                color: isListening ? "#fff" : "var(--fg-tertiary)",
                cursor: streaming ? "default" : "pointer",
                animation: isListening ? "pulse 1.5s infinite" : "none",
              }}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          )}
          <button
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: input.trim() && !streaming ? "var(--accent)" : "var(--bg-tertiary)",
              color: input.trim() && !streaming ? "#fff" : "var(--fg-tertiary)",
              cursor: input.trim() && !streaming ? "pointer" : "default",
            }}
          >
            {streaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <div className="text-center mt-2 text-[9px]" style={{ color: "var(--fg-tertiary)" }}>
          Powered by 40,000+ knowledge entities · Voice or text · Always verify safety-critical info
        </div>
      </div>
    </div>
  );
}
