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
          ? "申请采购新资产。审批通过后，系统将自动创建待入库的资产记录。" 
          : "Request a new asset purchase. An asset record will be created upon approval."}
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
