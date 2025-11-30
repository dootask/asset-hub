import type { APIRequestContext } from "@playwright/test";
import { MICRO_APP_CONFIG } from "./config";
import {
  serializeUserCookieValue,
  USER_COOKIE_NAME,
} from "@/lib/utils/user-cookie";
import { normalizeUserId } from "@/lib/utils/user-id";

const API_ROOT = `${MICRO_APP_CONFIG.baseUrl}/api`;
const cookieUserId = normalizeUserId(MICRO_APP_CONFIG.userId);
if (cookieUserId === null) {
  throw new Error("PLAYWRIGHT_USER_ID 必须是可解析的数字，用于写入认证 Cookie。");
}
const DEFAULT_COOKIE =
  `${USER_COOKIE_NAME}=${serializeUserCookieValue({
    id: cookieUserId,
    nickname: "Playwright E2E",
    token: MICRO_APP_CONFIG.token,
  })}`;
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  Cookie: DEFAULT_COOKIE,
};

type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";
type ActionConfigId =
  | "purchase"
  | "inbound"
  | "receive"
  | "borrow"
  | "return"
  | "maintenance"
  | "dispose"
  | "other";

export interface TestAsset {
  id: string;
  name: string;
}

export interface TestApproval {
  id: string;
  title: string;
  assetId?: string | null;
}

interface RawActionConfig {
  id: ActionConfigId;
  requiresApproval?: number | boolean;
  defaultApproverType?: "none" | "user" | "role";
  defaultApproverRefs?: string[];
  allowOverride?: number | boolean;
  metadata?: Record<string, unknown> | null;
}

function apiUrl(path: string) {
  return `${API_ROOT}${path}`;
}

export async function createTestAsset(
  request: APIRequestContext,
  overrides?: Partial<{
    name: string;
    category: string;
    status: string;
    owner: string;
    location: string;
    purchaseDate: string;
  }>,
): Promise<TestAsset> {
  const unique = Date.now();
  const payload = {
    name: overrides?.name ?? `E2E Asset ${unique}`,
    category: overrides?.category ?? "Laptop",
    status: overrides?.status ?? "idle",
    owner: overrides?.owner ?? "QA Team",
    location: overrides?.location ?? "Test Lab",
    purchaseDate: overrides?.purchaseDate ?? "2024-01-01",
  };

  const response = await request.post(apiUrl("/assets"), {
    headers: DEFAULT_HEADERS,
    data: payload,
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test asset: ${response.status()} ${response.statusText()}`);
  }

  const body = (await response.json()) as { data: TestAsset };
  return body.data;
}

export async function createTestApproval(
  request: APIRequestContext,
  options: {
    assetId?: string;
    type?: string;
    status?: ApprovalStatus;
    title?: string;
    reason?: string;
  },
): Promise<TestApproval> {
  const unique = Date.now();
  const approvalTitle = options.title ?? `E2E Approval ${unique}`;
  const response = await request.post(apiUrl("/approvals?lang=en"), {
    headers: DEFAULT_HEADERS,
    data: {
      type: options.type ?? "purchase",
      title: approvalTitle,
      reason: options.reason ?? `Auto-generated at ${new Date(unique).toISOString()}`,
      assetId: options.assetId,
      applicant: {
        id: cookieUserId ?? MICRO_APP_CONFIG.userId,
        name: "Playwright E2E",
      },
      approver: {
        id: cookieUserId ?? MICRO_APP_CONFIG.userId,
        name: "Playwright E2E",
      },
      metadata: { initiatedFrom: "playwright" },
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test approval: ${response.status()} ${response.statusText()}`);
  }

  let body = (await response.json()) as { data: TestApproval };
  let approval = body.data;

  if (options.status && options.status !== "pending") {
    const actionMap: Record<Exclude<ApprovalStatus, "pending">, "approve" | "reject" | "cancel"> = {
      approved: "approve",
      rejected: "reject",
      cancelled: "cancel",
    };
    const action = actionMap[options.status];
    const actionResponse = await request.post(apiUrl(`/approvals/${approval.id}/actions?lang=en`), {
      headers: DEFAULT_HEADERS,
      data: {
        action,
        actor: {
          id: cookieUserId ?? MICRO_APP_CONFIG.userId,
          name: "Playwright E2E",
        },
      },
    });
    if (!actionResponse.ok()) {
      throw new Error(
        `Failed to update approval status to ${options.status}: ${actionResponse.status()} ${actionResponse.statusText()}`,
      );
    }
    body = (await actionResponse.json()) as { data: TestApproval };
    approval = body.data;
  }

  return approval;
}

export async function patchActionConfig(
  request: APIRequestContext,
  id: ActionConfigId,
  patch: Partial<{
    requiresApproval: boolean;
    defaultApproverType: "none" | "user" | "role";
    defaultApproverRefs: string[];
    allowOverride: boolean;
    metadata: Record<string, unknown> | null;
  }>,
) {
  const configsResponse = await request.get(apiUrl("/config/approvals"), {
    headers: DEFAULT_HEADERS,
  });
  if (!configsResponse.ok()) {
    throw new Error(
      `Failed to load action configs: ${configsResponse.status()} ${configsResponse.statusText()}`,
    );
  }
  const body = (await configsResponse.json()) as { data: RawActionConfig[] };
  const existing = body.data.find((entry) => entry.id === id);
  if (!existing) {
    throw new Error(`Action config ${id} not found`);
  }

  const updated = {
    requiresApproval: patch.requiresApproval ?? Boolean(existing.requiresApproval),
    defaultApproverType: patch.defaultApproverType ?? existing.defaultApproverType ?? "none",
    defaultApproverRefs: patch.defaultApproverRefs ?? existing.defaultApproverRefs ?? [],
    allowOverride: patch.allowOverride ?? Boolean(existing.allowOverride),
    metadata: patch.metadata ?? existing.metadata ?? null,
  };

  const response = await request.put(apiUrl(`/config/approvals/${id}`), {
    headers: DEFAULT_HEADERS,
    data: updated,
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to update action config ${id}: ${response.status()} ${response.statusText()}`,
    );
  }

  return existing;
}

export async function restoreActionConfig(
  request: APIRequestContext,
  config: RawActionConfig,
) {
  await request.put(apiUrl(`/config/approvals/${config.id}`), {
    headers: DEFAULT_HEADERS,
    data: {
      requiresApproval: Boolean(config.requiresApproval),
      defaultApproverType: config.defaultApproverType ?? "none",
      defaultApproverRefs: config.defaultApproverRefs ?? [],
      allowOverride: Boolean(config.allowOverride),
      metadata: config.metadata ?? null,
    },
  });
}
