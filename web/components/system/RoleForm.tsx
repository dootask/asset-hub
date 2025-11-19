"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import type { Role } from "@/lib/types/system";

interface RoleFormProps {
  role?: Role;
  locale?: string;
}

export default function RoleForm({ role, locale = "en" }: RoleFormProps) {
  const router = useRouter();
  const isChinese = locale === "zh";
  const [formState, setFormState] = useState({
    name: role?.name ?? "",
    scope: role?.scope ?? "system",
    description: role?.description ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role) {
      setFormState({
        name: role.name,
        scope: role.scope,
        description: role.description ?? "",
      });
    } else {
      setFormState({ name: "", scope: "system", description: "" });
    }
  }, [role]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = role
        ? `/apps/asset-hub/api/system/roles/${role.id}`
        : "/apps/asset-hub/api/system/roles";
      const method = role ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.message ?? "提交失败");
      }

      router.replace(`/${locale}/system/role`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isChinese
            ? "提交失败，请稍后再试。"
            : "Submission failed, please try again later.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border bg-muted/40 p-4">
      <h3 className="text-sm font-semibold">
        {role
          ? isChinese ? "编辑角色" : "Edit Role"
          : isChinese ? "新增角色" : "New Role"}
      </h3>
      <div className="space-y-1.5">
        <Label htmlFor="role-name" className="text-xs font-medium text-muted-foreground">
          {isChinese ? "角色名称" : "Role Name"}
        </Label>
        <Input
          id="role-name"
          required
          value={formState.name}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, name: event.target.value }))
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="role-scope" className="text-xs font-medium text-muted-foreground">
          {isChinese ? "角色作用域" : "Role Scope"}
        </Label>
        <Select
          value={formState.scope}
          onValueChange={(value) =>
            setFormState((prev) => ({ ...prev, scope: value }))
          }
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
        <Label htmlFor="role-description" className="text-xs font-medium text-muted-foreground">
          {isChinese ? "描述" : "Description"}
        </Label>
        <Textarea
          id="role-description"
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
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting} className="rounded-2xl px-4 py-2 text-sm">
          {submitting
            ? isChinese
              ? "提交中..."
              : "Submitting..."
            : role
              ? isChinese
                ? "保存修改"
                : "Save Changes"
              : isChinese
                ? "创建角色"
                : "Create Role"}
        </Button>
        {role && (
          <Button
            type="button"
            variant="outline"
            onClick={() => router.replace(`/${locale}/system/role`)}
            className="rounded-2xl px-4 py-2 text-sm"
          >
            {isChinese ? "取消" : "Cancel"}
          </Button>
        )}
      </div>
    </form>
  );
}

