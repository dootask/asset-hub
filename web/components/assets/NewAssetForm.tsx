"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ASSET_STATUSES,
  getAssetStatusLabel,
} from "@/lib/types/asset";
import type { AssetCategory } from "@/lib/types/asset-category";
import type { Company } from "@/lib/types/system";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import { enUS, zhCN } from "react-day-picker/locale";
import { coerceMoneyToCents } from "@/lib/utils/money";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  locale?: string;
  categories: AssetCategory[];
  companies: Company[];
};

function parseYmdDate(value: string): Date | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return undefined;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return undefined;
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return date;
}

export default function NewAssetForm({ locale = "en", categories, companies }: Props) {
  const router = useRouter();
  const isChinese = locale === "zh";
  const [purchaseDateOpen, setPurchaseDateOpen] = useState(false);
  const [purchaseMonth, setPurchaseMonth] = useState<Date | undefined>(undefined);
  const [expiresDateOpen, setExpiresDateOpen] = useState(false);
  const [expiresMonth, setExpiresMonth] = useState<Date | undefined>(undefined);
  const firstCategory = categories[0]?.code ?? "";
  const firstCompany = companies[0]?.code ?? "";
  const [formState, setFormState] = useState({
    assetNo: "",
    name: "",
    specModel: "",
    category: firstCategory,
    status: ASSET_STATUSES[0],
    companyCode: firstCompany,
    owner: "",
    location: "",
    purchaseDate: "",
    expiresAt: "",
    note: "",
    purchasePrice: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const feedback = useAppFeedback();

  const handleChange = (
    field: keyof typeof formState,
    value: string,
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const rawPurchasePrice = formState.purchasePrice.trim();
      const purchasePriceCents = coerceMoneyToCents(rawPurchasePrice);
      if (rawPurchasePrice && purchasePriceCents === null) {
        feedback.error(
          isChinese ? "采购价格格式不正确" : "Invalid purchase price",
          {
            blocking: true,
            title: isChinese ? "提交失败" : "Submit failed",
            acknowledgeLabel: isChinese ? "知道了" : "Got it",
          },
        );
        return;
      }

      const payload = {
        assetNo: formState.assetNo,
        name: formState.name,
        specModel: formState.specModel,
        category: formState.category,
        status: formState.status,
        companyCode: formState.companyCode,
        owner: formState.owner,
        location: formState.location,
        purchaseDate: formState.purchaseDate,
        expiresAt: formState.expiresAt,
        note: formState.note,
        purchasePriceCents,
        purchaseCurrency: "CNY",
      };
      const client = await getApiClient();
      const response = await client.post<{ data: { id: string } }>(
        "/apps/asset-hub/api/assets",
        payload,
      );

      router.push(`/${locale}/assets/${response.data.data.id}`);
      router.refresh();
      feedback.success(isChinese ? "资产已创建" : "Asset created");
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

  const purchaseDateValue = parseYmdDate(formState.purchaseDate);
  const expiresDateValue = parseYmdDate(formState.expiresAt);

  const categoryReady = formState.category.trim().length > 0;
  const companyReady = formState.companyCode.trim().length > 0;
  const canSubmit = categoryReady && companyReady && companies.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label
            htmlFor="asset-name"
            className="gap-1 text-sm font-medium text-muted-foreground"
          >
            {isChinese ? "资产名称" : "Asset Name"}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="asset-name"
            required
            value={formState.name}
            onChange={(event) => handleChange("name", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="asset-no" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "资产编号（留空自动生成）" : "Asset No. (auto-generated if left blank)"}
          </Label>
          <Input
            id="asset-no"
            value={formState.assetNo}
            placeholder={isChinese ? "例如：IT-2025-0001" : "e.g. IT-2025-0001"}
            onChange={(event) => handleChange("assetNo", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="asset-spec-model" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "规格型号" : "Spec / Model"}
          </Label>
          <Input
            id="asset-spec-model"
            value={formState.specModel}
            placeholder={isChinese ? "例如：M3 Max / 64GB / 1TB" : "e.g. M3 Max / 64GB / 1TB"}
            onChange={(event) => handleChange("specModel", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="asset-company"
            className="gap-1 text-sm font-medium text-muted-foreground"
          >
            {isChinese ? "所属公司" : "Company"}
            <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formState.companyCode || "none"}
            onValueChange={(value) =>
              handleChange("companyCode", value === "none" ? "" : value)
            }
            disabled={companies.length === 0}
          >
            <SelectTrigger id="asset-company" className="w-full">
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
            htmlFor="asset-category"
            className="gap-1 text-sm font-medium text-muted-foreground"
          >
            {isChinese ? "资产类别" : "Category"}
            <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formState.category || "none"}
            onValueChange={(value) => handleChange("category", value === "none" ? "" : value)}
            disabled={categories.length === 0}
          >
            <SelectTrigger id="asset-category" className="w-full">
              <SelectValue
                placeholder={
                  categories.length === 0
                    ? isChinese
                      ? "请先创建资产类别"
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
          <Label htmlFor="asset-status" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "资产状态" : "Status"}
          </Label>
          <Select
            value={formState.status}
            onValueChange={(value) => handleChange("status", value)}
          >
            <SelectTrigger id="asset-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSET_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {getAssetStatusLabel(status, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="asset-owner"
            className="gap-1 text-sm font-medium text-muted-foreground"
          >
            {isChinese ? "使用人 / 部门" : "Owner / Dept"}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="asset-owner"
            required
            value={formState.owner}
            onChange={(event) => handleChange("owner", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="asset-location"
            className="gap-1 text-sm font-medium text-muted-foreground"
          >
            {isChinese ? "存放位置" : "Location"}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="asset-location"
            required
            value={formState.location}
            onChange={(event) => handleChange("location", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="asset-purchase-date" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "购入日期" : "Purchase Date"}
          </Label>
          <div className="relative">
            <Input
              id="asset-purchase-date"
              value={formState.purchaseDate}
              placeholder="YYYY-MM-DD"
              className="bg-background pr-10"
              onChange={(event) => {
                const nextValue = event.target.value;
                handleChange("purchaseDate", nextValue);
                const parsed = parseYmdDate(nextValue);
                if (parsed) {
                  setPurchaseMonth(parsed);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setPurchaseDateOpen(true);
                }
              }}
            />
            <Popover open={purchaseDateOpen} onOpenChange={setPurchaseDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                >
                  <CalendarIcon className="size-3.5" />
                  <span className="sr-only">
                    {isChinese ? "选择日期" : "Select date"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto overflow-hidden p-0"
                align="end"
                alignOffset={-8}
                sideOffset={10}
              >
                <Calendar
                  mode="single"
                  selected={purchaseDateValue}
                  locale={isChinese ? zhCN : enUS}
                  captionLayout="dropdown"
                  month={purchaseMonth ?? purchaseDateValue}
                  onMonthChange={setPurchaseMonth}
                  weekStartsOn={0}
                  startMonth={new Date(new Date().getFullYear() - 5, 0)}
                  endMonth={new Date(new Date().getFullYear() + 5, 11)}
                  onSelect={(date: Date | undefined) => {
                    if (!date) return;
                    handleChange("purchaseDate", date.toISOString().slice(0, 10));
                    setPurchaseMonth(date);
                    setPurchaseDateOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="asset-purchase-price" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "采购价格" : "Purchase Price"}
          </Label>
          <Input
            id="asset-purchase-price"
            type="text"
            inputMode="decimal"
            value={formState.purchasePrice}
            placeholder={isChinese ? "例如：18999.00" : "e.g. 18999.00"}
            onChange={(event) => handleChange("purchasePrice", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="asset-expires-at" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "过期时间" : "Expires At"}
          </Label>
          <div className="relative">
            <Input
              id="asset-expires-at"
              value={formState.expiresAt}
              placeholder="YYYY-MM-DD"
              className="bg-background pr-10"
              onChange={(event) => {
                const nextValue = event.target.value;
                handleChange("expiresAt", nextValue);
                if (!nextValue.trim()) {
                  return;
                }
                const parsed = parseYmdDate(nextValue);
                if (parsed) {
                  setExpiresMonth(parsed);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setExpiresDateOpen(true);
                }
              }}
            />
            <Popover open={expiresDateOpen} onOpenChange={setExpiresDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                >
                  <CalendarIcon className="size-3.5" />
                  <span className="sr-only">
                    {isChinese ? "选择日期" : "Select date"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto overflow-hidden p-0"
                align="end"
                alignOffset={-8}
                sideOffset={10}
              >
                <Calendar
                  mode="single"
                  selected={expiresDateValue}
                  locale={isChinese ? zhCN : enUS}
                  captionLayout="dropdown"
                  month={expiresMonth ?? expiresDateValue ?? undefined}
                  onMonthChange={setExpiresMonth}
                  weekStartsOn={0}
                  startMonth={new Date(new Date().getFullYear() - 10, 0)}
                  endMonth={new Date(new Date().getFullYear() + 20, 11)}
                  onSelect={(date: Date | undefined) => {
                    if (!date) return;
                    handleChange("expiresAt", date.toISOString().slice(0, 10));
                    setExpiresMonth(date);
                    setExpiresDateOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="asset-note" className="text-sm font-medium text-muted-foreground">
            {isChinese ? "备注" : "Note"}
          </Label>
          <Textarea
            id="asset-note"
            value={formState.note}
            rows={4}
            placeholder={isChinese ? "可填写补充信息" : "Optional notes..."}
            onChange={(event) => handleChange("note", event.target.value)}
          />
        </div>
      </div>

      {categories.length === 0 && (
        <p className="rounded-2xl border border-dashed border-amber-400/60 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          {isChinese
            ? "当前没有可用的资产类别，请先在“分类管理”页面创建。"
            : "No categories available. Please create one in the category management page first."}
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
              ? "创建资产"
              : "Create Asset"}
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
