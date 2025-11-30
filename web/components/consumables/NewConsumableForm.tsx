"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import {
  CONSUMABLE_STATUSES,
  getConsumableStatusLabel,
  type ConsumableCategory,
  type ConsumableStatus,
} from "@/lib/types/consumable";
import type { Company } from "@/lib/types/system";

type Props = {
  locale?: string;
  categories: ConsumableCategory[];
  companies: Company[];
};

export default function NewConsumableForm({
  locale = "en",
  categories,
  companies,
}: Props) {
  const router = useRouter();
  const isChinese = locale === "zh";
  const firstCategory = categories[0]?.code ?? "";
  const firstCompany = companies[0]?.code ?? "";
  const [formState, setFormState] = useState({
    name: "",
    category: firstCategory,
    status: CONSUMABLE_STATUSES[0] as ConsumableStatus,
    companyCode: firstCompany,
    quantity: "0",
    unit: categories[0]?.unit ?? "",
    keeper: "",
    location: "",
    safetyStock: "0",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const feedback = useAppFeedback();

  const handleChange = <K extends keyof typeof formState>(
    field: K,
    value: (typeof formState)[K],
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = Number(formState.quantity);
    const safetyStock = Number(formState.safetyStock || 0);
    if (!Number.isFinite(quantity) || quantity < 0) {
      feedback.error(isChinese ? "数量需为非负数字" : "Quantity must be a non-negative number");
      return;
    }
    if (!Number.isFinite(safetyStock) || safetyStock < 0) {
      feedback.error(
        isChinese ? "安全库存需为非负数字" : "Safety stock must be a non-negative number",
      );
      return;
    }

    setSubmitting(true);
    try {
      const client = await getApiClient();
      const payload = {
        name: formState.name.trim(),
        category: formState.category,
        status: formState.status,
        companyCode: formState.companyCode,
        quantity,
        unit: formState.unit.trim(),
        keeper: formState.keeper.trim(),
        location: formState.location.trim(),
        safetyStock,
        description: formState.description.trim() || undefined,
      };
      const response = await client.post<{ data: { id: string } }>(
        "/apps/asset-hub/api/consumables",
        payload,
      );
      router.push(`/${locale}/consumables/${response.data.data.id}`);
      router.refresh();
      feedback.success(isChinese ? "耗材已创建" : "Consumable created");
    } catch (err) {
      const message = extractApiErrorMessage(
        err,
        isChinese ? "提交失败，请稍后再试。" : "Submission failed, please try again later.",
      );
      feedback.error(message, {
        blocking: true,
        title: isChinese ? "提交失败" : "Submit failed",
        acknowledgeLabel: isChinese ? "知道了" : "Got it",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const categoryReady = formState.category.trim().length > 0;
  const companyReady = formState.companyCode.trim().length > 0;
  const nameReady = formState.name.trim().length > 0;
  const unitReady = formState.unit.trim().length > 0;
  const keeperReady = formState.keeper.trim().length > 0;
  const locationReady = formState.location.trim().length > 0;
  const canSubmit =
    categoryReady &&
    companyReady &&
    nameReady &&
    unitReady &&
    keeperReady &&
    locationReady &&
    categories.length > 0 &&
    companies.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="consumable-name" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "耗材名称" : "Consumable Name"}
          </Label>
          <Input
            id="consumable-name"
            required
            value={formState.name}
            onChange={(event) => handleChange("name", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="consumable-company" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "所属公司" : "Company"}
          </Label>
          <Select
            value={formState.companyCode || "none"}
            onValueChange={(value) =>
              handleChange("companyCode", value === "none" ? "" : value)
            }
            disabled={companies.length === 0}
          >
            <SelectTrigger id="consumable-company" className="w-full">
              <SelectValue
                placeholder={
                  companies.length === 0
                    ? isChinese
                      ? "请先创建公司"
                      : "Create a company first"
                    : undefined
                }
              />
            </SelectTrigger>
            <SelectContent>
              {companies.length === 0 ? (
                <SelectItem value="none" disabled>
                  {isChinese ? "无可用公司" : "No companies available"}
                </SelectItem>
              ) : (
                companies.map((company) => (
                  <SelectItem key={company.id} value={company.code}>
                    {company.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="consumable-category"
            className="text-sm font-medium text-muted-foreground"
          >
            {isChinese ? "耗材类别" : "Category"}
          </Label>
          <Select
            value={formState.category || "none"}
            onValueChange={(value) => handleChange("category", value === "none" ? "" : value)}
            disabled={categories.length === 0}
          >
            <SelectTrigger id="consumable-category" className="w-full">
              <SelectValue
                placeholder={
                  categories.length === 0
                    ? isChinese
                      ? "请先创建耗材类别"
                      : "Create a category first"
                    : undefined
                }
              />
            </SelectTrigger>
            <SelectContent>
              {categories.length === 0 ? (
                <SelectItem value="none" disabled>
                  {isChinese ? "无可用类别" : "No categories available"}
                </SelectItem>
              ) : (
                categories.map((category) => (
                  <SelectItem key={category.id} value={category.code}>
                    {isChinese ? category.labelZh : category.labelEn}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="consumable-status" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "状态" : "Status"}
          </Label>
          <Select
            value={formState.status}
            onValueChange={(value) => handleChange("status", value as ConsumableStatus)}
          >
            <SelectTrigger id="consumable-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONSUMABLE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {getConsumableStatusLabel(status, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="consumable-quantity" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "初始库存数量" : "Starting Quantity"}
          </Label>
          <Input
            id="consumable-quantity"
            required
            type="number"
            min={0}
            value={formState.quantity}
            onChange={(event) => handleChange("quantity", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="consumable-unit" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "计量单位" : "Unit"}
          </Label>
          <Input
            id="consumable-unit"
            required
            value={formState.unit}
            onChange={(event) => handleChange("unit", event.target.value)}
            placeholder={isChinese ? "例如：个、箱、包" : "e.g. pcs, box"}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="consumable-keeper" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "保管人" : "Keeper"}
          </Label>
          <Input
            id="consumable-keeper"
            required
            value={formState.keeper}
            onChange={(event) => handleChange("keeper", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="consumable-location"
            className="text-sm font-medium text-muted-foreground"
          >
            {isChinese ? "存放位置" : "Location"}
          </Label>
          <Input
            id="consumable-location"
            required
            value={formState.location}
            onChange={(event) => handleChange("location", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="consumable-safety-stock"
            className="text-sm font-medium text-muted-foreground"
          >
            {isChinese ? "安全库存" : "Safety Stock"}
          </Label>
          <Input
            id="consumable-safety-stock"
            required
            type="number"
            min={0}
            value={formState.safetyStock}
            onChange={(event) => handleChange("safetyStock", event.target.value)}
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="consumable-description" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "描述（可选）" : "Description (optional)"}
          </Label>
          <Textarea
            id="consumable-description"
            value={formState.description}
            onChange={(event) => handleChange("description", event.target.value)}
            placeholder={
              isChinese ? "补充仓位、批次或采购信息，方便追溯。" : "Add notes like batch, shelf, or PO info."
            }
          />
        </div>
      </div>

      {categories.length === 0 && (
        <p className="rounded-2xl border border-dashed border-amber-400/60 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          {isChinese
            ? "当前没有可用的耗材类别，请先在“耗材设置”创建。"
            : "No categories available. Please create one in Consumable Settings first."}
        </p>
      )}
      {companies.length === 0 && (
        <p className="rounded-2xl border border-dashed border-amber-400/60 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          {isChinese
            ? "当前没有可用的公司，请先在系统管理中创建公司。"
            : "No companies available. Please create one under System Management first."}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={submitting || !canSubmit}
          className="rounded-2xl px-5 py-2 text-sm shadow disabled:opacity-60"
        >
          {submitting
            ? isChinese
              ? "提交中..."
              : "Submitting..."
            : isChinese
              ? "创建耗材"
              : "Create Consumable"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={() => router.back()}
          className="rounded-2xl px-4 py-2 text-sm"
        >
          {isChinese ? "取消" : "Cancel"}
        </Button>
      </div>
    </form>
  );
}
