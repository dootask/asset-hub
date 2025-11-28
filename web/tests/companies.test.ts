import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTesting } from "@/lib/db/client";
import {
  createCompany,
  deleteCompany,
  listCompanies,
  updateCompany,
} from "@/lib/repositories/companies";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-companies.db");

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.ASSET_HUB_DB_PATH = TEST_DB_PATH;
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.rmSync(TEST_DB_PATH);
  }
  resetDbForTesting();
});

describe("Company repository", () => {
  it("creates and lists companies", () => {
    createCompany({
      name: "HITOSEA Group",
      code: "HITOSEA",
      description: "Shanghai HQ",
    });
    const companies = listCompanies();
    expect(companies.length).toBeGreaterThan(0);
    expect(companies[0].code).toBe("HITOSEA");
  });

  it("updates and deletes a company", () => {
    const company = createCompany({
      name: "HITOFLY",
      code: "HITOFLY",
      description: "SZ Branch",
    });
    const updated = updateCompany(company.id, {
      name: "HITOFLY Labs",
      code: "HITOFLY",
      description: "Updated",
    });
    expect(updated?.name).toBe("HITOFLY Labs");
    const removed = deleteCompany(company.id);
    expect(removed).toBe(true);
  });
});

