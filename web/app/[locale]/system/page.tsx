import Link from "next/link";

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
];

export default async function SystemOverviewPage({ params }: PageProps) {
  const { locale } = await params;
  const isChinese = locale === "zh";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">
          {isChinese ? "系统管理" : "System"}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {isChinese ? "系统管理总览" : "System Console"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isChinese
            ? "集中管理基础数据、角色与审批策略，保障资产业务闭环。"
            : "Manage master data, roles, and approval policies from a single place."}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.id}
            href={`/${locale}/system/${card.href}`}
            className="group rounded-2xl border bg-muted/20 p-5 transition hover:border-primary hover:bg-primary/5"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                {isChinese ? card.titleZh : card.titleEn}
              </h2>
              <span className="text-sm text-primary transition-transform duration-200 group-hover:translate-x-0.5 group-hover:underline">
                {isChinese ? "进入" : "Open"}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {isChinese ? card.descriptionZh : card.descriptionEn}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}

