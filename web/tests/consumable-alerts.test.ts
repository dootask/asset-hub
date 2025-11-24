import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTesting } from "@/lib/db/client";
import {
  listConsumableAlerts,
  resolveConsumableAlertById,
  resolveAlertsForConsumable,
  syncConsumableAlertSnapshot,
} from "@/lib/repositories/consumable-alerts";
import { createConsumable } from "@/lib/repositories/consumables";
import { createConsumableCategory } from "@/lib/repositories/consumable-categories";
import type { ConsumableStatus } from "@/lib/types/consumable";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-consumable-alerts.db");
let categorySeeded = false;

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.ASSET_HUB_DB_PATH = TEST_DB_PATH;
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.rmSync(TEST_DB_PATH);
  }
  resetDbForTesting();
  categorySeeded = false;
});

describe("Consumable alerts repository", () => {
  function ensureCategory() {
    if (!categorySeeded) {
      createConsumableCategory({
        code: "Office",
        labelZh: "办公",
        labelEn: "Office",
      });
      categorySeeded = true;
    }
  }

  function seedConsumable(
    overrides?: Partial<{
      quantity: number;
      reservedQuantity: number;
      status: ConsumableStatus;
      name: string;
    }>,
  ) {
    ensureCategory();
    return createConsumable({
      name: overrides?.name ?? "Test Consumable",
      category: "Office",
      status: overrides?.status ?? "in-stock",
      companyCode: "NEBULA",
      quantity: overrides?.quantity ?? 10,
      reservedQuantity: overrides?.reservedQuantity ?? 0,
      unit: "pcs",
      keeper: "Ops",
      location: "Shelf",
      safetyStock: 5,
      description: "",
    });
  }

  it("creates and updates alerts based on low stock snapshots", () => {
    const consumable = seedConsumable({ name: "A4 纸" });
    const result = syncConsumableAlertSnapshot({
      consumableId: consumable.id,
      consumableName: "A4 纸",
      keeper: "Ops",
      status: "low-stock",
      quantity: 3,
      reservedQuantity: 1,
    });

    expect(result?.created).toBeTruthy();
    let alerts = listConsumableAlerts({ status: ["open"] });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.level).toBe("low-stock");

    // Update snapshot to out-of-stock
    syncConsumableAlertSnapshot({
      consumableId: consumable.id,
      consumableName: "A4 纸",
      keeper: "Ops",
      status: "out-of-stock",
      quantity: 0,
      reservedQuantity: 0,
    });

    alerts = listConsumableAlerts({ status: ["open"] });
    expect(alerts[0]?.level).toBe("out-of-stock");
  });

  it("resolves alerts when stock recovers", () => {
    const consumable = seedConsumable({ quantity: 0, status: "out-of-stock", name: "墨盒" });
    syncConsumableAlertSnapshot({
      consumableId: consumable.id,
      consumableName: "墨盒",
      keeper: "Ops",
      status: "out-of-stock",
      quantity: 0,
      reservedQuantity: 0,
    });
    const openBefore = listConsumableAlerts({ status: ["open"] });
    expect(openBefore).toHaveLength(1);

    const result = syncConsumableAlertSnapshot({
      consumableId: consumable.id,
      consumableName: "墨盒",
      keeper: "Ops",
      status: "in-stock",
      quantity: 12,
      reservedQuantity: 2,
    });
    expect(result?.resolved?.length).toBe(1);

    const openAfter = listConsumableAlerts({ status: ["open"] });
    expect(openAfter).toHaveLength(0);
  });

  it("resolves alerts by id", () => {
    const consumable = seedConsumable({ name: "标签纸" });
    const created = syncConsumableAlertSnapshot({
      consumableId: consumable.id,
      consumableName: "标签纸",
      status: "low-stock",
      quantity: 1,
      reservedQuantity: 0,
    })?.created;
    expect(created).toBeTruthy();

    const resolved = resolveConsumableAlertById(created!.id);
    expect(resolved?.status).toBe("resolved");

    const stillOpen = listConsumableAlerts({ status: ["open"] });
    expect(stillOpen).toHaveLength(0);
  });

  it("resolves alerts for consumable", () => {
    const consumable = seedConsumable({
      quantity: 0,
      status: "out-of-stock",
      name: "螺丝刀",
    });
    syncConsumableAlertSnapshot({
      consumableId: consumable.id,
      consumableName: consumable.name,
      status: "out-of-stock",
      quantity: 0,
      reservedQuantity: 0,
    });
    const resolved = resolveAlertsForConsumable(consumable.id);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.status).toBe("resolved");
  });
});

