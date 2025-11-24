import type { ReactNode } from "react";
import { requireAdminUser } from "@/lib/server/auth";

type SystemLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function SystemLayout({
  children,
  params,
}: SystemLayoutProps) {
  const { locale } = await params;
  requireAdminUser(locale);
  return <>{children}</>;
}

