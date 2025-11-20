function normalizeUrl(value: string | undefined) {
  if (!value) return undefined;
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

const microAppHost = normalizeUrl(process.env.PLAYWRIGHT_DOOTASK_HOST);
const microAppBase = normalizeUrl(process.env.PLAYWRIGHT_APP_URL);
const microAppUserId = process.env.PLAYWRIGHT_USER_ID;
const microAppUserToken = process.env.PLAYWRIGHT_USER_TOKEN;

if (!microAppHost || !microAppBase || !microAppUserId || !microAppUserToken) {
  throw new Error(
    "Playwright micro-app 环境变量缺失，请在 .env 中配置 PLAYWRIGHT_DOOTASK_HOST / PLAYWRIGHT_APP_URL / PLAYWRIGHT_USER_ID / PLAYWRIGHT_USER_TOKEN。",
  );
}

export const MICRO_APP_CONFIG = {
  host: microAppHost,
  baseUrl: microAppBase,
  userId: microAppUserId,
  token: microAppUserToken,
};

export function normalizeAppPath(path = "/en") {
  if (!path) return "";
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildMicroAppTestUrl(path = "/en") {
  const normalizedPath = normalizeAppPath(path);
  const targetUrl = `${MICRO_APP_CONFIG.baseUrl}${normalizedPath}`;
  const url = new URL(`${MICRO_APP_CONFIG.host}/single/apps/iframe-test`);
  url.searchParams.set("url", targetUrl);
  url.searchParams.set("userid", MICRO_APP_CONFIG.userId);
  url.searchParams.set("token", MICRO_APP_CONFIG.token);
  return url.toString();
}



