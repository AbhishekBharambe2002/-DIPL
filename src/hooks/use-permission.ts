"use client";

import { useSession } from "next-auth/react";
import type { Permission } from "@/config/permissions";

export function usePermission(permission: Permission): boolean {
  const { data: session } = useSession();
  if (!session?.user?.permissions) return false;
  return session.user.permissions.includes(permission);
}

export function usePermissions(): string[] {
  const { data: session } = useSession();
  return (session?.user?.permissions as string[]) || [];
}

export function useUserRole(): string | null {
  const { data: session } = useSession();
  return (session?.user?.role as string) || null;
}
