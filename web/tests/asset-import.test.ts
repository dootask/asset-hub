import { describe, expect, it } from "vitest";
import { parseAssetImportContent } from "@/app/api/assets/import/route";

describe("Asset import parser", () => {
  it("parses valid CSV content", () => {
    const csv = `name,category,status,owner,location,purchaseDate
MacBook Pro,Laptop,in-use,Alice,Shanghai,2024-01-01
Server Rack,Server,idle,Infra,Beijing,2023-12-12
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
    const csv = `name,category,status,owner,location,purchaseDate
Broken,,unknown,,,
`;
    const result = parseAssetImportContent(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

