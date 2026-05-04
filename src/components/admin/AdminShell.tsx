import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronLeft, ChevronRight, LogOut, Menu } from "lucide-react";
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
import AdminSidebar, { adminNavItems } from "./AdminSidebar";

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
  leaderboard: "/admin?tab=leaderboard",
  communication: "/admin?tab=communication",
};

const getUserInitials = (fullName: string) => {
  if (!fullName) return "AD";

  const nameParts = fullName.split(" ");
  if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
  return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
};

const getFirstName = (fullName: string) => {
  if (!fullName) return "Admin";
  return fullName.split(" ")[0];
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
    navigate(adminRouteById[id] || "/admin");
  };

  const activeTitle = title || adminNavItems.find((item) => item.id === activeId)?.label || "Dashboard";

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
              <button className="relative rounded-lg p-2 transition-colors hover:bg-gray-100">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
              </button>
              <div className="hidden h-8 w-px bg-gray-200 sm:block" />
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-bold text-white shadow-md sm:h-9 sm:w-9">
                  {getUserInitials(userData.fullName)}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-700">{getFirstName(userData.fullName)}</p>
                  <p className="text-xs text-gray-400">Administrator</p>
                </div>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
        </div>
      </div>
    </>
  );
};

export default AdminShell;
