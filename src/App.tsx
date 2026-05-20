import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useLayoutEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.tsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.tsx";
import DashboardPage from "./pages/DashboardPage.tsx";
import CompetitionPage from "./pages/CompetitionPage.tsx";
import CertificatesPage from "./pages/CertificatesPage.tsx";
import NotificationsPage from "./pages/NotificationsPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import QuizPage from "./pages/QuizPage.tsx";
import LeaderboardPage from "./pages/LeaderboardPage.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AnnouncementsPage from "./pages/AnnouncementsPage.tsx";
import AboutSection from "./components/homepage/AboutSection.tsx";
import Signup from "./pages/signup.tsx";
import Status from "./pages/Status.tsx";
import Payment from "./pages/Payment.tsx";
import Questionbank from "./pages/Questionbank.tsx";
import ManageExam from "./pages/ManageExam.tsx";
import Register from "./pages/regiter";
import PreExamCheck from "./pages/PreExamCheck.tsx";
import Instruction from "./pages/instruction";
import CandidateEvidenceDashboard from "./pages/Evidence.tsx";
import ExamDashboard from "./pages/Exam.tsx";
import AdminShell from "./components/admin/AdminShell.tsx";
import RequireExamStep from "./components/auth/RequireExamStep.tsx";
import RequireRole from "./components/auth/RequireRole.tsx";
import ScrollToTop from "./components/ScrollToTop.tsx";
import { getStoredRoleId, hasAuthSession } from "./lib/session.ts";

const queryClient = new QueryClient();
const ALL_AUTHENTICATED_ROLES = [1, 2, 3];
const ADMIN_ROLES = [1, 2];
const PRIMARY_ADMIN_ROLE = [1];
const CANDIDATE_ROLE = [3];
const ADMIN_AREA_PATHS = [
  "/admin",
  "/Status",
  "/Payment",
  "/Question",
  "/ManageExam",
  "/Evidence",
  "/AllEvidence",
];

const isAdminAreaPath = (pathname: string) =>
  ADMIN_AREA_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

const ADMIN_OVERVIEW_GUARD_STATE = "nurseQuizAdminOverviewGuard";
const ADMIN_OVERVIEW_GUARD_DEPTH = 5;

const hasAdminOverviewGuard = (state: unknown) => {
  if (!state || typeof state !== "object") return false;

  const record = state as Record<string, unknown>;
  const userState = record.usr && typeof record.usr === "object"
    ? record.usr as Record<string, unknown>
    : {};

  return Boolean(record[ADMIN_OVERVIEW_GUARD_STATE] || userState[ADMIN_OVERVIEW_GUARD_STATE]);
};

const createAdminOverviewGuardState = () => {
  const currentState = window.history.state && typeof window.history.state === "object"
    ? window.history.state as Record<string, unknown>
    : {};
  const currentUserState = currentState.usr && typeof currentState.usr === "object"
    ? currentState.usr as Record<string, unknown>
    : {};

  return {
    ...currentState,
    usr: {
      ...currentUserState,
      [ADMIN_OVERVIEW_GUARD_STATE]: true,
    },
    [ADMIN_OVERVIEW_GUARD_STATE]: true,
  };
};

const pushAdminOverviewGuard = (depth = 1) => {
  for (let index = 0; index < depth; index += 1) {
    window.history.pushState(createAdminOverviewGuardState(), "", "/admin");
  }
};

