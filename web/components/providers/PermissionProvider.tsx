"use client";

import { createContext, useContext, useEffect, useState, useMemo } from "react";
import {
  AUTH_EVENT,
  getStoredAuth,
  type StoredAuth,
} from "@/lib/utils/auth-storage";

type SessionUser = {
  id: number | string;
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
      const stored = getStoredAuth();
      if (!stored) {
        setUser(null);
        setUserReady(false);
        return;
      }
      setUser({
        id: stored.userId,
        nickname: stored.nickname,
        email: stored.email,
      });
      setUserReady(true);
    };

    readStoredUser();

    const handleUserUpdated = (event: Event) => {
      const detail = (event as CustomEvent<StoredAuth | null>).detail;
      if (detail && detail.userId) {
        setUser({
          id: detail.userId,
          nickname: detail.nickname,
          email: detail.email,
        });
      } else {
        setUser(null);
      }
      setUserReady(true);
    };

    window.addEventListener(AUTH_EVENT, handleUserUpdated);
    return () => {
      window.removeEventListener(AUTH_EVENT, handleUserUpdated);
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
    const normalizedId = user ? Number(user.id) : null;
    const isAdmin = normalizedId !== null ? adminUserIds.includes(normalizedId) : false;
    const isApprover =
      normalizedId !== null ? approverUserIds.includes(normalizedId) : false;

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
