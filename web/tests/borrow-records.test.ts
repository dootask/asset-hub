import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDbForTesting } from "@/lib/db/client";
import { createAsset } from "@/lib/repositories/assets";
import { createAssetOperation } from "@/lib/repositories/asset-operations";
import {
  handleBorrowOperationCreated,
  handleReturnOperationCreated,
} from "@/lib/services/borrow-tracking";
import { listOverdueBorrowRecords } from "@/lib/repositories/borrow-records";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-borrow-records.db");

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

describe("Borrow tracking", () => {
  it("creates borrow records with planned return dates and lists overdue entries", () => {
    const asset = createAsset({
      name: "MacBook Air",
      category: "Laptop",
      status: "idle",
      companyCode: "HITOSEA",
      owner: "IT",
      location: "HQ",
      purchaseDate: "2024-01-01",
    });

    const metadata = {
      operationTemplate: {
        snapshot: {
          type: "borrow",
          labelZh: "借用",
          labelEn: "Borrow",
          requireAttachment: false,
          fields: [],
        },
        values: {
          borrower: "Alice",
          returnPlan: "2024-02-01",
        },
      },
    };

    const borrowOperation = createAssetOperation(asset.id, {
      type: "borrow",
      actor: "Ops",
      description: "借用笔记本",
      metadata,
    });
    handleBorrowOperationCreated(asset.id, borrowOperation);

    const overdue = listOverdueBorrowRecords("2024-03-01");
    expect(overdue.length).toBe(1);
    expect(overdue[0].borrower).toBe("Alice");
    expect(overdue[0].plannedReturnDate).toBe("2024-02-01");
  });

  it("marks borrow records as returned when a return operation is recorded", () => {
    const asset = createAsset({
      name: "Surface Pro",
      category: "Laptop",
      status: "in-use",
      companyCode: "HITOSEA",
      owner: "Alice",
      location: "HQ",
      purchaseDate: "2024-01-05",
    });

    const metadata = {
      operationTemplate: {
        snapshot: {
          type: "borrow",
          labelZh: "借用",
          labelEn: "Borrow",
          requireAttachment: false,
          fields: [],
        },
        values: {
          borrower: "Alice",
          returnPlan: "2024-02-10",
        },
      },
    };

    const borrowOperation = createAssetOperation(asset.id, {
      type: "borrow",
      actor: "Ops",
      metadata,
    });
    handleBorrowOperationCreated(asset.id, borrowOperation);

    const returnOperation = createAssetOperation(asset.id, {
      type: "return",
      actor: "Alice",
      metadata: {
        operationTemplate: {
          snapshot: {
            type: "return",
            labelZh: "归还",
            labelEn: "Return",
            requireAttachment: false,
            fields: [],
          },
          values: {
            receiver: "IT",
          },
        },
      },
    });
    handleReturnOperationCreated(asset.id, returnOperation);

    const overdueAfterReturn = listOverdueBorrowRecords("2024-03-01");
    expect(overdueAfterReturn.length).toBe(0);
  });
});

