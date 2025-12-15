import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDbForTesting } from "@/lib/db/client";
import { parseAssetImportContent } from "@/app/api/assets/import/route";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-asset-import.db");

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

describe("Asset import parser", () => {
  it("parses valid CSV content", () => {
    const csv = `name,category,status,companyCode,owner,location,purchaseDate
MacBook Pro,Laptop,in-use,HITOSEA,Alice,Shanghai,2024-01-01
Server Rack,Server,idle,HITOFLY,Infra,Beijing,2023-12-12
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

  it("accepts headers with different cases or separators", () => {
    const csv = `Name,Category,Status,Company_Code,Owner,Location,Purchase_Date
MacBook Pro,Laptop,In Use,HITOSEA,Alice,Shanghai,2024-01-01
`;
    const result = parseAssetImportContent(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      name: "MacBook Pro",
      status: "in-use",
      companyCode: "HITOSEA",
      purchaseDate: "2024-01-01",
    });
  });

  it("normalizes localized status labels", () => {
    const csv = `name,category,status,companyCode,owner,location,purchaseDate
MacBook Pro,Laptop,待入库,HITOSEA,Alice,Shanghai,2024-01-01
Server Rack,Server,Pending,HITOSEA,Infra,Beijing,2023-12-12
`;
    const result = parseAssetImportContent(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0].status).toBe("pending");
    expect(result.rows[1].status).toBe("pending");
  });
});
