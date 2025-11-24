import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTesting } from "@/lib/db/client";
import { parseConsumableImportContent } from "@/app/api/consumables/import/route";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-consumable-import.db");

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.ASSET_HUB_DB_PATH = TEST_DB_PATH;
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.rmSync(TEST_DB_PATH);
  }
  resetDbForTesting();
});

describe("Consumable import parser", () => {
  it("parses valid rows", () => {
    const csv = `name,category,status,companyCode,quantity,unit,keeper,location,safetyStock,description
硒鼓,PrinterSupplies,in-stock,NEBULA,10,pcs,Admin,Shanghai,5,示例
`;
    const result = parseConsumableImportContent(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe("硒鼓");
  });

  it("reports invalid status", () => {
    const csv = `name,category,status,companyCode,quantity,unit,keeper,location,safetyStock
Bad,PrinterSupplies,unknown,NEBULA,10,pcs,Admin,SH,5
`;
    const result = parseConsumableImportContent(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

