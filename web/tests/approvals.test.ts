import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTesting } from "@/lib/db/client";
import { createAsset } from "@/lib/repositories/assets";
import {
  createAssetOperation,
  listOperationsForAsset,
} from "@/lib/repositories/asset-operations";
import {
  applyApprovalAction,
  createApprovalRequest,
  listApprovalRequests,
  reassignApprovalApprover,
} from "@/lib/repositories/approvals";
import { getAssetById } from "@/lib/repositories/assets";
import { createConsumableCategory } from "@/lib/repositories/consumable-categories";
import {
  createConsumable,
  getConsumableById,
} from "@/lib/repositories/consumables";
import { createConsumableOperation } from "@/lib/repositories/consumable-operations";

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
      companyCode: "HITOSEA",
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

  it('lists "all" approvals within user scope (applicant + approver)', () => {
    const asset = createAsset({
      name: "Test Device",
      category: "Laptop",
      status: "idle",
      companyCode: "HITOSEA",
      owner: "QA",
      location: "Lab",
      purchaseDate: "2024-03-01",
    });

    const op1 = createAssetOperation(asset.id, {
      type: "purchase",
      actor: "QA",
      description: "申请采购",
      status: "pending",
    });
    createApprovalRequest({
      type: "purchase",
      title: "采购审批-我发起",
      assetId: asset.id,
      operationId: op1.id,
      applicant: { id: "user-1", name: "QA" },
      approver: { id: "approver-1", name: "Leader" },
    });

    const op2 = createAssetOperation(asset.id, {
      type: "inbound",
      actor: "QA",
      description: "入库确认",
      status: "pending",
    });
    createApprovalRequest({
      type: "inbound",
      title: "入库审批-待我审批",
      assetId: asset.id,
      operationId: op2.id,
      applicant: { id: "someone-else", name: "Other" },
      approver: { id: "user-1", name: "QA" },
    });

    const result = listApprovalRequests({ role: "all", userId: "user-1" });
    expect(result.meta.total).toBe(2);
    expect(result.data.map((item) => item.title).sort()).toEqual(
      ["采购审批-我发起", "入库审批-待我审批"].sort(),
    );
  });

  it("applies approval actions, updates asset state, and records metadata", () => {
    const asset = createAsset({
      name: "Camera",
      category: "Security",
      status: "in-use",
      companyCode: "HITOSEA",
      owner: "Ops",
      location: "HQ",
      purchaseDate: "2023-12-01",
    });

    const operation = createAssetOperation(asset.id, {
      type: "inbound",
      actor: "Ops",
      description: "入库确认",
      status: "pending",
      metadata: {
        operationTemplate: {
          snapshot: {
            type: "inbound",
            labelZh: "入库确认",
            labelEn: "Inbound",
            requireAttachment: false,
            fields: [
              {
                key: "receiver",
                labelZh: "收货人",
                labelEn: "Receiver",
                widget: "text",
              },
            ],
          },
          values: {
            receiver: "Ops User",
          },
        },
      },
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

    const updatedAsset = getAssetById(asset.id);
    expect(updatedAsset?.owner).toBe("Ops User");
    expect(updatedAsset?.status).toBe("idle");
  });

  it("creates asset + purchase operation + pending inbound after purchase approval passes (new asset)", () => {
    const approval = createApprovalRequest({
      type: "purchase",
      title: "采购审批",
      reason: "扩容需求",
      applicant: { id: "infra-1", name: "Infra" },
      approver: { id: "cfo-1", name: "CFO" },
      metadata: {
        purchaseAsset: { mode: "new" },
        newAsset: {
          name: "Server",
          category: "Server",
          companyCode: "HITOSEA",
          owner: "Infra",
          location: "DC",
        },
        operationTemplate: {
          snapshot: {
            type: "purchase",
            labelZh: "采购申请",
            labelEn: "Purchase",
            requireAttachment: false,
            fields: [
              {
                key: "budget",
                labelZh: "预算",
                labelEn: "Budget",
                widget: "number",
              },
            ],
          },
          values: {
            budget: 120000,
          },
        },
      },
    });

    const updated = applyApprovalAction(approval.id, {
      action: "approve",
      actor: { id: "cfo-1", name: "CFO" },
    });

    expect(updated.assetId).toBeTruthy();
    const assetId = updated.assetId!;
    expect(getAssetById(assetId)).toBeTruthy();

    const operations = listOperationsForAsset(assetId);
    const purchaseOperation = operations.find(
      (operation) =>
        operation.type === "purchase" &&
        (operation.metadata as { autoGeneratedFromApprovalId?: unknown })
          ?.autoGeneratedFromApprovalId === approval.id,
    );
    expect(purchaseOperation).toBeDefined();

    const pendingInbound = operations.find(
      (operation) =>
        operation.type === "inbound" &&
        operation.status === "pending" &&
        (operation.metadata as { autoGeneratedFromApprovalId?: unknown })
          ?.autoGeneratedFromApprovalId === approval.id,
    );
    expect(pendingInbound).toBeDefined();
    expect(
      (pendingInbound?.metadata as { operationTemplate?: unknown })
        ?.operationTemplate,
    ).toBeTruthy();
  });

  it("links existing asset and does not create inbound operation (existing asset)", () => {
    const asset = createAsset({
      name: "Server",
      category: "Server",
      status: "idle",
      companyCode: "HITOSEA",
      owner: "Infra",
      location: "DC",
      purchaseDate: "2024-01-01",
    });

    const approval = createApprovalRequest({
      type: "purchase",
      title: "采购审批",
      reason: "扩容需求",
      assetId: asset.id,
      applicant: { id: "infra-1", name: "Infra" },
      approver: { id: "cfo-1", name: "CFO" },
      metadata: { purchaseAsset: { mode: "existing", assetId: asset.id } },
    });

    applyApprovalAction(approval.id, {
      action: "approve",
      actor: { id: "cfo-1", name: "CFO" },
    });

    const operations = listOperationsForAsset(asset.id);
    const purchaseOperation = operations.find(
      (operation) =>
        operation.type === "purchase" &&
        (operation.metadata as { autoGeneratedFromApprovalId?: unknown })
          ?.autoGeneratedFromApprovalId === approval.id,
    );
    expect(purchaseOperation).toBeDefined();

    const pendingInbound = operations.find(
      (operation) =>
        operation.type === "inbound" &&
        (operation.metadata as { autoGeneratedFromApprovalId?: unknown })
          ?.autoGeneratedFromApprovalId === approval.id,
    );
    expect(pendingInbound).toBeUndefined();
  });

  it("reassigns approver for pending approvals and records history", () => {
    const approval = createApprovalRequest({
      type: "purchase",
      title: "采购审批",
      applicant: { id: "user-1", name: "Applicant" },
      approver: { id: "approver-1", name: "Leader A" },
      metadata: { source: "test" },
    });

    const updated = reassignApprovalApprover(approval.id, {
      approver: { id: "approver-2", name: "Leader B" },
      actor: { id: "user-1", name: "Applicant" },
    });

    expect(updated.approverId).toBe("approver-2");
    expect(updated.approverName).toBe("Leader B");
    expect(updated.metadata?.source).toBe("test");

    const history = (updated.metadata as { approverReassignments?: unknown })
      ?.approverReassignments;
    expect(Array.isArray(history)).toBe(true);
    expect((history as unknown[]).length).toBe(1);
    expect(
      (history as Array<{ to?: { id?: string } }>)[0]?.to?.id,
    ).toBe("approver-2");
  });

  it("prevents reassigning approver after approval is handled", () => {
    const asset = createAsset({
      name: "Device",
      category: "Laptop",
      status: "in-use",
      companyCode: "HITOSEA",
      owner: "Ops",
      location: "HQ",
      purchaseDate: "2024-01-01",
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

    applyApprovalAction(approval.id, {
      action: "approve",
      actor: { id: "manager-1", name: "Manager" },
    });

    expect(() =>
      reassignApprovalApprover(approval.id, {
        approver: { id: "manager-2", name: "Manager 2" },
        actor: { id: "ops-user", name: "Ops" },
      }),
    ).toThrow(/无法更换审批人/);
  });

  it("auto creates receive operations when approval lacks operation link", () => {
    const asset = createAsset({
      name: "ThinkPad",
      category: "Laptop",
      status: "idle",
      companyCode: "HITOSEA",
      owner: "仓库",
      location: "上海",
      purchaseDate: "2024-02-01",
    });

    const approval = createApprovalRequest({
      type: "receive",
      title: "新人领用",
      reason: "新员工入职",
      assetId: asset.id,
      applicant: { id: "user-ops", name: "Ops User" },
      approver: { id: "manager-ops", name: "Manager" },
      metadata: {
        operationTemplate: {
          snapshot: {
            type: "receive",
            labelZh: "领用",
            labelEn: "Receive",
            requireAttachment: false,
            fields: [
              { key: "receiver", labelZh: "领用人", labelEn: "Receiver", widget: "text" },
              { key: "purpose", labelZh: "用途", labelEn: "Purpose", widget: "textarea" },
            ],
          },
          values: {
            receiver: "新人小张",
            purpose: "研发办公",
          },
        },
      },
    });

    const updated = applyApprovalAction(approval.id, {
      action: "approve",
      actor: { id: "manager-ops", name: "Manager" },
    });

    expect(updated.operationId).toBeTruthy();
    const updatedAsset = getAssetById(asset.id);
    expect(updatedAsset?.status).toBe("in-use");
    expect(updatedAsset?.owner).toBe("新人小张");

    const operations = listOperationsForAsset(asset.id);
    const receiveOp = operations.find((op) => op.id === updated.operationId);
    expect(receiveOp?.type).toBe("receive");
    expect(
      (receiveOp?.metadata as { operationTemplate?: unknown })?.operationTemplate,
    ).toBeTruthy();
  });

  it("auto links return operations and falls back to receiver for owner update", () => {
    const asset = createAsset({
      name: "iPad",
      category: "Tablet",
      status: "in-use",
      companyCode: "HITOSEA",
      owner: "新人小张",
      location: "北京",
      purchaseDate: "2023-08-15",
    });

    const approval = createApprovalRequest({
      type: "return",
      title: "归还 iPad",
      reason: "项目结束",
      assetId: asset.id,
      applicant: { id: "user-ops", name: "Ops" },
      approver: { id: "manager-ops", name: "Manager" },
      metadata: {
        operationTemplate: {
          snapshot: {
            type: "return",
            labelZh: "归还",
            labelEn: "Return",
            requireAttachment: false,
            fields: [
              { key: "receiver", labelZh: "接收人", labelEn: "Receiver", widget: "text" },
              { key: "condition", labelZh: "状态", labelEn: "Condition", widget: "textarea" },
            ],
          },
          values: {
            receiver: "资产管理员",
            condition: "完好无损",
          },
        },
      },
    });

    const updated = applyApprovalAction(approval.id, {
      action: "approve",
      actor: { id: "manager-ops", name: "Manager" },
    });

    expect(updated.operationId).toBeTruthy();
    const updatedAsset = getAssetById(asset.id);
    expect(updatedAsset?.status).toBe("idle");
    expect(updatedAsset?.owner).toBe("资产管理员");
  });

  it("auto creates dispose operation and retires the asset", () => {
    const asset = createAsset({
      name: "Old Router",
      category: "Network",
      status: "maintenance",
      companyCode: "HITOSEA",
      owner: "网络组",
      location: "深圳",
      purchaseDate: "2020-05-20",
    });

    const approval = createApprovalRequest({
      type: "dispose",
      title: "淘汰旧路由器",
      reason: "硬件老化",
      assetId: asset.id,
      applicant: { id: "user-net", name: "NetOps" },
      approver: { id: "manager-net", name: "Manager" },
      metadata: {
        operationTemplate: {
          snapshot: {
            type: "dispose",
            labelZh: "报废",
            labelEn: "Dispose",
            requireAttachment: true,
            fields: [
              { key: "method", labelZh: "方式", labelEn: "Method", widget: "text" },
            ],
          },
          values: {
            method: "环保回收",
          },
        },
      },
    });

    const updated = applyApprovalAction(approval.id, {
      action: "approve",
      actor: { id: "manager-net", name: "Manager" },
    });

    expect(updated.operationId).toBeTruthy();
    const updatedAsset = getAssetById(asset.id);
    expect(updatedAsset?.status).toBe("retired");

    const operations = listOperationsForAsset(asset.id);
    const disposeOp = operations.find((op) => op.id === updated.operationId);
    expect(disposeOp?.type).toBe("dispose");
  });

  it("updates consumable stock when linked approvals are approved", () => {
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
      quantity: 50,
      unit: "box",
      keeper: "Ops",
      location: "Shanghai",
      safetyStock: 10,
    });

    const operation = createConsumableOperation(consumable.id, {
      type: "outbound",
      actor: "Ops",
      description: "项目发放",
      status: "pending",
      quantityDelta: -5,
    });

    const approval = createApprovalRequest({
      type: "outbound",
      title: "耗材出库审批",
      reason: "季度发放",
      consumableId: consumable.id,
      consumableOperationId: operation.id,
      applicant: { id: "ops-user", name: "Ops" },
      approver: { id: "manager-ops", name: "Manager" },
    });

    const updated = applyApprovalAction(approval.id, {
      action: "approve",
      actor: { id: "manager-ops", name: "Manager" },
      comment: "同意发放",
    });

    expect(updated.status).toBe("approved");
    expect(updated.consumableOperationId).toBe(operation.id);

    const refreshed = getConsumableById(consumable.id)!;
    expect(refreshed.quantity).toBe(45);
  });
});
