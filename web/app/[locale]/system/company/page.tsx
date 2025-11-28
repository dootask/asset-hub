import type { Metadata } from "next";
import { listCompanies } from "@/lib/repositories/companies";
import CompanyManagementClient from "./CompanyManagementClient";

export const metadata: Metadata = {
  title: "公司管理 - Asset Hub",
};

export default async function CompanyManagementPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const companies = listCompanies();
  return (
    <CompanyManagementClient
      locale={locale}
      initialCompanies={companies}
    />
  );
}
