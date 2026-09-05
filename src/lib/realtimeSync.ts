/**
 * Real-Time Sync & Presence Bus
 *
 * Provides instant multi-tab & multi-device coordination:
 * 1. Broadcasts cache invalidation signals (products, customers, quotations, service calls, inquiries, jobs)
 * 2. Multi-Device Presence: warns staff across different laptops when someone else is editing the same record
 * 3. Plays subtle audio chimes and shows notifications for incoming inquiries & job applications
 */

import { useEffect, useState } from "react";
import { ref, onValue, set, remove, onDisconnect, serverTimestamp } from "firebase/database";
import { collection, onSnapshot } from "firebase/firestore";
import { db, rtdb } from "./firebase";

export type SyncTopic =
  | "products"
  | "customers"
  | "quotations"
  | "service_calls"
  | "inquiries"
  | "job_applications"
  | "team";

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

// Dedicated BroadcastChannel for instant cross-tab coordination on same machine (<1ms)
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

// Initialize local sync listener
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

// Initialize RTDB Cloud Sync listener (if database provisioned)
if (rtdb && typeof window !== "undefined") {
  try {
    const cloudSyncBusRef = ref(rtdb, "sync_bus");
    let isInitialRTDBSync = true;
    onValue(
      cloudSyncBusRef,
      (snap) => {
        if (isInitialRTDBSync) {
          isInitialRTDBSync = false;
          return;
        }
        const data = snap.val();
        if (!data) return;
        Object.keys(data).forEach((topicKey) => {
          const msg = data[topicKey] as SyncMessage;
          if (msg && msg.topic && Date.now() - (msg.timestamp || 0) < 15000) {
            const topicListeners = listeners.get(msg.topic);
            if (topicListeners) {
              topicListeners.forEach((cb) => cb(msg));
            }
          }
        });
      },
      (err) => {
        // Silently fallback if RTDB is disabled in console
        console.debug("RTDB cloud sync standby:", err.message);
      }
    );
  } catch {}
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

  // 1. Broadcast to local tabs (0ms latency)
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

  // 3. Publish to RTDB cloud for multi-computer signaling (< 50ms)
  if (rtdb) {
    try {
      const topicRef = ref(rtdb, `sync_bus/${topic}`);
      set(topicRef, message).catch(() => {});
    } catch {}
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
 * and discover if another staff member on ANY laptop is currently editing the same document.
 */
export function useResourcePresence(
  resourceType: "service_call" | "quotation" | "product",
  resourceId?: string,
  staffProfile?: { id?: string; name?: string; role?: string } | null
) {
  const [activeEditors, setActiveEditors] = useState<ActiveEditor[]>([]);
  const staffId = staffProfile?.id || (typeof window !== "undefined" ? localStorage.getItem("zorba_client_session_id") || `client_${Math.random().toString(36).slice(2, 9)}` : "anonymous");
  const staffName = staffProfile?.name || "Staff Member";
  const staffRole = staffProfile?.role;

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("zorba_client_session_id")) {
      try {
        localStorage.setItem("zorba_client_session_id", staffId);
      } catch {}
    }
  }, [staffId]);

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

    // --- A. Local Multi-Tab Coordination ---
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

    const registerLocalHeartbeat = () => {
      const all = getStoredEditors();
      const list = (all[currentKey] || []).filter(
        (e) => e.staffId !== staffId && Date.now() - e.lastHeartbeat < 15000
      );
      list.push(mySession);
      all[currentKey] = list;
      saveStoredEditors(all);

      const others = list.filter((e) => e.staffId !== staffId);
      setActiveEditors((prev) => {
        // Merge with existing cloud editors
        const map = new Map(prev.map((e) => [e.staffId, e]));
        others.forEach((o) => map.set(o.staffId, o));
        return Array.from(map.values()).filter((e) => e.staffId !== staffId);
      });

      if (presenceBroadcastChannel) {
        presenceBroadcastChannel.postMessage({
          type: "heartbeat",
          session: mySession,
        });
      }
    };

    const cleanupLocalPresence = () => {
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

    registerLocalHeartbeat();
    const interval = setInterval(registerLocalHeartbeat, 5000);

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

    // --- B. Cloud RTDB Multi-Device Coordination ---
    let cloudPresenceUnsub: (() => void) | null = null;
    let myPresenceRef: any = null;

    if (rtdb) {
      try {
        const sanitizedId = resourceId.replace(/[.#$[\]]/g, "_");
        const presenceRoomRef = ref(rtdb, `presence/${resourceType}/${sanitizedId}`);
        const safeStaffKey = staffId.replace(/[.#$[\]]/g, "_");
        myPresenceRef = ref(rtdb, `presence/${resourceType}/${sanitizedId}/${safeStaffKey}`);

        // Register session in RTDB and set auto-removal on disconnect/tab close
        set(myPresenceRef, {
          staffId,
          staffName,
          staffRole: staffRole || null,
          resourceType,
          resourceId,
          lastHeartbeat: serverTimestamp(),
        }).catch(() => {});

        try {
          onDisconnect(myPresenceRef).remove();
        } catch {}

        // Listen for all active devices in this room
        cloudPresenceUnsub = onValue(
          presenceRoomRef,
          (snapshot) => {
            const roomData = snapshot.val();
            if (!roomData) {
              setActiveEditors([]);
              return;
            }
            const cloudEditors: ActiveEditor[] = [];
            Object.keys(roomData).forEach((key) => {
              const item = roomData[key];
              if (item && item.staffId && item.staffId !== staffId) {
                cloudEditors.push({
                  staffId: item.staffId,
                  staffName: item.staffName || "Staff Member",
                  staffRole: item.staffRole || undefined,
                  lastHeartbeat: typeof item.lastHeartbeat === "number" ? item.lastHeartbeat : Date.now(),
                  resourceType: item.resourceType || resourceType,
                  resourceId: item.resourceId || resourceId,
                });
              }
            });
            setActiveEditors(cloudEditors);
          },
          (err) => {
            console.debug("RTDB presence room standby:", err.message);
          }
        );
      } catch (err) {
        console.debug("RTDB presence init skipped:", err);
      }
    }

    return () => {
      clearInterval(interval);
      cleanupLocalPresence();
      if (presenceBroadcastChannel) {
        presenceBroadcastChannel.removeEventListener("message", handlePresenceMessage);
      }
      if (cloudPresenceUnsub) {
        try {
          cloudPresenceUnsub();
        } catch {}
      }
      if (myPresenceRef) {
        try {
          remove(myPresenceRef).catch(() => {});
        } catch {}
      }
    };
  }, [resourceType, resourceId, staffId, staffName, staffRole]);

  return { activeEditors };
}

export interface OnlineStaffDutyMember {
  staffId: string;
  name: string;
  lastSeen?: number;
}

/**
 * Hook to announce current staff member's live on-duty status in the shop/workshop
 * and track which other team members are currently online across all devices.
 */
export function useStaffDutyPresence(activeProfile?: {
  id?: string;
  name?: string;
  role?: string;
} | null) {
  const [onlineStaff, setOnlineStaff] = useState<OnlineStaffDutyMember[]>([]);
  const [developerStaffIds, setDeveloperStaffIds] = useState<Set<string>>(new Set());

  // Real-time track which team members are developers to strictly exempt them
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        collection(db, "team_members"),
        (snap) => {
          const devSet = new Set<string>();
          snap.docs.forEach((doc) => {
            const data = doc.data();
            if (data.role === "developer") {
              devSet.add(doc.id);
              if (data.id) devSet.add(data.id);
            }
          });
          setDeveloperStaffIds(devSet);
        },
        () => {}
      );
      return () => unsub();
    } catch {}
  }, []);

  useEffect(() => {
    const isExempt = activeProfile?.role === "developer" || (activeProfile?.id && developerStaffIds.has(activeProfile.id));
    const staffId = activeProfile?.id;
    const staffName = activeProfile?.name || "Staff Member";

    const deviceSessionId =
      typeof window !== "undefined"
        ? localStorage.getItem("zorba_duty_device_id") ||
          `dev_${Math.random().toString(36).slice(2, 9)}`
        : `dev_${Math.random().toString(36).slice(2, 9)}`;

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("zorba_duty_device_id", deviceSessionId);
      } catch {}
    }

    let myDutyRef: any = null;
    let dutyListenerUnsub: (() => void) | null = null;

    if (rtdb) {
      try {
        let heartbeatTimer: any = null;

        // If current profile is a developer, ensure any legacy node is purged immediately
        if (staffId && isExempt) {
          const safeStaffKey = staffId.replace(/[.#$[\]]/g, "_");
          remove(ref(rtdb, `staff_presence/${safeStaffKey}`)).catch(() => {});
        }

        // Register online presence only for non-exempt staff members
        if (staffId && !isExempt) {
          const safeStaffKey = staffId.replace(/[.#$[\]]/g, "_");
          const safeDevKey = deviceSessionId.replace(/[.#$[\]]/g, "_");
          myDutyRef = ref(rtdb, `staff_presence/${safeStaffKey}/${safeDevKey}`);

          const updateHeartbeat = () => {
            set(myDutyRef, {
              staffId,
              name: staffName,
              lastSeen: Date.now(),
            }).catch(() => {});
          };

          updateHeartbeat();
          try {
            onDisconnect(myDutyRef).remove();
          } catch {}

          heartbeatTimer = setInterval(updateHeartbeat, 15000);
        }

        // Listen for all online staff in RTDB
        const rootPresenceRef = ref(rtdb, "staff_presence");
        dutyListenerUnsub = onValue(
          rootPresenceRef,
          (snapshot) => {
            const data = snapshot.val();
            if (!data) {
              setOnlineStaff([]);
              return;
            }
            const staffMap = new Map<string, OnlineStaffDutyMember>();
            const now = Date.now();
            const STALE_HEARTBEAT_THRESHOLD_MS = 60000; // 60s TTL

            Object.keys(data).forEach((sKey) => {
              const userDevices = data[sKey];
              if (userDevices && typeof userDevices === "object") {
                Object.keys(userDevices).forEach((dKey) => {
                  const item = userDevices[dKey];
                  if (item && item.staffId) {
                    // Strictly purge and exempt developers from online board
                    if (developerStaffIds.has(item.staffId) || (staffId === item.staffId && isExempt)) {
                      remove(ref(rtdb!, `staff_presence/${sKey}`)).catch(() => {});
                      return;
                    }

                    // Stale ghost session check:
                    // If device hasn't reported within 60s (or lacks lastSeen from an old dead session),
                    // auto-prune this dead device node from RTDB and do not show as online
                    const isFresh =
                      typeof item.lastSeen === "number" &&
                      now - item.lastSeen < STALE_HEARTBEAT_THRESHOLD_MS;

                    if (!isFresh) {
                      remove(ref(rtdb!, `staff_presence/${sKey}/${dKey}`)).catch(() => {});
                      return;
                    }

                    staffMap.set(item.staffId, {
                      staffId: item.staffId,
                      name: item.name || "Staff Member",
                      lastSeen: item.lastSeen,
                    });
                  }
                });
              }
            });

            setOnlineStaff(Array.from(staffMap.values()));
          },
          (err) => {
            console.debug("Staff presence listener standby:", err.message);
          }
        );

        return () => {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          if (dutyListenerUnsub) dutyListenerUnsub();
          if (myDutyRef) {
            remove(myDutyRef).catch(() => {});
          }
        };
      } catch (e) {
        console.debug("Duty presence initialization skipped:", e);
      }
    }
  }, [activeProfile?.id, activeProfile?.name, activeProfile?.role, developerStaffIds]);

  const isStaffOnline = (staffId: string) => {
    if (developerStaffIds.has(staffId)) return false;
    return onlineStaff.some((s) => s.staffId === staffId);
  };

  return {
    onlineStaff,
    isStaffOnline,
    onlineCount: onlineStaff.length,
  };
}
