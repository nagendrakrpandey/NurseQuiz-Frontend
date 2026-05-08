export const SESSION_LAST_ACTIVITY_KEY = "sessionLastActivityAt";
export const SESSION_LOGOUT_REASON_KEY = "sessionLogoutReason";
export const EXAM_PRECHECK_DONE_KEY = "preExamDone";
export const EXAM_INSTRUCTION_DONE_KEY = "instructionDone";
export const IDLE_LOGOUT_MS = 30 * 60 * 1000;

const AUTH_STORAGE_KEYS = [
  "token",
  "email",
  "userId",
  "candidateId",
  "userName",
  "roleId",
  "loginStatus",
  "contact",
  "userData",
  "adminData",
];

const EXAM_SESSION_STORAGE_KEYS = [
  EXAM_PRECHECK_DONE_KEY,
  EXAM_INSTRUCTION_DONE_KEY,
  "batchCode",
  "batchId",
  "level",
  "enrollment_no",
  "enrollmentNo",
];

export const markSessionActivity = () => {
  localStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(Date.now()));
};

export const getLastSessionActivity = () => {
  const parsed = Number(localStorage.getItem(SESSION_LAST_ACTIVITY_KEY));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const isSessionIdleExpired = (timeoutMs = IDLE_LOGOUT_MS) => {
  const lastActivity = getLastSessionActivity();
  return Boolean(lastActivity && Date.now() - lastActivity >= timeoutMs);
};

export const clearAuthSession = (reason: "manual" | "idle" = "manual") => {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  EXAM_SESSION_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(SESSION_LAST_ACTIVITY_KEY);
  localStorage.setItem(SESSION_LOGOUT_REASON_KEY, reason);
  sessionStorage.clear();
};

export const hasAuthSession = () => Boolean(localStorage.getItem("token"));

const getStoredNumber = (key: string) => {
  const storedValue = localStorage.getItem(key);
  if (storedValue === null || storedValue === "") return null;

  const parsed = Number(storedValue);
  return Number.isFinite(parsed) ? parsed : null;
};

const getStoredUserNumber = (key: "roleId" | "loginStatus") => {
  const storedUserData = localStorage.getItem("userData");
  const storedAdminData = localStorage.getItem("adminData");
  const sources = [storedUserData, storedAdminData].filter(Boolean);

  for (const source of sources) {
    try {
      const parsedData = JSON.parse(source as string);
      const parsed = Number(parsedData?.[key]);
      if (Number.isFinite(parsed)) return parsed;
    } catch {
      // Ignore invalid stale storage and keep checking other sources.
    }
  }

  return null;
};

export const getStoredRoleId = () => getStoredNumber("roleId") ?? getStoredUserNumber("roleId");

export const getStoredLoginStatus = () => getStoredNumber("loginStatus") ?? getStoredUserNumber("loginStatus");

export const getPostLoginRoute = (roleId, loginStatus) => {
  const role = String(roleId);
  const status = String(loginStatus);

  if (status === "0") {
    return "/register";
  }

  if (status === "1") {
    if (role === "1") return "/admin";
    if (role === "2") return "/admin";
    if (role === "3") return "/dashboard";
  }

  return "/login";
};
