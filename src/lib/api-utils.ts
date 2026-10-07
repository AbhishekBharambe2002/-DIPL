import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/server/db/connection";
import type { Permission } from "@/config/permissions";

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, code: string, status = 400) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  );
}

export function paginatedResponse(
  data: unknown[],
  total: number,
  page: number,
  limit: number
) {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user;
}

export function hasPermission(
  userPermissions: string[],
  required: Permission
): boolean {
  return userPermissions.includes(required);
}

export async function withAuth(
  handler: (user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>) => Promise<NextResponse>,
  requiredPermission?: Permission
) {
  await connectDB();
  const user = await getAuthenticatedUser();

  if (!user) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  if (requiredPermission && !hasPermission(user.permissions, requiredPermission)) {
    return errorResponse("Insufficient permissions", "FORBIDDEN", 403);
  }

  return handler(user);
}

export function parsePaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const sort = searchParams.get("sort") || "-createdAt";
  const search = searchParams.get("search") || "";

  return { page, limit, sort, search, skip: (page - 1) * limit };
}
