"use client";

import { useEffect, useState, useCallback } from "react";

export const BASE_XP = 1420;
const TASKS_MAP_KEY = "hanbee_completed_xp_tasks_map";
const OLD_XP_KEY = "hanbee_user_xp_points";
const XP_EVENT_NAME = "hanbee_xp_event";

export interface XpGainEvent {
  amount: number;
  reason: string;
  totalXp: number;
}

function getStoredTasks(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TASKS_MAP_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function calculateTotalXp(tasksMap: Record<string, number>): number {
  const sum = Object.values(tasksMap).reduce((acc, val) => acc + (typeof val === "number" ? val : 0), 0);
  return BASE_XP + sum;
}

export function useUserXp() {
  const [xp, setXp] = useState<number>(BASE_XP);
  const [lastGained, setLastGained] = useState<XpGainEvent | null>(null);
  const [isGaining, setIsGaining] = useState(false);

  // Initialize and sanitize from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Purge old unbounded accumulator key that caused the runaway 3,200 XP bug
    try {
      localStorage.removeItem(OLD_XP_KEY);
    } catch {}

    const tasks = getStoredTasks();
    const cleanTotal = calculateTotalXp(tasks);
    setXp(cleanTotal);

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<XpGainEvent>;
      if (customEvent.detail) {
        setXp(customEvent.detail.totalXp);
        if (customEvent.detail.amount > 0) {
          setLastGained(customEvent.detail);
          setIsGaining(true);
          setTimeout(() => setIsGaining(false), 1200);
        }
      }
    };

    window.addEventListener(XP_EVENT_NAME, handleCustomEvent);
    return () => {
      window.removeEventListener(XP_EVENT_NAME, handleCustomEvent);
    };
  }, []);

  const addXpTask = useCallback((taskId: string, amount: number, reason = "Task Completed") => {
    if (typeof window === "undefined") return;
    const currentTasks = getStoredTasks();
    if (currentTasks[taskId] !== undefined) {
      // Task already completed and points already awarded! Do not double-add!
      return;
    }

    const updatedTasks = { ...currentTasks, [taskId]: amount };
    try {
      localStorage.setItem(TASKS_MAP_KEY, JSON.stringify(updatedTasks));
    } catch {}

    const newTotal = calculateTotalXp(updatedTasks);
    setXp(newTotal);

    const detail: XpGainEvent = {
      amount,
      reason,
      totalXp: newTotal,
    };

    window.dispatchEvent(new CustomEvent(XP_EVENT_NAME, { detail }));
  }, []);

  const removeXpTask = useCallback((taskId: string) => {
    if (typeof window === "undefined") return;
    const currentTasks = getStoredTasks();
    if (currentTasks[taskId] === undefined) return;

    const lostAmount = currentTasks[taskId];
    const updatedTasks = { ...currentTasks };
    delete updatedTasks[taskId];

    try {
      localStorage.setItem(TASKS_MAP_KEY, JSON.stringify(updatedTasks));
    } catch {}

    const newTotal = calculateTotalXp(updatedTasks);
    setXp(newTotal);

    const detail: XpGainEvent = {
      amount: -lostAmount,
      reason: "Task Removed",
      totalXp: newTotal,
    };

    window.dispatchEvent(new CustomEvent(XP_EVENT_NAME, { detail }));
  }, []);

  // Backwards-compatible addXp that ensures deterministic task IDs
  const addXp = useCallback((amountOrId: number | string, pointsOrReason?: number | string, maybeReason?: string) => {
    if (typeof amountOrId === "string" && typeof pointsOrReason === "number") {
      addXpTask(amountOrId, pointsOrReason, maybeReason || "Task Completed");
    } else if (typeof amountOrId === "number") {
      const reasonStr = typeof pointsOrReason === "string" ? pointsOrReason : "Manual Task";
      const taskId = `task_${reasonStr.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;
      addXpTask(taskId, amountOrId, reasonStr);
    }
  }, [addXpTask]);

  const resetAllXp = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(TASKS_MAP_KEY);
      localStorage.removeItem(OLD_XP_KEY);
      localStorage.removeItem("hanbee_pit_tasks");
      localStorage.removeItem("hanbee_claimed_bounties");
      localStorage.removeItem("hanbee_rc_inspection");
    } catch {}
    setXp(BASE_XP);
    window.dispatchEvent(
      new CustomEvent(XP_EVENT_NAME, {
        detail: { amount: 0, reason: "Reset", totalXp: BASE_XP },
      })
    );
  }, []);

  return {
    xp,
    addXp,
    addXpTask,
    removeXpTask,
    resetAllXp,
    lastGained,
    isGaining,
  };
}
