import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTesting } from "@/lib/db/client";
import {
  getAlertSettings,
  getSystemBooleanSetting,
  updateAlertSettings,
} from "@/lib/repositories/system-settings";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-system-settings.db");

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.ASSET_HUB_DB_PATH = TEST_DB_PATH;
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.rmSync(TEST_DB_PATH);
  }
  resetDbForTesting();
});

describe("system settings repository", () => {
  it("returns default alert settings", () => {
    const settings = getAlertSettings();
    expect(settings.alertsEnabled).toBe(true);
    expect(settings.pushEnabled).toBe(true);
  });

  it("updates and persists alert settings", () => {
    updateAlertSettings({ alertsEnabled: false, pushEnabled: false });
    expect(getSystemBooleanSetting("consumableAlertsEnabled", true)).toBe(false);
    expect(getSystemBooleanSetting("consumableAlertsPushEnabled", true)).toBe(false);
  });
});


