import { NextResponse } from "next/server";
import { listOperationTemplates } from "@/lib/repositories/operation-templates";

export async function GET() {
  const data = listOperationTemplates();
  return NextResponse.json({ data });
}


