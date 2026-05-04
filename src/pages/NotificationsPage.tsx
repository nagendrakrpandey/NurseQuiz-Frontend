import { AlertCircle, Bell, RefreshCw } from "lucide-react";
import UserDashboardShell from "@/components/user/UserDashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import {
  formatDashboardDate,
  getDashboardNotifications,
  getNotificationDescription,
} from "@/lib/userDashboard";

const getNotificationIconClass = (type?: string) => {
  const normalized = String(type || "info").toLowerCase();
  if (normalized === "warning") return "text-warning";
  if (normalized === "success") return "text-success";
  if (normalized === "error") return "text-destructive";
  return "text-info";
};

const NotificationsPage = () => {
  useIdleLogout();

  const { dashboardData, userData, loading, error, refreshDashboard } = useDashboardData();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-4 text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    );
  }

  const notifications = getDashboardNotifications(dashboardData);

  return (
    <UserDashboardShell
      title="Notifications"
      activePath="/notifications"
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
          <CardHeader>
            <CardTitle className="text-lg">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.length > 0 ? (
              notifications.map((notification, index) => (
                <div
                  key={`${notification.title}-${index}`}
                  className="flex flex-col gap-3 rounded-lg bg-muted/50 p-4 sm:flex-row sm:items-start"
                >
                  <AlertCircle
                    className={`mt-0.5 h-5 w-5 shrink-0 ${getNotificationIconClass(notification.type)}`}
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-sm font-semibold text-card-foreground">
                      {notification.title || "Notification"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
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
              <div className="rounded-lg bg-muted/50 p-8 text-center text-muted-foreground">
                <Bell className="mx-auto mb-3 h-10 w-10 opacity-50" />
                <p>No notifications yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UserDashboardShell>
  );
};

export default NotificationsPage;
