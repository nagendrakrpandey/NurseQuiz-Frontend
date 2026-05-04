import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  CreditCard,
  FileQuestion,
  LayoutDashboard,
  LogOut,
  Mail,
  Stethoscope,
  Trophy,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  icon: LucideIcon;
  label: string;
  id: string;
  color: string;
}

export const adminNavItems: AdminNavItem[] = [
  { icon: LayoutDashboard, label: "Overview", id: "overview", color: "emerald" },
  { icon: Users, label: "Registrations", id: "registrations", color: "blue" },
  { icon: CheckCircle2, label: "Approvals", id: "approvals", color: "amber" },
  { icon: CreditCard, label: "Payments", id: "payments", color: "purple" },
  { icon: FileQuestion, label: "Quiz Management", id: "quiz", color: "indigo" },
  { icon: Calendar, label: "Candidate Evidence", id: "manage-exam", color: "rose" },
  { icon: Trophy, label: "Leaderboard", id: "leaderboard", color: "orange" },
  { icon: Mail, label: "Communication", id: "communication", color: "cyan" },
];

interface AdminSidebarProps {
  activeId: string;
  items?: AdminNavItem[];
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  onSelect: (id: string) => void;
  onLogoutClick: () => void;
  onCloseMobile: () => void;
}

const AdminSidebar = ({
  activeId,
  items = adminNavItems,
  sidebarOpen,
  mobileMenuOpen,
  onSelect,
  onLogoutClick,
  onCloseMobile,
}: AdminSidebarProps) => {
  const handleMobileSelect = (id: string) => {
    onSelect(id);
    onCloseMobile();
  };

  const handleMobileLogout = () => {
    onLogoutClick();
    onCloseMobile();
  };

  return (
    <>
      <aside className={`${sidebarOpen ? "w-72" : "w-20"} hidden h-screen shrink-0 flex-col border-r border-gray-200/50 bg-white/80 shadow-xl backdrop-blur-xl transition-all duration-300 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex`}>
        <div className={`flex h-20 items-center gap-3 border-b border-gray-100 px-5 ${!sidebarOpen && "justify-center"}`}>
          <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-2 shadow-lg">
            <Stethoscope className="h-6 w-6 text-white" />
          </div>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-heading bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-xl font-bold text-transparent"
            >
              NurseQuiz
            </motion.span>
          )}
        </div>

        <nav className="flex-1 space-y-1.5 overflow-hidden p-4">
          {items.map((item, index) => {
            const isActive = activeId === item.id;
            const Icon = item.icon;

            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSelect(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                } ${!sidebarOpen && "justify-center"}`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-emerald-600" : "text-gray-400"}`} />
                {sidebarOpen && <span>{item.label}</span>}
                {sidebarOpen && isActive && (
                  <motion.div layoutId="activeIndicator" className="ml-auto h-6 w-1.5 rounded-full bg-emerald-500" />
                )}
              </motion.button>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-4">
          <button
            onClick={onLogoutClick}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 ${
              !sidebarOpen && "justify-center"
            }`}
            title={!sidebarOpen ? "Logout" : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0 text-gray-400 transition-colors hover:text-red-600" />
            {sidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={onCloseMobile}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed bottom-0 left-0 top-0 z-50 w-72 bg-white shadow-2xl lg:hidden"
            >
              <div className="flex h-20 items-center justify-between border-b border-gray-100 px-5">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-2">
                    <Stethoscope className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-heading text-xl font-bold text-emerald-600">NurseQuiz</span>
                </div>
                <button onClick={onCloseMobile} className="rounded-lg p-2 hover:bg-gray-100">
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <nav className="space-y-1.5 p-4">
                {items.map((item) => {
                  const isActive = activeId === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMobileSelect(item.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                        isActive ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? "text-emerald-600" : "text-gray-400"}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                <button
                  onClick={handleMobileLogout}
                  className="mt-4 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminSidebar;
