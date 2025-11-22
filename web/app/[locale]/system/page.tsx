import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";

type PageParams = {
  locale: string;
};

type PageProps = {
  params: Promise<PageParams>;
};

const CARDS = [
  {
    id: "company",
    href: "company",
    titleZh: "公司管理",
    titleEn: "Company Management",
    descriptionZh: "维护集团与分支机构信息，为资产归属和审批提供基础数据。",
    descriptionEn:
      "Maintain company records to support asset ownership and approval rules.",
  },
  {
    id: "role",
    href: "role",
    titleZh: "角色管理",
    titleEn: "Role Management",
    descriptionZh: "配置系统内角色，用于权限和审批人的角色引用。",
    descriptionEn:
      "Configure roles that will be reused by permission rules and approver settings.",
  },
  {
    id: "approval",
    href: "approval",
    titleZh: "审批配置",
    titleEn: "Approval Config",
    descriptionZh: "按操作类型定义是否需要审批、默认审批人及可否覆盖。",
    descriptionEn:
      "Define approval policies per operation type, including default approvers.",
  },
  {
    id: "alerts",
    href: "alerts",
    titleZh: "告警配置",
    titleEn: "Alert Settings",
    descriptionZh: "控制耗材低库存告警及 DooTask 推送开关。",
    descriptionEn:
      "Toggle consumable low-stock alerts and DooTask push integration.",
  },
  {
    id: "reports",
    href: "data/reports",
    titleZh: "数据报表",
    titleEn: "Data Reports",
    descriptionZh: "查看资产业务的聚合指标并下载标准报表。",
    descriptionEn:
      "Review aggregated metrics and download standard CSV reports.",
  },
  {
    id: "operations",
    href: "operation",
    titleZh: "操作管理",
    titleEn: "Operation Management",
    descriptionZh: "配置各类资产操作的字段、附件要求与审批说明（即将上线）。",
    descriptionEn:
      "Configure asset operation templates and requirements (coming soon).",
  },
  {
    id: "upgrade",
    href: "upgrade",
    titleZh: "升级与版本",
    titleEn: "Upgrade & Version",
    descriptionZh: "查看当前插件版本、套餐与升级渠道信息。",
    descriptionEn:
      "Check the current plugin version, plan, and available upgrade paths.",
  },
];

export default async function SystemOverviewPage({ params }: PageProps) {
  const { locale } = await params;
  const isChinese = locale === "zh";

  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        items={[
          { labelZh: "系统管理", labelEn: "System" },
        ]}
        title={isChinese ? "系统管理总览" : "System Console"}
        description={
          isChinese
            ? "集中管理基础数据、角色与审批策略，保障资产业务闭环。"
            : "Manage master data, roles, and approval policies from a single place."
        }
      />

      <section className="grid gap-4 md:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.id}
            href={`/${locale}/system/${card.href}`}
            className="group rounded-2xl border p-5 transition hover:border-primary hover:bg-primary/5"
          >
            <h2 className="text-lg font-semibold">
              {isChinese ? card.titleZh : card.titleEn}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isChinese ? card.descriptionZh : card.descriptionEn}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}

