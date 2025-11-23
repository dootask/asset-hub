"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Company } from "@/lib/types/system";
import { useAppFeedback } from "@/components/providers/feedback-provider";

interface CompanyFormProps {
  company?: Company;
  locale?: string;
}

export default function CompanyForm({ company, locale = "en" }: CompanyFormProps) {
  const router = useRouter();
  const isChinese = locale === "zh";
  const [formState, setFormState] = useState({
    name: company?.name ?? "",
    code: company?.code ?? "",
    description: company?.description ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const feedback = useAppFeedback();

  useEffect(() => {
    if (company) {
      setFormState({
        name: company.name,
        code: company.code,
        description: company.description ?? "",
      });
    } else {
      setFormState({ name: "", code: "", description: "" });
    }
  }, [company]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const url = company
        ? `/apps/asset-hub/api/system/companies/${company.id}`
        : "/apps/asset-hub/api/system/companies";
      const method = company ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.message ?? "提交失败");
      }

      router.replace(`/${locale}/system/company`);
      router.refresh();
      feedback.success(
        isChinese
          ? company
            ? "公司信息已更新"
            : "公司已创建"
          : company
            ? "Company updated"
            : "Company created",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : isChinese
            ? "提交失败，请稍后重试。"
            : "Submission failed, please try again later.";
      feedback.error(message, {
        blocking: true,
        title: isChinese ? "提交失败" : "Submit failed",
        acknowledgeLabel: isChinese ? "知道了" : "Got it",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border bg-muted/40 p-4">
      <h3 className="text-sm font-semibold">
        {company
          ? isChinese ? "编辑公司" : "Edit Company"
          : isChinese ? "新增公司" : "New Company"}
      </h3>
      <div className="space-y-1.5">
        <Label htmlFor="company-name" className="text-xs font-medium text-muted-foreground">
          {isChinese ? "公司名称" : "Company Name"}
        </Label>
        <Input
          id="company-name"
          required
          value={formState.name}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, name: event.target.value }))
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="company-code" className="text-xs font-medium text-muted-foreground">
          {isChinese ? "公司编码" : "Company Code"}
        </Label>
        <Input
          id="company-code"
          required
          className="uppercase"
          value={formState.code}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, code: event.target.value }))
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="company-description" className="text-xs font-medium text-muted-foreground">
          {isChinese ? "描述" : "Description"}
        </Label>
        <Textarea
          id="company-description"
          rows={3}
          value={formState.description}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              description: event.target.value,
            }))
          }
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting} className="rounded-2xl px-4 py-2 text-sm">
          {submitting
            ? isChinese
              ? "提交中..."
              : "Submitting..."
            : company
              ? isChinese
                ? "保存修改"
                : "Save Changes"
              : isChinese
                ? "创建公司"
                : "Create Company"}
        </Button>
        {company && (
          <Button
            type="button"
            variant="outline"
            onClick={() => router.replace(`/${locale}/system/company`)}
            className="rounded-2xl px-4 py-2 text-sm"
          >
            {isChinese ? "取消" : "Cancel"}
          </Button>
        )}
      </div>
    </form>
  );
}
