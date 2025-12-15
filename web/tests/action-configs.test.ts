import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDbForTesting } from "@/lib/db/client";
import {
  getActionConfig,
  listActionConfigs,
  upsertActionConfig,
} from "@/lib/repositories/action-configs";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-action-configs.db");

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

describe("Action config repository", () => {
  it("returns defaults when no overrides exist", () => {
    const configs = listActionConfigs();
    expect(configs.length).toBeGreaterThan(0);
    const inbound = configs.find((config) => config.id === "inbound");
    expect(inbound).toBeDefined();
    expect(inbound?.requiresApproval).toBe(true);
  });

  it("upserts and fetches approval settings", () => {
    upsertActionConfig("inbound", {
      requiresApproval: false,
      defaultApproverType: "user",
      defaultApproverRefs: ["42"],
      allowOverride: false,
      metadata: { note: "auto" },
    });

    const inbound = getActionConfig("inbound");
    expect(inbound.requiresApproval).toBe(false);
    expect(inbound.defaultApproverType).toBe("user");
    expect(inbound.defaultApproverRefs).toEqual(["42"]);
    expect(inbound.allowOverride).toBe(false);
    expect(inbound.metadata).toEqual({ note: "auto" });
  });
});
