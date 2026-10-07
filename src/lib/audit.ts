import { AuditLog } from "@/server/models/audit-log";

interface AuditEntry {
  userId: string;
  action: string;
  module: string;
  recordId?: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

export async function createAuditLog(entry: AuditEntry) {
  try {
    await AuditLog.create({
      user: entry.userId,
      action: entry.action,
      module: entry.module,
      recordId: entry.recordId,
      previousValue: entry.previousValue,
      newValue: entry.newValue,
    });
  } catch {
    console.error("Failed to create audit log");
  }
}
