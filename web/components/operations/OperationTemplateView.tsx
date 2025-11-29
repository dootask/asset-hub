"use client";

import type { ReactNode } from "react";
import type {
  OperationTemplateFieldValue,
  OperationTemplateMetadata,
  OperationTemplateSnapshotField,
} from "@/lib/types/operation-template";
import { cn } from "@/lib/utils";
import { OPERATION_TEMPLATE_LABELS } from "@/lib/constants/operation-template-labels";

type Props = {
  metadata?: OperationTemplateMetadata | null;
  labels?: Record<string, { key: string; labelZh: string; labelEn: string }>;
  locale?: string;
  title?: string;
  emptyHint?: string;
  variant?: "card" | "inline";
  className?: string;
};

type TemplateEntry = {
  key: string;
  label: string;
  widget?: OperationTemplateSnapshotField["widget"];
  value?: OperationTemplateFieldValue;
};

function formatDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function renderValue(entry: TemplateEntry, locale: string): ReactNode {
  const formatLinkLabel = (url: string) => {
    try {
      const parsed = new URL(url, "http://placeholder");
      const pathname = parsed.pathname?.split("/").filter(Boolean).pop();
      return pathname || url;
    } catch {
      return url;
    }
  };

  const renderAttachmentLink = (value: string) => {
    const isLink =
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("/");

    if (!isLink) {
      return <span className="break-all">{value}</span>;
    }

    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="break-all text-primary underline-offset-4 hover:underline"
      >
        {formatLinkLabel(value)}
      </a>
    );
  };

  if (Array.isArray(entry.value)) {
    if (entry.value.length === 0) {
      return <span className="text-muted-foreground">-</span>;
    }
    return (
      <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
        {entry.value.map((item, index) => (
          <li
            key={`${entry.key}-${index}`}
            className="break-all"
          >
            {renderAttachmentLink(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (entry.value === undefined || entry.value === null || entry.value === "") {
    return <span className="text-muted-foreground">-</span>;
  }

  if (entry.widget === "number" && typeof entry.value === "number") {
    return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
      style: "decimal",
      maximumFractionDigits: 2,
    }).format(entry.value);
  }

  if (entry.widget === "date" && typeof entry.value === "string") {
    return formatDate(entry.value, locale);
  }

  return (
    <span className="break-words">
      {typeof entry.value === "string" ? entry.value : String(entry.value)}
    </span>
  );
}

function buildEntries(
  metadata: OperationTemplateMetadata,
  locale: string,
): TemplateEntry[] {
  const isChinese = locale === "zh";
  const values = metadata.values ?? {};

  if (metadata.snapshot?.fields?.length) {
    return metadata.snapshot.fields.map((field) => ({
      key: field.key,
      label: isChinese ? field.labelZh : field.labelEn,
      widget: field.widget,
      value: values[field.key],
    }));
  }

  return Object.entries(values).map(([key, value]) => ({
    key,
    label: key,
    value,
  }));
}

export default function OperationTemplateView({
  metadata,
  labels,
  locale = "en",
  title,
  emptyHint,
  variant = "card",
  className,
}: Props) {
  if (!metadata) {
    return emptyHint ? (
      <div className={cn("text-xs text-muted-foreground", className)}>
        {emptyHint}
      </div>
    ) : null;
  }

  const entries = buildEntries(metadata, locale);
  if (entries.length === 0) {
    return emptyHint ? (
      <div className={cn("text-xs text-muted-foreground", className)}>
        {emptyHint}
      </div>
    ) : null;
  }

  const isChinese = locale === "zh";
  const heading =
    title ??
    (metadata.snapshot
      ? isChinese
        ? metadata.snapshot.labelZh
        : metadata.snapshot.labelEn
      : undefined);

  const containerClasses =
    variant === "inline"
      ? "rounded-xl bg-muted/40 p-3"
      : "rounded-2xl border bg-background/60 p-4";

  const mergedLabels = { ...OPERATION_TEMPLATE_LABELS, ...(labels ?? {}) };
  const getLabel = (key: string, defaultLabel?: string) => {
    const labelEntry = mergedLabels[key];
    if (labelEntry) {
      return locale === "zh" ? labelEntry.labelZh : labelEntry.labelEn;
    }
    return defaultLabel ?? key;
  };

  return (
    <div className={cn(containerClasses, "space-y-3 text-sm", className)}>
      {heading && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {heading}
          </p>
        </div>
      )}
      <dl className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.key} className="space-y-1">
            <dt className="text-xs text-muted-foreground">
              {getLabel(entry.key, entry.label)}
            </dt>
            <dd className="text-sm font-medium text-foreground">
              {renderValue(entry, locale)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
