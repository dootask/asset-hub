import { appConfig } from "@/lib/config";
import type { SystemVersionInfo } from "@/lib/types/system";

export function getSystemVersionInfo(): SystemVersionInfo {
  return {
    version: appConfig.release.version,
    releaseDate: appConfig.release.releasedAt,
    edition: appConfig.release.edition,
    plan: appConfig.release.plan,
    changelogUrl: appConfig.release.changelogUrl,
    license: {
      maxUsers: appConfig.release.maxUsers ?? null,
      expiresAt: appConfig.release.expiresAt,
    },
  };
}

