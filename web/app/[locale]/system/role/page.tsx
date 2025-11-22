import RoleManagementClient from "./RoleManagementClient";
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
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const result = await fetchRoles();
  const baseUrl = await getRequestBaseUrl();

  return (
    <RoleManagementClient
      locale={locale}
      initialRoles={result.data}
      baseUrl={baseUrl}
    />
  );
}

