import type { DooTaskClient } from "@dootask/tools";

type BotPayload = {
  client: DooTaskClient | null;
  userId?: string | number | null;
  text: string;
};

async function sendBotMessage({
  client,
  userId,
  text,
  botType,
}: BotPayload & { botType: "approval-alert" | "system-msg" }) {
  if (!client) return;
  const id = typeof userId === "number" ? userId : Number(userId);
  if (!Number.isFinite(id)) return;
  await client.sendBotMessage({
    userid: id,
    text,
    bot_type: botType,
    text_type: "md",
  });
}

export async function sendApprovalBotMessage(payload: BotPayload) {
  await sendBotMessage({ ...payload, botType: "approval-alert" });
}

export async function sendSystemBotMessage(payload: BotPayload) {
  await sendBotMessage({ ...payload, botType: "system-msg" });
}
