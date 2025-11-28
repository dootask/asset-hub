import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTesting } from "@/lib/db/client";
import { createConsumableCategory } from "@/lib/repositories/consumable-categories";
import {
  createConsumable,
  getConsumableById,
} from "@/lib/repositories/consumables";
import {
  createConsumableOperation,
  listOperationsForConsumable,
  queryConsumableOperations,
  updateConsumableOperationStatus,
} from "@/lib/repositories/consumable-operations";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-consumable-ops.db");

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.ASSET_HUB_DB_PATH = TEST_DB_PATH;
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.rmSync(TEST_DB_PATH);
  }
  resetDbForTesting();
});

describe("Consumable operations", () => {
  it("applies inbound and outbound deltas to stock levels", () => {
    createConsumableCategory({
      code: "PrinterSupplies",
      labelZh: "打印耗材",
      labelEn: "Printer Supplies",
    });
    const consumable = createConsumable({
      name: "测试硒鼓",
      category: "PrinterSupplies",
      status: "in-stock",
      companyCode: "HITOSEA",
      quantity: 10,
      unit: "pcs",
      keeper: "Admin",
      location: "Shanghai",
      safetyStock: 8,
    });

    createConsumableOperation(consumable.id, {
      type: "inbound",
      actor: "Admin",
      description: "入库补货",
      quantityDelta: 5,
    });

    let updated = getConsumableById(consumable.id)!;
    expect(updated.quantity).toBe(15);
    expect(updated.status).toBe("in-stock");

    const outbound = createConsumableOperation(consumable.id, {
      type: "outbound",
      actor: "Admin",
      description: "发放",
      quantityDelta: -8,
      status: "pending",
    });

    updated = getConsumableById(consumable.id)!;
    expect(updated.quantity).toBe(15);

    updateConsumableOperationStatus(outbound.id, "done");

    updated = getConsumableById(consumable.id)!;
    expect(updated.quantity).toBe(7);
    expect(updated.status).toBe("low-stock");
  });

  it("tracks reserved quantity and prevents invalid deductions", () => {
    createConsumableCategory({
      code: "OfficeSupplies",
      labelZh: "办公用品",
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
      safetyStock: 5,
    });

    createConsumableOperation(consumable.id, {
      type: "reserve",
      actor: "Ops",
      description: "为项目预留",
      reservedDelta: 20,
    });

    const updated = getConsumableById(consumable.id)!;
    expect(updated.reservedQuantity).toBe(20);
    expect(updated.status).toBe("reserved");

    expect(() =>
      createConsumableOperation(consumable.id, {
        type: "outbound",
        actor: "Ops",
        description: "超额出库",
        quantityDelta: -25,
      }),
    ).toThrow(/库存不足/);

    const history = listOperationsForConsumable(consumable.id);
    expect(history).toHaveLength(1);
    expect(history[0].type).toBe("reserve");
  });

  it("generates audit report with filters and summary", () => {
    createConsumableCategory({
      code: "Ops",
      labelZh: "运维",
      labelEn: "Ops",
    });
    const consumable = createConsumable({
      name: "标签纸",
      category: "Ops",
      status: "in-stock",
      companyCode: "HITOSEA",
      quantity: 5,
      unit: "roll",
      keeper: "OpsTeam",
      location: "SZ",
      safetyStock: 2,
    });

    createConsumableOperation(consumable.id, {
      type: "inbound",
      actor: "OpsTeam",
      description: "补货",
      quantityDelta: 7,
    });

    createConsumableOperation(consumable.id, {
      type: "outbound",
      actor: "OpsTeam",
      description: "发放",
      quantityDelta: -3,
      status: "pending",
    });

    const report = queryConsumableOperations({
      keeper: "Ops",
      types: ["inbound", "outbound"],
    });

    expect(report.items).toHaveLength(2);
    expect(report.summary.totalOperations).toBe(2);
    expect(report.summary.pendingOperations).toBe(1);
    expect(report.summary.inboundQuantity).toBe(7);
    expect(report.summary.outboundQuantity).toBe(3);
    expect(report.summary.netQuantity).toBe(4);
  });
});

