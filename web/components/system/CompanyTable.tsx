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
      <table className="w-full table-auto text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">
              {isChinese ? "公司名称" : "Company"}
            </th>
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">
              {isChinese ? "编码" : "Code"}
            </th>
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">
              {isChinese ? "描述" : "Description"}
            </th>
            <th className="px-4 py-3 text-right font-medium whitespace-nowrap">
              {isChinese ? "操作" : "Actions"}
            </th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => {
            const isEditing = editParam === company.id;
            return (
              <tr key={company.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-medium">{company.name}</div>
                  <p className="text-xs text-muted-foreground">
                    {company.id}
                  </p>
                </td>
                <td className="px-4 py-3">{company.code}</td>
                <td className="px-4 py-3">
                  {company.description ?? "-"}
                </td>
                <td className="px-4 py-3 text-right text-xs whitespace-nowrap">
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

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

