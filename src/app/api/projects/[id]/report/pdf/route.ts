import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connection";
import { getAuthenticatedUser, errorResponse } from "@/lib/api-utils";
import { getProjectOverviewData } from "@/server/services/project-overview";
import { buildProjectReportPdf } from "@/server/services/project-report-pdf";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("project.view")) return errorResponse("Forbidden", "FORBIDDEN", 403);
  if (!mongoose.isValidObjectId(id)) return errorResponse("Not found", "NOT_FOUND", 404);

  const data = await getProjectOverviewData(id);
  if (!data) return errorResponse("Not found", "NOT_FOUND", 404);

  const pdf = await buildProjectReportPdf(data);
  const fileName = `${data.project.projectId}-report.pdf`.replace(/[^\w.-]+/g, "-");

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(pdf.length),
    },
  });
}
