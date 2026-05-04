import { Award, Download, RefreshCw } from "lucide-react";
import UserDashboardShell from "@/components/user/UserDashboardShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCertificateDownload } from "@/hooks/useCertificateDownload";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import {
  formatDashboardDate,
  getCertificateName,
  getCertificateStatusLabel,
  getDashboardCertificates,
  isCertificateAvailable,
} from "@/lib/userDashboard";

const CertificatesPage = () => {
  useIdleLogout();

  const { dashboardData, userData, loading, error, refreshDashboard } = useDashboardData();
  const { downloadingCertificate, downloadCertificate } = useCertificateDownload();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-4 text-muted-foreground">Loading certificates...</p>
        </div>
      </div>
    );
  }

  const certificates = getDashboardCertificates(dashboardData);

  return (
    <UserDashboardShell
      title="Certificates"
      activePath="/certificates"
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
                    className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <Award className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <h2 className="break-words text-sm font-semibold text-card-foreground">
                          {certificateName}
                        </h2>
                        {certificate.earnedDate && (
                          <p className="mt-1 text-xs text-muted-foreground">
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
                        <Download className="mr-2 h-4 w-4" />
                        {downloadingCertificate === certificateName ? "Downloading..." : "Download"}
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="w-fit">
                        {getCertificateStatusLabel(certificate.status)}
                      </Badge>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg bg-muted/50 p-8 text-center text-muted-foreground">
                <Award className="mx-auto mb-3 h-10 w-10 opacity-50" />
                <p>No certificates available yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UserDashboardShell>
  );
};

export default CertificatesPage;
