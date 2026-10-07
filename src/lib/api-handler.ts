import { NextRequest } from "next/server";
import { connectDB } from "@/server/db/connection";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  getAuthenticatedUser,
  parsePaginationParams,
} from "@/lib/api-utils";
import { createAuditLog } from "@/lib/audit";
import type { Permission } from "@/config/permissions";
import type { Model } from "mongoose";

interface ListOptions {
  model: Model<unknown>;
  permission: Permission;
  searchFields?: string[];
  populate?: string | string[];
  defaultSort?: string;
  filterFn?: (params: URLSearchParams) => Record<string, unknown>;
}

export async function handleList(req: NextRequest, options: ListOptions) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes(options.permission))
    return errorResponse("Forbidden", "FORBIDDEN", 403);

  const params = req.nextUrl.searchParams;
  const { page, limit, sort, search, skip } = parsePaginationParams(params);

  const filter: Record<string, unknown> = { isDeleted: { $ne: true } };

  if (search && options.searchFields?.length) {
    filter.$or = options.searchFields.map((f) => ({
      [f]: { $regex: search, $options: "i" },
    }));
  }

  if (options.filterFn) {
    Object.assign(filter, options.filterFn(params));
  }

  const sortObj: Record<string, 1 | -1> = {};
  if (sort.startsWith("-")) {
    sortObj[sort.slice(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  let query = options.model.find(filter).sort(sortObj).skip(skip).limit(limit);
  if (options.populate) {
    const pops = Array.isArray(options.populate) ? options.populate : [options.populate];
    for (const p of pops) query = query.populate(p);
  }

  const [data, total] = await Promise.all([
    query.lean(),
    options.model.countDocuments(filter),
  ]);

  return paginatedResponse(data as unknown[], total, page, limit);
}

interface GetOptions {
  model: Model<unknown>;
  permission: Permission;
  populate?: string | string[];
}

export async function handleGet(id: string, options: GetOptions) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes(options.permission))
    return errorResponse("Forbidden", "FORBIDDEN", 403);

  let query = options.model.findOne({ _id: id, isDeleted: { $ne: true } });
  if (options.populate) {
    const pops = Array.isArray(options.populate) ? options.populate : [options.populate];
    for (const p of pops) query = query.populate(p);
  }

  const doc = await query.lean();
  if (!doc) return errorResponse("Not found", "NOT_FOUND", 404);
  return successResponse(doc);
}

interface CreateOptions {
  model: Model<unknown>;
  permission: Permission;
  module: string;
}

export async function handleCreate(
  req: NextRequest,
  options: CreateOptions
) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes(options.permission))
    return errorResponse("Forbidden", "FORBIDDEN", 403);

  try {
    const body = await req.json();
    const doc = await options.model.create({ ...body, createdBy: user.id });

    await createAuditLog({
      userId: user.id,
      action: "create",
      module: options.module,
      recordId: (doc as unknown as { _id: string })._id.toString(),
      newValue: body,
    });

    return successResponse(doc, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Create failed";
    if (msg.includes("duplicate key") || msg.includes("E11000")) {
      return errorResponse("Duplicate entry", "DUPLICATE", 409);
    }
    return errorResponse(msg, "CREATE_ERROR", 400);
  }
}

interface UpdateOptions {
  model: Model<unknown>;
  permission: Permission;
  module: string;
}

export async function handleUpdate(
  id: string,
  req: NextRequest,
  options: UpdateOptions
) {
  await connectDB();
  const user = await getAuthenticatedUser();
  if (!user) return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  if (!user.permissions.includes(options.permission))
    return errorResponse("Forbidden", "FORBIDDEN", 403);

  try {
    const body = await req.json();
    const previous = await options.model.findById(id).lean();
    if (!previous) return errorResponse("Not found", "NOT_FOUND", 404);

    const doc = await options.model
      .findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true })
      .lean();

    await createAuditLog({
      userId: user.id,
      action: "update",
      module: options.module,
      recordId: id,
      previousValue: previous as Record<string, unknown>,
      newValue: body,
    });

    return successResponse(doc);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Update failed";
    return errorResponse(msg, "UPDATE_ERROR", 400);
  }
}
