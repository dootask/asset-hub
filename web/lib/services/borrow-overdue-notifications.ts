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
      const user = await client.getUserInfo();
      if (!user?.id) {
        skipped.push(record.id);
        continue;
      }

      const lines = [
        "**借用逾期提醒**",
        `- 资产：${record.assetName} (#${record.assetId})`,
        `- 借用人：${record.borrower ?? user.nickname ?? user.name ?? user.id}`,
        record.plannedReturnDate
          ? `- 计划归还：${record.plannedReturnDate}`
          : undefined,
        `- 当前状态：未归还`,
      ].filter(Boolean);

      await sendSystemBotMessage({
        client,
        userId: user.id,
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
