"use client";

import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { normalizeUserId } from "@/lib/utils/user-id";

const USER_STORAGE_KEY = "asset-hub:dootask-user";
const USER_EVENT = "asset-hub:user-updated";

type SessionUser = {
  id: number;
  nickname?: string;
  email?: string;
};

type PermissionContextType = {
  user: SessionUser | null;
  userReady: boolean;
  isAdmin: boolean;
  isApprover: boolean;
  adminUserIds: number[];
  approverUserIds: number[];
};

const PermissionContext = createContext<PermissionContextType | null>(null);

type Props = {
  children: React.ReactNode;
  adminUserIds: number[];
  approverUserIds: number[];
};

export function PermissionProvider({
  children,
  adminUserIds,
  approverUserIds,
}: Props) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [userReady, setUserReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const readStoredUser = () => {
      try {
        const stored = sessionStorage.getItem(USER_STORAGE_KEY);
        if (!stored) {
          setUser(null);
          setUserReady(false);
          return;
        }
        const parsed = JSON.parse(stored) as SessionUser;
        const normalizedId = normalizeUserId(parsed?.id);
        if (normalizedId === null) {
          setUser(null);
          setUserReady(false);
          return;
        }
        setUser({ ...parsed, id: normalizedId });
        setUserReady(true);
      } catch {
        setUser(null);
        setUserReady(false);
      }
    };

    readStoredUser();

    const handleUserUpdated = (event: Event) => {
      const detail = (event as CustomEvent<SessionUser | null>).detail;
      const normalizedId = normalizeUserId(detail?.id);
      if (normalizedId !== null && detail) {
        setUser({ ...detail, id: normalizedId });
      } else {
        setUser(null);
      }
      setUserReady(true);
    };

    window.addEventListener(USER_EVENT, handleUserUpdated);
    return () => {
      window.removeEventListener(USER_EVENT, handleUserUpdated);
    };
  }, []);

  // Fallback: if user not ready after 3s, assume guest/not-micro-env
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (userReady) return;
    
    // Note: In AppShell this was tied to isMicroEnv, but here we simplify
    // We just want to ensure userReady eventually becomes true so UI doesn't stick in loading
    const timer = window.setTimeout(() => setUserReady(true), 3000);
    return () => window.clearTimeout(timer);
  }, [userReady]);

  const value = useMemo(() => {
    const isAdmin = user ? adminUserIds.includes(user.id) : false;
    const isApprover = user ? approverUserIds.includes(user.id) : false;

    return {
      user,
      userReady,
      isAdmin,
      isApprover,
      adminUserIds,
      approverUserIds,
    };
  }, [user, userReady, adminUserIds, approverUserIds]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
}

