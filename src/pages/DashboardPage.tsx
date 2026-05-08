import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Play,
  RefreshCw,
  Trophy,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import UserDashboardShell from "@/components/user/UserDashboardShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useCertificateDownload } from "@/hooks/useCertificateDownload";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import {
  canStartDashboardQuiz,
  formatDashboardDate,
  formatDashboardLabel,
  getActiveLevelIndex,
  getCertificateName,
  getCertificateStatusLabel,
  getDashboardCertificates,
  getDashboardLevels,
  getDashboardNotifications,
  getFirstName,
  getLevelDate,
  getNotificationDescription,
  getProgressPercentage,
  isDashboardQuizCompleted,
  isCertificateAvailable,
  startDashboardExam,
  type DashboardResponse,
  type DashboardStat,
} from "@/lib/userDashboard";

interface StatCard {
  label: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  color: string;
}

const getStatusColor = (value?: string) => {
  const normalized = String(value || "").toLowerCase();

  if (normalized.includes("approved") || normalized.includes("completed") || normalized.includes("available")) {
    return "text-success";
  }

  if (normalized.includes("reject") || normalized.includes("fail") || normalized.includes("blocked")) {
    return "text-destructive";
  }

  return "text-warning";
};

const isExamSubmittedStatus = (dashboardData: DashboardResponse | null | undefined) => {
  const completedStatuses = new Set([
    "SUBMITTED",
    "COMPLETED",
    "FINISHED",
    "PASS",
    "PASSED",
    "FAIL",
    "FAILED",
    "SELECTED",
    "NOTSELECTED",
    "QUALIFIED",
    "NOTQUALIFIED",
  ]);
  const statuses = [
    dashboardData?.quizStatus,
    dashboardData?.examStatus,
    dashboardData?.status,
    dashboardData?.resultStatus,
    dashboardData?.passStatus,
    dashboardData?.result,
  ]
    .filter(Boolean)
    .map((status) =>
      String(status)
        .trim()
        .replace(/[\s_-]+/g, "")
        .toUpperCase(),
    );

  return isDashboardQuizCompleted(dashboardData) || statuses.some((status) => completedStatuses.has(status));
};

const isAlreadySubmittedMessage = (message: string) => /already.*submit|submitted|completed|finished/i.test(message);

const getStatIcon = (label?: string, fallbackIndex = 0): LucideIcon => {
  const normalized = String(label || "").toLowerCase();

  if (normalized.includes("registration")) return CheckCircle2;
  if (normalized.includes("stage") || normalized.includes("level")) return Trophy;
  if (normalized.includes("quiz") || normalized.includes("exam")) return Clock;
  if (normalized.includes("certificate")) return Award;
  if (normalized.includes("error") || normalized.includes("fail")) return XCircle;

  return [CheckCircle2, Trophy, Clock][fallbackIndex] || CheckCircle2;
};

const getStats = (dashboardData: DashboardResponse | null): StatCard[] => {
  const apiStats = dashboardData?.stats;

  if (Array.isArray(apiStats) && apiStats.length > 0) {
    const mappedStats = apiStats.map((stat: DashboardStat, index) => ({
      label: String(stat.label || `Stat ${index + 1}`),
      value: formatDashboardLabel(stat.value ?? "Not Available"),
      subtext: stat.subtext,
      icon: getStatIcon(stat.label, index),
      color: stat.color || getStatusColor(String(stat.value ?? "")),
    }));
    const hasExamStatus = mappedStats.some((stat) => /quiz|exam|status/i.test(stat.label));

    return hasExamStatus
      ? mappedStats
      : [
          ...mappedStats,
          {
            label: "Exam Status",
            value: formatDashboardLabel(
              dashboardData?.examStatus || dashboardData?.quizStatus || dashboardData?.status || "Not Started",
            ),
            icon: Clock,
            color: getStatusColor(dashboardData?.examStatus || dashboardData?.quizStatus || dashboardData?.status),
          },
        ];
  }

  return [
    {
      label: "Registration Status",
      value: formatDashboardLabel(dashboardData?.registrationStatus || "Not Available"),
      icon: CheckCircle2,
      color: getStatusColor(dashboardData?.registrationStatus),
    },
    {
      label: "Current Stage",
      value: formatDashboardLabel(dashboardData?.currentStage || "Not Available"),
      icon: Trophy,
      color: "text-primary",
    },
    {
      label: "Exam Status",
      value: formatDashboardLabel(
        dashboardData?.examStatus || dashboardData?.quizStatus || dashboardData?.status || "Not Started",
      ),
      icon: Clock,
      color: getStatusColor(dashboardData?.examStatus || dashboardData?.quizStatus || dashboardData?.status),
    },
  ];
};

