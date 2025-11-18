import { headers } from "next/headers";
import type { Asset } from "@/lib/types/asset";

const statusText: Record<Asset["status"], string> = {
  "in-use": "使用中",
  idle: "闲置",
  maintenance: "维护中",
  retired: "已退役",
};

export const metadata = {
  title: "资产列表 - Asset Hub",
};

async function getBaseUrl() {
  const preset =
    process.env.ASSET_HUB_BASE_URL ??
    process.env.NEXT_PUBLIC_ASSET_HUB_BASE_URL;
  if (preset) {
    return preset.replace(/\/$/, "");
  }

  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host");

  if (!host) {
    return "http://localhost:3000";
  }

  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

async function fetchAssets(): Promise<Asset[]> {
  const baseUrl = await getBaseUrl();
  const response = await fetch(`${baseUrl}/apps/asset-hub/api/assets`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("资产列表加载失败");
  }

  const payload = (await response.json()) as { data: Asset[] };
  return payload.data ?? [];
}

export default async function AssetListPage() {
  const assets = await fetchAssets();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header>
        <p className="text-sm text-muted-foreground">资产管理 / 列表</p>
        <h1 className="text-2xl font-semibold tracking-tight">资产列表</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          当前数据显示的是内置的示例资产；后续将替换为数据库数据并支持筛选、分页与查询。
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full table-auto text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">资产名称</th>
              <th className="px-4 py-3 font-medium">类别</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">使用人 / 部门</th>
              <th className="px-4 py-3 font-medium">位置</th>
              <th className="px-4 py-3 font-medium">购入日期</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-medium">{asset.name}</div>
                  <div className="text-xs text-muted-foreground">{asset.id}</div>
                </td>
                <td className="px-4 py-3">{asset.category}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                    {statusText[asset.status]}
                  </span>
                </td>
                <td className="px-4 py-3">{asset.owner}</td>
                <td className="px-4 py-3">{asset.location}</td>
                <td className="px-4 py-3">{asset.purchaseDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

