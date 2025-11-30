import type { Metadata } from "next";
import NewConsumableForm from "@/components/consumables/NewConsumableForm";
import PageHeader from "@/components/layout/PageHeader";
import { listConsumableCategories } from "@/lib/repositories/consumable-categories";
import { listCompanies } from "@/lib/repositories/companies";

export const metadata: Metadata = {
  title: "新增耗材 - Asset Hub",
};

export default async function ConsumableCreatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const categories = listConsumableCategories();
  const companies = listCompanies();
  const isChinese = locale === "zh";

  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        items={[
          {
            href: `/${locale}/consumables`,
            labelZh: "耗材管理",
            labelEn: "Consumables",
          },
          {
            href: `/${locale}/consumables/list`,
            labelZh: "耗材列表",
            labelEn: "Consumable List",
          },
          {
            labelZh: "新增耗材",
            labelEn: "Create Consumable",
          },
        ]}
        title={isChinese ? "新增耗材" : "Create Consumable"}
        description={
          isChinese
            ? "填写耗材基础信息，提交后将自动跳转到详情页。"
            : "Fill in consumable details. After submission you'll be redirected to its detail page."
        }
      />

      <section className="rounded-2xl border bg-muted/30 p-6">
        <NewConsumableForm locale={locale} categories={categories} companies={companies} />
      </section>
    </div>
  );
}
