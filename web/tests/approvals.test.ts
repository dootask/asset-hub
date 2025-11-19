import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTesting } from "@/lib/db/client";
import { createAsset } from "@/lib/repositories/assets";
import { createAssetOperation } from "@/lib/repositories/asset-operations";
import {
  applyApprovalAction,
  createApprovalRequest,
  listApprovalRequests,
} from "@/lib/repositories/approvals";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-approvals.db");

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.ASSET_HUB_DB_PATH = TEST_DB_PATH;
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.rmSync(TEST_DB_PATH);
  }
  resetDbForTesting();
});

describe("Approval repository", () => {
  it("creates approval requests and lists them with filters", () => {
    const asset = createAsset({
      name: "Test Device",
      category: "Laptop",
      status: "idle",
      owner: "QA",
      location: "Lab",
      purchaseDate: "2024-03-01",
    });

    const operation = createAssetOperation(asset.id, {
      type: "purchase",
      actor: "QA",
      description: "申请采购",
      status: "pending",
    });

    createApprovalRequest({
      type: "purchase",
      title: "采购审批",
      reason: "入职需要设备",
      assetId: asset.id,
      operationId: operation.id,
      applicant: { id: "user-1", name: "QA" },
      approver: { id: "approver-1", name: "Leader" },
    });

    const result = listApprovalRequests({
      role: "my-requests",
      userId: "user-1",
    });

    expect(result.meta.total).toBe(1);
    expect(result.data[0].status).toBe("pending");
  });

  it("applies approval actions and updates status", () => {
    const asset = createAsset({
      name: "Camera",
      category: "Security",
      status: "in-use",
      owner: "Ops",
      location: "HQ",
      purchaseDate: "2023-12-01",
    });

    const operation = createAssetOperation(asset.id, {
      type: "inbound",
      actor: "Ops",
      description: "入库确认",
      status: "pending",
    });

    const approval = createApprovalRequest({
      type: "inbound",
      title: "入库审批",
      applicant: { id: "ops-user" },
      approver: { id: "manager-1", name: "Manager" },
      assetId: asset.id,
      operationId: operation.id,
    });

    const updated = applyApprovalAction(approval.id, {
      action: "approve",
      comment: "同意入库",
      actor: { id: "manager-1", name: "Manager" },
    });

    expect(updated.status).toBe("approved");
    expect(updated.result).toBe("同意入库");
  });
});


