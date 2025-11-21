export type InventoryTaskStatus = "draft" | "in-progress" | "completed";

export interface InventoryTask {
  id: string;
  name: string;
  scope?: string;
  filters?: Record<string, unknown>;
  owner?: string;
  status: InventoryTaskStatus;
  description?: string;
  createdAt: string;
}

export interface CreateInventoryTaskPayload {
  name: string;
  scope?: string;
  filters?: Record<string, unknown>;
  owner?: string;
  description?: string;
  status?: InventoryTaskStatus;
}

