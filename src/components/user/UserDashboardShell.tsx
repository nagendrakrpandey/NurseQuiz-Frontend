import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Award,
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  Stethoscope,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAuthSession } from "@/lib/session";
import {
  getDashboardNotifications,
  getInitials,
  type DashboardResponse,
  type DashboardUser,
} from "@/lib/userDashboard";

interface UserDashboardShellProps {
  title: string;
  activePath: string;
  dashboardData: DashboardResponse | null;
  userData: DashboardUser;
  children: ReactNode;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

const UserDashboardShell = ({
  title,
  activePath,
  dashboardData,
  userData,
  children,
}: UserDashboardShellProps) => {
  const navigate = useNavigate();
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const notificationCount = getDashboardNotifications(dashboardData).length;

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Trophy, label: "Competition", path: "/competition" },
    { icon: Award, label: "Certificates", path: "/certificates" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
  ].filter((item) => {
    if (item.path === "/competition") {
      return dashboardData?.competition?.enabled !== false && dashboardData?.features?.competition !== false;
    }

    if (item.path === "/certificates") {
      return dashboardData?.features?.certificates !== false;
    }

    if (item.path === "/notifications") {
      return dashboardData?.features?.notifications !== false;
    }

    return true;
  });

  const handleLogout = () => {
    clearAuthSession("manual");
    navigate("/login", { replace: true });
  };

  const renderNav = (collapsed = false) => (
    <nav className="flex-1 p-3 space-y-1">
      {navItems.map((item) => {
        const active = item.path === activePath;

        return (
          <Link
            key={item.label}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const collapsed = desktopCollapsed;

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-muted/30">
      <aside
        className={`${
          collapsed ? "w-16" : "w-64"
        } bg-card border-r border-border transition-all duration-300 hidden md:flex flex-col shrink-0`}
      >
        <div className="h-16 flex items-center gap-2 px-4 border-b border-border">
          <Stethoscope className="h-6 w-6 text-primary shrink-0" />
          {!collapsed && <span className="font-heading font-bold text-foreground">NurseQuiz</span>}
        </div>
        {renderNav(collapsed)}
        <div className="border-t border-border p-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 transition-colors"
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-xl">
            <div className="h-16 flex items-center justify-between gap-2 px-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-6 w-6 text-primary shrink-0" />
                <span className="font-heading font-bold text-foreground">NurseQuiz</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {renderNav(false)}
            <div className="border-t border-border p-3">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="text-foreground md:hidden"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              className="hidden text-foreground md:inline-flex"
              aria-label="Toggle sidebar"
              onClick={() => setDesktopCollapsed((value) => !value)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="truncate font-heading text-lg font-bold text-foreground">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="relative">
              <Link to="/notifications">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {notificationCount}
                  </span>
                )}
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                {getInitials(userData.fullName)}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="md:hidden text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-6">{children}</main>
      </div>
    </div>
  );
};

export default UserDashboardShell;
