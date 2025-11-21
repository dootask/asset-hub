export type ConsumableAlertLevel = "low-stock" | "out-of-stock";
export type ConsumableAlertStatus = "open" | "resolved";

export interface ConsumableAlert {
  id: string;
  consumableId: string;
  consumableName: string;
  keeper?: string | null;
  level: ConsumableAlertLevel;
  status: ConsumableAlertStatus;
  message?: string | null;
  quantity: number;
  reservedQuantity: number;
  externalTodoId?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

