# 借用逾期提醒方案

Asset Hub 会自动记录每次“借用/归还”操作，并在数据库中追加 `asset_borrow_records`。要实现正式环境的逾期提醒，只需定期调用现有 API，并把结果推送给维护人员或 DooTask 待办系统。

## 1. API 说明

- 端点：`GET /apps/asset-hub/api/assets/borrows/overdue`
- 返回字段：
  - `assetId`, `assetName`
  - `borrowOperationId`
  - `borrower`
  - `plannedReturnDate`
  - `status`（永远是 `active`）
  - `assetOwner`
  - `overdueNotifiedAt`（尚未使用，保留扩展）

## 2. Cron / 定时任务建议

1. **频率**：每天 1 次（例如 08:00）。
2. **步骤**：
   1. 通过服务账号请求 API（需携带宿主注入的认证 cookie 或在内部网络直接访问）。
   2. 按列表生成通知（Msg、邮件、DoD），包含借用人、资产、计划归还日、逾期天数。
   3. 推送给资产管理员，或在 DooTask 中创建待办。

### 示例：Node.js 脚本（使用环境变量）

```ts
// scripts/borrow-reminder.mjs
const endpoint = process.env.ASSET_HUB_OVERDUE_URL;
const todoBase = process.env.DOOTASK_TODO_BASE_URL;
const todoToken = process.env.DOOTASK_TODO_TOKEN;

if (!endpoint) {
  throw new Error("ASSET_HUB_OVERDUE_URL is required");
}

const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
if (!response.ok) {
  console.error("Failed to fetch overdue borrows", await response.text());
  process.exit(1);
}

const { data } = await response.json();
if (data.length === 0) {
  console.log("No overdue borrows");
  process.exit(0);
}

for (const record of data) {
  const title = `[借用逾期] ${record.assetName}`;
  const description = `借用人：${record.borrower ?? "未知"}\n计划归还：${record.plannedReturnDate}\n资产：${record.assetName} (#${record.assetId})`;

  if (todoBase && todoToken) {
    await fetch(`${todoBase}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${todoToken}`,
      },
      body: JSON.stringify({
        title,
        description,
        type: "asset-borrow-overdue",
        link: `${process.env.ASSET_HUB_BASE_URL}/apps/asset-hub/zh/assets/${record.assetId}`,
      }),
    });
  } else {
    console.log(title);
    console.log(description);
  }
}
```

Cron 示例：

```bash
0 8 * * * cd /srv/asset-hub && ASSET_HUB_OVERDUE_URL="https://asset.example.com/apps/asset-hub/api/assets/borrows/overdue" node scripts/borrow-reminder.mjs >> /var/log/asset-hub/borrow-reminder.log 2>&1
```

## 3. 通知策略

- 若同一资产持续逾期，可在脚本端做“只提醒一次”或“每天提醒”策略（例如使用 KV/数据库记录最后通知时间）。
- 如需与 DooTask 待办完全对齐，可扩展 Asset Hub 服务端，在第 1 次提醒时写入 `overdueNotifiedAt` 和 `external_todo_id`，后续归还时自动关闭。该增强可在上线后按需求计划。

## 4. 运维要点

- 将 Cron 记录在 `docs/launch-checklist.md`。
- 关注脚本日志，确保借用列表和 DooTask API 调用成功。
- 若运营团队暂不需要自动提醒，可先保持人工查看 `/system/alerts` + `/api/assets/borrows/overdue`。


