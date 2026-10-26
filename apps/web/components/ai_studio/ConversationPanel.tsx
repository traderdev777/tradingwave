"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChatMessage,
  ClarificationQuestion,
  StrategySpec,
} from "../../lib/api";
import {
  Sparkles,
  Send,
  RotateCcw,
  Copy,
  Check,
  HelpCircle,
  ArrowRight,
  Bot,
  User,
  Sliders,
} from "lucide-react";

interface ConversationPanelProps {
  messages: ChatMessage[];
  loading: boolean;
  onSendMessage: (prompt: string) => void;
  onApplyClarification: (question: ClarificationQuestion, selectedOption: string) => void;
  onResetConversation: () => void;
  aiProviderName: string;
}

const SUGGESTED_PROMPT_CHIPS = [
  "I want to build an ORB strategy for NIFTY",
  "Make the exit timeframe 1 minute and activate TSL after 20 points profit",
  "Build a BTST strategy on NIFTY with overnight holding",
  "Create a 5m candle close > ORB High and 15m RSI(14) > 50 entry rule",
  "Add a 1.5× ATR trailing stop loss and mandatory 15:15 IST square-off",
  "Review this strategy for repainting and lookahead bias",
];

export function ConversationPanel({
  messages,
  loading,
  onSendMessage,
  onApplyClarification,
  onResetConversation,
  aiProviderName,
}: ConversationPanelProps) {
  const [inputText, setInputText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || loading) return;
    onSendMessage(inputText);
    setInputText("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleCopyMessage(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
      {/* Panel Header */}
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg)]/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FF7722]/15 border border-[#FF7722]/30 flex items-center justify-center text-[#FF7722]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text)] tracking-tight">AI Strategy Assistant</h3>
            <span className="text-[10px] text-[var(--text-muted)] font-mono block">
              {aiProviderName}
            </span>
          </div>
        </div>

        <button
          onClick={onResetConversation}
          title="Reset conversation"
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/40 transition-colors text-xs flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="text-[11px] hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="p-3 border-b border-[var(--border)] bg-[var(--bg)]/20 overflow-x-auto">
        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block mb-1.5">
          Suggested Ideas:
        </span>
        <div className="flex gap-1.5 flex-nowrap pb-1">
          {SUGGESTED_PROMPT_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(chip)}
              disabled={loading}
              className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] hover:border-[#FF7722] hover:text-[#FF7722] text-[var(--text)] whitespace-nowrap transition-colors font-medium flex-shrink-0 disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FF7722]/10 border border-[#FF7722]/20 flex items-center justify-center text-[#FF7722]">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--text)]">Design Your Quantitative Alpha</h4>
              <p className="text-xs text-[var(--text-muted)] max-w-xs mt-1 leading-relaxed">
                Describe your rule concepts in plain English. The assistant will detect parameters, ask clarification questions, and compile a machine-readable specification.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={msg.id}
              className={`flex gap-3 text-xs ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-[#FF7722]/15 border border-[#FF7722]/30 flex items-center justify-center text-[#FF7722] flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 space-y-2.5 shadow-sm leading-relaxed ${
                  isUser
                    ? "bg-[#FF7722] text-white rounded-tr-none font-medium"
                    : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-tl-none"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Embedded Clarification Questions */}
                {msg.clarification_questions && msg.clarification_questions.length > 0 && (
                  <div className="pt-2 border-t border-[var(--border)] space-y-2 mt-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#FF7722]">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Targeted Clarification Required:</span>
                    </div>

                    {msg.clarification_questions.map((q) => (
                      <div
                        key={q.id}
                        className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FF7722]/15 text-[#FF7722] font-semibold">
                            {q.category}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] italic">
                            Default: {q.suggested_default}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-[var(--text)]">{q.question}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{q.explanation}</p>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {q.options.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              onClick={() => onApplyClarification(q, opt)}
                              className="text-[10px] font-semibold px-2 py-1 rounded-md bg-[var(--bg)] border border-[var(--border)] hover:border-[#FF7722] hover:text-[#FF7722] transition-colors flex items-center gap-1"
                            >
                              <span>{opt}</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message Footer / Copy */}
                <div
                  className={`flex items-center justify-between pt-1 text-[9px] ${
                    isUser ? "text-white/80" : "text-[var(--text-muted)]"
                  }`}
                >
                  <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : "Just now"}</span>
                  {!isUser && (
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="hover:underline flex items-center gap-1"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-emerald-500" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] flex-shrink-0 mt-0.5 font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-3 text-xs items-center text-[var(--text-muted)]">
            <div className="w-7 h-7 rounded-lg bg-[#FF7722]/15 border border-[#FF7722]/30 flex items-center justify-center text-[#FF7722]">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="p-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-[#FF7722] border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] font-mono">Synthesizing deterministic rules...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Prompt Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[var(--border)] bg-[var(--bg)]/50">
        <div className="relative">
          <textarea
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your strategy idea (e.g. 'Build an intraday NIFTY 15m breakout with 1.5% target and 0.5% stop loss')..."
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 pr-12 text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#FF7722] focus:ring-1 focus:ring-[#FF7722] resize-none transition-all"
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            title="Send (Enter)"
            className="absolute right-2.5 bottom-3.5 p-2 rounded-lg bg-[#FF7722] hover:bg-[#E65A00] text-white disabled:opacity-40 transition-all shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mt-1 px-1">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>Zero LLM code execution on server</span>
        </div>
      </form>
    </div>
  );
}
