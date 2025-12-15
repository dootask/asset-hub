import PageHeader from "@/components/layout/PageHeader";
import NewPurchaseForm from "@/components/approvals/NewPurchaseForm";
import { listAssetCategories } from "@/lib/repositories/asset-categories";
import { listCompanies } from "@/lib/repositories/companies";

export default async function NewApprovalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isChinese = locale === "zh";
  const categories = listAssetCategories();
  const companies = listCompanies();

  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        items={[
          { href: `/${locale}/approvals`, labelZh: "审批中心", labelEn: "Approvals" },
          { labelZh: "发起采购", labelEn: "New Purchase" },
        ]}
        title={isChinese ? "发起采购申请" : "New Purchase Request"}
        description={isChinese 
          ? "发起采购审批时可选择：新增资产（审批通过后自动创建待入库资产）或关联到已有资产（不新增资产）。" 
          : "You can choose to create a new asset (auto-created upon approval) or link an existing asset (no new asset record)."}
      />
      <section className="rounded-2xl border bg-muted/30 p-6">
         <NewPurchaseForm 
           locale={locale} 
           categories={categories} 
           companies={companies} 
         />
      </section>
    </div>
  );
}
