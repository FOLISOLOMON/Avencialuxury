import { NextRequest, NextResponse } from "next/server";
import {
  runDailySummary,
  runWeeklySummary,
  scanDormantCustomers,
  cleanupExpiredNotifications,
} from "@/lib/automation/scheduler";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskParam = (searchParams.get("task") || "all").toLowerCase();
    const businessId = searchParams.get("businessId") || undefined;

    const validTasks = ["daily", "weekly", "dormancy", "cleanup", "all"];
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
