import RoleManagementClient from "./RoleManagementClient";
import type { Role } from "@/lib/types/system";
import { getRequestBaseUrl } from "@/lib/utils/server-url";
import { getApiClient } from "@/lib/http/client";

async function fetchRoles() {
  const client = await getApiClient();
  const response = await client.get<{ data: Role[] }>(
    "/apps/asset-hub/api/system/roles",
    { headers: { "Cache-Control": "no-cache" } },
  );
  return response.data;
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
