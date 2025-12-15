import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDbForTesting } from "@/lib/db/client";
import {
  createConsumable,
  deleteConsumable,
  listConsumables,
  updateConsumable,
} from "@/lib/repositories/consumables";
import { createConsumableCategory } from "@/lib/repositories/consumable-categories";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-consumables.db");

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

describe("Consumable repository", () => {
  it("creates and lists consumables", () => {
    createConsumableCategory({
      code: "PrinterSupplies",
      labelZh: "打印耗材",
      labelEn: "Printer Supplies",
    });
    createConsumable({
      name: "测试硒鼓",
      category: "PrinterSupplies",
      status: "in-stock",
      companyCode: "HITOSEA",
      quantity: 10,
      unit: "pcs",
      keeper: "Admin",
      location: "Shanghai",
      safetyStock: 5,
    });

    const result = listConsumables();
    expect(result.total).toBeGreaterThan(0);
    expect(result.items[0].name).toBe("测试硒鼓");
    expect(result.items[0].reservedQuantity).toBe(0);
  });

  it("updates and deletes consumables", () => {
    createConsumableCategory({
      code: "OfficeSupplies",
      labelZh: "办公耗材",
      labelEn: "Office Supplies",
    });
    const consumable = createConsumable({
      name: "A4 纸",
      category: "OfficeSupplies",
      status: "in-stock",
      companyCode: "HITOSEA",
      quantity: 20,
      unit: "box",
      keeper: "Ops",
      location: "SZ",
      safetyStock: 10,
    });

    const updated = updateConsumable(consumable.id, {
      ...consumable,
      quantity: 5,
      status: "low-stock",
      reservedQuantity: 2,
    });
    expect(updated?.quantity).toBe(5);
    expect(updated?.status).toBe("low-stock");
    expect(updated?.reservedQuantity).toBe(2);

    const removed = deleteConsumable(consumable.id);
    expect(removed).toBe(true);
  });
});
