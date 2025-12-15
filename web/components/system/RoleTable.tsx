"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  useTransition,
} from "react";
import { appReady, fetchUserBasic, isMicroApp, selectUsers } from "@dootask/tools";
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
import { Badge } from "@/components/ui/badge";
import type { Role } from "@/lib/types/system";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import { fetchUserNameMap } from "@/lib/utils/dootask-users";

interface Props {
  initialRoles: Role[];
  locale: string;
}

export type RoleTableHandle = {
  openCreateDialog: () => void;
};

type DootaskUser =
  | string
  | number
  | {
      userid?: string;
      id?: string;
      nickname?: string;
      name?: string;
    };

type SelectUsersReturn = DootaskUser[] | { users?: DootaskUser[] };

type FormState = {
  name: string;
  scope: string;
  description: string;
  members: string[];
};

const DEFAULT_FORM: FormState = {
  name: "",
  scope: "system",
  description: "",
  members: [],
};

const RoleTable = forwardRef<RoleTableHandle, Props>(function RoleTable(
  { initialRoles, locale },
  ref,
) {
  const isChinese = locale === "zh";
  const [roles, setRoles] = useState(initialRoles);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [pending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dialogRole, setDialogRole] = useState<Role | null>(null);
  const [selectorReady, setSelectorReady] = useState(false);
  const [selectingMembers, setSelectingMembers] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const feedback = useAppFeedback();

  useEffect(() => {
    setRoles(initialRoles);
  }, [initialRoles]);

  useEffect(() => {
    let active = true;
    async function detectSelector() {
      try {
        const micro = await isMicroApp();
        if (!micro) {
          if (active) setSelectorReady(false);
          return;
        }
        await appReady();
        if (active) setSelectorReady(true);
      } catch {
        if (active) setSelectorReady(false);
      }
    }
    detectSelector();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function hydrateNames() {
      const ids = new Set<string>();
      roles.forEach((role) => role.members?.forEach((member) => member && ids.add(member)));
      formState.members.forEach((member) => member && ids.add(member));
      const missing = Array.from(ids).filter((id) => !userNames[id]);
      if (missing.length === 0) {
        return;
      }
      const next = await fetchUserNameMap(missing);
      if (!cancelled && Object.keys(next).length > 0) {
        setUserNames((prev) => ({ ...prev, ...next }));
      }
    }
    hydrateNames();
    return () => {
      cancelled = true;
    };
  }, [roles, formState.members, userNames]);

  const resolveSelectedUser = useCallback(async (entry: DootaskUser) => {
    const rawId = typeof entry === "object" ? entry.userid ?? entry.id : entry;
    const id = rawId !== undefined ? `${rawId}`.trim() : "";
    if (!id) {
      return null;
    }
    const name =
      typeof entry === "object"
        ? entry.nickname ?? entry.name ?? ""
        : "";
    if (name) {
      return { id, name };
    }
    try {
      const numeric = Number(id);
      if (!Number.isFinite(numeric)) {
        return { id, name: "" };
      }
      const list = await fetchUserBasic([numeric]);
      const info = Array.isArray(list) ? list[0] : undefined;
      return { id, name: info?.nickname ?? info?.name ?? "" };
    } catch {
      return { id, name: "" };
    }
  }, []);

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return roles;
    return roles.filter((role) => {
      const target = `${role.name} ${role.scope} ${role.description ?? ""} ${(role.members ?? []).join(" ")}`.toLowerCase();
      return target.includes(query);
    });
  }, [roles, search]);

  const openCreateDialog = () => {
    setEditing(null);
    setFormState({ ...DEFAULT_FORM });
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
      members: role.members ?? [],
    });
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
          members: formState.members,
        };
        const url = editing
          ? `/apps/asset-hub/api/system/roles/${editing.id}`
          : `/apps/asset-hub/api/system/roles`;
        const client = await getApiClient();
        const response = await client.request<{ data: Role }>({
          url,
          method: editing ? "PUT" : "POST",
          data: payload,
        });
        const { data } = response.data;
        setRoles((prev) =>
          editing ? prev.map((role) => (role.id === data.id ? data : role)) : [data, ...prev],
        );
        setDialogOpen(false);
        setEditing(null);
        setFormState({ ...DEFAULT_FORM });
        feedback.success(
          isChinese
            ? editing
              ? "角色已更新"
              : "角色已创建"
            : editing
              ? "Role updated"
              : "Role created",
        );
      } catch (err) {
        const message = extractApiErrorMessage(
          err,
          isChinese ? "保存失败，请稍后再试。" : "Save failed, please try again.",
        );
        feedback.error(message, {
          blocking: true,
          title: isChinese ? "保存失败" : "Save failed",
          acknowledgeLabel: isChinese ? "知道了" : "Got it",
        });
      }
    });
  };

  const openDeleteDialog = (role: Role) => {
    setDialogRole(role);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!dialogRole) return;
    startTransition(async () => {
      try {
        const client = await getApiClient();
        await client.delete(`/apps/asset-hub/api/system/roles/${dialogRole.id}`);
        setRoles((prev) => prev.filter((role) => role.id !== dialogRole.id));
        setDeleteDialogOpen(false);
        setDialogRole(null);
        feedback.success(isChinese ? "删除成功" : "Deleted successfully");
      } catch (err) {
        const message = extractApiErrorMessage(
          err,
          isChinese ? "删除失败，请稍后再试。" : "Failed to delete role.",
        );
        feedback.error(message, {
          blocking: true,
          title: isChinese ? "删除失败" : "Delete failed",
          acknowledgeLabel: isChinese ? "知道了" : "Got it",
        });
      }
    });
  };

  const handleSelectMembers = useCallback(async () => {
    if (!selectorReady) {
      feedback.error(
        isChinese
          ? "当前环境不支持用户选择器，请在 DooTask 内使用。"
          : "User picker unavailable in this environment.",
      );
      return;
    }
    setSelectingMembers(true);
    try {
      const result = (await selectUsers({
        multipleMax: 20,
        showDialog: false,
        showSelectAll: false,
        value: formState.members
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id)),
      }).catch(() => null)) as SelectUsersReturn;
      const entries = Array.isArray(result) ? result : result?.users ?? [];
      if (!entries.length) {
        return;
      }
      const picks = (
        await Promise.all(entries.map((entry) => resolveSelectedUser(entry)))
      ).filter(Boolean) as { id: string; name?: string }[];
      if (!picks.length) {
        feedback.error(isChinese ? "无法解析所选用户。" : "Could not parse selected users.");
        return;
      }
      const nextMembers = Array.from(
        new Set([...formState.members, ...picks.map((item) => item.id)]),
      );
      setFormState((prev) => ({ ...prev, members: nextMembers }));
      setUserNames((prev) => {
        const next = { ...prev };
        picks.forEach((item) => {
          if (item.name) {
            next[item.id] = item.name;
          }
        });
        return next;
      });
    } catch (err) {
      const message = extractApiErrorMessage(
        err,
        isChinese ? "选择成员失败，请稍后再试。" : "Failed to pick members.",
      );
      feedback.error(message, {
        blocking: true,
        title: isChinese ? "操作失败" : "Operation failed",
        acknowledgeLabel: isChinese ? "知道了" : "Got it",
      });
    } finally {
      setSelectingMembers(false);
    }
  }, [selectorReady, formState.members, feedback, isChinese, resolveSelectedUser]);

  const handleRemoveMember = useCallback((memberId: string) => {
    setFormState((prev) => ({
      ...prev,
      members: prev.members.filter((id) => id !== memberId),
    }));
  }, []);

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditing(null);
      setFormState({ ...DEFAULT_FORM });
    }
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

      {filteredRoles.length === 0 ? (
        <div className="rounded-2xl border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          {roles.length === 0 && !search.trim()
            ? isChinese
              ? "尚未创建任何角色。"
              : "No roles yet. Create one to get started."
            : isChinese
              ? "没有匹配的角色，请调整搜索条件。"
              : "No roles match the current search."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border">
          <Table className="text-sm">
            <TableHeader className="bg-muted/50">
              <TableRow className="text-left text-xs uppercase tracking-wide text-muted-foreground hover:bg-transparent">
                <TableHead className="px-4 py-3">{isChinese ? "角色名称" : "Role"}</TableHead>
                <TableHead className="px-4 py-3">{isChinese ? "作用域" : "Scope"}</TableHead>
                <TableHead className="px-4 py-3">{isChinese ? "成员" : "Members"}</TableHead>
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
                  <TableCell className="px-4 py-3">
                    {role.members && role.members.length > 0 ? (
                      <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                        {role.members.slice(0, 3).map((member) => (
                          <span key={`${role.id}-${member}`} className="rounded-full bg-muted/50 px-2 py-0.5">
                            {userNames[member] ?? member}
                          </span>
                        ))}
                        {role.members.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{role.members.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
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
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
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
              <div className="space-y-1.5">
                <Label>
                  {isChinese ? "角色成员（可选）" : "Role members (optional)"}
                </Label>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={selectingMembers}
                      onClick={() => void handleSelectMembers()}
                    >
                      {selectingMembers
                        ? isChinese
                          ? "加载中..."
                          : "Loading..."
                        : isChinese
                          ? "选择用户"
                          : "Select users"}
                    </Button>
                    {formState.members.length > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setFormState((prev) => ({ ...prev, members: [] }))
                        }
                      >
                        {isChinese ? "清空" : "Clear"}
                      </Button>
                    )}
                    {!selectorReady && (
                      <span className="text-xs text-muted-foreground">
                        {isChinese
                          ? "当前环境不支持用户选择器，请在宿主中使用。"
                          : "Picker unavailable outside DooTask host."}
                      </span>
                    )}
                  </div>
                  {formState.members.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formState.members.map((id) => (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <span>
                            {userNames[id] ? `${userNames[id]} (${id})` : id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(id)}
                            className="rounded-full px-1 text-xs text-muted-foreground transition hover:text-foreground"
                            aria-label={isChinese ? "移除成员" : "Remove member"}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
