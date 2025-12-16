"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil } from "lucide-react";
import type { Consumable, ConsumableCategory } from "@/lib/types/consumable";
import type { Company } from "@/lib/types/system";
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
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import { coerceMoneyToCents, formatCentsToMoney } from "@/lib/utils/money";

type Props = {
  consumable: Consumable;
  locale?: string;
  categories: ConsumableCategory[];
  companies: Company[];
};

export default function EditConsumableDialog({
  consumable,
  locale = "en",
  categories,
  companies,
}: Props) {
  const isChinese = locale === "zh";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const feedback = useAppFeedback();
  const [formState, setFormState] = useState({
    consumableNo: consumable.consumableNo ?? "",
    name: consumable.name,
    specModel: consumable.specModel ?? "",
    category: consumable.category,
    status: consumable.status === "archived" ? "archived" : "auto",
    companyCode: consumable.companyCode ?? companies[0]?.code ?? "",
    quantity: consumable.quantity.toString(),
    unit: consumable.unit,
    keeper: consumable.keeper,
    location: consumable.location,
    safetyStock: consumable.safetyStock.toString(),
    purchasePrice: formatCentsToMoney(consumable.purchasePriceCents),
    description: consumable.description ?? "",
  });
  const categoryOptions = categories.map((category) => ({
    id: category.id,
    code: category.code,
    label: isChinese ? category.labelZh : category.labelEn,
    fallbackLabel: isChinese ? category.labelEn : category.labelZh,
  }));
  const companyOptions = companies.map((company) => ({
    id: company.id,
    code: company.code,
    label: company.name,
  }));

  const currentCategory = categoryOptions.find(
    (entry) => entry.code === formState.category,
  );
  const selectCategories =
    currentCategory || !formState.category
      ? categoryOptions
      : [
          ...categoryOptions,
          {
            id: "unknown-category",
            code: formState.category,
            label: formState.category,
            fallbackLabel: "",
          },
        ];
  const currentCompany =
    companyOptions.find((entry) => entry.code === formState.companyCode) ??
    (formState.companyCode
      ? [
          {
            id: "unknown-company",
            code: formState.companyCode,
            label: formState.companyCode,
          },
        ]
      : [])[0];
  const selectCompanies =
    currentCompany && !companyOptions.some((entry) => entry.code === currentCompany.code)
      ? [...companyOptions, currentCompany]
      : companyOptions;

  const handleChange = <K extends keyof typeof formState>(
    field: K,
    value: (typeof formState)[K],
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = Number(formState.quantity);
    const safetyStock = Number(formState.safetyStock || 0);
    if (!Number.isFinite(quantity) || quantity < 0) {
      feedback.error(
        isChinese ? "库存数量需为非负数字" : "Quantity must be a non-negative number",
      );
      return;
    }
    if (!Number.isFinite(safetyStock) || safetyStock < 0) {
      feedback.error(
        isChinese ? "安全库存需为非负数字" : "Safety stock must be a non-negative number",
      );
      return;
    }

    const rawPurchasePrice = formState.purchasePrice.trim();
    const purchasePriceCents = coerceMoneyToCents(rawPurchasePrice);
    if (rawPurchasePrice && purchasePriceCents === null) {
      feedback.error(isChinese ? "采购价格格式不正确" : "Invalid purchase price", {
        blocking: true,
        title: isChinese ? "更新失败" : "Update failed",
        acknowledgeLabel: isChinese ? "知道了" : "Got it",
      });
      return;
    }

    setSubmitting(true);
    try {
      const client = await getApiClient();
      await client.put(`/apps/asset-hub/api/consumables/${consumable.id}`, {
        consumableNo: formState.consumableNo.trim() || undefined,
        name: formState.name.trim(),
        specModel: formState.specModel.trim() || undefined,
        category: formState.category,
        status: formState.status === "archived" ? "archived" : undefined,
        companyCode: formState.companyCode.trim(),
        quantity,
        unit: formState.unit.trim(),
        keeper: formState.keeper.trim(),
        location: formState.location.trim(),
        safetyStock,
        purchasePriceCents,
        purchaseCurrency: "CNY",
        description: formState.description.trim() || undefined,
      });
      setOpen(false);
      router.refresh();
      feedback.success(isChinese ? "耗材已更新" : "Consumable updated");
    } catch (err) {
      const message = extractApiErrorMessage(
        err,
        isChinese ? "更新失败，请稍后重试。" : "Failed to update consumable.",
      );
      feedback.error(message, {
        blocking: true,
        title: isChinese ? "更新失败" : "Update failed",
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
    selectCategories.length > 0 &&
    selectCompanies.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full">
          <Pencil className="mr-2 h-3.5 w-3.5" />
          {isChinese ? "编辑信息" : "Edit Info"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isChinese ? "编辑耗材信息" : "Edit Consumable"}</DialogTitle>
          <DialogDescription>
            {isChinese
              ? "更新耗材的基础资料，保存后立即生效。"
              : "Update consumable details. Changes take effect immediately."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <form id="edit-consumable-form" className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-consumable-name"
                  className="gap-1"
                >
                  {isChinese ? "耗材名称" : "Consumable Name"}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-consumable-name"
                  required
                  value={formState.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-consumable-no"
                  className="text-sm font-medium text-muted-foreground"
                >
                  {isChinese
                    ? "耗材编号（留空自动生成）"
                    : "Consumable No. (auto-generated if left blank)"}
                </Label>
                <Input
                  id="edit-consumable-no"
                  value={formState.consumableNo}
                  placeholder={isChinese ? "例如：OFF-000001" : "e.g. OFF-000001"}
                  onChange={(event) =>
                    handleChange("consumableNo", event.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-consumable-spec-model"
                  className="text-sm font-medium text-muted-foreground"
                >
                  {isChinese ? "规格型号" : "Spec / Model"}
                </Label>
                <Input
                  id="edit-consumable-spec-model"
                  value={formState.specModel}
                  placeholder={isChinese ? "例如：A4 / 80g" : "e.g. A4 / 80g"}
                  onChange={(event) =>
                    handleChange("specModel", event.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-consumable-company"
                  className="gap-1"
                >
                  {isChinese ? "所属公司" : "Company"}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formState.companyCode}
                  onValueChange={(value) => handleChange("companyCode", value)}
                  disabled={selectCompanies.length === 0}
                >
                  <SelectTrigger id="edit-consumable-company" className="w-full">
                    <SelectValue
                      placeholder={
                        selectCompanies.length === 0
                          ? isChinese
                            ? "暂无公司"
                            : "No companies"
                          : undefined
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {selectCompanies.length === 0 ? (
                      <SelectItem value="" disabled>
                        {isChinese ? "无可用公司" : "No companies available"}
                      </SelectItem>
                    ) : (
                      selectCompanies.map((company) => (
                        <SelectItem key={company.id} value={company.code}>
                          {company.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-consumable-category"
                  className="gap-1"
                >
                  {isChinese ? "耗材类别" : "Category"}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formState.category}
                  onValueChange={(value) => handleChange("category", value)}
                  disabled={selectCategories.length === 0}
                >
                  <SelectTrigger id="edit-consumable-category" className="w-full">
                    <SelectValue
                      placeholder={
                        selectCategories.length === 0
                          ? isChinese
                            ? "暂无类别"
                            : "No categories"
                          : undefined
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {selectCategories.length === 0 ? (
                      <SelectItem value="" disabled>
                        {isChinese ? "无可用类别" : "No categories available"}
                      </SelectItem>
                    ) : (
                      selectCategories.map((category) => (
                        <SelectItem key={category.id} value={category.code}>
                          <span className="font-medium">{category.label}</span>
                          {category.fallbackLabel && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {category.fallbackLabel}
                            </span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-consumable-quantity"
                  className="gap-1"
                >
                  {isChinese ? "当前库存" : "Quantity"}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-consumable-quantity"
                  type="number"
                  min={0}
                  required
                  value={formState.quantity}
                  onChange={(event) => handleChange("quantity", event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-consumable-unit"
                  className="gap-1"
                >
                  {isChinese ? "计量单位" : "Unit"}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-consumable-unit"
                  required
                  value={formState.unit}
                  onChange={(event) => handleChange("unit", event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-consumable-keeper"
                  className="gap-1"
                >
                  {isChinese ? "保管人" : "Keeper"}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-consumable-keeper"
                  required
                  value={formState.keeper}
                  onChange={(event) => handleChange("keeper", event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-consumable-location"
                  className="gap-1"
                >
                  {isChinese ? "存放位置" : "Location"}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-consumable-location"
                  required
                  value={formState.location}
                  onChange={(event) => handleChange("location", event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-consumable-safety-stock"
                  className="gap-1"
                >
                  {isChinese ? "安全库存" : "Safety Stock"}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-consumable-safety-stock"
                  type="number"
                  min={0}
                  required
                  value={formState.safetyStock}
                  onChange={(event) => handleChange("safetyStock", event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-consumable-status">
                  {isChinese ? "状态" : "Status"}
                </Label>
                <Select
                  value={formState.status}
                  onValueChange={(value) =>
                    handleChange("status", (value as "auto" | "archived") ?? "auto")
                  }
                >
                  <SelectTrigger id="edit-consumable-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">
                      {isChinese ? "自动（按库存计算）" : "Automatic (from stock)"}
                    </SelectItem>
                    <SelectItem value="archived">
                      {isChinese ? "归档（停止自动更新）" : "Archived (manual override)"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-consumable-purchase-price"
                  className="text-sm font-medium text-muted-foreground"
                >
                  {isChinese ? "采购价格" : "Purchase Price"}
                </Label>
                <Input
                  id="edit-consumable-purchase-price"
                  value={formState.purchasePrice}
                  placeholder={isChinese ? "例如：99.00" : "e.g. 99.00"}
                  onChange={(event) =>
                    handleChange("purchasePrice", event.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-consumable-description">
                  {isChinese ? "描述" : "Description"}
                </Label>
                <Textarea
                  id="edit-consumable-description"
                  value={formState.description}
                  onChange={(event) => handleChange("description", event.target.value)}
                  placeholder={
                    isChinese ? "补充仓位、批次或采购信息，方便追溯。" : "Add batch, shelf, or PO info."
                  }
                />
              </div>
            </div>
          </form>
        </DialogBody>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            {isChinese ? "取消" : "Cancel"}
          </Button>
          <Button
            type="submit"
            form="edit-consumable-form"
            disabled={submitting || !canSubmit}
          >
            {submitting
              ? isChinese
                ? "保存中..."
                : "Saving..."
              : isChinese
                ? "保存变更"
                : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
