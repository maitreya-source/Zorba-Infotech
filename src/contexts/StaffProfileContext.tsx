import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import type { TeamMember } from "@/lib/types";

const STORAGE_KEY = "zorba_active_staff_profile";
const TEN_HOURS_MS = 10 * 60 * 60 * 1000; // 10 hours TTL

export interface ActiveStaffProfile {
  id: string;
  name: string;
  role: string;
  avatar: string;
  phone?: string;
  email?: string;
  specialization?: string;
  selectedAt: number;
  expiresAt: number;
}

interface StaffProfileContextType {
  activeProfile: ActiveStaffProfile | null;
  setActiveProfile: (member: TeamMember | ActiveStaffProfile | null) => void;
  clearProfile: () => void;
  showSelectorModal: boolean;
  setShowSelectorModal: (show: boolean) => void;
  timeRemainingFormatted: string;
  isProfileActive: boolean;
}

const StaffProfileContext = createContext<StaffProfileContextType | undefined>(undefined);

export function StaffProfileProvider({ children }: { children: React.ReactNode }) {
  const [activeProfile, setActiveProfileState] = useState<ActiveStaffProfile | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const parsed: ActiveStaffProfile = JSON.parse(stored);
      if (Date.now() > parsed.expiresAt) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [showSelectorModal, setShowSelectorModal] = useState<boolean>(false);
  const [now, setNow] = useState(Date.now());

  // Periodically check expiry every 1 hour (3600000 ms)
  useEffect(() => {
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (activeProfile && current > activeProfile.expiresAt) {
        // 10 hour session expired on this computer
        localStorage.removeItem(STORAGE_KEY);
        setActiveProfileState(null);
        setShowSelectorModal(true);
      }
    }, 60 * 60 * 1000); // 1 hour check interval
    return () => clearInterval(interval);
  }, [activeProfile]);

  const setActiveProfile = (member: TeamMember | ActiveStaffProfile | null) => {
    if (!member) {
      localStorage.removeItem(STORAGE_KEY);
      setActiveProfileState(null);
      return;
    }

    const currentTime = Date.now();
    const expiresAt = currentTime + TEN_HOURS_MS;

    const profilePayload: ActiveStaffProfile = {
      id: member.id,
      name: member.name,
      role: member.role || "backoffice",
      avatar: member.avatar || "penguin",
      phone: member.phone,
      email: member.email,
      specialization: member.specialization,
      selectedAt: currentTime,
      expiresAt,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profilePayload));
    } catch (err) {
      console.warn("Could not save staff profile to localStorage:", err);
    }

    setActiveProfileState(profilePayload);
    setShowSelectorModal(false);
  };

  const clearProfile = () => {
    localStorage.removeItem(STORAGE_KEY);
    setActiveProfileState(null);
    setShowSelectorModal(true);
  };

  const timeRemainingFormatted = useMemo(() => {
    if (!activeProfile) return "No active session";
    const msLeft = activeProfile.expiresAt - now;
    if (msLeft <= 0) return "Session Expired";
    const totalMinutes = Math.floor(msLeft / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m left`;
  }, [activeProfile, now]);

  return (
    <StaffProfileContext.Provider
      value={{
        activeProfile,
        setActiveProfile,
        clearProfile,
        showSelectorModal,
        setShowSelectorModal,
        timeRemainingFormatted,
        isProfileActive: Boolean(activeProfile && now < activeProfile.expiresAt),
      }}
    >
      {children}
    </StaffProfileContext.Provider>
  );
}

export function useStaffProfile() {
  const context = useContext(StaffProfileContext);
  if (!context) {
    throw new Error("useStaffProfile must be used within a StaffProfileProvider");
  }
  return context;
}
