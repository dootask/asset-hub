"use client";

import { forwardRef, useImperativeHandle, useMemo, useState, useTransition } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Role } from "@/lib/types/system";

interface Props {
  initialRoles: Role[];
  locale: string;
  baseUrl: string;
}

export type RoleTableHandle = {
  openCreateDialog: () => void;
};

type FormState = {
  name: string;
  scope: string;
  description: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  scope: "system",
  description: "",
};

const RoleTable = forwardRef<RoleTableHandle, Props>(function RoleTable(
  { initialRoles, locale, baseUrl },
  ref,
) {
  const isChinese = locale === "zh";
  const [roles, setRoles] = useState(initialRoles);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dialogRole, setDialogRole] = useState<Role | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return roles;
    return roles.filter((role) =>
      `${role.name} ${role.scope} ${role.description ?? ""}`.toLowerCase().includes(query),
    );
  }, [roles, search]);

  const openCreateDialog = () => {
    setEditing(null);
    setFormState(DEFAULT_FORM);
    setError(null);
    setDialogOpen(true);
  };

  useImperativeHandle(
    ref,
    () => ({
      openCreateDialog,
    }),
    [],
  );

  const openEditDialog = (role: Role) => {
    setEditing(role);
    setFormState({
      name: role.name,
      scope: role.scope,
      description: role.description ?? "",
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
          scope: formState.scope,
          description: formState.description.trim() || undefined,
        };
        const url = editing
          ? `${baseUrl}/apps/asset-hub/api/system/roles/${editing.id}`
          : `${baseUrl}/apps/asset-hub/api/system/roles`;
        const response = await fetch(url, {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const message = await response.json().catch(() => null);
          throw new Error(message?.message ?? "保存失败");
        }
        const { data } = (await response.json()) as { data: Role };
        setRoles((prev) =>
          editing ? prev.map((role) => (role.id === data.id ? data : role)) : [data, ...prev],
        );
        setDialogOpen(false);
        setEditing(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : isChinese
              ? "保存失败，请稍后再试。"
              : "Save failed, please try again.",
        );
      }
    });
  };

  const openDeleteDialog = (role: Role) => {
    setDialogRole(role);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!dialogRole) return;
    startTransition(async () => {
      try {
        const response = await fetch(
          `${baseUrl}/apps/asset-hub/api/system/roles/${dialogRole.id}`,
          {
            method: "DELETE",
          },
        );
        if (!response.ok) {
          const message = await response.json().catch(() => null);
          throw new Error(message?.message ?? "删除失败");
        }
        setRoles((prev) => prev.filter((role) => role.id !== dialogRole.id));
        setDeleteDialogOpen(false);
        setDialogRole(null);
      } catch (err) {
        setDeleteError(
          err instanceof Error
            ? err.message
            : isChinese
              ? "删除失败，请稍后再试。"
              : "Failed to delete role.",
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
              ? `共 ${roles.length} 个角色`
              : `${roles.length} roles`}
          </p>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={isChinese ? "搜索名称或描述" : "Search by name or description"}
            className="md:w-64"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border">
        {filteredRoles.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {isChinese ? "暂无匹配的角色。" : "No roles match the current filters."}
          </div>
        ) : (
          <Table className="text-sm">
            <TableHeader className="bg-muted/50">
              <TableRow className="text-left text-xs uppercase tracking-wide text-muted-foreground hover:bg-transparent">
                <TableHead className="px-4 py-3">{isChinese ? "角色名称" : "Role"}</TableHead>
                <TableHead className="px-4 py-3">{isChinese ? "作用域" : "Scope"}</TableHead>
                <TableHead className="px-4 py-3">{isChinese ? "描述" : "Description"}</TableHead>
                <TableHead className="px-4 py-3 text-right">{isChinese ? "操作" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="px-4 py-3 whitespace-normal">
                    <div className="font-medium">{role.name}</div>
                    <p className="text-xs text-muted-foreground">{role.id}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3">{role.scope}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-normal">
                    {role.description ?? "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-xs">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full px-3"
                      onClick={() => openEditDialog(role)}
                    >
                      {isChinese ? "编辑" : "Edit"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 rounded-full px-3 text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(role)}
                    >
                      {isChinese ? "删除" : "Delete"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? isChinese
                  ? "编辑角色"
                  : "Edit Role"
                : isChinese
                  ? "新增角色"
                  : "New Role"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form id="role-form" className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="role-name">
                  {isChinese ? "角色名称" : "Role Name"}
                </Label>
                <Input
                  id="role-name"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-scope">
                  {isChinese ? "角色作用域" : "Role Scope"}
                </Label>
                <Select
                  value={formState.scope}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, scope: value }))}
                >
                  <SelectTrigger id="role-scope" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">
                      {isChinese ? "系统" : "System"}
                    </SelectItem>
                    <SelectItem value="asset">
                      {isChinese ? "资产" : "Asset"}
                    </SelectItem>
                    <SelectItem value="consumable">
                      {isChinese ? "耗材" : "Consumable"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-description">
                  {isChinese ? "描述（可选）" : "Description (optional)"}
                </Label>
                <Textarea
                  id="role-description"
                  rows={3}
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>
              {error && (
                <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
            </form>
          </DialogBody>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {isChinese ? "取消" : "Cancel"}
            </Button>
            <Button type="submit" form="role-form" disabled={pending}>
              {pending
                ? isChinese
                  ? "保存中..."
                  : "Saving..."
                : isChinese
                  ? "保存"
                  : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
          {deleteError && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
              {deleteError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>
              {isChinese ? "取消" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isChinese ? "确认删除" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

export default RoleTable;

