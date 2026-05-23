"use client";

import { useUserProfile } from "@/lib/hooks/use-user-profile";
import type { AppRole } from "@/types/database";

export function useRequireRole(allowed: AppRole[]) {
  const q = useUserProfile();
  const ok = q.data ? allowed.includes(q.data.role) : false;
  return { ...q, allowed: ok };
}
