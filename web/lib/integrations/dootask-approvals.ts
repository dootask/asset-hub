import { appConfig } from "@/lib/config";

interface ApplicantOrApprover {
  id?: string;
  name?: string;
}

interface CreateTodoParams {
  requestId: string;
  title: string;
  link: string;
  applicant: ApplicantOrApprover;
  approver?: ApplicantOrApprover;
}

interface CompleteTodoParams {
  externalId: string;
  requestId: string;
  status: "approved" | "rejected" | "cancelled";
  result?: string | null;
}

const API_BASE = (appConfig.dootask.apiBaseUrl ?? "").replace(/\/$/, "");
const API_TOKEN = appConfig.dootask.apiToken?.trim();
const INTEGRATION_ENABLED = Boolean(API_BASE && API_TOKEN);

async function request<T>(
  path: string,
  options: RequestInit & { method: string },
): Promise<T | null> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`DooTask request failed (${response.status})`);
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function createApprovalTodo(params: CreateTodoParams) {
  if (!INTEGRATION_ENABLED) {
    console.info("[dootask] createApprovalTodo skipped", params.requestId);
    return null;
  }

  try {
    const payload = {
      title: params.title,
      link: params.link,
      applicant: params.applicant,
      approver: params.approver,
      metadata: {
        requestId: params.requestId,
      },
    };

    const data = await request<{ id?: string; data?: { id?: string } }>(
      "/todos",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    const externalId = data?.data?.id ?? data?.id ?? null;
    if (!externalId) {
      throw new Error("Missing external todo id");
    }

    return { externalId };
  } catch (error) {
    console.error("[dootask] createApprovalTodo failed", error);
    return null;
  }
}

export async function completeApprovalTodo(params: CompleteTodoParams) {
  if (!INTEGRATION_ENABLED) {
    console.info("[dootask] completeApprovalTodo skipped", params.requestId);
    return null;
  }

  try {
    await request(`/todos/${params.externalId}/complete`, {
      method: "POST",
      body: JSON.stringify({
        status: params.status,
        result: params.result,
      }),
    });
    return { ok: true };
  } catch (error) {
    console.error(
      "[dootask] completeApprovalTodo failed",
      params.requestId,
      error,
    );
    return null;
  }
}


