import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTesting } from "@/lib/db/client";
import {
  createAsset,
  listAssets,
} from "@/lib/repositories/assets";
import { createAssetCategory } from "@/lib/repositories/asset-categories";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-assets.db");

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.ASSET_HUB_DB_PATH = TEST_DB_PATH;
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.rmSync(TEST_DB_PATH);
  }
  resetDbForTesting();
});

describe("Asset repository", () => {
  it("auto-generates assetNo with category prefix when empty", () => {
    createAssetCategory({
      code: "Laptop",
      labelZh: "笔记本电脑",
      labelEn: "Laptop",
      assetNoPrefix: "LAP",
    });

    const first = createAsset({
      name: "Test Laptop",
      category: "Laptop",
      status: "in-use",
      companyCode: "HITOSEA",
      owner: "QA",
      location: "Lab",
      purchaseDate: "2024-01-01",
    });
    const second = createAsset({
      name: "Test Laptop 2",
      category: "Laptop",
      status: "in-use",
      companyCode: "HITOSEA",
      owner: "QA",
      location: "Lab",
      purchaseDate: "2024-01-02",
    });

    expect(first.assetNo).toBe("LAP-000001");
    expect(second.assetNo).toBe("LAP-000002");
  });

  it("creates assets and lists them with pagination", () => {
    createAsset({
      name: "Test Laptop",
      category: "Laptop",
      status: "in-use",
      companyCode: "HITOSEA",
      owner: "QA",
      location: "Lab",
      purchaseDate: "2024-01-01",
    });

    const page = listAssets({ page: 1, pageSize: 5 });
    expect(page.total).toBeGreaterThan(0);
    expect(page.items[0].name).toEqual("Test Laptop");
  });

  it("filters by status", () => {
    createAsset({
      name: "Server A",
      category: "Server",
      status: "idle",
      companyCode: "HITOSEA",
      owner: "Infra",
      location: "DC",
      purchaseDate: "2024-02-01",
    });
    createAsset({
      name: "Server B",
      category: "Server",
      status: "in-use",
      companyCode: "HITOSEA",
      owner: "Infra",
      location: "DC",
      purchaseDate: "2024-02-02",
    });

    const idlePage = listAssets({ status: ["idle"] });
    expect(idlePage.items.every((asset) => asset.status === "idle")).toBe(
      true,
    );
  });
});
