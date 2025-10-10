import { NextResponse } from "next/server";
import { sql } from "@/lib";

const HEADER_NAME = "x-cron-secret";
const CRON_SECRET = process.env.CRON_SECRET;

function parseDeletedCount(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return 0;
    }
    return parsed;
  }
  return 0;
}

export async function POST(request: Request) {
  if (!CRON_SECRET) {
    console.error("Cleanup route misconfigured: missing CRON_SECRET");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const providedSecret = request.headers.get(HEADER_NAME);
  if (!providedSecret || providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sql`SELECT cleanup_old_accounts() AS deleted_count`;
    const deletedCount = parseDeletedCount(result?.[0]?.deleted_count ?? 0);
    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    console.error("Cleanup execution error:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
