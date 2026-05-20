import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut, Menu } from "lucide-react";
import AccountMenu from "@/components/AccountMenu";
import { Button } from "@/components/ui/button";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { clearAuthSession, hasAuthSession } from "@/lib/session";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AdminSidebar, { getAdminNavItemsForRole, isAdminNavItemAllowedForRole } from "./AdminSidebar";

interface AdminShellUser {
  fullName: string;
  email: string;
  contact: string;
  id: number;
  roleId: number;
  loginStatus: number;
}

interface AdminShellProps {
  activeId: string;
  title?: string;
  children: ReactNode;
}

const adminRouteById: Record<string, string> = {
  overview: "/admin",
  registrations: "/admin?tab=registrations",
  approvals: "/admin?tab=approvals",
  payments: "/Payment",
  quiz: "/Question",
  "manage-exam": "/Evidence",
  "all-evidence": "/AllEvidence",
  leaderboard: "/admin?tab=leaderboard",
  communication: "/admin?tab=communication",
};

const getUserInitials = (fullName: string) => {
  if (!fullName) return "AD";

  const nameParts = fullName.split(" ");
  if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
  return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
};

const readStoredAdminUser = (): AdminShellUser | null => {
  const storedUserData = localStorage.getItem("userData");
  const storedAdminData = localStorage.getItem("adminData");
  const source = storedUserData || storedAdminData;

  if (!source) return null;

  try {
    const parsedData = JSON.parse(source);
    return {
      fullName: parsedData.fullName || "Admin User",
      email: parsedData.email || "",
      contact: parsedData.contact || "",
      id: parsedData.id || 0,
      roleId: parsedData.roleId || 0,
      loginStatus: parsedData.loginStatus || 0,
    };
  } catch {
    return null;
  }
};

const AdminShell = ({ activeId, title, children }: AdminShellProps) => {
  const navigate = useNavigate();
  useIdleLogout();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [userData, setUserData] = useState<AdminShellUser>({
    fullName: "",
    email: "",
    contact: "",
    id: 0,
    roleId: 0,
    loginStatus: 0,
  });

  useEffect(() => {
    const storedUser = readStoredAdminUser();

    if (storedUser && hasAuthSession()) {
      setUserData(storedUser);
      return;
    }

    navigate("/login", { replace: true });
  }, [navigate]);

  const handleLogout = () => {
    clearAuthSession("manual");
    navigate("/login", { replace: true });
  };

  const handleNavSelect = (id: string) => {
    if (!isAdminNavItemAllowedForRole(id, userData.roleId)) {
      navigate("/admin");
      return;
    }

    navigate(adminRouteById[id] || "/admin");
  };

  const adminNav = getAdminNavItemsForRole(userData.roleId);
  const activeTitle = title || adminNav.find((item) => item.id === activeId)?.label || "Dashboard";

  return (
    <>
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-red-600" />
              Confirm Logout
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to logout? You will need to login again to access the dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminSidebar
          activeId={activeId}
          items={adminNav}
          sidebarOpen={sidebarOpen}
          mobileMenuOpen={mobileMenuOpen}
          onSelect={handleNavSelect}
          onLogoutClick={() => setShowLogoutDialog(true)}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <div className={`${sidebarOpen ? "lg:ml-72" : "lg:ml-20"} flex min-w-0 flex-1 flex-col overflow-x-hidden transition-[margin] duration-300`}>
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200/50 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button className="rounded-lg p-2 hover:bg-gray-100 lg:hidden" onClick={() => setMobileMenuOpen(true)}>
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
              <button className="hidden rounded-lg p-2 hover:bg-gray-100 lg:flex" onClick={() => setSidebarOpen((current) => !current)}>
                {sidebarOpen ? <ChevronLeft className="h-5 w-5 text-gray-600" /> : <ChevronRight className="h-5 w-5 text-gray-600" />}
              </button>
              <h1 className="truncate font-heading text-lg font-bold text-gray-800 sm:text-xl">{activeTitle}</h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <AccountMenu
                fullName={userData.fullName}
                subtitle="Administrator"
                initials={getUserInitials(userData.fullName)}
                dashboardPath="/admin"
                onLogout={() => setShowLogoutDialog(true)}
              />
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
        </div>
      </div>
    </>
  );
};

export default AdminShell;
