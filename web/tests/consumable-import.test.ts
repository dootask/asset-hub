import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDbForTesting } from "@/lib/db/client";
import { parseConsumableImportContent } from "@/app/api/consumables/import/route";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-consumable-import.db");

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

describe("Consumable import parser", () => {
  it("parses valid rows", () => {
    const csv = `name,category,companyCode,quantity,unit,keeper,location,safetyStock,description
硒鼓,PrinterSupplies,HITOSEA,10,pcs,Admin,Shanghai,5,示例
`;
    const result = parseConsumableImportContent(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe("硒鼓");
  });

  it("derives status from quantity and safetyStock", () => {
    const csv = `Name,Category,Company_Code,Quantity,Unit,Keeper,Location,Safety_Stock,Description
库存足够,PrinterSupplies,HITOSEA,10,pcs,Admin,Shanghai,5,示例
低库存,PrinterSupplies,HITOSEA,3,pcs,Admin,Shanghai,5,
缺货,PrinterSupplies,HITOSEA,0,pcs,Admin,Shanghai,5,
`;
    const result = parseConsumableImportContent(csv);
    expect(result.errors).toHaveLength(0);
    const statuses = result.rows.map((row) =>
      row.quantity <= 0 ? "out-of-stock" : row.quantity <= row.safetyStock ? "low-stock" : "in-stock",
    );
    expect(statuses).toEqual(["in-stock", "low-stock", "out-of-stock"]);
  });

  it("respects archived status input when provided", () => {
    const csv = `name,category,status,companyCode,quantity,unit,keeper,location,safetyStock
归档耗材,PrinterSupplies,archived,HITOSEA,2,pcs,Admin,SH,1
`;
    const result = parseConsumableImportContent(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0].status).toBe("archived");
  });
});
