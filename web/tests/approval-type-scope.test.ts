import { describe, expect, it } from "vitest";
import type { ApprovalType } from "@/lib/types/approval";
import {
  isConsumableApprovalType,
  isConsumableOnlyApprovalType,
} from "@/lib/utils/approval-type-scope";

describe("Approval type scope helpers", () => {
  it("treats purchase/inbound/dispose as valid consumable approval types", () => {
    const allowed: ApprovalType[] = [
      "purchase",
      "inbound",
      "dispose",
      "outbound",
      "reserve",
      "release",
      "adjust",
    ];
    for (const type of allowed) {
      expect(isConsumableApprovalType(type), type).toBe(true);
    }
  });

  it("rejects asset-only approval types for consumables", () => {
    const denied: ApprovalType[] = ["receive", "borrow", "return", "maintenance"];
    for (const type of denied) {
      expect(isConsumableApprovalType(type), type).toBe(false);
    }
  });

  it("marks outbound/reserve/release/adjust as consumable-only types", () => {
    const only: ApprovalType[] = ["outbound", "reserve", "release", "adjust"];
    for (const type of only) {
      expect(isConsumableOnlyApprovalType(type), type).toBe(true);
    }
    const shared: ApprovalType[] = ["purchase", "inbound", "dispose", "generic"];
    for (const type of shared) {
      expect(isConsumableOnlyApprovalType(type), type).toBe(false);
    }
  });
});

