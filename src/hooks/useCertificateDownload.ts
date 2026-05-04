import { useState } from "react";
import jsPDF from "jspdf";
import {
  buildApiUrl,
  getCertificateName,
  getStoredDashboardUser,
  getStoredAuthToken,
  isCertificateAvailable,
  type DashboardCertificate,
} from "@/lib/userDashboard";

const getCertificateFileName = (certificateName: string) =>
  `${certificateName.replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "") || "certificate"}.pdf`;

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const getScoreLabel = (scorePercentage?: number | string | null) => {
  const parsed = Number(scorePercentage);
  return Number.isFinite(parsed) ? `${Math.round(parsed)}%` : "";
};

const generateFallbackCertificate = (certificate: DashboardCertificate) => {
  const certificateName = getCertificateName(certificate);
  const scoreLabel = getScoreLabel(certificate.scorePercentage);
  const isQualificationCertificate = certificateName.toLowerCase().includes("qualification");
  const user = getStoredDashboardUser();
  const issueDate = certificate.earnedDate
    ? new Date(certificate.earnedDate)
    : new Date();
  const formattedDate = Number.isNaN(issueDate.getTime())
    ? new Date().toLocaleDateString()
    : issueDate.toLocaleDateString();
  const certificateId = `NQ-${user.candidateId || user.id || "USER"}-${Date.now().toString().slice(-6)}`;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(247, 252, 250);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setDrawColor(25, 118, 165);
  doc.setLineWidth(2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  doc.setDrawColor(42, 157, 143);
  doc.setLineWidth(0.7);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

  doc.setTextColor(25, 118, 165);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("NurseQuiz", pageWidth / 2, 38, { align: "center" });

  doc.setTextColor(24, 36, 51);
  doc.setFontSize(18);
  doc.text(certificateName, pageWidth / 2, 58, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(86, 100, 112);
  doc.text("This certificate is proudly presented to", pageWidth / 2, 78, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(15, 23, 42);
  doc.text(user.fullName || "Participant", pageWidth / 2, 98, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(86, 100, 112);
  const achievementText = isQualificationCertificate
    ? `for qualifying for the next round of the NurseQuiz competition${scoreLabel ? ` with ${scoreLabel}.` : "."}`
    : "for participation in the NurseQuiz competition.";
  doc.text(doc.splitTextToSize(achievementText, pageWidth - 70), pageWidth / 2, 116, {
    align: "center",
  });

  doc.setFontSize(11);
  doc.text(`Email: ${user.email || "Not available"}`, pageWidth / 2, 134, { align: "center" });
  doc.text(`Issued on: ${formattedDate}`, pageWidth / 2, 145, { align: "center" });
  doc.text(`Certificate ID: ${certificateId}`, pageWidth / 2, 156, { align: "center" });

  doc.setDrawColor(25, 118, 165);
  doc.line(38, 174, 108, 174);
  doc.line(pageWidth - 108, 174, pageWidth - 38, 174);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(24, 36, 51);
  doc.text("Coordinator", 73, 181, { align: "center" });
  doc.text("Authorized Signature", pageWidth - 73, 181, { align: "center" });

  doc.save(getCertificateFileName(certificateName));
};

export const useCertificateDownload = () => {
  const [downloadingCertificate, setDownloadingCertificate] = useState<string | null>(null);

  const downloadCertificate = async (certificate: DashboardCertificate) => {
    const certificateName = getCertificateName(certificate);

    if (!isCertificateAvailable(certificate.status)) return;

    const token = getStoredAuthToken();
    setDownloadingCertificate(certificateName);

    try {
      if (certificate.downloadUrl) {
        const response = await fetch(buildApiUrl(certificate.downloadUrl), {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (response.ok) {
          const blob = await response.blob();
          downloadBlob(blob, getCertificateFileName(certificateName));
          return;
        }

        console.warn(`Certificate API returned ${response.status}. Generating PDF in browser.`);
      }

      generateFallbackCertificate(certificate);
    } catch (error) {
      console.error("Certificate download error:", error);
      try {
        generateFallbackCertificate(certificate);
      } catch (fallbackError) {
        console.error("Certificate PDF generation error:", fallbackError);
        window.alert("Certificate download failed. Please try again.");
      }
    } finally {
      setDownloadingCertificate(null);
    }
  };

  return {
    downloadingCertificate,
    downloadCertificate,
  };
};
