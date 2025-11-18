import CompanyForm from "@/components/system/CompanyForm";
import CompanyTable from "@/components/system/CompanyTable";
import type { Company } from "@/lib/types/system";
import { getRequestBaseUrl } from "@/lib/utils/server-url";

type SearchParams = Record<string, string | string[] | undefined>;

function normalizeParam(value?: string | string[]) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

async function fetchCompanies() {
  const baseUrl = await getRequestBaseUrl();
  const response = await fetch(
    `${baseUrl}/apps/asset-hub/api/system/companies`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("无法加载公司数据");
  }

  return (await response.json()) as { data: Company[] };
}

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ locale }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const result = await fetchCompanies();
  const editId = normalizeParam(resolvedSearchParams.edit);
  const companyToEdit = result.data.find((company) => company.id === editId);
  const isChinese = locale === "zh";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">
          {isChinese ? "系统管理 / 公司" : "System / Companies"}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {isChinese ? "公司管理" : "Company Management"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isChinese
            ? "维护集团与分支机构信息，为资产归属与审批流程提供基础数据。"
            : "Maintain company records for asset ownership and approval workflows."}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <CompanyTable companies={result.data} locale={locale} />
        <CompanyForm company={companyToEdit} locale={locale} />
      </div>
    </div>
  );
}

