"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Company } from "@/lib/types/system";
import { useAppFeedback } from "@/components/providers/feedback-provider";

interface Props {
  initialCompanies: Company[];
  locale: string;
  baseUrl: string;
}

export type CompanyTableHandle = {
  openCreateDialog: () => void;
};

type FormState = {
  name: string;
  code: string;
  description: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  code: "",
  description: "",
};

const CompanyTable = forwardRef<CompanyTableHandle, Props>(function CompanyTable(
  { initialCompanies, locale, baseUrl }: Props,
  ref,
) {
  const isChinese = locale === "zh";
  const [companies, setCompanies] = useState(initialCompanies);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const feedback = useAppFeedback();

  const displayedCompanies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return companies
      .filter((company) => {
        if (!normalizedSearch) return true;
        const target = `${company.name} ${company.code} ${
          company.description ?? ""
        }`.toLowerCase();
        return target.includes(normalizedSearch);
      })
      .sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
      );
  }, [companies, search]);

  const openCreateDialog = useCallback(() => {
    setEditingId(null);
    setFormState(DEFAULT_FORM);
    setDialogOpen(true);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      openCreateDialog,
    }),
    [openCreateDialog],
  );

  const openEditDialog = (company: Company) => {
    setEditingId(company.id);
    setFormState({
      name: company.name,
      code: company.code,
      description: company.description ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          name: formState.name.trim(),
          code: formState.code.trim().toUpperCase(),
          description: formState.description.trim() || undefined,
        };
        if (!payload.name || !payload.code) {
          throw new Error(
            isChinese ? "请填写名称与编码。" : "Name and code are required.",
          );
        }
        const endpoint = editingId
          ? `${baseUrl}/apps/asset-hub/api/system/companies/${editingId}`
          : `${baseUrl}/apps/asset-hub/api/system/companies`;
        const response = await fetch(endpoint, {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body?.message ?? "保存失败，请稍后重试。");
        }
        const { data } = body as { data: Company };
        setCompanies((prev) => {
          if (editingId) {
            return prev.map((item) => (item.id === data.id ? data : item));
          }
          return [data, ...prev];
        });
        setDialogOpen(false);
        setEditingId(null);
        setFormState(DEFAULT_FORM);
        feedback.success(
          isChinese
            ? editingId
              ? "公司已更新"
              : "公司已创建"
            : editingId
              ? "Company updated"
              : "Company created",
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : isChinese
              ? "保存失败，请稍后重试。"
              : "Failed to save company.";
        feedback.error(message, {
          blocking: true,
          title: isChinese ? "保存失败" : "Save failed",
          acknowledgeLabel: isChinese ? "知道了" : "Got it",
        });
      }
    });
  };

  const handleDelete = (company: Company) => {
    startTransition(async () => {
      try {
        const response = await fetch(
          `${baseUrl}/apps/asset-hub/api/system/companies/${company.id}`,
          { method: "DELETE" },
        );
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.message ?? "删除失败");
        }
        setCompanies((prev) => prev.filter((item) => item.id !== company.id));
        feedback.success(isChinese ? "删除成功" : "Deleted successfully");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : isChinese
              ? "删除失败，请稍后重试。"
              : "Failed to delete company.";
        feedback.error(message, {
          blocking: true,
          title: isChinese ? "删除失败" : "Delete failed",
          acknowledgeLabel: isChinese ? "知道了" : "Got it",
        });
      }
    });
  };

  return (
    <>
      <div className="space-y-2 rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p>
            {isChinese
              ? `共 ${companies.length} 个公司`
              : `${companies.length} companies`}
          </p>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              isChinese ? "搜索名称或编码" : "Search by name or code"
            }
            className="md:w-64"
          />
        </div>
      </div>

      {displayedCompanies.length === 0 ? (
        <div className="rounded-2xl border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          {companies.length === 0 && !search.trim()
            ? isChinese
              ? "尚未创建任何公司记录。"
              : "No companies yet. Use the button above to create one."
            : isChinese
              ? "没有匹配的公司，请调整搜索条件。"
              : "No companies match the current search."}
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border bg-card">
          <Table className="text-sm">
            <TableHeader className="bg-muted/30">
              <TableRow className="text-xs uppercase tracking-wide text-muted-foreground">
                <TableHead className="px-4 py-3">
                  {isChinese ? "公司名称" : "Company"}
                </TableHead>
                <TableHead className="px-4 py-3">Code</TableHead>
                <TableHead className="px-4 py-3">
                  {isChinese ? "描述" : "Description"}
                </TableHead>
                <TableHead className="px-4 py-3">
                  {isChinese ? "创建时间" : "Created"}
                </TableHead>
                <TableHead className="px-4 py-3 text-right">
                  {isChinese ? "操作" : "Actions"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedCompanies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {company.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {company.id}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs font-mono text-muted-foreground">
                    {company.code}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {company.description ? (
                      <span className="text-sm text-muted-foreground">
                        {company.description}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(company.createdAt).toLocaleDateString(
                      locale === "zh" ? "zh-CN" : "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full px-3"
                        onClick={() => openEditDialog(company)}
                      >
                        {isChinese ? "编辑" : "Edit"}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full px-3 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(company)}
                          >
                            {isChinese ? "删除" : "Delete"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {isChinese ? "确认删除公司" : "Delete company?"}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {isChinese
                                ? "删除后将无法恢复，且相关资产需要重新分配公司。"
                                : "This action cannot be undone and related assets must be reassigned."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              {isChinese ? "取消" : "Cancel"}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDelete(company)}
                              disabled={pending}
                            >
                              {isChinese ? "确认删除" : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? isChinese
                  ? "编辑公司"
                  : "Edit Company"
                : isChinese
                  ? "新增公司"
                  : "New Company"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form id="company-form" className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="company-name">
                  {isChinese ? "公司名称" : "Company Name"}
                </Label>
                <Input
                  id="company-name"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company-code">
                  {isChinese ? "公司编码" : "Company Code"}
                </Label>
                <Input
                  id="company-code"
                  value={formState.code}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, code: event.target.value }))
                  }
                  placeholder={isChinese ? "例如：NEBULA" : "e.g. NEBULA"}
                  required
                  disabled={!!editingId}
                />
                {editingId && (
                  <p className="text-xs text-muted-foreground">
                    {isChinese
                      ? "公司编码用于引用，不可修改。"
                      : "Code is referenced elsewhere and cannot be changed."}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company-description">
                  {isChinese ? "描述（可选）" : "Description (optional)"}
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
            </form>
          </DialogBody>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setEditingId(null);
                setFormState(DEFAULT_FORM);
              }}
            >
              {isChinese ? "取消" : "Cancel"}
            </Button>
            <Button type="submit" form="company-form" disabled={pending}>
              {pending
                ? isChinese
                  ? "保存中..."
                  : "Saving..."
                : editingId
                  ? isChinese
                    ? "保存变更"
                    : "Save"
                  : isChinese
                    ? "创建公司"
                    : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

export default CompanyTable;

