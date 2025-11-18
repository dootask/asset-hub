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
import type { Role } from "@/lib/types/system";

interface Props {
  roles: Role[];
  locale?: string;
}

export default function RoleTable({ roles, locale = "en" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dialogRole, setDialogRole] = useState<Role | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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

  const baseLink = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const closeDialog = () => {
    setDeleteDialogOpen(false);
    setDialogRole(null);
    setDialogError(null);
  };

  const handleDelete = async () => {
    if (!dialogRole) return;
    setDeletingId(dialogRole.id);
    setDialogError(null);
    try {
      const response = await fetch(
        `/apps/asset-hub/api/system/roles/${dialogRole.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.message ?? "删除失败");
      }
      closeDialog();
      router.replace(baseLink);
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

  if (roles.length === 0) {
    return (
      <div className="rounded-2xl border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        {isChinese ? "暂无角色数据。" : "No roles yet."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border">
      <table className="w-full table-auto text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">
              {isChinese ? "角色名称" : "Role"}
            </th>
            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">
              {isChinese ? "作用域" : "Scope"}
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
          {roles.map((role) => (
            <tr key={role.id} className="border-t">
              <td className="px-4 py-3">
                <div className="font-medium">{role.name}</div>
                <p className="text-xs text-muted-foreground">{role.id}</p>
              </td>
              <td className="px-4 py-3">{role.scope}</td>
              <td className="px-4 py-3">{role.description ?? "-"}</td>
              <td className="px-4 py-3 text-right text-xs whitespace-nowrap">
                <Link
                  href={buildEditLink(role.id)}
                  className="rounded-full border px-3 py-1 font-medium text-muted-foreground hover:text-foreground"
                >
                  {editParam === role.id
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
                    setDialogRole(role);
                    setDeleteDialogOpen(true);
                    setDialogError(null);
                  }}
                  disabled={deletingId === role.id}
                  className="ml-2 rounded-full border border-destructive/40 px-3 py-1 font-medium text-destructive/80 hover:text-destructive disabled:opacity-50"
                >
                  {isChinese ? "删除" : "Delete"}
                </button>
              </td>
            </tr>
          ))}
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
              {isChinese ? "删除角色" : "Delete Role"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isChinese
                ? `确定删除 ${dialogRole?.name ?? ""}？`
                : `Are you sure you want to delete ${dialogRole?.name ?? ""}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {dialogError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {dialogError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId === dialogRole?.id}>
              {isChinese ? "取消" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deletingId === dialogRole?.id}
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