const getWelcomeMessage = (dashboardData: DashboardResponse | null, fullName: string) =>
  dashboardData?.welcomeMessage || `Welcome, ${getFirstName(fullName)}!`;

const getDescription = (dashboardData: DashboardResponse | null, fullName: string) => {
  if (dashboardData?.description) return dashboardData.description;

  const stage = dashboardData?.currentStage;
  if (stage) return `${fullName} is registered for the ${formatDashboardLabel(stage)} Quiz.`;

  return "Your dashboard will update automatically when competition data is available.";
};

const getNotificationIconClass = (type?: string) => {
  const normalized = String(type || "info").toLowerCase();
  if (normalized === "warning") return "text-warning";
  if (normalized === "success") return "text-success";
  if (normalized === "error") return "text-destructive";
  return "text-info";
};

const readStoredLoginBatch = () => {
  let storedUser: Record<string, unknown> = {};

  try {
    storedUser = JSON.parse(localStorage.getItem("userData") || "{}");
  } catch {
    storedUser = {};
  }

  return {
    batchId: Number(localStorage.getItem("batchId") || storedUser.batchId || storedUser.batch_id || 0) || null,
    batchCode: String(localStorage.getItem("batchCode") || storedUser.batchCode || storedUser.batch_code || "").trim(),
    level: String(localStorage.getItem("level") || storedUser.level || "").trim(),
  };
};

