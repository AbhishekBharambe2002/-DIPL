import { NextRequest } from "next/server";
import { connectDB } from "@/server/db/connection";
import { User } from "@/server/models/user";
import {
  getAuthenticatedUser,
  errorResponse,
  successResponse,
  paginatedResponse,
  parsePaginationParams,
} from "@/lib/api-utils";
import { createAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes("user.view"))
    return errorResponse("Forbidden", "FORBIDDEN", 403);

  const params = req.nextUrl.searchParams;
  const { page, limit, skip, search } = parsePaginationParams(params);

  const filter: Record<string, unknown> = { isDeleted: { $ne: true } };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const [data, total] = await Promise.all([
    User.find(filter).populate("role", "name code").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return paginatedResponse(data, total, page, limit);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const authUser = await getAuthenticatedUser();
  if (!authUser) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!authUser.permissions.includes("user.create"))
    return errorResponse("Forbidden", "FORBIDDEN", 403);

  try {
    const body = await req.json();
    const hashedPassword = await bcrypt.hash(body.password || "password123", 12);

    const newUser = await User.create({
      ...body,
      password: hashedPassword,
      createdBy: authUser.id,
    });

    await createAuditLog({
      userId: authUser.id,
      action: "create",
      module: "users",
      recordId: newUser._id.toString(),
      newValue: { name: body.name, email: body.email, role: body.role },
    });

    const result = newUser.toObject();
    delete (result as Record<string, unknown>).password;
    return successResponse(result, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Create failed";
    if (msg.includes("E11000")) return errorResponse("Email already exists", "DUPLICATE", 409);
    return errorResponse(msg, "CREATE_ERROR", 400);
  }
}
