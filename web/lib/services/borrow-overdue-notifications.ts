import { normalizeLocale } from "@/lib/i18n";
import { createDooTaskClientFromContext } from "@/lib/integrations/dootask-server-client";
import { sendSystemBotMessage } from "@/lib/integrations/dootask-notifications-server";
import {
  listOverdueBorrowRecords,
  markBorrowRecordOverdueNotified,
} from "@/lib/repositories/borrow-records";
import { getAssetById } from "@/lib/repositories/assets";

type NotifyOptions = {
  referenceDate?: string;
};

function buildOpenMicroAppLine(assetId: string | number, locale: string) {
  const url = `/apps/asset-hub/{system_lang}/assets/${assetId}?theme={system_theme}`;
  const appConfig = JSON.stringify({
    id: "asset-hub",
    name: "asset-hub-borrow",
    immersive: true,
    keep_alive: false,
    url_type: "iframe",
    url,
  });
  const label =
    locale === "zh"
      ? "查看详情：打开资产以归还或续借"
      : "Details: Open asset to return or extend";
  return `> <div class="open-micro-app" data-app-config='${appConfig}'>${label}</div>`;
}

export async function sendBorrowOverdueNotifications(options: NotifyOptions = {}) {
  const overdue = listOverdueBorrowRecords(options.referenceDate);

  let sent = 0;
  const skipped: string[] = [];
  const errors: Array<{ id: string; message: string }> = [];

  for (const record of overdue) {
    if (record.overdueNotifiedAt) {
      skipped.push(record.id);
      continue;
    }

    const client = createDooTaskClientFromContext({
      token: record.borrowerToken ?? undefined,
      serverOrigin: record.serverOrigin ?? undefined,
    });

    if (!client) {
      skipped.push(record.id);
      continue;
    }

    try {
      const user = Object.assign({
        lang: "en",
      }, await client.getUserInfo());
      if (!user?.userid) {
        skipped.push(record.id);
        continue;
      }

      const lang = normalizeLocale(user.lang);
      const asset = getAssetById(record.assetId);
      const assetNo = asset?.assetNo ?? record.assetId;
      const lines = [
        lang === "zh" ? "**借用逾期提醒**" : "**Borrow Overdue Reminder**",
        lang === "zh"
          ? `- 资产：${record.assetName} (#${assetNo})`
          : `- Asset: ${record.assetName} (#${assetNo})`,
        lang === "zh" ? `- 借用人：${record.borrower ?? user.nickname ?? user.userid}` : `- Borrower: ${record.borrower ?? user.nickname ?? user.userid}`,
        record.plannedReturnDate
          ? lang === "zh" ? `- 计划归还：${record.plannedReturnDate}` : `- Planned Return: ${record.plannedReturnDate}`
          : undefined,
        lang === "zh" ? `- 当前状态：未归还` : `- Current Status: Not Returned`,
        buildOpenMicroAppLine(record.assetId, lang),
      ].filter(Boolean);

      await sendSystemBotMessage({
        client,
        userId: user.userid,
        text: lines.join("\n"),
      });

      markBorrowRecordOverdueNotified(record.id);
      sent += 1;
    } catch (error) {
      errors.push({
        id: record.id,
        message: error instanceof Error ? error.message : "未知错误",
      });
    }
  }

  return {
    total: overdue.length,
    sent,
    skipped,
    errors,
  };
}
