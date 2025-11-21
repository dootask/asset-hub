import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTesting } from "@/lib/db/client";
import {
  createInventoryTask,
  listInventoryTasks,
  updateInventoryTaskStatus,
} from "@/lib/repositories/inventory-tasks";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-inventory-tasks.db");

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.ASSET_HUB_DB_PATH = TEST_DB_PATH;
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.rmSync(TEST_DB_PATH);
  }
  resetDbForTesting();
});

describe("Inventory task repository", () => {
  it("creates and lists inventory tasks", () => {
    createInventoryTask({
      name: "Q2 Shanghai",
      scope: "Shanghai office",
      filters: { status: ["in-use"] },
      owner: "Ops",
    });
    const tasks = listInventoryTasks();
    expect(tasks.length).toBe(1);
    expect(tasks[0].name).toBe("Q2 Shanghai");
  });

  it("updates task status", () => {
    const task = createInventoryTask({
      name: "Q3 Shenzhen",
      filters: {},
    });
    const updated = updateInventoryTaskStatus(task.id, "completed");
    expect(updated?.status).toBe("completed");
  });
});

