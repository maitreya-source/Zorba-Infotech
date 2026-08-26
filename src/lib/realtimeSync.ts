/**
 * Real-Time Sync & Presence Bus
 *
 * Provides instant multi-tab & multi-device coordination:
 * 1. Broadcasts cache invalidation signals (products, customers, quotations, service calls, inquiries, jobs)
 * 2. Manages presence to warn staff when someone else is editing the same record
 * 3. Plays subtle audio chimes and shows notifications for incoming inquiries & job applications
 */

import { useEffect, useState } from "react";

export type SyncTopic =
  | "products"
  | "customers"
  | "quotations"
  | "service_calls"
  | "inquiries"
  | "job_applications";

export interface SyncMessage {
  topic: SyncTopic;
  timestamp: number;
  authorStaffName?: string;
  resourceId?: string;
  action?: "create" | "update" | "delete";
}

export interface ActiveEditor {
  staffId: string;
  staffName: string;
  staffRole?: string;
  lastHeartbeat: number;
  resourceType: string;
  resourceId: string;
}

// Dedicated BroadcastChannel for instant cross-tab coordination on same machine
const SYNC_CHANNEL_NAME = "zorba_realtime_sync_bus";
const PRESENCE_CHANNEL_NAME = "zorba_realtime_presence_bus";
const PRESENCE_STORAGE_KEY = "zorba_active_editors_v1";

let syncBroadcastChannel: BroadcastChannel | null = null;
let presenceBroadcastChannel: BroadcastChannel | null = null;

if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    syncBroadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    presenceBroadcastChannel = new BroadcastChannel(PRESENCE_CHANNEL_NAME);
  } catch {}
}

const listeners = new Map<SyncTopic, Set<(msg: SyncMessage) => void>>();

// Initialize global sync listener
if (syncBroadcastChannel) {
  syncBroadcastChannel.onmessage = (event) => {
    const data = event.data as SyncMessage;
    if (!data || !data.topic) return;
    const topicListeners = listeners.get(data.topic);
    if (topicListeners) {
      topicListeners.forEach((cb) => cb(data));
    }
  };
}

/**
 * Publish a real-time sync signal across all active tabs and devices
 */
export function publishSyncSignal(
  topic: SyncTopic,
  meta?: {
    authorStaffName?: string;
    resourceId?: string;
    action?: "create" | "update" | "delete";
  }
) {
  const message: SyncMessage = {
    topic,
    timestamp: Date.now(),
    authorStaffName: meta?.authorStaffName,
    resourceId: meta?.resourceId,
    action: meta?.action,
  };

  // 1. Broadcast to local tabs
  if (syncBroadcastChannel) {
    try {
      syncBroadcastChannel.postMessage(message);
    } catch {}
  }

  // 2. Trigger in-process topic listeners
  const topicListeners = listeners.get(topic);
  if (topicListeners) {
    topicListeners.forEach((cb) => cb(message));
  }
}

/**
 * Subscribe to real-time sync signals for a topic
 */
export function subscribeSyncSignal(
  topic: SyncTopic,
  callback: (msg: SyncMessage) => void
): () => void {
  if (!listeners.has(topic)) {
    listeners.set(topic, new Set());
  }
  const set = listeners.get(topic)!;
  set.add(callback);

  return () => {
    set.delete(callback);
  };
}

/**
 * Synthesizes a subtle, pleasant 2-tone chime using Web Audio API (zero audio assets required).
 */
export function playNotificationChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    // Tone 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.3);
  } catch {}
}

/**
 * Hook to announce active editing presence on a document (Quotation, Service Call, Product)
 * and discover if another staff member is currently editing the same document.
 */
export function useResourcePresence(
  resourceType: "service_call" | "quotation" | "product",
  resourceId?: string,
  staffProfile?: { id?: string; name?: string; role?: string } | null
) {
  const [activeEditors, setActiveEditors] = useState<ActiveEditor[]>([]);
  const staffId = staffProfile?.id || "anonymous";
  const staffName = staffProfile?.name || "Staff Member";
  const staffRole = staffProfile?.role;

  useEffect(() => {
    if (!resourceId || resourceId === "new" || resourceId === "NEW") {
      setActiveEditors([]);
      return;
    }

    const currentKey = `${resourceType}:${resourceId}`;
    const mySession: ActiveEditor = {
      staffId,
      staffName,
      staffRole,
      lastHeartbeat: Date.now(),
      resourceType,
      resourceId,
    };

    // Helper to read active editors from storage
    const getStoredEditors = (): Record<string, ActiveEditor[]> => {
      try {
        const raw = localStorage.getItem(PRESENCE_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    };

    const saveStoredEditors = (data: Record<string, ActiveEditor[]>) => {
      try {
        localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(data));
      } catch {}
    };

    // Register my presence
    const registerHeartbeat = () => {
      const all = getStoredEditors();
      const list = (all[currentKey] || []).filter(
        (e) => e.staffId !== staffId && Date.now() - e.lastHeartbeat < 15000
      );
      list.push(mySession);
      all[currentKey] = list;
      saveStoredEditors(all);

      // Update state for other active editors
      const others = list.filter((e) => e.staffId !== staffId);
      setActiveEditors(others);

      if (presenceBroadcastChannel) {
        presenceBroadcastChannel.postMessage({
          type: "heartbeat",
          session: mySession,
        });
      }
    };

    const cleanupPresence = () => {
      const all = getStoredEditors();
      if (all[currentKey]) {
        all[currentKey] = all[currentKey].filter((e) => e.staffId !== staffId);
        saveStoredEditors(all);
      }
      if (presenceBroadcastChannel) {
        presenceBroadcastChannel.postMessage({
          type: "leave",
          key: currentKey,
          staffId,
        });
      }
    };

    registerHeartbeat();
    const interval = setInterval(registerHeartbeat, 5000);

    // Listen for presence broadcasts
    const handlePresenceMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;
      if (data.type === "heartbeat" && data.session) {
        const s = data.session as ActiveEditor;
        if (s.resourceType === resourceType && s.resourceId === resourceId && s.staffId !== staffId) {
          setActiveEditors((prev) => {
            const map = new Map(prev.map((e) => [e.staffId, e]));
            map.set(s.staffId, s);
            return Array.from(map.values());
          });
        }
      } else if (data.type === "leave" && data.key === currentKey) {
        setActiveEditors((prev) => prev.filter((e) => e.staffId !== data.staffId));
      }
    };

    if (presenceBroadcastChannel) {
      presenceBroadcastChannel.addEventListener("message", handlePresenceMessage);
    }

    return () => {
      clearInterval(interval);
      cleanupPresence();
      if (presenceBroadcastChannel) {
        presenceBroadcastChannel.removeEventListener("message", handlePresenceMessage);
      }
    };
  }, [resourceType, resourceId, staffId, staffName, staffRole]);

  return { activeEditors };
}
