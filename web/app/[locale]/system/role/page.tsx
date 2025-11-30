import RoleManagementClient from "./RoleManagementClient";

export default async function RolePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <RoleManagementClient
      locale={locale}
      initialRoles={[]}
    />
  );
}
