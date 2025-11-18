import Link from "next/link";
import packageJson from "@/package.json";

type PageParams = {
  locale: string;
};

const HIGHLIGHTS = [
  {
    key: "lifecycle",
    zh: "资产全生命周期：采购、入库、领用、借用、维修、报废一站式跟踪。",
    en: "Full lifecycle coverage: purchase, inbound, assign, borrow, maintain, retire.",
  },
  {
    key: "workflow",
    zh: "审批与操作分离：结合 DooTask 代办与通知，确保关键操作可追溯。",
    en: "Workflow-ready: aligns with DooTask inbox & notifications for traceability.",
  },
  {
    key: "extensibility",
    zh: "扩展预留：支持耗材管理、操作报表、自定义字段等后续能力。",
    en: "Built for extensibility: consumables, reports and custom fields on the roadmap.",
  },
] as const;

const LINKS = [
  {
    key: "docs",
    zh: "插件开发文档",
    en: "Plugin Docs",
    href: "https://appstore.dootask.com/development/manual",
  },
  {
    key: "feedback",
    zh: "提交反馈",
    en: "Give Feedback",
    href: "https://github.com/dootask/asset-hub/issues",
  },
] as const;

export default async function AboutPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale } = await params;
  const isChinese = locale === "zh";
  const version = packageJson.version ?? "0.0.0";

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          {isChinese ? "关于插件" : "About the Plugin"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Asset Hub</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isChinese
            ? "面向企业资产全生命周期管理的 DooTask 插件。"
            : "A DooTask plugin for end-to-end asset lifecycle management."}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border bg-muted/30 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {isChinese ? "当前版本" : "Current Version"}
            </p>
            <p className="mt-2 text-2xl font-semibold">{version}</p>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {isChinese ? "数据库" : "Database"}
            </p>
            <p className="mt-2 text-lg font-semibold">SQLite</p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">
          {isChinese ? "核心亮点" : "Highlights"}
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
          {HIGHLIGHTS.map((item) => (
            <li
              key={item.key}
              className="rounded-2xl border border-dashed px-4 py-3 text-foreground"
            >
              {isChinese ? item.zh : item.en}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">
          {isChinese ? "常用链接" : "Useful Links"}
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {LINKS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              target="_blank"
              className="rounded-full border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {isChinese ? item.zh : item.en}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}


