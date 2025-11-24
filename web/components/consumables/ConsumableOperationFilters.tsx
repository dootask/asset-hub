"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FilterDatePicker from "@/components/filters/FilterDatePicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  CONSUMABLE_OPERATION_STATUS_LABELS,
  type ConsumableOperationStatusMeta,
} from "@/lib/constants/consumable-operation-status";
import {
  CONSUMABLE_OPERATION_TYPES,
  type ConsumableOperationStatus,
} from "@/lib/types/consumable-operation";

type InitialFilters = {
  keyword?: string;
  keeper?: string;
  actor?: string;
  consumableId?: string;
  dateFrom?: string;
  dateTo?: string;
  types?: string[];
  statuses?: ConsumableOperationStatus[];
};

interface Props {
  locale: string;
  initialValues: InitialFilters;
}

const FILTER_KEYS = [
  "keyword",
  "keeper",
  "actor",
  "consumableId",
  "dateFrom",
  "dateTo",
  "type",
  "status",
  "page",
  "pageSize",
];

export default function ConsumableOperationFilters({
  locale,
  initialValues,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isChinese = locale === "zh";

  const selectedTypes = useMemo(
    () => initialValues.types ?? [],
    [initialValues.types],
  );
  const selectedStatuses = useMemo(
    () => initialValues.statuses ?? [],
    [initialValues.statuses],
  );

  const {
    keyword,
    keeper,
    actor,
    consumableId,
    dateFrom,
    dateTo,
  } = initialValues;

  const formKey = useMemo(
    () =>
      JSON.stringify({
        keyword: keyword ?? "",
        keeper: keeper ?? "",
        actor: actor ?? "",
        consumableId: consumableId ?? "",
        dateFrom: dateFrom ?? "",
        dateTo: dateTo ?? "",
        types: [...selectedTypes].sort(),
        statuses: [...selectedStatuses].sort(),
      }),
    [
      actor,
      consumableId,
      dateFrom,
      dateTo,
      keeper,
      keyword,
      selectedStatuses,
      selectedTypes,
    ],
  );

  const submitFilters = (formData: FormData) => {
    const params = new URLSearchParams(searchParams.toString());

    FILTER_KEYS.forEach((key) => params.delete(key));

    const keyword = (formData.get("keyword") as string | null)?.trim();
    const keeper = (formData.get("keeper") as string | null)?.trim();
    const actor = (formData.get("actor") as string | null)?.trim();
    const consumableId = (formData.get("consumableId") as string | null)?.trim();
    const dateFrom = (formData.get("dateFrom") as string | null)?.trim();
    const dateTo = (formData.get("dateTo") as string | null)?.trim();

    if (keyword) params.set("keyword", keyword);
    if (keeper) params.set("keeper", keeper);
    if (actor) params.set("actor", actor);
    if (consumableId) params.set("consumableId", consumableId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    formData.getAll("type").forEach((value) => {
      const trimmed = String(value).trim();
      if (trimmed) params.append("type", trimmed);
    });

    formData.getAll("status").forEach((value) => {
      const trimmed = String(value).trim();
      if (trimmed) params.append("status", trimmed);
    });

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const resetFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((key) => params.delete(key));
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const renderStatusLabel = (status: ConsumableOperationStatus) => {
    const label: ConsumableOperationStatusMeta = CONSUMABLE_OPERATION_STATUS_LABELS[status];
    return isChinese ? label.zh : label.en;
  };

  return (
    <form
      key={formKey}
      className="rounded-3xl border bg-card p-5 shadow-sm space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submitFilters(new FormData(event.currentTarget));
      }}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-muted-foreground">
            {isChinese ? "关键字" : "Keyword"}
          </span>
          <Input
            type="text"
            name="keyword"
            defaultValue={initialValues.keyword ?? ""}
            placeholder={
              isChinese ? "按耗材/描述/操作编号" : "Consumable / description / ID"
            }
            className="rounded-2xl bg-background text-sm"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-muted-foreground">
            {isChinese ? "保管人" : "Keeper"}
          </span>
          <Input
            type="text"
            name="keeper"
            defaultValue={initialValues.keeper ?? ""}
            className="rounded-2xl bg-background text-sm"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-muted-foreground">
            {isChinese ? "操作人" : "Actor"}
          </span>
          <Input
            type="text"
            name="actor"
            defaultValue={initialValues.actor ?? ""}
            className="rounded-2xl bg-background text-sm"
          />
        </label>
        <FilterDatePicker
          name="dateFrom"
          label={isChinese ? "开始日期" : "Start Date"}
          locale={locale}
          defaultValue={initialValues.dateFrom}
        />
        <FilterDatePicker
          name="dateTo"
          label={isChinese ? "结束日期" : "End Date"}
          locale={locale}
          defaultValue={initialValues.dateTo}
        />
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-muted-foreground">
            {isChinese ? "耗材编号" : "Consumable ID"}
          </span>
          <Input
            type="text"
            name="consumableId"
            defaultValue={initialValues.consumableId ?? ""}
            className="rounded-2xl bg-background text-sm"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {isChinese ? "操作类型" : "Operation Types"}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {CONSUMABLE_OPERATION_TYPES.map((type) => {
              const checkboxId = `operation-type-${type.value}`;
              return (
                <label
                  key={type.value}
                  htmlFor={checkboxId}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Checkbox
                    id={checkboxId}
                    name="type"
                    value={type.value}
                    defaultChecked={selectedTypes.includes(type.value)}
                    className="border-muted-foreground"
                  />
                  {isChinese ? type.label.zh : type.label.en}
                </label>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {isChinese ? "状态" : "Status"}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {(Object.keys(CONSUMABLE_OPERATION_STATUS_LABELS) as ConsumableOperationStatus[]).map(
              (status) => {
                const checkboxId = `operation-status-${status}`;
                return (
                  <label
                    key={status}
                    htmlFor={checkboxId}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Checkbox
                      id={checkboxId}
                      name="status"
                      value={status}
                      defaultChecked={selectedStatuses.includes(status)}
                      className="border-muted-foreground"
                    />
                    {renderStatusLabel(status)}
                  </label>
                );
              },
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit">
          {isChinese ? "应用筛选" : "Apply Filters"}
        </Button>
        <Button type="button" variant="outline" onClick={resetFilters}>
          {isChinese ? "重置" : "Reset"}
        </Button>
      </div>
    </form>
  );
}
