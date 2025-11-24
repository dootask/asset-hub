import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTesting } from "@/lib/db/client";
import { parseAssetImportContent } from "@/app/api/assets/import/route";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-asset-import.db");

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.ASSET_HUB_DB_PATH = TEST_DB_PATH;
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.rmSync(TEST_DB_PATH);
  }
  resetDbForTesting();
});

describe("Asset import parser", () => {
  it("parses valid CSV content", () => {
    const csv = `name,category,status,companyCode,owner,location,purchaseDate
MacBook Pro,Laptop,in-use,NEBULA,Alice,Shanghai,2024-01-01
Server Rack,Server,idle,VOYAGER,Infra,Beijing,2023-12-12
`;
    const result = parseAssetImportContent(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      name: "MacBook Pro",
      status: "in-use",
    });
  });

  it("reports errors for invalid rows", () => {
    const csv = `name,category,status,companyCode,owner,location,purchaseDate
Broken,,unknown,,,
`;
    const result = parseAssetImportContent(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

