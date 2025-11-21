import type { ConsumableOperationType } from "@/lib/types/consumable-operation";

export interface ConsumableActionConfig {
  id: ConsumableOperationType;
  labelZh: string;
  labelEn: string;
  requiresApproval: boolean;
}

const CONFIG_MAP: Record<ConsumableOperationType, ConsumableActionConfig> = {
  purchase: {
    id: "purchase",
    labelZh: "耗材采购",
    labelEn: "Consumable Purchase",
    requiresApproval: true,
  },
  inbound: {
    id: "inbound",
    labelZh: "耗材入库",
    labelEn: "Consumable Inbound",
    requiresApproval: true,
  },
  outbound: {
    id: "outbound",
    labelZh: "耗材出库",
    labelEn: "Consumable Outbound",
    requiresApproval: true,
  },
  reserve: {
    id: "reserve",
    labelZh: "耗材预留",
    labelEn: "Reserve",
    requiresApproval: false,
  },
  release: {
    id: "release",
    labelZh: "释放预留",
    labelEn: "Release",
    requiresApproval: false,
  },
  adjust: {
    id: "adjust",
    labelZh: "库存调整",
    labelEn: "Adjust",
    requiresApproval: true,
  },
  dispose: {
    id: "dispose",
    labelZh: "耗材处理",
    labelEn: "Dispose",
    requiresApproval: true,
  },
};

export const CONSUMABLE_ACTION_CONFIGS = Object.values(CONFIG_MAP);

export function getConsumableActionConfig(
  type: ConsumableOperationType,
): ConsumableActionConfig {
  return CONFIG_MAP[type];
}

