import { notFound } from "next/navigation";
import Link from "next/link";
import PageBreadcrumb from "@/components/layout/PageBreadcrumb";
import ConsumableInventoryEntriesTable from "@/components/consumables/ConsumableInventoryEntriesTable";
import ConsumableInventoryStatusControls from "@/components/consumables/ConsumableInventoryStatusControls";
import { getConsumableInventoryTask } from "@/lib/repositories/consumable-inventory";

type PageParams = {
  locale: string;
  id: string;
};

export default async function ConsumableInventoryDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, id } = await params;
  const task = getConsumableInventoryTask(id);
  if (!task) {
    notFound();
  }
  const isChinese = locale === "zh";

  const filterTags: string[] = [];
  if (Array.isArray(task.filters?.categories) && task.filters?.categories.length) {
    filterTags.push(
      `${isChinese ? "类别" : "Categories"}: ${(task.filters?.categories as string[]).join(", ")}`,
    );
  }
  if (typeof task.filters?.keeper === "string") {
    filterTags.push(
      `${isChinese ? "保管人" : "Keeper"}: ${task.filters?.keeper as string}`,
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb
        locale={locale}
        items={[
          {
            href: `/${locale}/consumables`,
            labelZh: "耗材管理",
            labelEn: "Consumables",
          },
          {
            href: `/${locale}/consumables/inventory`,
            labelZh: "盘点",
            labelEn: "Inventory",
          },
          {
            labelZh: task.name,
            labelEn: task.name,
          },
        ]}
      />

      <section className="rounded-2xl border bg-card/70 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{task.id}</p>
            <h1 className="text-2xl font-semibold">{task.name}</h1>
            {task.description && (
              <p className="text-sm text-muted-foreground">{task.description}</p>
            )}
          </div>
          <ConsumableInventoryStatusControls
            taskId={task.id}
            status={task.status}
            locale={locale}
          />
        </div>
        <dl className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">
              {isChinese ? "状态" : "Status"}
            </dt>
            <dd className="text-base font-semibold text-foreground">
              {task.status === "draft"
                ? isChinese
                  ? "草稿"
                  : "Draft"
                : task.status === "in-progress"
                  ? isChinese
                    ? "进行中"
                    : "In progress"
                  : isChinese
                    ? "已完成"
                    : "Completed"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">
              {isChinese ? "负责人" : "Owner"}
            </dt>
            <dd className="text-base font-semibold text-foreground">
              {task.owner ?? "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">
              {isChinese ? "创建时间" : "Created at"}
            </dt>
            <dd className="text-base font-semibold text-foreground">
              {new Date(task.createdAt).toLocaleString(
                locale === "zh" ? "zh-CN" : "en-US",
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">
              {isChinese ? "范围" : "Scope"}
            </dt>
            <dd className="text-base font-semibold text-foreground">
              {filterTags.length
                ? filterTags.join(" · ")
                : isChinese
                  ? "全部耗材"
                  : "All consumables"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card/70 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {isChinese ? "盘点记录" : "Inventory entries"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isChinese
                ? "填入实盘数据，系统会自动计算差异。"
                : "Fill actual counts to compute variances automatically."}
            </p>
          </div>
          <div className="flex gap-3 text-sm text-muted-foreground">
            <span>
              {isChinese ? "总条目" : "Total"} · {task.stats.totalEntries}
            </span>
            <span>
              {isChinese ? "已提交" : "Recorded"} · {task.stats.recordedEntries}
            </span>
            <span>
              {isChinese ? "存在差异" : "Variances"} · {task.stats.varianceEntries}
            </span>
          </div>
        </div>
        <ConsumableInventoryEntriesTable
          taskId={task.id}
          locale={locale}
          entries={task.entries}
        />
        <div className="text-xs text-muted-foreground">
          {isChinese ? (
            <>
              盘点前可在{" "}
              <Link
                href={`/${locale}/consumables/list`}
                className="underline underline-offset-4"
              >
                耗材列表
              </Link>{" "}
              中导出当前库存作为纸质清单。
            </>
          ) : (
            <>
              Need a printable sheet? Use the{" "}
              <Link
                href={`/${locale}/consumables/list`}
                className="underline underline-offset-4"
              >
                consumables list
              </Link>{" "}
              export before executing the task.
            </>
          )}
        </div>
      </section>
    </div>
  );
}

