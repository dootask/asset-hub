import clsx from "clsx";
import type { ApprovalStatus } from "@/lib/types/approval";

const STATUS_TEXT: Record<ApprovalStatus, { zh: string; en: string }> = {
  pending: { zh: "待审批", en: "Pending" },
  approved: { zh: "已通过", en: "Approved" },
  rejected: { zh: "已驳回", en: "Rejected" },
  cancelled: { zh: "已撤销", en: "Cancelled" },
};

const STATUS_STYLES: Record<ApprovalStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200",
  cancelled: "bg-muted text-muted-foreground",
};

interface Props {
  status: ApprovalStatus;
  locale?: string;
  className?: string;
}

export default function ApprovalStatusBadge({ status, locale, className }: Props) {
  const isChinese = locale === "zh";
  const label = isChinese
    ? STATUS_TEXT[status].zh
    : STATUS_TEXT[status].en;

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {label}
    </span>
  );
}


