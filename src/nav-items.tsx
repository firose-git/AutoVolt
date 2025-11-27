

import { Zap, Calendar, Users as UsersIcon, Settings as SettingsIcon, Shield, UserCheck, User, Ticket, FileText, BarChart3, Brain, Monitor, Link, LayoutDashboard, Bell, LogOut } from "lucide-react";
import NotFound from "./pages/NotFound";

export const navItems = [
  // ===== DASHBOARD =====
  {
    title: "Power Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
    pageName: "dashboard"
  },
  // ===== CORE OPERATIONS =====
  {
    title: "Devices",
    to: "/dashboard/devices",
    icon: <Zap className="h-4 w-4" />,
  },
  {
    title: "Switches",
    to: "/dashboard/switches",
    icon: <Zap className="h-4 w-4" />,
  },
  {
    title: "Master Control",
    to: "/dashboard/master",
    icon: <Shield className="h-4 w-4" />,
  },

  // ===== SCHEDULING =====
  {
    title: "Schedule",
    to: "/dashboard/schedule",
    icon: <Calendar className="h-4 w-4" />,
  },

  // ===== ANALYTICS & MONITORING =====
  {
    title: "Analytics & Monitoring",
    to: "/dashboard/analytics",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    title: "AI/ML Insights",
    to: "/dashboard/aiml",
    icon: <Brain className="h-4 w-4" />,
  },
  {
    title: "Grafana",
    to: "/dashboard/grafana",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    title: "ESP32 Dashboard",
    to: "/dashboard/esp32-grafana",
    icon: <Monitor className="h-4 w-4" />,
  },

  // ===== OPERATIONS & MAINTENANCE =====
  {
    title: "Advanced Integrations",
    to: "/dashboard/integrations",
    icon: <Link className="h-4 w-4" />,
  },

  // ===== USER MANAGEMENT =====
  {
    title: "Users",
    to: "/dashboard/users",
    icon: <UsersIcon className="h-4 w-4" />,
  },
  {
    title: "Role Management",
    to: "/dashboard/roles",
    icon: <Shield className="h-4 w-4" />,
  },
  {
    title: "Permissions",
    to: "/dashboard/permissions",
    icon: <UserCheck className="h-4 w-4" />,
  },

  // ===== SUPPORT & LOGS =====
  {
    title: "Notifications",
    to: "/dashboard/notifications",
    icon: <Bell className="h-4 w-4" />,
  },
  {
    title: "Support Tickets",
    to: "/dashboard/tickets",
    icon: <Ticket className="h-4 w-4" />,
  },
  {
    title: "Active Logs",
    to: "/dashboard/logs",
    icon: <FileText className="h-4 w-4" />,
  },

  // ===== ACCOUNT & SETTINGS =====
  {
    title: "Profile",
    to: "/dashboard/profile",
    icon: <User className="h-4 w-4" />,
  },
  {
    title: "Settings",
    to: "/dashboard/settings",
    icon: <SettingsIcon className="h-4 w-4" />,
  },
];

// Additional nav items that might be used in header/sidebar
export const headerNavItems = [
  {
    title: "Notifications",
    icon: <Bell className="h-4 w-4" />,
    action: "notifications",
  },
  {
    title: "Logout",
    icon: <LogOut className="h-4 w-4" />,
    action: "logout",
  },
];

// 404 page
export const notFoundPage = <NotFound />;
