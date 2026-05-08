import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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

const queryClient = new QueryClient();
const ALL_AUTHENTICATED_ROLES = [1, 2, 3];
const ADMIN_ROLES = [1, 2];
const PRIMARY_ADMIN_ROLE = [1];
const CANDIDATE_ROLE = [3];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
           <Route path="/Evidence" element={<RequireRole allowedRoles={PRIMARY_ADMIN_ROLE}><AdminShell activeId="manage-exam" title="Candidate Evidence"><CandidateEvidenceDashboard /></AdminShell></RequireRole>} />
           <Route path="/Evidence/report/:candidateId" element={<RequireRole allowedRoles={PRIMARY_ADMIN_ROLE}><AdminShell activeId="manage-exam" title="Candidate Report"><CandidateEvidenceDashboard /></AdminShell></RequireRole>} />
           <Route path="/Evidence/:candidateId" element={<RequireRole allowedRoles={PRIMARY_ADMIN_ROLE}><AdminShell activeId="manage-exam" title="Candidate Evidence"><CandidateEvidenceDashboard /></AdminShell></RequireRole>} />
          <Route path="/Exam" element={<RequireRole allowedRoles={CANDIDATE_ROLE}><RequireExamStep step="exam"><ExamDashboard /></RequireExamStep></RequireRole>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
