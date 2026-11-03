"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "./chat.module.css";
import { Send, Search, ChevronLeft, User, Users, Inbox, Plus } from "lucide-react";
import {
  createGroupConversation,
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
import Modal from "../../../components/ui/Modal";
import modalStyles from "../../../components/ui/Modal.module.css";

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

export default function ChatPage() {
  const [currentUserId, setCurrentUserId] = useState("");
  const [activeConversationId, setActiveConversationId] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  // Purely a left-list filter -- deliberately not wired into
  // activeConversationId, the message/receipt queries, or the realtime
  // subscription below, all of which key only off activeConversationId.
  // Switching tabs can never crash or bleed one thread into another,
  // because nothing about an already-open thread's data depends on it.
  const [chatTab, setChatTab] = useState<"solo" | "group">("solo");

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

  const conversations = rawConversations ?? [];

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
    enabled: Boolean(activeConversationId),
  });

  const messages = [...(messagesQuery.data?.pages ?? [])].reverse().flat();

  const { data: receipts } = useQuery({
    queryKey: ["chat-receipts", activeConversationId],
    queryFn: () => fetchChatReadReceipts(activeConversationId),
    enabled: Boolean(activeConversationId),
  });

  useEffect(() => {
    if (!activeConversationId) return;
    let realtimeClient: ReturnType<typeof getRealtimeClient>;
    try {
      realtimeClient = getRealtimeClient();
    } catch {
      return;
    }
    const channel = realtimeClient
      .channel(`chat-${activeConversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConversationId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["chat-messages", activeConversationId] });
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_participants", filter: `conversation_id=eq.${activeConversationId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["chat-receipts", activeConversationId] });
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          queryClient.invalidateQueries({ queryKey: ["chat-messages", activeConversationId] });
          queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
        }
      });
    return () => {
      void realtimeClient.removeChannel(channel).catch(() => undefined);
    };
  }, [activeConversationId, queryClient]);

  const markRead = useMutation({
    mutationFn: markChatRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-conversations"] }),
  });
  useEffect(() => {
    if (activeConversationId) markRead.mutate(activeConversationId);
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversationId, messages.length]);

  const openContact = useMutation({
    mutationFn: startDirectConversation,
    onSuccess: async (conversationId) => {
      // Both caches need invalidating -- otherwise the person stays
      // listed under "Direct Contacts" (the pre-conversation list)
      // *and* shows up as the new conversation, duplicated in the Solo tab.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["chat-contacts"] }),
      ]);
      setActiveConversationId(conversationId);
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "You can't start a conversation with this person."),
  });

  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<string[]>([]);
  const [newGroupError, setNewGroupError] = useState("");

  const createGroup = useMutation({
    mutationFn: () => createGroupConversation(newGroupTitle, newGroupMemberIds),
    onSuccess: async (conversationId) => {
      await queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      setNewGroupOpen(false);
      setNewGroupTitle("");
      setNewGroupMemberIds([]);
      setNewGroupError("");
      setChatTab("group");
      setActiveConversationId(conversationId);
      setMobileView("chat");
    },
    onError: (reason) => setNewGroupError(reason instanceof Error ? reason.message : "We couldn't create this group."),
  });

  function toggleGroupMember(userId: string) {
    setNewGroupMemberIds((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
  }

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
    sendMessage.mutate(body);
  }

  function isAllowedContact(theirRole: string | null | undefined) {
    if (!myRole || !theirRole) return true;
    switch (myRole) {
      case "manager": return theirRole === "staff" || theirRole === "school_staff";
      // chat_relation_dir() on the backend is the real gate here -- it only
      // returns non-null for student<->student when both sides are
      // independent ("pool_student" relation), so widening this to include
      // "student" can't leak school-student-to-school-student or
      // independent-to-school-student pairs the backend wouldn't allow;
      // it was just hiding the independent<->independent case the backend
      // already supports.
      case "student": return theirRole === "staff" || theirRole === "school_staff" || theirRole === "student";
      case "staff": return theirRole === "student" || theirRole === "manager";
      case "school_staff": return theirRole === "student" || theirRole === "manager";
      default: return true;
    }
  }

  const isAiEntity = (nameOrTitle?: string | null, id?: string | null, role?: string | null) => {
    const s = `${nameOrTitle ?? ""} ${id ?? ""} ${role ?? ""}`.toLowerCase();
    return s.includes("hanbee ai") || s.includes("pit strategist") || s.includes("mock-ai-assistant") || s.includes("ai-bot") || s.includes("ai strategist");
  };

  const conversationList = conversations.filter((c) => !isAiEntity(c.title ?? c.other_full_name, c.id, c.other_role));
  const contactList = (contacts ?? []).filter((contact) => !isAiEntity(contact.full_name, contact.user_id, contact.role));
  const activeConversation = conversationList.find((c) => c.id === activeConversationId);
  const activeContact = contactList.find((c) => c.user_id === activeConversation?.other_user_id);
  
  const title = activeConversation?.kind === "direct"
    ? activeConversation.other_full_name ?? "Conversation"
    : activeConversation?.title ?? "Hanbee Race Comms";

  const visibleConversations = conversationList.filter((conversation) => {
    if (conversation.kind === "direct" && !isAllowedContact(conversation.other_role)) return false;
    return (conversation.title ?? conversation.other_full_name ?? "Group chat").toLowerCase().includes(search.toLowerCase());
  });

  // chat_contacts() is a permissions list -- "who you're allowed to
  // message" -- by design independent of whether a conversation already
  // exists (same as any real contacts list never disappearing once you've
  // texted someone). The direct-conversations list already covers anyone
  // with a real thread, so exclude them here to avoid showing the same
  // person twice in the Solo tab.
  const directConversationUserIds = new Set(
    conversationList.filter((c) => c.kind === "direct").map((c) => c.other_user_id),
  );
  const visibleContacts = contactList.filter((contact) => {
    if (!isAllowedContact(contact.role)) return false;
    if (directConversationUserIds.has(contact.user_id)) return false;
    return contact.full_name.toLowerCase().includes(search.toLowerCase());
  });

  // Strict split: a conversation only ever appears under the tab matching
  // its real `kind` -- Solo can never show a group thread or vice versa.
  const soloConversations = visibleConversations.filter((c) => c.kind === "direct");
  const groupConversations = visibleConversations.filter((c) => c.kind === "group");
  const soloCount = soloConversations.length + visibleContacts.length;
  const groupCount = groupConversations.length;

  const formatTime = (value: string | null) =>
    value ? new Date(value).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "";

  return (
    <div className={`${styles.layout} ${mobileView === "chat" ? styles.mobileHideList : styles.mobileHideChat}`}>
      {/* Sidebar: Conversations */}
      <div className={styles.contactsSidebar}>
        <div className={styles.sidebarHeader}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Race Comms</h2>
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

        <div className={styles.chatTabBar}>
          <button
            type="button"
            className={`${styles.chatTabBtn} ${chatTab === "solo" ? styles.chatTabBtnActive : ""}`}
            onClick={() => setChatTab("solo")}
          >
            <User size={14} />
            Solo
            {soloCount > 0 && <span className={styles.chatTabCount}>{soloCount}</span>}
          </button>
          <button
            type="button"
            className={`${styles.chatTabBtn} ${chatTab === "group" ? styles.chatTabBtnActive : ""}`}
            onClick={() => setChatTab("group")}
          >
            <Users size={14} />
            Group
            {groupCount > 0 && <span className={styles.chatTabCount}>{groupCount}</span>}
          </button>
        </div>

        <div className={styles.contactsList}>
          {conversationsLoading && <p role="status" style={{ padding: 16 }}>Loading channels…</p>}

          {chatTab === "solo" && (
            <>
              {soloConversations.map((conv) => {
                const contactName = conv.other_full_name ?? "Hanbee user";
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
                    {conv.unread_count > 0 && <span className={styles.chatTabCount}>{conv.unread_count}</span>}
                  </button>
                );
              })}

              {visibleContacts.length > 0 && (
                <h3 style={{ padding: "14px 20px 4px", fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Direct Contacts</h3>
              )}
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

              {!conversationsLoading && soloConversations.length === 0 && visibleContacts.length === 0 && (
                <div className={styles.chatEmptyState}>
                  <User size={28} aria-hidden="true" />
                  <p>No direct messages yet. People you can message will appear here.</p>
                </div>
              )}
            </>
          )}

          {chatTab === "group" && (
            <>
              <div style={{ padding: "12px 20px 4px" }}>
                <button
                  type="button"
                  className={styles.contactItem}
                  style={{ justifyContent: "center", gap: 8, border: "1px dashed var(--border-subtle)", borderRadius: 10 }}
                  onClick={() => setNewGroupOpen(true)}
                >
                  <Plus size={16} aria-hidden="true" />
                  New group
                </button>
              </div>
              {groupConversations.map((conv) => {
                const contactName = conv.title ?? "Group chat";
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
                    {conv.unread_count > 0 && <span className={styles.chatTabCount}>{conv.unread_count}</span>}
                  </button>
                );
              })}

              {!conversationsLoading && groupConversations.length === 0 && (
                <div className={styles.chatEmptyState}>
                  <Inbox size={28} aria-hidden="true" />
                  <p>You&apos;re not part of any group chat yet.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={styles.mainChat}>
        {activeConversation ? (
          <div className={styles.activeChatWrapper}>
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
                    ? activeContact?.relation.replaceAll("_", " ") ?? activeConversation.other_role ?? "Direct message"
                    : `${activeConversation.participant_count} members`}
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
                const mine = Boolean(effectiveUserId && message.sender_id === effectiveUserId);
                const seen = (receipts ?? []).some(
                  (r) => r.user_id !== effectiveUserId && r.last_read_at && r.last_read_at >= message.created_at,
                );

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
                        <span suppressHydrationWarning>{dayLabel(message.created_at)}</span>
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
                        <time className={styles.timestamp} dateTime={message.created_at} suppressHydrationWarning>
                          <span>{formatTime(message.created_at)}</span>
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

              <div ref={messagesEndRef} />
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
          </div>
        ) : (
          <div className={styles.noChatSelected}>
            Select a channel or contact to start chatting.
          </div>
        )}
      </div>

      <Modal
        open={newGroupOpen}
        title="New group"
        onClose={() => { setNewGroupOpen(false); setNewGroupError(""); }}
        actions={
          <>
            <button type="button" className={modalStyles.secondaryBtn} disabled={createGroup.isPending} onClick={() => setNewGroupOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={modalStyles.primaryBtn}
              disabled={createGroup.isPending || !newGroupTitle.trim() || newGroupMemberIds.length === 0}
              onClick={() => createGroup.mutate()}
            >
              {createGroup.isPending ? "Creating…" : "Create group"}
            </button>
          </>
        }
      >
        {newGroupError && <p role="alert" style={{ marginBottom: 12 }}>{newGroupError}</p>}
        <label style={{ display: "block", marginBottom: 14 }}>
          Group name
          <input
            value={newGroupTitle}
            onChange={(event) => setNewGroupTitle(event.target.value)}
            placeholder="e.g. Pit Crew"
            maxLength={60}
            disabled={createGroup.isPending}
            className={styles.searchInput}
            style={{ display: "block", marginTop: 6, width: "100%" }}
          />
        </label>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 8 }}>
          Add people you can already message directly:
        </p>
        <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {contactList.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No contacts available to add yet.</p>}
          {contactList.map((contact) => (
            <label key={contact.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={newGroupMemberIds.includes(contact.user_id)}
                onChange={() => toggleGroupMember(contact.user_id)}
                disabled={createGroup.isPending}
              />
              <span>{contact.full_name}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{contact.relation.replaceAll("_", " ")}</span>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
