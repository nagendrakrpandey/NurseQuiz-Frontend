import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import DashboardPage from "./pages/DashboardPage.tsx";
import CompetitionPage from "./pages/CompetitionPage.tsx";
import CertificatesPage from "./pages/CertificatesPage.tsx";
import NotificationsPage from "./pages/NotificationsPage.tsx";
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
import RequireRole from "./components/auth/RequireRole.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<RequireRole allowedRoles={[3]}><DashboardPage /></RequireRole>} />
          <Route path="/competition" element={<RequireRole allowedRoles={[3]}><CompetitionPage /></RequireRole>} />
          <Route path="/certificates" element={<RequireRole allowedRoles={[3]}><CertificatesPage /></RequireRole>} />
          <Route path="/notifications" element={<RequireRole allowedRoles={[3]}><NotificationsPage /></RequireRole>} />
          <Route path="/quiz" element={<RequireRole allowedRoles={[3]}><QuizPage /></RequireRole>} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/admin" element={<RequireRole allowedRoles={[1]}><AdminDashboard /></RequireRole>} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/About" element={<AboutSection />} />
         <Route path="/Signup" element={<Signup />} />
         <Route path="/Status" element={<Status />} />
         <Route path="/Payment" element={<RequireRole allowedRoles={[1]}><AdminShell activeId="payments" title="Payments"><Payment /></AdminShell></RequireRole>} />
         <Route path="/Question" element={<RequireRole allowedRoles={[1]}><AdminShell activeId="quiz" title="Quiz Management"><Questionbank /></AdminShell></RequireRole>} />
           <Route path="/ManageExam" element={<RequireRole allowedRoles={[1]}><AdminShell activeId="manage-exam" title="Manage Exam"><ManageExam /></AdminShell></RequireRole>} />
           <Route path="/register1" element={<Register />} />
           <Route path="/Precheck" element={<RequireRole allowedRoles={[3]}><PreExamCheck /></RequireRole>} />
           <Route path="/instruction" element={<RequireRole allowedRoles={[3]}><Instruction /></RequireRole>} />
           <Route path="/Evidence" element={<RequireRole allowedRoles={[1]}><AdminShell activeId="manage-exam" title="Candidate Evidence"><CandidateEvidenceDashboard /></AdminShell></RequireRole>} />
           <Route path="/Evidence/report/:candidateId" element={<RequireRole allowedRoles={[1]}><AdminShell activeId="manage-exam" title="Candidate Report"><CandidateEvidenceDashboard /></AdminShell></RequireRole>} />
           <Route path="/Evidence/:candidateId" element={<RequireRole allowedRoles={[1]}><AdminShell activeId="manage-exam" title="Candidate Evidence"><CandidateEvidenceDashboard /></AdminShell></RequireRole>} />
          <Route path="/Exam" element={<RequireRole allowedRoles={[3]}><ExamDashboard /></RequireRole>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
