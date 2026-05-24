"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, ChevronDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";

const LOGO_URL = "/manus-storage/saigonexpresslogo_clean_719f26ac.png";

const QUICK_REPLIES = [
  "What's on the menu?",
  "Where are your stores?",
  "Do you offer catering?",
  "Halal options?",
  "Franchise info",
];

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function FloatingWidgets() {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Xin chào! 👋 Welcome to Saigon Express Tasmania. How can I help you today? Ask me about our menu, store locations, catering, wholesale, or franchise opportunities!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = trpc.public.chat.useMutation();

  useEffect(() => {
    if (chatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, chatOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    try {
      const result = await chatMutation.mutateAsync({
        messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
      });
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: result.content ?? "" },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I'm having trouble connecting right now. Please call us on 0416 036 016 or email info@saigonexpress.com.au.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Facebook Messenger Button */}
      <a
        href="https://m.me/saigonexpresstasmania"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-[7.5rem] right-5 z-50 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        style={{ background: "linear-gradient(135deg, #0084ff 0%, #00c6ff 100%)", width: 52, height: 52 }}
        title="Message us on Facebook"
        aria-label="Message Saigon Express on Facebook"
      >
        <svg viewBox="0 0 24 24" fill="white" width="26" height="26">
          <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.879 1.436 5.449 3.686 7.133V22l3.371-1.853c.9.25 1.854.386 2.943.386 5.523 0 10-4.145 10-9.243S17.523 2 12 2zm1.018 12.436l-2.55-2.72-4.976 2.72 5.474-5.808 2.612 2.72 4.914-2.72-5.474 5.808z"/>
        </svg>
      </a>

      {/* Chat Widget — pill button "Chat with SG ✨" */}
      <AnimatePresence mode="wait">
        {!chatOpen ? (
          <motion.button
            key="pill-btn"
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={() => setChatOpen(true)}
            className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 select-none"
            style={{ background: "oklch(40% 0.18 25)", animation: "chat-pulse 2.5s ease-in-out infinite" }}
            aria-label="Chat with Saigon Express"
          >
            {/* Chat bubble icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 shrink-0">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-white font-bold text-base whitespace-nowrap tracking-wide">
              Chat With Us
            </span>
          </motion.button>
        ) : (
          <motion.button
            key="close-btn"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            onClick={() => setChatOpen(false)}
            className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: "oklch(40% 0.18 25)" }}
            aria-label="Close chat"
          >
            <X className="w-6 h-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-[5.5rem] right-5 z-50 w-[360px] max-w-[calc(100vw-2.5rem)] rounded-2xl shadow-2xl overflow-hidden border border-border flex flex-col"
            style={{ height: "520px", background: "oklch(99% 0.003 80)" }}
          >
            {/* Header */}
            <div className="p-4 flex items-center gap-3 shrink-0" style={{ background: "oklch(40% 0.18 25)" }}>
              <img loading="eager" src={LOGO_URL} alt="Saigon Express" className="h-9 w-auto object-contain" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm">Saigon Express Tasmania</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse"></span>
                  <span className="text-white/60 text-xs">AI Assistant · Online now</span>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-white/60 hover:text-white transition-colors">
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: "oklch(98% 0.005 80)" }}>
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 overflow-hidden" style={{ background: "oklch(40% 0.18 25)" }}>
                      <img src={LOGO_URL} alt="SE" className="w-6 h-6 object-contain" />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "text-white rounded-tr-sm"
                      : "bg-white border border-border text-foreground rounded-tl-sm"
                  }`} style={msg.role === "user" ? { background: "oklch(40% 0.18 25)" } : {}}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "oklch(40% 0.18 25)" }}>
                    <img src={LOGO_URL} alt="SE" className="w-6 h-6 object-contain" />
                  </div>
                  <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1 items-center">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies — only show at start */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2 pt-1 flex gap-2 overflow-x-auto scrollbar-hide shrink-0 border-t border-border/40">
                {QUICK_REPLIES.map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="shrink-0 px-3 py-1.5 rounded-full border border-border bg-white text-xs text-foreground hover:border-primary/50 hover:text-primary transition-colors whitespace-nowrap">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-white flex gap-2 shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a message..."
                disabled={isTyping}
                className="flex-1 px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 bg-background disabled:opacity-50"
              />
              <button type="submit" disabled={!input.trim() || isTyping}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40"
                style={{ background: "oklch(40% 0.18 25)" }}>
                {isTyping ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
