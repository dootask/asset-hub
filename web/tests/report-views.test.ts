import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTesting } from "@/lib/db/client";
import {
  createReportView,
  deleteReportView,
  listReportViews,
  updateReportView,
} from "@/lib/repositories/report-views";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-report-views.db");

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.ASSET_HUB_DB_PATH = TEST_DB_PATH;
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.rmSync(TEST_DB_PATH);
  }
  resetDbForTesting();
});

describe("Report view repository", () => {
  it("creates and lists report views", () => {
    createReportView({
      name: "Asset Status",
      dataSource: "assets",
      fields: ["id", "name", "status"],
      filters: { status: ["in-use"] },
    });
    const views = listReportViews();
    expect(views.length).toBe(1);
    expect(views[0].name).toBe("Asset Status");
  });

  it("updates and deletes a report view", () => {
    const view = createReportView({
      name: "Approvals",
      dataSource: "approvals",
      fields: ["id", "title"],
    });
    const updated = updateReportView(view.id, {
      name: "Approvals Detail",
      dataSource: "approvals",
      fields: ["id", "title", "status"],
    });
    expect(updated?.name).toBe("Approvals Detail");
    const removed = deleteReportView(view.id);
    expect(removed).toBe(true);
  });
});

