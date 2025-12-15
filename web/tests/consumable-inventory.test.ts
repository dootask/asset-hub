import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDbForTesting } from "@/lib/db/client";
import {
  createConsumableInventoryTask,
  getConsumableInventoryTask,
  listConsumableInventoryTasks,
  updateConsumableInventoryTask,
} from "@/lib/repositories/consumable-inventory";
import { createConsumableCategory } from "@/lib/repositories/consumable-categories";
import { createConsumable } from "@/lib/repositories/consumables";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-consumable-inventory.db");

afterEach(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("ASSET_HUB_DB_PATH", TEST_DB_PATH);
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.rmSync(TEST_DB_PATH);
  }
  resetDbForTesting();
});

describe("Consumable inventory repository", () => {
  it("creates tasks and generates entries based on filters", () => {
    createConsumableCategory({
      code: "Office",
      labelZh: "办公",
      labelEn: "Office",
    });
    createConsumableCategory({
      code: "Print",
      labelZh: "打印",
      labelEn: "Print",
    });

    const officeConsumable = createConsumable({
      name: "A4 纸",
      category: "Office",
      status: "in-stock",
      companyCode: "HITOSEA",
      quantity: 20,
      reservedQuantity: 2,
      unit: "box",
      keeper: "Ops",
      location: "Shanghai",
      safetyStock: 5,
    });
    createConsumable({
      name: "墨盒",
      category: "Print",
      status: "in-stock",
      companyCode: "HITOSEA",
      quantity: 5,
      reservedQuantity: 1,
      unit: "pcs",
      keeper: "Ops",
      location: "Shanghai",
      safetyStock: 2,
    });

    const task = createConsumableInventoryTask({
      name: "办公用品盘点",
      filters: { categories: ["Office"] },
      status: "in-progress",
    });

    expect(task.entries).toHaveLength(1);
    expect(task.entries[0]?.consumableId).toBe(officeConsumable.id);
    expect(task.entries[0]?.expectedQuantity).toBe(20);

    const summaries = listConsumableInventoryTasks();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.stats.totalEntries).toBe(1);
  });

  it("records actual quantities and updates status automatically", () => {
    createConsumableCategory({
      code: "Office",
      labelZh: "办公",
      labelEn: "Office",
    });
    const consumable = createConsumable({
      name: "签字笔",
      category: "Office",
      status: "in-stock",
      companyCode: "HITOSEA",
      quantity: 30,
      reservedQuantity: 4,
      unit: "box",
      keeper: "Admin",
      location: "Beijing",
      safetyStock: 10,
    });

    const task = createConsumableInventoryTask({
      name: "Q3 盘点",
      status: "in-progress",
    });
    const entryId = task.entries[0]?.id;
    expect(entryId).toBeDefined();

    const updated = updateConsumableInventoryTask(task.id, {
      entries: [
        {
          id: entryId!,
          actualQuantity: 28,
          actualReserved: 5,
          note: "缺少两盒，预留多 1",
        },
      ],
    });

    expect(updated?.entries[0]?.varianceQuantity).toBe(-2);
    expect(updated?.entries[0]?.varianceReserved).toBe(1);
    expect(updated?.entries[0]?.status).toBe("recorded");

    const refreshed = getConsumableInventoryTask(task.id);
    expect(refreshed?.stats.recordedEntries).toBe(1);

    // auto-complete once all entries recorded
    expect(refreshed?.status).toBe("completed");

    // ensure consumable stayed untouched
    const entry = refreshed?.entries[0];
    expect(entry?.consumableId).toBe(consumable.id);
  });
});
