import { NextRequest, NextResponse } from "next/server";
import {
  runDailySummary,
  runWeeklySummary,
  scanDormantCustomers,
  cleanupExpiredNotifications,
  runDebtReminders,
} from "@/lib/automation/scheduler";

export const dynamic = "force-dynamic";

/**
 * Validate incoming request authorization against CRON_SECRET.
 * Ensures the privileged scheduler endpoint cannot be publicly triggered without permission.
 */
function verifyCronAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // If not set in environment, only allow in development
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token === cronSecret) return true;
  }

  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get("secret");
  if (querySecret && querySecret === cronSecret) return true;

  // Also check Vercel Cron header if running on Vercel
  const vercelCronHeader = req.headers.get("x-vercel-cron");
  if (vercelCronHeader) return true;

  return false;
}

async function handleCronExecution(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Invalid or missing cron secret authorization" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const taskParam = (searchParams.get("task") || "all").toLowerCase();
  const businessId = searchParams.get("businessId") || undefined;

  const validTasks = ["daily", "weekly", "dormancy", "cleanup", "debts", "all"];
  if (!validTasks.includes(taskParam)) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid task '${taskParam}'. Valid tasks are: ${validTasks.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const results: Record<string, any> = {};

  if (taskParam === "debts" || taskParam === "all") {
    results.debts = await runDebtReminders(businessId);
  }

  if (taskParam === "daily" || taskParam === "all") {
    results.daily = await runDailySummary(businessId);
  }

  if (taskParam === "weekly" || taskParam === "all") {
    results.weekly = await runWeeklySummary(businessId);
  }

  if (taskParam === "dormancy" || taskParam === "all") {
    results.dormancy = await scanDormantCustomers(businessId);
  }

  if (taskParam === "cleanup" || taskParam === "all") {
    results.cleanup = await cleanupExpiredNotifications(businessId);
  }

  return NextResponse.json({
    success: true,
    task: taskParam,
    businessId: businessId || "all",
    executedAt: new Date().toISOString(),
    results,
  });
}

export async function GET(req: NextRequest) {
  try {
    return await handleCronExecution(req);
  } catch (error: any) {
    console.error("GET /api/automation/cron error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to execute scheduled automation task",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handleCronExecution(req);
  } catch (error: any) {
    console.error("POST /api/automation/cron error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to execute scheduled automation task",
      },
      { status: 500 }
    );
  }
}