const DashboardPage = () => {
  useIdleLogout();

  const { dashboardData, userData, loading, error, refreshDashboard } = useDashboardData();
  const navigate = useNavigate();
  const { downloadingCertificate, downloadCertificate } = useCertificateDownload();
  const [examActionLoading, setExamActionLoading] = useState(false);
  const [examActionMessage, setExamActionMessage] = useState("");
  const [examCompletedDialogDismissed, setExamCompletedDialogDismissed] = useState(false);
  const examCompleted = isExamSubmittedStatus(dashboardData);
  const examStatusLabel = formatDashboardLabel(
    dashboardData?.examStatus || dashboardData?.quizStatus || dashboardData?.status || "Not Started",
  );

  const closeExamActionDialog = () => {
    setExamActionMessage("");
    if (examCompleted) setExamCompletedDialogDismissed(true);
  };

  const handleStartExam = async () => {
    if (examCompleted) {
      setExamActionMessage("Your exam is completed.");
      return;
    }

    setExamActionLoading(true);
    setExamActionMessage("");

    try {
      const startResult = await startDashboardExam(dashboardData?.currentStage);
      await refreshDashboard();
      if (isAlreadySubmittedMessage(startResult.message)) {
        setExamActionMessage("Your exam is completed.");
        return;
      }

      const storedBatch = readStoredLoginBatch();
      const resolvedBatchId = Number(startResult.batchId || storedBatch.batchId || 0) || null;
      const resolvedBatchCode = String(startResult.batchCode || storedBatch.batchCode || "").trim();
      const resolvedLevel = String(startResult.level || storedBatch.level || dashboardData?.currentStage || "").trim();

      const precheckParams = new URLSearchParams();
      if (resolvedBatchId) {
        localStorage.setItem("batchId", String(resolvedBatchId));
        precheckParams.set("batchId", String(resolvedBatchId));
      }
      if (resolvedBatchCode) {
        localStorage.setItem("batchCode", resolvedBatchCode);
        precheckParams.set("batchCode", resolvedBatchCode);
      }
      if (resolvedLevel) {
        localStorage.setItem("level", resolvedLevel);
        precheckParams.set("level", resolvedLevel);
      }

      const precheckSearch = precheckParams.toString();
      navigate(`/Precheck${precheckSearch ? `?${precheckSearch}` : ""}`);
    } catch (startError) {
      const message = startError instanceof Error ? startError.message : "Unable to start exam.";
      const alreadySubmitted = isAlreadySubmittedMessage(message);
      setExamActionMessage(alreadySubmitted ? "Your exam is completed." : message);
      await refreshDashboard();
    } finally {
      setExamActionLoading(false);
    }
  };

  useEffect(() => {
    if (examCompleted && !examCompletedDialogDismissed && !examActionMessage) {
      setExamActionMessage("Your exam is completed.");
    }
  }, [examActionMessage, examCompleted, examCompletedDialogDismissed]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const notifications = getDashboardNotifications(dashboardData);
  const stats = getStats(dashboardData);
  const competitionLevels = getDashboardLevels(dashboardData);
  const certificates = getDashboardCertificates(dashboardData);
  const progressValue = getProgressPercentage(dashboardData);
  const activeLevel = getActiveLevelIndex(dashboardData);
  const quizAvailable = canStartDashboardQuiz(dashboardData);

  return (
    <UserDashboardShell
      title="Dashboard"
      activePath="/dashboard"
      dashboardData={dashboardData}
      userData={userData}
    >
      <Dialog open={Boolean(examActionMessage)} onOpenChange={(open) => !open && closeExamActionDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exam Status</DialogTitle>
            <DialogDescription>{examActionMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={closeExamActionDialog}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
        {error && (
          <Card className="border-destructive/30 bg-destructive/5 card-shadow">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div className="min-w-0">
                  <p className="font-medium text-destructive">Dashboard data could not be loaded</p>
                  <p className="break-words text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={refreshDashboard} className="w-full sm:w-auto">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero-gradient rounded-xl p-4 text-primary-foreground sm:p-6"
        >
          <h2 className="mb-1 text-xl font-heading font-bold">
            {getWelcomeMessage(dashboardData, userData.fullName)}
          </h2>
          <p className="mb-4 text-sm text-primary-foreground/80">
            {getDescription(dashboardData, userData.fullName)}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {quizAvailable ? (
              <Button
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
                onClick={handleStartExam}
                disabled={examActionLoading}
              >
                {examActionLoading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {examActionLoading ? "Starting..." : "Start Exam"}
              </Button>
            ) : (
              <Badge className="w-fit bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20">
                {formatDashboardLabel(
                  dashboardData?.examStatus || dashboardData?.quizStatus || dashboardData?.status || "Exam Not Available",
                )}
              </Badge>
            )}
            <Badge className="w-fit bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20">
              Exam Status: {examStatusLabel}
            </Badge>
            {userData.email && (
              <span className="break-all text-xs text-primary-foreground/70 sm:self-center">
                {userData.email}
              </span>
            )}
          </div>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="card-shadow">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="break-words font-heading font-semibold text-card-foreground">{stat.value}</p>
                  {stat.subtext && <p className="text-xs text-muted-foreground">{stat.subtext}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Competition Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {competitionLevels.length > 0 ? (
              <>
                <div className="mb-4 flex gap-3 overflow-x-auto pb-1 sm:items-center sm:gap-4">
                  {competitionLevels.map((level, index) => {
                    const isActive = activeLevel >= 0 && index <= activeLevel;
                    const levelDate = getLevelDate(level, dashboardData?.levelDates);

                    return (
                      <div key={`${level}-${index}`} className="flex shrink-0 items-center gap-2">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isActive ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                        </div>
                        <div>
                          <span
                            className={`text-sm font-medium ${
                              isActive ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {formatDashboardLabel(level)}
                          </span>
                          {levelDate && (
                            <p className="text-xs text-muted-foreground">{formatDashboardDate(levelDate)}</p>
                          )}
                        </div>
                        {index < competitionLevels.length - 1 && (
                          <ChevronRight className="h-4 w-4 text-border" />
                        )}
                      </div>
                    );
                  })}
                </div>
                <Progress value={progressValue} className="h-2" />
              </>
            ) : (
              <div className="rounded-lg bg-muted/50 p-6 text-center text-muted-foreground">
                Competition stages are not configured yet.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-5 md:grid-cols-2 md:gap-6">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.length > 0 ? (
                notifications.slice(0, 4).map((notification, index) => (
                  <div key={`${notification.title}-${index}`} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                    <AlertCircle
                      className={`mt-0.5 h-4 w-4 shrink-0 ${getNotificationIconClass(notification.type)}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-card-foreground">
                        {notification.title || "Notification"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getNotificationDescription(notification)}
                      </p>
                    </div>
                    {(notification.time || notification.createdAt) && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {notification.time || formatDashboardDate(notification.createdAt)}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <AlertCircle className="mx-auto mb-3 h-10 w-10 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              )}
              {notifications.length > 4 && (
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to="/notifications">View All Notifications</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Certificates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {certificates.length > 0 ? (
                certificates.map((certificate, index) => {
                  const certificateName = getCertificateName(certificate);
                  const available = isCertificateAvailable(certificate.status);

                  return (
                    <div
                      key={`${certificateName}-${index}`}
                      className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Award className="h-5 w-5 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <span className="break-words text-sm font-medium text-card-foreground">
                            {certificateName}
                          </span>
                          {certificate.earnedDate && (
                            <p className="text-xs text-muted-foreground">
                              Earned: {formatDashboardDate(certificate.earnedDate)}
                            </p>
                          )}
                        </div>
                      </div>
                      {available ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => downloadCertificate(certificate)}
                          disabled={downloadingCertificate === certificateName}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          {downloadingCertificate === certificateName ? "Downloading..." : "Download"}
                        </Button>
                      ) : (
                        <Badge variant="secondary">{getCertificateStatusLabel(certificate.status)}</Badge>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Award className="mx-auto mb-3 h-10 w-10 opacity-50" />
                  <p>No certificates available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </UserDashboardShell>
  );
};

export default DashboardPage;
