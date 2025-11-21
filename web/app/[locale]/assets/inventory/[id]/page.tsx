import type { Metadata } from "next";
import Link from "next/link";
import PageBreadcrumb from "@/components/layout/PageBreadcrumb";
import { getInventoryTaskById } from "@/lib/repositories/inventory-tasks";

type PageParams = {
  locale: string;
  id: string;
};

interface PageProps {
  params: Promise<PageParams>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Inventory Task ${id} - Asset Hub`,
  };
}

export default async function InventoryDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const isChinese = locale === "zh";
  const task = getInventoryTaskById(id);

  if (!task) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
        {isChinese ? "未找到对应的盘点任务。" : "Inventory task not found."}
      </div>
    );
  }

  const filters = task.filters ?? {};

  return (
    <div className="space-y-6">
      <header>
        <PageBreadcrumb
          locale={locale}
          items={[
            {
              href: `/${locale}/assets/inventory`,
              labelZh: "盘点任务",
              labelEn: "Inventory",
            },
            {
              labelZh: task.name,
              labelEn: task.name,
            },
          ]}
        />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{task.name}</h1>
        <p className="text-sm text-muted-foreground">{task.id}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card/70 p-4">
          <h2 className="text-lg font-semibold">
            {isChinese ? "基本信息" : "Overview"}
          </h2>
          <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
            <div>
              <dt className="font-medium text-foreground">
                {isChinese ? "范围" : "Scope"}
              </dt>
              <dd>{task.scope ?? (isChinese ? "未指定" : "Not specified")}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                {isChinese ? "负责人" : "Owner"}
              </dt>
              <dd>{task.owner ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                {isChinese ? "状态" : "Status"}
              </dt>
              <dd>{task.status}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                {isChinese ? "描述" : "Description"}
              </dt>
              <dd>{task.description ?? "-"}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border bg-card/70 p-4">
          <h2 className="text-lg font-semibold">
            {isChinese ? "过滤条件" : "Filters"}
          </h2>
          <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
            <div>
              <dt className="font-medium text-foreground">
                {isChinese ? "状态" : "Status"}
              </dt>
              <dd>
                {Array.isArray(filters.status) && filters.status.length
                  ? filters.status.join(", ")
                  : isChinese
                    ? "全部"
                    : "All"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                {isChinese ? "类别" : "Category"}
              </dt>
              <dd>
                {typeof filters.category === "string" && filters.category.trim()
                  ? filters.category
                  : "-"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                {isChinese ? "关键词" : "Keyword"}
              </dt>
              <dd>
                {typeof filters.search === "string" && filters.search.trim()
                  ? filters.search
                  : "-"}
              </dd>
            </div>
          </dl>
          <div className="mt-4">
            <a
              href={`/apps/asset-hub/api/assets/inventory-tasks/${task.id}/export`}
              className="inline-flex rounded-2xl border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {isChinese ? "导出资产清单" : "Export Assets"}
            </a>
          </div>
        </div>
      </div>

      <Link
        href={`/${locale}/assets/inventory`}
        className="inline-flex text-sm text-muted-foreground hover:text-foreground"
      >
        {isChinese ? "返回任务列表" : "Back to task list"}
      </Link>
    </div>
  );
}

