"use client";

import { usePermissions } from "@/components/providers/PermissionProvider";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export default function AdminOnly({ children, fallback = null }: Props) {
  const { isAdmin, userReady } = usePermissions();

  if (!userReady) {
    return null; // Or return a skeleton if needed
  }

  if (!isAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

