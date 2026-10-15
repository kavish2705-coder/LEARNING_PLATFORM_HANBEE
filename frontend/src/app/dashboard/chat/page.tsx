"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "./chat.module.css";
import { Send, Search, Radio, Sparkles, Zap, Wrench, Flag, ChevronLeft } from "lucide-react";
import {
  fetchChatContacts,
  fetchChatConversations,
  fetchChatMessages,
  markChatRead,
  sendChatMessage,
  startDirectConversation,
  CHAT_MESSAGE_PAGE_SIZE,
  type ChatContact,
} from "../../../lib/messagingApi";
import { readStoredSession } from "../../../lib/supabaseAuth";
import { getRealtimeClient } from "../../../lib/realtime";
import { fetchChatReadReceipts } from "../../../lib/messagingApi";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";

function dayKey(value: string) {
  return new Date(value).toDateString();
}

function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

const MOCK_CONVERSATIONS = [
  {
    id: "mock-squad-apex",
    title: "Team Redline Apex",
    kind: "group" as const,
    last_body: "Rohan: Motor RPM calibrated. Let's do a fast stint! ⚡",
    unread_count: 2,
    participant_count: 4,
    other_user_id: null,
    other_full_name: null,
    other_role: null,
  },
  {
    id: "mock-pit-control",
    title: "Track Pit Control & Marshals",
    kind: "group" as const,
    last_body: "Race Control: Transponder frequencies synced on Ch 4.",
    unread_count: 0,
    participant_count: 12,
    other_user_id: null,
    other_full_name: null,
    other_role: null,
  },
  {
    id: "mock-ai-assistant",
    title: "Hanbee AI Pit Strategist",
    kind: "direct" as const,
    last_body: "AI: Sector 2 apex delta is -0.14s. Ready for telemetry query.",
    unread_count: 0,
    participant_count: 2,
    other_user_id: "ai-bot",
    other_full_name: "Hanbee AI Pit Strategist",
    other_role: "staff",
  },
];

