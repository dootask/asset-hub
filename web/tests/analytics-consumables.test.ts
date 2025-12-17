import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDbForTesting } from "@/lib/db/client";
import {
  getConsumableCategoryDistribution,
  getConsumableOperationSummary,
  getConsumableStatusDistribution,
} from "@/lib/repositories/analytics";
import { createConsumableCategory } from "@/lib/repositories/consumable-categories";
import { createConsumable } from "@/lib/repositories/consumables";
import { createConsumableOperation } from "@/lib/repositories/consumable-operations";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-analytics-consumables.db");

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

describe("Analytics repository (consumables)", () => {
  it("aggregates consumable status/category and operation type", () => {
    const category = createConsumableCategory({
      code: "TestCategory",
      labelZh: "测试类别",
      labelEn: "Test Category",
      unit: "pcs",
      description: "test",
    });

    const consumable = createConsumable({
      name: "Test Consumable",
      specModel: "M1",
      category: category.code,
      status: "in-stock",
      companyCode: "HITOSEA",
      quantity: 10,
      unit: "pcs",
      keeper: "QA",
      location: "Lab",
      safetyStock: 0,
    });

    createConsumableOperation(consumable.id, {
      type: "outbound",
      actor: "QA",
      quantityDelta: -1,
      description: "领取 1 个",
    });

    const statusDist = getConsumableStatusDistribution();
    expect(statusDist.some((row) => row.label === "in-stock")).toBe(true);

    const categoryDist = getConsumableCategoryDistribution(999);
    const testCategory = categoryDist.find((row) => row.label === "TestCategory");
    expect(testCategory?.count).toBe(1);

    const opDist = getConsumableOperationSummary(30);
    const outbound = opDist.find((row) => row.label === "outbound");
    expect(outbound?.count).toBe(1);
  });
});

