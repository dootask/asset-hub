import RoleForm from "@/components/system/RoleForm";
import RoleTable from "@/components/system/RoleTable";
import SystemBreadcrumb from "@/components/system/SystemBreadcrumb";
import type { Role } from "@/lib/types/system";
import { getRequestBaseUrl } from "@/lib/utils/server-url";

type SearchParams = Record<string, string | string[] | undefined>;

function normalizeParam(value?: string | string[]) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

async function fetchRoles() {
  const baseUrl = await getRequestBaseUrl();
  const response = await fetch(`${baseUrl}/apps/asset-hub/api/system/roles`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("无法加载角色数据");
  }
  return (await response.json()) as { data: Role[] };
}

export default async function RolePage({
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
  const result = await fetchRoles();
  const editId = normalizeParam(resolvedSearchParams.edit);
  const roleToEdit = result.data.find((role) => role.id === editId);
  const isChinese = locale === "zh";

  return (
    <div className="space-y-6">
      <header>
        <SystemBreadcrumb
          locale={locale}
          currentLabelZh="角色"
          currentLabelEn="Roles"
        />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {isChinese ? "角色管理" : "Role Management"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isChinese
            ? "配置不同业务角色与作用域，为审批流程提供依据。"
            : "Configure role scopes to drive approvals and permissions."}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <RoleTable roles={result.data} locale={locale} />
        <RoleForm role={roleToEdit} locale={locale} />
      </div>
    </div>
  );
}

