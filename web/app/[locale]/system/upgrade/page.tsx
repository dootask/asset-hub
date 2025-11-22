import Link from "next/link";
import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import { getSystemVersionInfo } from "@/lib/repositories/system-version";

type PageParams = { locale: string };

export const metadata: Metadata = {
  title: "Upgrade - Asset Hub",
};

function formatDate(value?: string | null, locale?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function SystemUpgradePage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale } = await params;
  const isChinese = locale === "zh";
  const versionInfo = getSystemVersionInfo();
  const aboutPath = isChinese ? "zh/about" : "en/about";

  const releaseDate = formatDate(versionInfo.releaseDate, locale);
  const expiresAt = formatDate(versionInfo.license.expiresAt, locale);

  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        items={[
          { href: `/${locale}/system`, labelZh: "系统管理", labelEn: "System" },
          {
            labelZh: "升级与版本",
            labelEn: "Upgrade & Version",
          },
        ]}
        title={isChinese ? "升级与版本" : "Upgrade & Version"}
        description={
          isChinese
            ? "了解当前安装的 Asset Hub 版本、授权信息，并查看升级渠道。"
            : "Review the installed Asset Hub version, license status, and available upgrade paths."
        }
      />

      <section className="rounded-3xl border bg-gradient-to-br from-primary/5 via-background to-background p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary">
              {isChinese ? "当前版本" : "Current Version"}
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-4xl font-semibold text-foreground">
                {versionInfo.version}
              </span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {versionInfo.edition}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {releaseDate
                ? isChinese
                  ? `发布于 ${releaseDate}`
                  : `Released ${releaseDate}`
                : isChinese
                  ? "发布日期未配置"
                  : "Release date not available"}
            </p>
          </div>
          <div className="flex gap-3">
            {versionInfo.changelogUrl && (
            <Link
              href={versionInfo.changelogUrl}
              target="_blank"
              className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
            >
              {isChinese ? "查看更新记录" : "View changelog"}
            </Link>
            )}
            <Link
              href={`https://www.dootask.com/${aboutPath}`}
              target="_blank"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              {isChinese ? "咨询升级" : "Talk to us"}
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">
            {isChinese ? "授权信息" : "License"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isChinese
              ? "当前安装包使用的授权与套餐信息。"
              : "Details of the current plan and entitlement."}
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {isChinese ? "套餐 / 计划" : "Plan"}
                </dt>
                <dd className="text-base font-semibold">{versionInfo.plan}</dd>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {isChinese ? "授权用户数" : "Max Seats"}
                </dt>
                <dd className="text-base font-semibold">
                  {versionInfo.license.maxUsers
                    ? `${versionInfo.license.maxUsers.toLocaleString()}`
                    : isChinese
                      ? "无限制"
                      : "Unlimited"}
                </dd>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {isChinese ? "到期日期" : "Expires"}
                </dt>
                <dd className="text-base font-semibold">
                  {expiresAt ?? (isChinese ? "长期有效" : "Perpetual")}
                </dd>
              </div>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">
            {isChinese ? "升级渠道" : "Upgrade paths"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isChinese
              ? "我们提供企业定制、SLA 保证与托管部署等增强服务。"
              : "We provide enterprise customization, SLA-backed support, and managed hosting."}
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="rounded-xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3">
              <p className="font-semibold text-primary">
                {isChinese ? "企业版" : "Enterprise"}
              </p>
              <p className="text-muted-foreground">
                {isChinese
                  ? "支持多实例部署、专属顾问与灰度更新。"
                  : "Includes multi-instance deployment, dedicated advisor, and staged rollouts."}
              </p>
            </li>
            <li className="rounded-xl border border-muted-foreground/20 bg-muted/10 px-4 py-3">
              <p className="font-semibold text-foreground">
                {isChinese ? "托管服务" : "Managed Service"}
              </p>
              <p className="text-muted-foreground">
                {isChinese
                  ? "由官方托管 Asset Hub，自动享受备份与安全加固。"
                  : "Let us host Asset Hub so you automatically get backups and security hardening."}
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-lg font-semibold">
          {isChinese ? "常用链接" : "Useful Links"}
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="https://appstore.dootask.com/development/manual"
            target="_blank"
            className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
          >
            {isChinese ? "插件开发文档" : "Plugin Docs"}
          </Link>
          <Link
            href="https://github.com/dootask/asset-hub/issues"
            target="_blank"
            className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
          >
            {isChinese ? "提交反馈" : "Give Feedback"}
          </Link>
        </div>
      </section>
    </div>
  );
}