export default function ChatPage() {
  const [currentUserId, setCurrentUserId] = useState("");
  const [activeConversationId, setActiveConversationId] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: profile } = useSessionProfile();
  const myRole = profile?.role;
  const effectiveUserId = profile?.id ?? readStoredSession()?.user?.id ?? currentUserId;

  useEffect(() => { 
    const stored = readStoredSession()?.user?.id;
    if (stored) setCurrentUserId(stored);
    else if (profile?.id) setCurrentUserId(profile.id);
    else setCurrentUserId("user-self");
  }, [profile?.id]);

  const { data: rawConversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: fetchChatConversations,
  });
  const { data: contacts } = useQuery({ queryKey: ["chat-contacts"], queryFn: fetchChatContacts });

  // Use backend conversations if any exist; otherwise fallback to rich interactive race channels
  const conversations = (rawConversations && rawConversations.length > 0)
    ? rawConversations
    : MOCK_CONVERSATIONS;

  const isMockActive = activeConversationId.startsWith("mock-");

  // Local interactive message history for simulated channels
  const [mockMessages, setMockMessages] = useState<Record<string, Array<{
    id: string;
    sender_id: string;
    sender_name: string;
    body: string;
    created_at: string;
    kind?: string;
  }>>>({
    "mock-squad-apex": [
      { id: "m1", sender_id: "rohan", sender_name: "Rohan Varma", body: "Hey team! All 4 wheels and steering trim inspected on our Redline Buggy.", created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
      { id: "m2", sender_id: "aarav", sender_name: "Aarav Patel", body: "LiPo battery pack #2 is charged to 8.38V in the safe bag. Ready to roll!", created_at: new Date(Date.now() - 3600000).toISOString() },
      { id: "m3", sender_id: "rohan", sender_name: "Rohan Varma", body: "Motor RPM calibrated. Let's do a fast stint! ⚡", created_at: new Date(Date.now() - 1800000).toISOString() },
    ],
    "mock-pit-control": [
      { id: "p1", sender_id: "marshal", sender_name: "Race Control", body: "Scrutineering opened for Championship Group A. Bring cars to Bay 3.", created_at: new Date(Date.now() - 7200000).toISOString() },
      { id: "p2", sender_id: "marshal", sender_name: "Race Control", body: "Transponder frequencies synced on Ch 4. Pre-grid in 15 minutes.", created_at: new Date(Date.now() - 3600000).toISOString() },
    ],
    "mock-ai-assistant": [
      { id: "a1", sender_id: "ai", sender_name: "Hanbee AI", body: "Hello Driver! I am your AI Pit Strategist. Ask me about tire trim, battery limits, or sector delta times.", created_at: new Date(Date.now() - 7200000).toISOString() },
    ],
  });

  // Pick default conversation
  useEffect(() => {
    if (activeConversationId || !conversations.length) return;
    const requestedId = new URLSearchParams(window.location.search).get("conversation");
    const requested = requestedId ? conversations.find((row) => row.id === requestedId) : undefined;
    setActiveConversationId(requested?.id ?? conversations[0]?.id ?? "");
  }, [conversations, activeConversationId]);

  const messagesQuery = useInfiniteQuery({
    queryKey: ["chat-messages", activeConversationId],
    queryFn: ({ pageParam }: { pageParam?: string }) => fetchChatMessages(activeConversationId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.length === CHAT_MESSAGE_PAGE_SIZE ? lastPage[0].created_at : undefined),
    enabled: Boolean(activeConversationId) && !isMockActive,
  });

  const dbMessages = [...(messagesQuery.data?.pages ?? [])].reverse().flat();
  const currentMockList = mockMessages[activeConversationId] || [];

  const messages = isMockActive ? currentMockList : dbMessages;

  const { data: receipts } = useQuery({
    queryKey: ["chat-receipts", activeConversationId],
    queryFn: () => fetchChatReadReceipts(activeConversationId),
    enabled: Boolean(activeConversationId) && !isMockActive,
  });

  useEffect(() => {
    if (!activeConversationId || isMockActive) return;
    const channel = getRealtimeClient()
      .channel(`chat-${activeConversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConversationId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["chat-messages", activeConversationId] });
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_participants", filter: `conversation_id=eq.${activeConversationId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["chat-receipts", activeConversationId] });
      })
      .subscribe();
    return () => {
      void getRealtimeClient().removeChannel(channel);
    };
  }, [activeConversationId, queryClient, isMockActive]);

  const markRead = useMutation({
    mutationFn: markChatRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-conversations"] }),
  });
  useEffect(() => {
    if (activeConversationId && !isMockActive) markRead.mutate(activeConversationId);
  }, [activeConversationId, isMockActive]);

  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [activeConversationId, messages.length, isTyping]);

  const openContact = useMutation({
    mutationFn: startDirectConversation,
    onSuccess: async (conversationId) => {
      await queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      setActiveConversationId(conversationId);
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "You can't start a conversation with this person."),
  });

  const sendMessage = useMutation({
    mutationFn: (body: string) => sendChatMessage(activeConversationId, body),
    onSuccess: () => {
      setInputValue("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "We couldn't send your message."),
  });

  function handleSend(customText?: string) {
    const body = (customText ?? inputValue).trim();
    if (!body || !activeConversationId) return;
    setError("");

    if (!isMockActive) {
      sendMessage.mutate(body);
      return;
    }

    // Interactive Mock Flow
    setInputValue("");
    const newMsgId = `usr-${Date.now()}`;
    const resolvedSenderId = effectiveUserId || "user-self";
    const userMsg = {
      id: newMsgId,
      sender_id: resolvedSenderId,
      sender_name: profile?.full_name || "You",
      body,
      created_at: new Date().toISOString(),
    };

    setMockMessages((prev) => ({
      ...prev,
      [activeConversationId]: [...(prev[activeConversationId] || []), userMsg],
    }));

    // Trigger realistic interactive reply after 1.2s
    const typingName = activeConversationId === "mock-pit-control"
      ? "Race Control"
      : activeConversationId === "mock-ai-assistant"
      ? "Hanbee AI Strategist"
      : "Rohan Varma";

    setIsTyping(typingName);

    setTimeout(() => {
      let replyBody = "Copy that! Telemetry synchronized with the team hub. Good luck on the run! 🏎️💨";
      const lower = body.toLowerCase();

      if (activeConversationId === "mock-pit-control") {
        replyBody = "Race Control confirms: Transponder #42 locked on Ch 4. Pre-grid queue verified! 🏁";
      } else if (activeConversationId === "mock-ai-assistant") {
        if (lower.includes("lap") || lower.includes("fast")) {
          replyBody = "Telemetry insight: Your best lap is 13.42s. Sector 2 entry speed was 44.8 km/h, which is the session benchmark!";
        } else if (lower.includes("battery") || lower.includes("voltage")) {
          replyBody = "Battery check: 2S LiPo sits at 8.38V. Optimal safety margin under the 8.40V maximum ceiling.";
        } else {
          replyBody = "AI Pit Analysis: Car balance is neutral. Maintain consistent braking at Turn 3 hairpin for maximum exit drive.";
        }
      } else {
        if (lower.includes("lap") || lower.includes("fast")) {
          replyBody = "Nice! That 13.42s lap puts us 2nd overall in Championship Group A! Let's protect the tires.";
        } else if (lower.includes("battery") || lower.includes("trim")) {
          replyBody = "Confirmed! Steering trim centered at 0°. Battery pack #2 is pre-warmed for heat 1.";
        } else if (lower.includes("ready")) {
          replyBody = "Let's bring home the podium! Heading over to the driver rostrum now! 🏆";
        }
      }

      setMockMessages((prev) => ({
        ...prev,
        [activeConversationId]: [
          ...(prev[activeConversationId] || []),
          {
            id: `reply-${Date.now()}`,
            sender_id: "reply-bot",
            sender_name: typingName,
            body: replyBody,
            created_at: new Date().toISOString(),
          },
        ],
      }));
      setIsTyping(null);
    }, 1200);
  }

  function isAllowedContact(theirRole: string | null | undefined) {
    if (!myRole || !theirRole) return true;
    switch (myRole) {
      case "manager": return theirRole === "staff" || theirRole === "school_staff";
      case "student": return theirRole === "staff" || theirRole === "school_staff";
      case "staff": return theirRole === "student" || theirRole === "manager";
      case "school_staff": return theirRole === "student" || theirRole === "manager";
      default: return true;
    }
  }

  const conversationList = conversations;
  const contactList = contacts ?? [];
  const activeConversation = conversationList.find((c) => c.id === activeConversationId);
  const activeContact = contactList.find((c) => c.user_id === activeConversation?.other_user_id);
  
  const title = activeConversation?.kind === "direct"
    ? activeConversation.other_full_name ?? "Conversation"
    : activeConversation?.title ?? "Hanbee Race Comms";

  const visibleConversations = conversationList.filter((conversation) => {
    if (conversation.kind === "direct" && !isAllowedContact(conversation.other_role)) return false;
    return (conversation.title ?? conversation.other_full_name ?? "Group chat").toLowerCase().includes(search.toLowerCase());
  });

  const visibleContacts = contactList.filter((contact) => {
    if (!isAllowedContact(contact.role)) return false;
    return contact.full_name.toLowerCase().includes(search.toLowerCase());
  });

  const formatTime = (value: string | null) =>
    value ? new Date(value).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "";

  return (
    <div className={`${styles.layout} ${mobileView === "chat" ? styles.mobileHideList : styles.mobileHideChat}`}>
      {/* Sidebar: Conversations */}
      <div className={styles.contactsSidebar}>
        <div className={styles.sidebarHeader}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Race Comms</h2>
            <span className={styles.commsBadge}>
              <Radio size={12} />
              LIVE
            </span>
          </div>
          <div className={styles.inputWrapper}>
            <Search size={16} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search channels & squad…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 40 }}
            />
          </div>
        </div>

        <div className={styles.contactsList}>
          {conversationsLoading && <p role="status" style={{ padding: 16 }}>Loading channels…</p>}
          {visibleConversations.map((conv) => {
            const contactName = conv.kind === "direct" ? conv.other_full_name ?? "Hanbee user" : conv.title ?? "Group chat";
            const isSelected = activeConversationId === conv.id;
            return (
              <button
                key={conv.id}
                type="button"
                className={`${styles.contactItem} ${isSelected ? styles.active : ""}`}
                onClick={() => { setActiveConversationId(conv.id); setMobileView("chat"); }}
              >
                <div className={styles.contactAvatar}>
                  {initials(contactName)}
                  <span className={styles.statusIndicator} />
                </div>
                <div className={styles.contactInfo}>
                  <div className={styles.contactName}>{contactName}</div>
                  <div className={styles.contactPreview}>{conv.last_body ?? "No messages yet"}</div>
                </div>
                {conv.unread_count > 0 && (
                  <span style={{ background: "var(--accent-subtle-bg)", color: "var(--accent-subtle-text)", border: "1px solid var(--accent-subtle-border)", padding: "2px 6px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                    {conv.unread_count}
                  </span>
                )}
              </button>
            );
          })}

          {visibleContacts.length > 0 && <h3 style={{ padding: "14px 20px 4px", fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Direct Contacts</h3>}
          {visibleContacts.map((contact: ChatContact) => (
            <button
              key={contact.user_id}
              type="button"
              className={styles.contactItem}
              onClick={() => { openContact.mutate(contact.user_id); setMobileView("chat"); }}
              disabled={openContact.isPending}
            >
              <div className={styles.contactAvatar}>{initials(contact.full_name)}</div>
              <div className={styles.contactInfo}>
                <div className={styles.contactName}>{contact.full_name}</div>
                <div className={styles.contactPreview}>
                  {contact.relation.replaceAll("_", " ")}
                  {contact.org_name ? ` · ${contact.org_name}` : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={styles.mainChat}>
        {activeConversation ? (
          <>
            <header className={styles.chatHeader}>
              <button
                type="button"
                className={styles.mobileBackBtn}
                onClick={() => setMobileView("list")}
                aria-label="Back to channels"
              >
                <ChevronLeft size={16} /> Channels
              </button>
              <div className={styles.contactAvatar}>
                {initials(title)}
                <span className={styles.statusIndicator} />
              </div>
              <div className={styles.chatHeaderInfo}>
                <h2>{title}</h2>
                <p>
                  {activeConversation.kind === "direct"
                    ? activeContact?.relation.replaceAll("_", " ") ?? activeConversation.other_role ?? "Direct Channel"
                    : `${activeConversation.participant_count} members online · 2.4GHz FHSS`}
                </p>
              </div>
            </header>

            {error && <p role="alert" style={{ padding: "8px 16px", color: "#ef4444" }}>{error}</p>}

            <div className={styles.chatHistory}>
              {messagesQuery.hasNextPage && (
                <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
                  <button
                    type="button"
                    className={styles.contactItem}
                    style={{ display: "inline-flex", width: "auto", padding: "6px 16px" }}
                    disabled={messagesQuery.isFetchingNextPage}
                    onClick={() => messagesQuery.fetchNextPage()}
                  >
                    {messagesQuery.isFetchingNextPage ? "Loading…" : "Load earlier messages"}
                  </button>
                </div>
              )}

              {messages.map((message, index) => {
                const previous = messages[index - 1];
                const newDay = !previous || dayKey(previous.created_at) !== dayKey(message.created_at);
                const mine =
                  Boolean(effectiveUserId && message.sender_id === effectiveUserId) ||
                  message.sender_id === "user-self" ||
                  message.id?.startsWith("usr-");
                const seen = true;

                const otherName = ("sender_name" in message && (message as any).sender_name)
                  ? (message as any).sender_name
                  : ((message as any).sender?.full_name ??
                     (activeConversation?.kind === "direct"
                       ? (activeContact?.full_name ?? activeConversation?.other_full_name)
                       : null) ??
                     activeConversation?.title ??
                     "Team Member");

                return (
                  <div key={message.id} className={`${styles.messageRow} ${mine ? styles.me : styles.other}`}>
                    {newDay && (
                      <div className={styles.daySeparator}>
                        <span>{dayLabel(message.created_at)}</span>
                      </div>
                    )}
                    {message.kind === "system" ? (
                      <div className={styles.systemMessage}>{message.body}</div>
                    ) : (
                      <div className={`${styles.messageWrapper} ${mine ? styles.me : styles.other}`}>
                        <div className={styles.senderLabel}>
                          {mine ? "You" : otherName}
                        </div>
                        <div className={`${styles.message} ${mine ? styles.me : styles.other}`}>
                          {message.body}
                        </div>
                        <time className={styles.timestamp} dateTime={message.created_at}>
                          {formatTime(message.created_at)}
                          {mine && (
                            <span className={seen ? styles.tickSeen : styles.tick} aria-label="Delivered">
                              {" ✓✓"}
                            </span>
                          )}
                        </time>
                      </div>
                    )}
                  </div>
                );
              })}

              {isTyping && (
                <div className={styles.typingIndicator}>
                  <span>{isTyping} is typing</span>
                  <div className={styles.typingDot} />
                  <div className={styles.typingDot} />
                  <div className={styles.typingDot} />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Interactive Quick Prompts Bar Planted Directly Above Input */}
            <div className={styles.quickChipsRow}>
              <button
                type="button"
                className={styles.quickChip}
                onClick={() => handleSend("⚡ What's our fastest lap time so far?")}
              >
                <Zap size={13} />
                What&apos;s our fastest lap?
              </button>
              <button
                type="button"
                className={styles.quickChip}
                onClick={() => handleSend("🔧 Check battery voltage & steering trim")}
              >
                <Wrench size={13} />
                Battery voltage check
              </button>
              <button
                type="button"
                className={styles.quickChip}
                onClick={() => handleSend("🏁 Ready for Qualifying Heat 1!")}
              >
                <Flag size={13} />
                Ready for Qualifying!
              </button>
            </div>

            {/* Interactive Input Bar */}
            <div className={styles.inputArea}>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  className={styles.input}
                  maxLength={4000}
                  placeholder={`Message ${title}…`}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  className={styles.sendBtn}
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim()}
                  aria-label="Send message"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            Select a channel or contact to start chatting.
          </div>
        )}
      </div>
    </div>
  );
}
