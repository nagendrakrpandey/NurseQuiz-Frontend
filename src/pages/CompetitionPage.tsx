import { Link } from "react-router-dom";
import { AlertCircle, CalendarDays, CheckCircle2, Play, RefreshCw, Trophy, XCircle } from "lucide-react";
import UserDashboardShell from "@/components/user/UserDashboardShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import {
  canStartDashboardQuiz,
  formatDashboardDate,
  formatDashboardLabel,
  getActiveLevelIndex,
  getDashboardEligibility,
  getDashboardLevels,
  getDashboardScorePercentLabel,
  getLevelDate,
  getProgressPercentage,
  isDashboardQuizCompleted,
} from "@/lib/userDashboard";

const CompetitionPage = () => {
  useIdleLogout();

  const { dashboardData, userData, loading, error, refreshDashboard } = useDashboardData();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-4 text-muted-foreground">Loading competition...</p>
        </div>
      </div>
    );
  }

  const levels = getDashboardLevels(dashboardData);
  const activeLevel = getActiveLevelIndex(dashboardData);
  const progress = getProgressPercentage(dashboardData);
  const quizAvailable = canStartDashboardQuiz(dashboardData);
  const nextRoundEligibility = getDashboardEligibility(dashboardData);
  const nextRoundMessage =
    isDashboardQuizCompleted(dashboardData) && nextRoundEligibility !== null
      ? nextRoundEligibility
        ? "Congratulations, you are eligible for the next round."
        : "Sorry, you are not eligible for the next round."
      : "";
  const scorePercentLabel = getDashboardScorePercentLabel(dashboardData);

  return (
    <UserDashboardShell
      title="Competition"
      activePath="/competition"
      dashboardData={dashboardData}
      userData={userData}
    >
      <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
        {error && (
          <Card className="border-destructive/30 bg-destructive/5 card-shadow">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={refreshDashboard} className="w-full sm:w-auto">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="card-shadow">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Competition Timeline</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Current stage: {formatDashboardLabel(dashboardData?.currentStage || "Not Available")}
              </p>
            </div>
            {quizAvailable ? (
              <Button asChild className="w-full sm:w-auto">
                <Link to="/Precheck">
                  <Play className="mr-2 h-4 w-4" />
                  Start Exam
                </Link>
              </Button>
            ) : (
              <Badge variant="secondary" className="w-fit">
                {formatDashboardLabel(dashboardData?.quizStatus || "Exam Not Available")}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            <Progress value={progress} className="h-2" />

            {nextRoundMessage && (
              <div
                className={`flex items-start gap-3 rounded-lg p-4 text-sm ${
                  nextRoundEligibility
                    ? "bg-success/10 text-success"
                    : "bg-warning/10 text-warning"
                }`}
              >
                {nextRoundEligibility ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span className="font-medium">{nextRoundMessage}</span>
                {scorePercentLabel && (
                  <span className="ml-auto shrink-0 font-semibold">{scorePercentLabel}</span>
                )}
              </div>
            )}

            {levels.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-3">
                {levels.map((level, index) => {
                  const isActive = activeLevel >= 0 && index <= activeLevel;
                  const date = getLevelDate(level, dashboardData?.levelDates);

                  return (
                    <div
                      key={`${level}-${index}`}
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                              isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isActive ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                          </div>
                          <h2 className="font-heading text-base font-semibold text-card-foreground">
                            {formatDashboardLabel(level)}
                          </h2>
                        </div>
                        <Trophy className={isActive ? "h-5 w-5 text-primary" : "h-5 w-5 text-muted-foreground"} />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        <span>{date ? formatDashboardDate(date) : "Date not announced"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg bg-muted/50 p-8 text-center text-muted-foreground">
                <AlertCircle className="mx-auto mb-3 h-10 w-10 opacity-50" />
                Competition stages are not configured yet.
              </div>
            )}

            {dashboardData?.nextExamDate && (
              <div className="rounded-lg bg-accent p-4 text-sm text-accent-foreground">
                Next exam: {formatDashboardDate(dashboardData.nextExamDate)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UserDashboardShell>
  );
};

export default CompetitionPage;
