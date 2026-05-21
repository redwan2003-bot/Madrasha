export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole =
  | "teacher"
  | "monitor"
  | "team_lead"
  | "office"
  | "admin";

export interface MonitoringDashboard {
  allTeachers: TeacherPublic[];
  routine: RoutineRow[];
  onLeave: LeaveRow[];
  monitoringTeam: MonitoringTeamRow[];
  monitoringReport: ReportRow[];
  todaysAttendance: ReportRow[];
  specialMessages: Record<string, string>;
  dutyRoster: Record<string, { name: string; index: string }>;
  meta?: { date: string; dayBn: string };
}

export interface TeacherPublic {
  IndexNo: string;
  TeacherFN: string;
  Designation?: string;
  TeacherSub?: string;
  TcrAddress?: string;
  MobileNo?: string;
  Grade?: string;
  Role?: string;
  PhotoUrl?: string;
  weeklyClassCount: number;
}

export interface RoutineRow {
  Period: string;
  Class: string;
  Sub?: string;
  TeacherFN?: string;
}

export interface LeaveRow {
  LeaveStart: string;
  LeaveEnd: string;
  LeaveType?: string;
  Comment?: string;
  TeacherFN?: string;
  Designation?: string;
  Index?: string;
}

export interface MonitoringTeamRow {
  id?: number;
  teacher_index: string;
  TeacherIndex?: string;
  monitor_day: string;
  MonitorDay?: string;
  role?: string;
  Role?: string;
  status: string;
  Status?: string;
}

export interface ReportRow {
  id?: number;
  report_date?: string;
  ReportDate?: string;
  period?: string;
  Period?: string;
  class?: string;
  Class?: string;
  teacher_name?: string;
  TeacherName?: string;
  attendance?: number;
  Attendance?: number;
  monitor_report_text?: string;
  MonitorReportText?: string;
}

export type Database = {
  public: {
    Tables: Record<string, unknown>;
    Views: Record<string, unknown>;
    Functions: {
      get_monitoring_dashboard: {
        Args: { p_date?: string };
        Returns: Json;
      };
      submit_monitor_report: {
        Args: {
          p_date: string;
          p_period: string;
          p_class: string;
          p_teacher_name: string;
          p_attendance: number;
          p_monitor_report: string;
          p_monitor_index: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      app_role: AppRole;
    };
  };
};
