import { createDooTaskClientFromContext } from "@/lib/integrations/dootask-server-client";
import { sendSystemBotMessage } from "@/lib/integrations/dootask-notifications-server";
import {
  listOverdueBorrowRecords,
  markBorrowRecordOverdueNotified,
} from "@/lib/repositories/borrow-records";

type NotifyOptions = {
  referenceDate?: string;
};

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

      const lang = (user.lang ?? "en").toLowerCase().startsWith("zh") ? "zh" : "en";
      const lines = [
        lang === "zh" ? "**借用逾期提醒**" : "**Borrow Overdue Reminder**",
        lang === "zh" ? `- 资产：${record.assetName} (#${record.assetId})` : `- Asset: ${record.assetName} (#${record.assetId})`,
        lang === "zh" ? `- 借用人：${record.borrower ?? user.nickname ?? user.userid}` : `- Borrower: ${record.borrower ?? user.nickname ?? user.userid}`,
        record.plannedReturnDate
          ? lang === "zh" ? `- 计划归还：${record.plannedReturnDate}` : `- Planned Return: ${record.plannedReturnDate}`
          : undefined,
        lang === "zh" ? `- 当前状态：未归还` : `- Current Status: Not Returned`,
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
