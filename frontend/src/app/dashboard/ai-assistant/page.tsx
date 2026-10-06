"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./chat.module.css";
import { Bot, Send } from "lucide-react";
import { authenticatedSupabaseFetch } from "../../../lib/supabaseAuth";

type Message = { id: string; role: "user" | "ai"; content: string; timestamp: string };
type Stored = { role: "user" | "model"; content: string; created_at: string };

const GREETING: Message = {
  id: "greeting",
  role: "ai",
  content: "Hello! I'm your Hanbee AI Mentor. Ask me about your courses, RC racing basics, or how to use HanbeeLms.",
  timestamp: "",
};

const PROMPTS = [
  "Explain my last lap time",
  "Suggest a training routine",
  "How do I tune my suspension?",
  "What are the best tires for carpet?",
];

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    authenticatedSupabaseFetch<{ history: Stored[] }>("/functions/v1/ai-assistant", { method: "GET" })
      .then((result) => {
        if (!result.history?.length) return;
        setMessages([
          GREETING,
          ...result.history.map((m, i) => ({
            id: `h${i}`,
            role: (m.role === "model" ? "ai" : "user") as "ai" | "user",
            content: m.content,
            timestamp: time(m.created_at),
          })),
        ]);
      })
      .catch(() => { /* a fresh greeting is an acceptable fallback */ })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || isTyping) return;
    const history = messages
      .filter((m) => m.id !== GREETING.id)
      .map((m) => ({ role: m.role === "ai" ? "model" : "user", content: m.content }));
    setMessages((current) => [...current, { id: `u${Date.now()}`, role: "user", content: prompt, timestamp: time(new Date().toISOString()) }]);
    setInputValue("");
    setIsTyping(true);
    setError("");
    try {
      const result = await authenticatedSupabaseFetch<{ reply: string }>("/functions/v1/ai-assistant", {
        method: "POST",
        body: JSON.stringify({ message: prompt, history }),
      });
      setMessages((current) => [...current, { id: `a${Date.now()}`, role: "ai", content: result.reply, timestamp: time(new Date().toISOString()) }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The AI assistant couldn't respond. Please try again.");
    } finally {
      setIsTyping(false);
    }
  }

  async function newConversation() {
    setError("");
    try {
      await authenticatedSupabaseFetch("/functions/v1/ai-assistant", { method: "DELETE" });
      setMessages([GREETING]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't clear the conversation.");
    }
  }

  return (
    <div className={styles.chatContainer}>
      <header className={styles.chatHeader}>
        <div className={styles.avatar}><Bot size={24} /></div>
        <div className={styles.headerInfo}>
          <h2>Hanbee AI Mentor</h2>
          <p>Always here to help you learn beyond the obvious</p>
        </div>
        <button type="button" className={styles.promptChip} onClick={() => void newConversation()} disabled={messages.length <= 1 || isTyping}>
          New conversation
        </button>
      </header>

      <div className={styles.chatHistory}>
        {loading && <p role="status" style={{ padding: "8px 20px", opacity: 0.6 }}>Loading your conversation…</p>}
        {messages.map((msg) => (
          <div key={msg.id} className={`${styles.messageWrapper} ${styles[msg.role]}`}>
            <div className={`${styles.message} ${styles[msg.role]}`}>{msg.content}</div>
            {msg.timestamp && <div className={styles.timestamp}>{msg.timestamp}</div>}
          </div>
        ))}
        {isTyping && (
          <div className={`${styles.messageWrapper} ${styles.ai}`}>
            <div className={`${styles.message} ${styles.ai}`}>
              <div className={styles.typingIndicator}>
                <div className={styles.dot}></div>
                <div className={styles.dot}></div>
                <div className={styles.dot}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <p role="alert" style={{ padding: "8px 20px" }}>{error}</p>}

      <div className={styles.suggestedPrompts}>
        {PROMPTS.map((prompt) => (
          <button key={prompt} type="button" className={styles.promptChip} onClick={() => void send(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <div className={styles.inputArea}>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            className={styles.input}
            maxLength={2000}
            placeholder="Ask your mentor anything..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(inputValue); } }}
          />
          <button type="button" className={styles.sendBtn} onClick={() => void send(inputValue)} disabled={!inputValue.trim() || isTyping} aria-label="Send message">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
