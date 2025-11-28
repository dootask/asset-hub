"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import type { BackupRecord } from "@/lib/types/backup";

interface Props {
  locale: string;
  dbPath: string;
  initialBackups: BackupRecord[];
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function formatDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BackupManager({ locale, dbPath, initialBackups }: Props) {
  const isChinese = locale === "zh";
  const feedback = useAppFeedback();
  const [backups, setBackups] = useState<BackupRecord[]>(initialBackups);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const sortedBackups = useMemo(
    () =>
      backups.slice().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [backups],
  );

  const refresh = async () => {
    const client = await getApiClient();
    const { data } = await client.get<{ data: BackupRecord[] }>(
      "/apps/asset-hub/api/system/backups",
    );
    setBackups(data.data);
  };

  const handleCreate = () => {
    startTransition(async () => {
      try {
        const client = await getApiClient();
        const { data } = await client.post<{ data: BackupRecord }>(
          "/apps/asset-hub/api/system/backups",
          { note: note.trim() || undefined },
        );
        setBackups((prev) => [data.data, ...prev]);
        setNote("");
        feedback.success(isChinese ? "备份已创建。" : "Backup created.");
      } catch (error) {
        const message = extractApiErrorMessage(
          error,
          isChinese ? "备份失败，请稍后重试。" : "Failed to create backup.",
        );
        feedback.error(message, { blocking: true });
      }
    });
  };

  const handleRestore = (backup: BackupRecord) => {
    const confirmed = window.confirm(
      isChinese
        ? `确定要从备份「${backup.filename}」还原吗？当前数据将被覆盖，请在业务低峰执行。`
        : `Restore from backup "${backup.filename}"? This will overwrite current data. Proceed during maintenance window.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        const client = await getApiClient();
        await client.post(
          `/apps/asset-hub/api/system/backups/${encodeURIComponent(backup.id)}/restore`,
        );
        feedback.success(
          isChinese ? "还原完成，请刷新页面查看最新数据。" : "Restore completed. Refresh to see latest data.",
          { blocking: true },
        );
      } catch (error) {
        const message = extractApiErrorMessage(
          error,
          isChinese ? "还原失败，请稍后重试。" : "Restore failed. Please try again.",
        );
        feedback.error(message, { blocking: true });
      }
    });
  };

  const handleDelete = (backup: BackupRecord) => {
    const confirmed = window.confirm(
      isChinese
        ? `确定要删除备份「${backup.filename}」吗？操作不可撤销。`
        : `Delete backup "${backup.filename}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        const client = await getApiClient();
        await client.delete(
          `/apps/asset-hub/api/system/backups/${encodeURIComponent(backup.id)}`,
        );
        setBackups((prev) => prev.filter((item) => item.id !== backup.id));
        feedback.success(isChinese ? "已删除备份。" : "Backup deleted.");
      } catch (error) {
        const message = extractApiErrorMessage(
          error,
          isChinese ? "删除失败，请稍后重试。" : "Failed to delete backup.",
        );
        feedback.error(message);
      }
    });
  };

  const handleDownload = (backup: BackupRecord) => {
    const url = `/apps/asset-hub/api/system/backups/${encodeURIComponent(backup.id)}/download`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const hasBackups = sortedBackups.length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-amber-200/60 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="font-semibold">
          {isChinese ? "高风险操作提示" : "High-risk operation notice"}
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            {isChinese
              ? "还原会覆盖当前数据库，请在维护窗口执行并提前通知使用者。"
              : "Restore overwrites the current database; run during maintenance windows and notify users."}
          </li>
          <li>
            {isChinese
              ? `当前数据库文件：${dbPath}`
              : `Current database file: ${dbPath}`}
          </li>
          <li>
            {isChinese
              ? "下载的备份文件包含所有数据，请妥善存储。"
              : "Downloaded backups contain all data; store them securely."}
          </li>
        </ul>
      </div>

      <div className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 lg:flex-row lg:items-center">
            <Input
              className="lg:max-w-md"
              placeholder={
                isChinese ? "可选备注，例如“导入前备份”" : "Optional note, e.g. \"pre-import backup\""
              }
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={refresh} disabled={pending}>
              {isChinese ? "刷新" : "Refresh"}
            </Button>
            <Button onClick={handleCreate} disabled={pending}>
              {pending
                ? isChinese
                  ? "执行中..."
                  : "Working..."
                : isChinese
                  ? "立即备份"
                  : "Create backup"}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isChinese ? "备份列表" : "Backup list"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isChinese
              ? "包含手动创建和自动生成的备份（如还原前的安全副本）。"
              : "Includes manual backups and auto safety snapshots created before restores."}
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isChinese ? "文件名" : "Filename"}</TableHead>
                <TableHead>{isChinese ? "创建时间" : "Created"}</TableHead>
                <TableHead>{isChinese ? "大小" : "Size"}</TableHead>
                <TableHead>{isChinese ? "备注" : "Note"}</TableHead>
                <TableHead className="text-right">
                  {isChinese ? "操作" : "Actions"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hasBackups ? (
                sortedBackups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="font-mono text-xs md:text-sm">
                      {backup.filename}
                    </TableCell>
                    <TableCell>{formatDate(backup.createdAt, locale)}</TableCell>
                    <TableCell>{formatSize(backup.size)}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-muted-foreground">
                      {backup.note ?? (isChinese ? "—" : "—")}
                    </TableCell>
                    <TableCell className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(backup)}
                        disabled={pending}
                      >
                        {isChinese ? "下载" : "Download"}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRestore(backup)}
                        disabled={pending}
                      >
                        {isChinese ? "还原" : "Restore"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(backup)}
                        disabled={pending}
                      >
                        {isChinese ? "删除" : "Delete"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    {isChinese ? "暂无备份" : "No backups yet"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
