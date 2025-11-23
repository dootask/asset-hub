import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./next-intl.config.ts");

const nextConfig: NextConfig = {
  /**
   * 统一挂载在 /apps/asset-hub 前缀下，确保与 DooTask 插件配置一致。
   * 开发和生产环境都应保持该前缀，以避免路径差异。
   */
  basePath: "/apps/asset-hub",

  // 仅允许 .com 域名进行开发环境下的跨域请求
  allowedDevOrigins: ["*.coder.hitosea.com"]
};

export default withNextIntl(nextConfig);
