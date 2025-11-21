export type ConsumableInventoryTaskStatus =
  | "draft"
  | "in-progress"
  | "completed";

export type ConsumableInventoryEntryStatus = "pending" | "recorded";

export interface ConsumableInventoryTask {
  id: string;
  name: string;
  scope?: string;
  filters?: Record<string, unknown>;
  owner?: string;
  status: ConsumableInventoryTaskStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsumableInventoryTaskSummary extends ConsumableInventoryTask {
  stats: {
    totalEntries: number;
    recordedEntries: number;
    varianceEntries: number;
  };
}

export interface ConsumableInventoryEntry {
  id: string;
  taskId: string;
  consumableId: string;
  consumableName: string;
  category?: string;
  keeper?: string;
  expectedQuantity: number;
  expectedReserved: number;
  actualQuantity?: number | null;
  actualReserved?: number | null;
  varianceQuantity?: number | null;
  varianceReserved?: number | null;
  note?: string | null;
  status: ConsumableInventoryEntryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ConsumableInventoryTaskDetail extends ConsumableInventoryTask {
  entries: ConsumableInventoryEntry[];
  stats: {
    totalEntries: number;
    recordedEntries: number;
    varianceEntries: number;
  };
}

export interface CreateConsumableInventoryTaskPayload {
  name: string;
  scope?: string;
  filters?: {
    categories?: string[];
    keeper?: string;
  };
  owner?: string;
  description?: string;
  status?: ConsumableInventoryTaskStatus;
}

export interface UpdateConsumableInventoryTaskPayload {
  status?: ConsumableInventoryTaskStatus;
  entries?: Array<{
    id: string;
    actualQuantity?: number | null;
    actualReserved?: number | null;
    note?: string | null;
  }>;
}

