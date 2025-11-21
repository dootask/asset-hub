import { describe, expect, it } from "vitest";
import { parseConsumableImportContent } from "@/app/api/consumables/import/route";

describe("Consumable import parser", () => {
  it("parses valid rows", () => {
    const csv = `name,category,status,quantity,unit,keeper,location,safetyStock,description
硒鼓,PrinterSupplies,in-stock,10,pcs,Admin,Shanghai,5,示例
`;
    const result = parseConsumableImportContent(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe("硒鼓");
  });

  it("reports invalid status", () => {
    const csv = `name,category,status,quantity,unit,keeper,location,safetyStock
Bad,PrinterSupplies,unknown,10,pcs,Admin,SH,5
`;
    const result = parseConsumableImportContent(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