const AdminNavigationBoundary = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const roleId = getStoredRoleId();
    const isAdmin = hasAuthSession() && ADMIN_ROLES.includes(Number(roleId));

    if (isAdmin && !isAdminAreaPath(location.pathname)) {
      navigate("/admin", { replace: true });
    }
  }, [location.pathname, navigate]);

  useLayoutEffect(() => {
    const roleId = getStoredRoleId();
    const isAdmin = hasAuthSession() && ADMIN_ROLES.includes(Number(roleId));
    const isOverview = location.pathname === "/admin" && !location.search;

    if (!isAdmin || !isOverview) return;

    if (!hasAdminOverviewGuard(window.history.state)) {
      pushAdminOverviewGuard(ADMIN_OVERVIEW_GUARD_DEPTH);
    }

    const keepAdminOverviewInPlace = () => {
      const activeRoleId = getStoredRoleId();
      const isStillAdmin = hasAuthSession() && ADMIN_ROLES.includes(Number(activeRoleId));
      if (!isStillAdmin) return;

      if (window.location.pathname === "/admin" && !window.location.search) {
        pushAdminOverviewGuard(ADMIN_OVERVIEW_GUARD_DEPTH);
        return;
      }

      if (!isAdminAreaPath(window.location.pathname)) {
        window.history.replaceState(createAdminOverviewGuardState(), "", "/admin");
        navigate("/admin", { replace: true });
      }
    };

    window.addEventListener("popstate", keepAdminOverviewInPlace);
    return () => window.removeEventListener("popstate", keepAdminOverviewInPlace);
  }, [location.pathname, location.search, navigate]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AdminNavigationBoundary />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/register" element={<RequireRole allowedRoles={ALL_AUTHENTICATED_ROLES}><RegisterPage /></RequireRole>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/dashboard" element={<RequireRole allowedRoles={CANDIDATE_ROLE}><DashboardPage /></RequireRole>} />
          <Route path="/competition" element={<RequireRole allowedRoles={CANDIDATE_ROLE}><CompetitionPage /></RequireRole>} />
          <Route path="/certificates" element={<RequireRole allowedRoles={CANDIDATE_ROLE}><CertificatesPage /></RequireRole>} />
          <Route path="/notifications" element={<RequireRole allowedRoles={CANDIDATE_ROLE}><NotificationsPage /></RequireRole>} />
          <Route path="/profile" element={<RequireRole allowedRoles={ALL_AUTHENTICATED_ROLES}><ProfilePage /></RequireRole>} />
          <Route path="/quiz" element={<RequireRole allowedRoles={CANDIDATE_ROLE}><QuizPage /></RequireRole>} />
          <Route path="/leaderboard" element={<RequireRole allowedRoles={ALL_AUTHENTICATED_ROLES}><LeaderboardPage /></RequireRole>} />
          <Route path="/admin" element={<RequireRole allowedRoles={ADMIN_ROLES}><AdminDashboard /></RequireRole>} />
          <Route path="/announcements" element={<RequireRole allowedRoles={ALL_AUTHENTICATED_ROLES}><AnnouncementsPage /></RequireRole>} />
          <Route path="/About" element={<RequireRole allowedRoles={ALL_AUTHENTICATED_ROLES}><AboutSection /></RequireRole>} />
         <Route path="/Signup" element={<Signup />} />
         <Route path="/Status" element={<RequireRole allowedRoles={PRIMARY_ADMIN_ROLE}><Status /></RequireRole>} />
         <Route path="/Payment" element={<RequireRole allowedRoles={PRIMARY_ADMIN_ROLE}><AdminShell activeId="payments" title="Payments"><Payment /></AdminShell></RequireRole>} />
         <Route path="/Question" element={<RequireRole allowedRoles={PRIMARY_ADMIN_ROLE}><AdminShell activeId="quiz" title="Quiz Management"><Questionbank /></AdminShell></RequireRole>} />
           <Route path="/ManageExam" element={<RequireRole allowedRoles={PRIMARY_ADMIN_ROLE}><AdminShell activeId="manage-exam" title="Manage Exam"><ManageExam /></AdminShell></RequireRole>} />
           <Route path="/register1" element={<RequireRole allowedRoles={CANDIDATE_ROLE}><Register /></RequireRole>} />
           <Route path="/Precheck" element={<RequireRole allowedRoles={CANDIDATE_ROLE}><PreExamCheck /></RequireRole>} />
           <Route path="/instruction" element={<RequireRole allowedRoles={CANDIDATE_ROLE}><RequireExamStep step="instruction"><Instruction /></RequireExamStep></RequireRole>} />
           <Route path="/Evidence" element={<RequireRole allowedRoles={PRIMARY_ADMIN_ROLE}><AdminShell activeId="manage-exam" title="Exam Evidence"><CandidateEvidenceDashboard evidenceMode="completed" /></AdminShell></RequireRole>} />
           <Route path="/Evidence/report/:candidateId" element={<RequireRole allowedRoles={PRIMARY_ADMIN_ROLE}><AdminShell activeId="manage-exam" title="Log Report"><CandidateEvidenceDashboard evidenceMode="completed" /></AdminShell></RequireRole>} />
           <Route path="/Evidence/:candidateId" element={<RequireRole allowedRoles={PRIMARY_ADMIN_ROLE}><AdminShell activeId="manage-exam" title="Exam Evidence"><CandidateEvidenceDashboard evidenceMode="completed" /></AdminShell></RequireRole>} />
           <Route path="/AllEvidence" element={<RequireRole allowedRoles={PRIMARY_ADMIN_ROLE}><AdminShell activeId="all-evidence" title="All Evidence"><CandidateEvidenceDashboard evidenceMode="all" /></AdminShell></RequireRole>} />
           <Route path="/AllEvidence/report/:candidateId" element={<RequireRole allowedRoles={PRIMARY_ADMIN_ROLE}><AdminShell activeId="all-evidence" title="Log Report"><CandidateEvidenceDashboard evidenceMode="all" /></AdminShell></RequireRole>} />
           <Route path="/AllEvidence/:candidateId" element={<RequireRole allowedRoles={PRIMARY_ADMIN_ROLE}><AdminShell activeId="all-evidence" title="All Evidence"><CandidateEvidenceDashboard evidenceMode="all" /></AdminShell></RequireRole>} />
          <Route path="/Exam" element={<RequireRole allowedRoles={CANDIDATE_ROLE}><RequireExamStep step="exam"><ExamDashboard /></RequireExamStep></RequireRole>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
