"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { AppRole } from "@/types/database";

export type UserProfile = {
  id: string;
  teacher_index: string | null;
  role: AppRole;
  display_name: string | null;
};

export function useUserProfile() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, teacher_index, role, display_name")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
  });
}
