import { ChevronDown, LayoutDashboard, LogOut, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AccountMenuProps {
  fullName: string;
  subtitle?: string;
  initials: string;
  dashboardPath: string;
  profilePath?: string;
  onLogout: () => void;
}

const getFirstName = (fullName: string) => {
  const trimmedName = fullName.trim();
  if (!trimmedName) return "User";
  return trimmedName.split(" ")[0];
};

const AccountMenu = ({
  fullName,
  subtitle,
  initials,
  dashboardPath,
  profilePath = "/profile",
  onLogout,
}: AccountMenuProps) => {
  const navigate = useNavigate();
  const displayName = fullName.trim() || "User";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-bold text-white shadow-md sm:h-9 sm:w-9">
            {initials}
          </span>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block truncate text-sm font-medium text-gray-700">{getFirstName(displayName)}</span>
            {subtitle && <span className="block truncate text-xs text-gray-400">{subtitle}</span>}
          </span>
          <ChevronDown className="hidden h-4 w-4 text-gray-400 sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-lg">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-semibold text-gray-800">{displayName}</span>
          {subtitle && <span className="block truncate text-xs font-normal text-gray-500">{subtitle}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => navigate(dashboardPath)}>
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => navigate(profilePath)}>
          <UserCircle className="h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer gap-2 text-red-600 focus:bg-red-50 focus:text-red-700"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountMenu;
