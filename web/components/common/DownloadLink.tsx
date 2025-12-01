"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { downloadWithDooTask } from "@/lib/utils/download";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<"button">, "type" | "onClick" | "className">;

export default function DownloadLink({
  href,
  children,
  className,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      onClick={() => downloadWithDooTask(href)}
      className={cn("cursor-pointer", className)}
      {...rest}
    >
      {children}
    </button>
  );
}
