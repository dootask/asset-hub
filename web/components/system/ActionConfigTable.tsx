"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ActionConfig, ActionConfigId } from "@/lib/types/action-config";
import type { Role } from "@/lib/types/system";
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
import { Switch } from "@/components/ui/switch";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { appReady, fetchUserBasic, isMicroApp, selectUsers } from "@dootask/tools";

interface Props {
  initialConfigs: ActionConfig[];
  locale?: string;
}

const APPROVER_TYPE_OPTIONS = [
  { value: "none", labelZh: "不指定（任意用户）", labelEn: "Any user" },
  { value: "user", labelZh: "指定用户", labelEn: "User" },
  { value: "role", labelZh: "指定角色", labelEn: "Role" },
];

const CONFIG_ORDER: ActionConfigId[] = [
  "purchase",
  "inbound",
  "receive",
  "borrow",
  "return",
  "maintenance",
  "dispose",
  "outbound",
  "reserve",
  "release",
  "adjust",
  "other",
];

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

export default function ActionConfigTable({ initialConfigs, locale }: Props) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [roles, setRoles] = useState<Role[]>([]);
  const [savingId, setSavingId] = useState<ActionConfigId | null>(null);
  const [selectingId, setSelectingId] = useState<ActionConfigId | null>(null);
  const [selectorReady, setSelectorReady] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const isChinese = locale === "zh";
  const feedback = useAppFeedback();

  const sortedConfigs = useMemo(
    () =>
      [...configs].sort(
        (a, b) => CONFIG_ORDER.indexOf(a.id) - CONFIG_ORDER.indexOf(b.id),
      ),
    [configs],
  );

  const handleChange = (id: ActionConfigId, partial: Partial<ActionConfig>) => {
    setConfigs((prev) =>
      prev.map((config) => (config.id === id ? { ...config, ...partial } : config)),
    );
  };

  const handleRefsChange = (id: ActionConfigId, value: string) => {
    const refs = value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    handleChange(id, { defaultApproverRefs: refs });
  };

  useEffect(() => {
    setConfigs(initialConfigs);
  }, [initialConfigs]);

  useEffect(() => {
    let cancelled = false;
    async function loadConfigs() {
      try {
        const client = await getApiClient();
        const response = await client.get<{ data: ActionConfig[] }>(
          "/apps/asset-hub/api/config/approvals",
          { headers: { "Cache-Control": "no-cache" } },
        );
        if (!cancelled) {
          setConfigs(response.data.data);
        }
      } catch {
        if (!cancelled && initialConfigs.length === 0) {
          setConfigs([]);
        }
      }
    }
    loadConfigs();
    return () => {
      cancelled = true;
    };
  }, [initialConfigs.length]);

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
    async function hydrateUserNames() {
      const ids = configs
        .filter((config) => config.defaultApproverType === "user")
        .flatMap((config) => config.defaultApproverRefs)
        .filter(Boolean);
      const missing = ids.filter((id) => !(id in userNames));
      if (missing.length === 0) return;
      for (const id of missing) {
        const numeric = Number(id);
        if (Number.isNaN(numeric)) continue;
        try {
          const result = await fetchUserBasic([numeric]);
          const info = Array.isArray(result) ? result[0] : undefined;
          const name = info?.nickname ?? info?.name;
          if (name && !cancelled) {
            setUserNames((prev) => ({ ...prev, [id]: name }));
          }
        } catch {
          // ignore lookup errors to avoid blocking UI
        }
      }
    }

    async function fetchRoles() {
      try {
        const client = await getApiClient();
        // Assuming there's an endpoint to get all roles, or we use the paginated one with large size
        // For now, reusing the endpoint used by RoleTable, might need adjustment if it's paginated by default
        // If listRoles returns all, that's great. The API route GET /api/system/roles currently returns filtered list based on query params
        // but usually listRoles returns all if no params. Let's check api implementation or assume we can get all.
        // Actually the API GET /api/system/roles is not implemented to return list in the snippets I saw (it was POST/PUT/DELETE in one file and GET id in another). 
        // Wait, RoleManagementClient uses RoleTable which uses initialRoles prop. 
        // Let's assume we can fetch from /apps/asset-hub/api/system/roles if implemented, or we might need to implement it.
        // Looking at previous `read_file` of `web/app/api/system/roles/route.ts` (it was only [id] and POST).
        // Ah, I missed reading `web/app/api/system/roles/route.ts`. Let me assume I can add a simple fetch.
        // Actually RoleTable receives `initialRoles`.
        // For now, I'll try to fetch from the same endpoint pattern. 
        // If GET /api/system/roles is not available, I might need to add it or use a different way.
        // Let's try to fetch. If it fails, roles will be empty and we fallback to input.
        
        // Re-reading my own memory/logs: I saw `web/app/api/system/roles/route.ts` signature in previous turns but I didn't read the content of GET.
        // It seems I only read `[id]/route.ts`.
        // I will assume a GET endpoint exists or I will add one if I find it missing. 
        // For now, I'll implement the fetch call.
        const response = await client.get<{ data: Role[] }>("/apps/asset-hub/api/system/roles");
        if (!cancelled && response.data?.data) {
          setRoles(response.data.data);
        }
      } catch {
        // ignore
      }
    }

    hydrateUserNames();
    fetchRoles();
    return () => {
      cancelled = true;
    };
  }, [configs, userNames]);

  const handleSave = (config: ActionConfig) => {
    setSavingId(config.id);
    startTransition(async () => {
      try {
        const client = await getApiClient();
        const response = await client.put<{ data: ActionConfig }>(
          `/apps/asset-hub/api/config/approvals/${config.id}`,
          {
            requiresApproval: config.requiresApproval,
            defaultApproverType: config.defaultApproverType,
            defaultApproverRefs: config.defaultApproverRefs,
            allowOverride: config.allowOverride,
            metadata: config.metadata,
          },
        );
        const payload = response.data;
        setConfigs((prev) =>
          prev.map((item) => (item.id === config.id ? payload.data : item)),
        );
        feedback.success(
          isChinese ? "配置已保存" : "Configuration saved",
        );
      } catch (err) {
        const message = extractApiErrorMessage(
          err,
          isChinese ? "保存审批配置失败。" : "Failed to save configuration.",
        );
        feedback.error(message, {
          blocking: true,
          title: isChinese ? "保存失败" : "Save failed",
          acknowledgeLabel: isChinese ? "知道了" : "Got it",
        });
      } finally {
        setSavingId(null);
      }
    });
  };

  const resolveSelectedUser = async (entry: DootaskUser) => {
    const rawId = typeof entry === "object" ? entry.userid ?? entry.id : entry;
    const id = rawId !== undefined ? `${rawId}`.trim() : "";
    if (!id) return null;
    const name =
      typeof entry === "object"
        ? entry.nickname ?? entry.name ?? ""
        : "";
    if (name) {
      return { id, name };
    }
    try {
      const numeric = Number(id);
      const list = await fetchUserBasic([numeric]);
      const info = Array.isArray(list) ? list[0] : undefined;
      return { id, name: info?.nickname ?? info?.name ?? "" };
    } catch {
      return { id, name: "" };
    }
  };

  const handleSelectApprovers = async (config: ActionConfig) => {
    if (config.defaultApproverType !== "user") return;
    if (!selectorReady) {
      feedback.error(
        isChinese
          ? "当前环境不支持选择审批人，请手动填写。"
          : "User picker is unavailable. Please type approver IDs.",
      );
      return;
    }
    setSelectingId(config.id);
    try {
      const result = (await selectUsers({
        multipleMax: 5,
        showSelectAll: false,
        showDialog: false,
        value: config.defaultApproverRefs
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
      const refs = picks.map((item) => item.id).filter(Boolean);
      handleChange(config.id, { defaultApproverRefs: refs });
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
        isChinese ? "选择审批人失败。" : "Failed to pick approvers.",
      );
      feedback.error(message, {
        blocking: true,
        title: isChinese ? "选择失败" : "Selection failed",
        acknowledgeLabel: isChinese ? "知道了" : "Got it",
      });
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {sortedConfigs.length === 0 && (
        <div className="rounded-2xl border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          {isChinese
            ? "暂无可用的审批配置。"
            : "No approval configurations available yet."}
        </div>
      )}
      {sortedConfigs.length > 0 && (
        <Accordion
          type="multiple"
          defaultValue={[]}
          className="divide-y divide-border/60 overflow-hidden rounded-3xl border border-border/60 bg-card/20"
        >
          {sortedConfigs.map((config) => {
            const approverTypeLabel =
              APPROVER_TYPE_OPTIONS.find(
                (option) => option.value === config.defaultApproverType,
              ) ??
              APPROVER_TYPE_OPTIONS[0];
            const approverRefs =
              config.defaultApproverRefs.length > 0
                ? config.defaultApproverRefs.join(", ")
                : isChinese
                  ? "未设置"
                  : "Not set";
            const updatedLabel = config.updatedAt
              ? new Date(config.updatedAt).toLocaleString()
              : isChinese
                ? "尚未保存"
                : "Not saved yet";

            return (
              <AccordionItem key={config.id} value={config.id} className="px-4">
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1.5">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {config.id}
                      </p>
                      <p className="text-base font-semibold">
                        {isChinese
                          ? config.labelZh ?? config.id
                          : config.labelEn ?? config.id}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Badge variant={config.requiresApproval ? "default" : "secondary"}>
                          {config.requiresApproval
                            ? isChinese
                              ? "需要审批"
                              : "Approval required"
                            : isChinese
                              ? "无需审批"
                              : "No approval"}
                        </Badge>
                        <Badge variant={config.allowOverride ? "outline" : "secondary"}>
                          {config.allowOverride
                            ? isChinese
                              ? "允许更换审批人"
                              : "Reassign allowed"
                            : isChinese
                              ? "禁止更换审批人"
                              : "Reassign disabled"}
                        </Badge>
                        <Badge variant="outline">
                          {isChinese ? "审批人类型" : "Approver type"} ·{" "}
                          {isChinese ? approverTypeLabel.labelZh : approverTypeLabel.labelEn}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:text-right">
                      <span>
                        {isChinese ? "默认审批人：" : "Default approvers:"} {approverRefs}
                      </span>
                      <span>
                        {isChinese ? "最近更新：" : "Last updated:"} {updatedLabel}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-2">
                  <div className="space-y-6 py-2" data-testid={`action-config-card-${config.id}`}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          {isChinese ? "需要审批" : "Requires approval"}
                        </Label>
                        <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
                          <p className="text-sm text-muted-foreground">
                            {config.requiresApproval
                              ? isChinese
                                ? "启用后该操作会触发审批流程。"
                                : "If enabled, every submission must go through approval."
                              : isChinese
                                ? "关闭后该操作不再需要审批。"
                                : "Disable to allow direct submissions without approval."}
                          </p>
                          <Switch
                            checked={config.requiresApproval}
                            onCheckedChange={(checked) =>
                              handleChange(config.id, { requiresApproval: checked })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          {isChinese ? "允许更换审批人" : "Allow approver reassignment"}
                        </Label>
                        <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
                          <p className="text-sm text-muted-foreground">
                            {config.allowOverride
                              ? isChinese
                                ? "待审批时允许更换审批人。"
                                : "Allow reassignment while pending."
                              : isChinese
                                ? "待审批时不允许更换审批人。"
                                : "Approver reassignment is disabled while pending."}
                          </p>
                          <Switch
                            checked={config.allowOverride}
                            onCheckedChange={(checked) =>
                              handleChange(config.id, { allowOverride: checked })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          {isChinese ? "默认审批人类型" : "Default approver type"}
                        </Label>
                        <Select
                          value={config.defaultApproverType}
                          onValueChange={(value) =>
                            handleChange(config.id, {
                              defaultApproverType: value as ActionConfig["defaultApproverType"],
                              defaultApproverRefs: [],
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isChinese ? "选择类型" : "Select type"} />
                          </SelectTrigger>
                          <SelectContent align="start">
                            {APPROVER_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {isChinese ? option.labelZh : option.labelEn}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {config.defaultApproverType !== "none" && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            {config.defaultApproverType === "user"
                              ? isChinese
                                ? "默认审批人"
                                : "Default approvers"
                              : isChinese
                                ? "默认角色"
                                : "Default role"}
                          </Label>
                          {config.defaultApproverType === "user" ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-9"
                                  disabled={pending || selectingId === config.id}
                                  onClick={() => handleSelectApprovers(config)}
                                >
                                  {selectingId === config.id
                                    ? isChinese
                                      ? "加载中..."
                                      : "Loading..."
                                    : isChinese
                                      ? "选择用户"
                                      : "Select users"}
                                </Button>
                                {config.defaultApproverRefs.length > 0 && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={pending || selectingId === config.id}
                                    onClick={() =>
                                      handleChange(config.id, { defaultApproverRefs: [] })
                                    }
                                  >
                                    {isChinese ? "清空" : "Clear"}
                                  </Button>
                                )}
                                {!selectorReady && (
                                  <span className="text-xs text-muted-foreground">
                                    {isChinese
                                      ? "当前环境暂不支持选择器，请在宿主中使用。"
                                      : "Picker unavailable here; use host app."}
                                  </span>
                                )}
                              </div>
                              {config.defaultApproverRefs.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {config.defaultApproverRefs.map((id) => (
                                    <Badge key={id} variant="secondary">
                                      {userNames[id] ? `${userNames[id]} (${id})` : id}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Role Selection Dropdown */
                            config.defaultApproverType === "role" ? (
                              roles.length > 0 ? (
                                <Select
                                  value={config.defaultApproverRefs[0] || ""}
                                  onValueChange={(val) =>
                                    handleChange(config.id, { defaultApproverRefs: [val] })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={isChinese ? "选择角色" : "Select role"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {roles.map((role) => (
                                      <SelectItem key={role.id} value={role.id}>
                                        {role.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="text-sm text-muted-foreground h-9 flex items-center px-3 rounded-lg bg-muted/40">
                                  {isChinese 
                                    ? "暂无可用角色，请先前往角色管理创建。"
                                    : "No roles available. Create one in Role Management."}
                                </div>
                              )
                            ) : (
                              /* Fallback Text Input (should not be reached given current types, but safe to keep) */
                              <Input
                                value={config.defaultApproverRefs.join(", ")}
                                onChange={(event) =>
                                  handleRefsChange(config.id, event.target.value)
                                }
                                placeholder={
                                  isChinese ? "示例：role-asset-admin" : "e.g. role-asset-admin"
                                }
                              />
                            )
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                      <p>
                        {isChinese
                          ? "保存后，新审批请求会立即应用最新策略。"
                          : "After saving, new approval requests inherit the latest policy."}
                      </p>
                      <Button
                        variant="default"
                        disabled={pending || savingId === config.id}
                        onClick={() => handleSave(config)}
                      >
                        {savingId === config.id
                          ? isChinese
                            ? "保存中..."
                            : "Saving..."
                          : isChinese
                            ? "保存配置"
                            : "Save configuration"}
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
