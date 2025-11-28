import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import BackupManager from "@/components/system/BackupManager";
import { listBackups } from "@/lib/repositories/backups";
import { appConfig } from "@/lib/config";

type PageParams = { locale: string };

export const metadata: Metadata = {
  title: "Backup & Restore - Asset Hub",
};

export default async function BackupPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale } = await params;
  const isChinese = locale === "zh";
  const backups = listBackups();

  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        items={[
          { href: `/${locale}/system`, labelZh: "系统管理", labelEn: "System" },
          {
            labelZh: "备份与还原",
            labelEn: "Backup & Restore",
          },
        ]}
        title={isChinese ? "数据库备份与还原" : "Database Backup & Restore"}
        description={
          isChinese
            ? "创建数据库备份、下载存档，或从历史备份还原。仅系统管理员可用。"
            : "Create, download, and restore database snapshots. Admin-only."
        }
      />

      <BackupManager
        locale={locale}
        dbPath={appConfig.db.filePath}
        initialBackups={backups}
      />
    </div>
  );
}
