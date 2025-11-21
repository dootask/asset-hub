"use client";

import { useMemo, useState, useTransition } from "react";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Company } from "@/lib/types/system";

interface Props {
  initialCompanies: Company[];
  locale: string;
  baseUrl: string;
}

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

export default function CompanyTable({ initialCompanies, locale, baseUrl }: Props) {
  const isChinese = locale === "zh";
  const [companies, setCompanies] = useState(initialCompanies);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const displayedCompanies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = companies.filter((company) => {
      if (!normalizedSearch) return true;
      const target = `${company.name} ${company.code} ${
        company.description ?? ""
      }`.toLowerCase();
      return target.includes(normalizedSearch);
    });
    return filtered.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
    );
  }, [companies, search]);

  const openCreateDialog = () => {
    setEditingId(null);
    setFormState(DEFAULT_FORM);
    setError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (company: Company) => {
    setEditingId(company.id);
    setFormState({
      name: company.name,
      code: company.code,
      description: company.description ?? "",
    });
    setError(null);
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
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : isChinese
              ? "保存失败，请稍后重试。"
              : "Failed to save company.",
        );
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
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : isChinese
              ? "删除失败，请稍后重试。"
              : "Failed to delete company.",
        );
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
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                isChinese ? "搜索名称或编码" : "Search by name or code"
              }
              className="md:w-64"
            />
            <Button
              type="button"
              className="rounded-2xl px-4 py-2 text-sm"
              onClick={openCreateDialog}
            >
              {isChinese ? "新增公司" : "New Company"}
            </Button>
          </div>
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
        <DialogContent className="max-w-lg">
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
          <form className="space-y-4" onSubmit={handleSubmit}>
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
            {error && (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
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
              <Button
                type="submit"
                disabled={pending}
                className="rounded-2xl px-4 py-2"
              >
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
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Company } from "@/lib/types/system";

interface Props {
  companies: Company[];
  locale?: string;
}

export default function CompanyTable({ companies, locale = "en" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dialogCompany, setDialogCompany] = useState<Company | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const isChinese = locale === "zh";

  const editParam = searchParams.get("edit");

  const buildEditLink = useMemo(() => {
    const baseSearch = searchParams.toString();
    return (id: string) => {
      const params = new URLSearchParams(baseSearch);
      params.set("edit", id);
      return `${pathname}?${params.toString()}`;
    };
  }, [pathname, searchParams]);

  const buildBaseLink = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const closeDialog = () => {
    setDeleteDialogOpen(false);
    setDialogCompany(null);
    setDialogError(null);
  };

  const handleDelete = async () => {
    if (!dialogCompany) return;
    setDeletingId(dialogCompany.id);
    setDialogError(null);
    try {
      const response = await fetch(
        `/apps/asset-hub/api/system/companies/${dialogCompany.id}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.message ?? "删除失败");
      }
      closeDialog();
      router.replace(buildBaseLink);
      router.refresh();
    } catch (error) {
      setDialogError(
        error instanceof Error
          ? error.message
          : isChinese
            ? "删除失败"
            : "Delete failed",
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (companies.length === 0) {
    return (
      <div className="rounded-2xl border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        {isChinese ? "暂无公司数据。" : "No companies yet."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border">
      <Table className="text-sm">
        <TableHeader className="bg-muted/50">
          <TableRow className="text-left text-xs uppercase tracking-wide text-muted-foreground hover:bg-transparent">
            <TableHead className="px-4 py-3">{isChinese ? "公司名称" : "Company"}</TableHead>
            <TableHead className="px-4 py-3">{isChinese ? "编码" : "Code"}</TableHead>
            <TableHead className="px-4 py-3">{isChinese ? "描述" : "Description"}</TableHead>
            <TableHead className="px-4 py-3 text-right">{isChinese ? "操作" : "Actions"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => {
            const isEditing = editParam === company.id;
            return (
              <TableRow key={company.id}>
                <TableCell className="px-4 py-3 whitespace-normal">
                  <div className="font-medium">{company.name}</div>
                  <p className="text-xs text-muted-foreground">{company.id}</p>
                </TableCell>
                <TableCell className="px-4 py-3">{company.code}</TableCell>
                <TableCell className="px-4 py-3 whitespace-normal">
                  {company.description ?? "-"}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-xs">
                  <Link
                    href={buildEditLink(company.id)}
                    className="rounded-full border px-3 py-1 font-medium text-muted-foreground hover:text-foreground"
                  >
                    {isEditing
                      ? isChinese
                        ? "编辑中"
                        : "Editing"
                      : isChinese
                        ? "编辑"
                        : "Edit"}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setDialogCompany(company);
                      setDeleteDialogOpen(true);
                      setDialogError(null);
                    }}
                    disabled={deletingId === company.id}
                    className="ml-2 rounded-full border border-destructive/40 px-3 py-1 font-medium text-destructive/80 hover:text-destructive disabled:opacity-50"
                  >
                    {isChinese ? "删除" : "Delete"}
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
          } else {
            setDeleteDialogOpen(true);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isChinese ? "删除公司" : "Delete Company"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isChinese
                ? `确定删除 ${dialogCompany?.name ?? ""}？该操作不可恢复。`
                : `Delete ${dialogCompany?.name ?? ""}? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {dialogError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {dialogError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId === dialogCompany?.id}>
              {isChinese ? "取消" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deletingId === dialogCompany?.id}
              className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30 dark:text-white"
            >
              {isChinese ? "确认删除" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

