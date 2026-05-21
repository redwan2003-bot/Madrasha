"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MonitoringDashboard } from "@/types/database";

function todayIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
}

export function useMonitoringDashboard() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const date = todayIso();

  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const query = useQuery({
    queryKey: ["monitoring-dashboard", date],
    enabled: hasSupabase,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_monitoring_dashboard", {
        p_date: date,
      });
      if (error) throw error;
      return data as unknown as MonitoringDashboard;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!hasSupabase) return;
    const channel = supabase
      .channel(`monitoring-${date}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reports",
          filter: `report_date=eq.${date}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["monitoring-dashboard", date] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "duty_roster_daily",
          filter: `duty_date=eq.${date}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["monitoring-dashboard", date] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "temporary_duties",
          filter: `duty_date=eq.${date}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["monitoring-dashboard", date] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, date, hasSupabase]);

  return { ...query, date };
}
