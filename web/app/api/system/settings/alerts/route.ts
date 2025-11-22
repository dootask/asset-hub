import { NextResponse } from "next/server";
import {
  getAlertSettings,
  updateAlertSettings,
} from "@/lib/repositories/system-settings";

export async function GET() {
  return NextResponse.json({ data: getAlertSettings() });
}

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as {
      alertsEnabled?: unknown;
      pushEnabled?: unknown;
    };

    if (
      typeof payload.alertsEnabled !== "boolean" ||
      typeof payload.pushEnabled !== "boolean"
    ) {
      return NextResponse.json(
        { error: "INVALID_PAYLOAD", message: "alertsEnabled / pushEnabled are required booleans." },
        { status: 400 },
      );
    }

    const settings = {
      alertsEnabled: payload.alertsEnabled,
      pushEnabled: payload.pushEnabled,
    };
    updateAlertSettings(settings);
    return NextResponse.json({ data: settings });
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        message:
          error instanceof Error ? error.message : "Unable to update alert settings.",
      },
      { status: 400 },
    );
  }
}


