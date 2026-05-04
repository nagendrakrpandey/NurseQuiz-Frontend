import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  clearAuthSession,
  getPostLoginRoute,
  getStoredLoginStatus,
  getStoredRoleId,
  hasAuthSession,
  isSessionIdleExpired,
  markSessionActivity,
} from "@/lib/session";

interface RequireRoleProps {
  allowedRoles: number[];
  children: ReactNode;
}

const RequireRole = ({ allowedRoles, children }: RequireRoleProps) => {
  const location = useLocation();
  const hasSession = hasAuthSession();
  const sessionExpired = hasSession && isSessionIdleExpired();
  const roleId = getStoredRoleId();
  const loginStatus = getStoredLoginStatus();

  useEffect(() => {
    if (hasSession && !sessionExpired) {
      markSessionActivity();
    }
    if (sessionExpired) {
      clearAuthSession("idle");
    }
  }, [hasSession, sessionExpired]);

  if (!hasSession) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (sessionExpired) {
    return <Navigate to="/login" replace />;
  }

  if (!roleId || !allowedRoles.includes(roleId)) {
    return <Navigate to={getPostLoginRoute(roleId, loginStatus)} replace />;
  }

  return <>{children}</>;
};

export default RequireRole;
