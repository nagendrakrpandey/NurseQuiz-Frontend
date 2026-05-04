// AdminDashboard.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, CheckCircle2, CreditCard, Trophy, Mail, Search, Filter,
  ThumbsUp, ThumbsDown, Eye, BarChart3, Bell, Upload, Send, Menu,
  XCircle, Clock, AlertCircle, Building2, FileText, Download, Plus, Trash2, Edit, Loader2,
  ChevronLeft, ChevronRight, LogOut, Settings, HelpCircle, TrendingUp, TrendingDown,
  Wallet, Receipt, Award, MessageSquare, Phone, AtSign, Sparkles, Star, Briefcase,
  Shield, Check, Ban, RefreshCw, MoreHorizontal, FileCheck, FileX, UserCheck
} from "lucide-react";
import AdminSidebar, { adminNavItems } from "@/components/admin/AdminSidebar";
import LiveLeaderboard from "@/components/admin/LiveLeaderboard";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { clearAuthSession, hasAuthSession } from "@/lib/session";
import PaymentsTab from "./Payment";
import QuizManagementTab from "./Questionbank";
import ExamManagementTab from "./ManageExam";
import { BASE_URL } from "@/Service/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useLocation, useNavigate } from "react-router-dom";
import EvidencePage from "./Evidence";

// Types
interface OrganizationData {
  id: number;
  userId: number;
  organizationName: string;
  registrationNumber: string;
  pincode: string;
  state: string;
  district: string;
  orgEmail: string;
  orgPhone: string;
  status: number;
  createdAt: string;
  updatedAt: string;
  address?: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    loginStatus?: number;
  };
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  organizationId: number;
  userId: number;
}

interface Document {
  id: number;
  registrationCertPath: string;
  teamLeadIdPath: string;
  nursingCouncilRegPath: string;
  userId: number;
  organizationId: string;
}

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  type: "info" | "error" | "success" | "warning";
}

interface UserData {
  fullName: string;
  email: string;
  contact: string;
  id: number;
  roleId: number;
  loginStatus: number;
}

const getAdminTabFromSearch = (search: string) => {
  const tab = new URLSearchParams(search).get("tab");
  return adminNavItems.some((item) => item.id === tab) ? tab || "overview" : "overview";
};

// Animated Card Component
const AnimatedCard = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

// Enhanced Payment Status Badge Component
const PaymentStatusBadge = ({ paymentStatus }: { paymentStatus?: number }) => {
  const getPaymentStatusConfig = () => {
    switch (paymentStatus) {
      case 1:
        return { color: "bg-gradient-to-r from-emerald-500 to-emerald-600", icon: CheckCircle2, label: "PAID", textColor: "text-white" };
      case 0:
        return { color: "bg-gradient-to-r from-red-500 to-red-600", icon: XCircle, label: "PENDING", textColor: "text-white" };
      default:
        return { color: "bg-gradient-to-r from-amber-500 to-amber-600", icon: Clock, label: "NOT INITIATED", textColor: "text-white" };
    }
  };

  const config = getPaymentStatusConfig();
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${config.color} ${config.textColor}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
};

// Enhanced Status Badge Component
const StatusBadge = ({ status }: { status: number }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 2:
        return { color: "bg-gradient-to-r from-emerald-500 to-emerald-600", icon: CheckCircle2, label: "APPROVED", textColor: "text-white" };
      case 3:
        return { color: "bg-gradient-to-r from-red-500 to-red-600", icon: XCircle, label: "REJECTED", textColor: "text-white" };
      default:
        return { color: "bg-gradient-to-r from-amber-500 to-amber-600", icon: Clock, label: "PENDING", textColor: "text-white" };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${config.color} ${config.textColor}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
};

// Custom Dialog Component
const CustomDialog = ({ isOpen, onClose, title, message, type = "info" }: DialogState & { onClose: () => void }) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "error":
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      case "success":
        return <CheckCircle2 className="h-6 w-6 text-emerald-600" />;
      case "warning":
        return <AlertCircle className="h-6 w-6 text-amber-600" />;
      default:
        return <AlertCircle className="h-6 w-6 text-blue-600" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case "error":
        return "bg-red-100";
      case "success":
        return "bg-emerald-100";
      case "warning":
        return "bg-amber-100";
      default:
        return "bg-blue-100";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${getBgColor()} flex items-center justify-center`}>
                {getIcon()}
              </div>
              <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-600 mt-2">{message}</p>
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-md">
              OK
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// PDF Download Function
const downloadRegistrationPDF = (org: OrganizationData, members: TeamMember[], documents: Document | null, paymentStatus: number | null) => {
  const doc = new jsPDF();
  
  // Add header with gradient effect
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Registration Details", 105, 25, { align: "center" });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  let yPos = 55;
  
  // Organization Details Section
  doc.setFillColor(245, 245, 245);
  doc.rect(14, yPos - 8, 182, 10, 'F');
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text(" ORGANIZATION DETAILS", 20, yPos);
  yPos += 12;
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const orgDetails = [
    { label: "Organization Name:", value: org?.organizationName || "N/A" },
    { label: "Registration Number:", value: org?.registrationNumber || "N/A" },
    { label: "Email:", value: org?.orgEmail || "N/A" },
    { label: "Phone:", value: org?.orgPhone || "N/A" },
    { label: "Address:", value: org?.address || "N/A" },
    { label: "Location:", value: `${org?.district || "N/A"}, ${org?.state || "N/A"} (${org?.pincode || "N/A"})` },
    { label: "Registered On:", value: org?.createdAt ? new Date(org.createdAt).toLocaleString() : "N/A" },
    { label: "User ID:", value: String(org?.user?.id || org?.userId || "N/A") }
  ];
  
  orgDetails.forEach((detail) => {
    doc.setFont("helvetica", "bold");
    doc.text(detail.label, 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(String(detail.value), 75, yPos);
    yPos += 6;
  });
  
  yPos += 8;
  
  // Payment Status Section
  doc.setFillColor(245, 245, 245);
  doc.rect(14, yPos - 8, 182, 10, 'F');
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text(" PAYMENT STATUS", 20, yPos);
  yPos += 12;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Current Status:", 20, yPos);
  doc.setFont("helvetica", "normal");
  const paymentText = paymentStatus === 1 ? "PAID - Payment Completed" : paymentStatus === 0 ? "PENDING - Payment Not Completed" : "NOT INITIATED";
  const paymentColor = paymentStatus === 1 ? [16, 185, 129] : paymentStatus === 0 ? [239, 68, 68] : [245, 158, 11];
  doc.setTextColor(paymentColor[0], paymentColor[1], paymentColor[2]);
  doc.text(paymentText, 75, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 10;
  
  yPos += 5;
  
  // Registration Status Section
  doc.setFillColor(245, 245, 245);
  doc.rect(14, yPos - 8, 182, 10, 'F');
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text(" REGISTRATION STATUS", 20, yPos);
  yPos += 12;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Current Status:", 20, yPos);
  doc.setFont("helvetica", "normal");
  const statusText = org?.status === 2 ? "APPROVED" : org?.status === 3 ? "REJECTED" : "PENDING";
  const statusColor = org?.status === 2 ? [16, 185, 129] : org?.status === 3 ? [239, 68, 68] : [245, 158, 11];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(statusText, 75, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 10;
  
  // Team Members Section
  if (members && members.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFillColor(245, 245, 245);
    doc.rect(14, yPos - 8, 182, 10, 'F');
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129);
    doc.text(" TEAM MEMBERS", 20, yPos);
    yPos += 10;
    
    const formatRole = (role: string) => {
      const roleMap: { [key: string]: string } = {
        'lead': 'OT (Operation Theatre)',
        'member': 'ICCU (Intensive Care Unit)',
        'admin': 'CSSD (Central Sterile Supply Department)'
      };
      return roleMap[role.toLowerCase()] || role.charAt(0).toUpperCase() + role.slice(1);
    };
    
    const tableData = members.map((member, index) => [
      (index + 1).toString(),
      member.name || "N/A",
      member.email || "N/A",
      formatRole(member.role)
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [["#", "Full Name", "Email", "Department"]],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Documents Section
  if (documents) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFillColor(245, 245, 245);
    doc.rect(14, yPos - 8, 182, 10, 'F');
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129);
    doc.text(" UPLOADED DOCUMENTS", 20, yPos);
    yPos += 12;
    
    doc.setFontSize(9);
    const documentsList = [
      { label: "Registration Certificate:", uploaded: !!documents.registrationCertPath },
      { label: "Team Lead ID Proof:", uploaded: !!documents.teamLeadIdPath },
      { label: "Nursing Council Registration:", uploaded: !!documents.nursingCouncilRegPath }
    ];
    
    documentsList.forEach((docItem) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(docItem.label, 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(docItem.uploaded ? 16 : 239, docItem.uploaded ? 185 : 68, docItem.uploaded ? 129 : 68);
      doc.text(docItem.uploaded ? "✓ Uploaded" : "✗ Not uploaded", 100, yPos);
      yPos += 7;
    });
    doc.setTextColor(0, 0, 0);
    yPos += 10;
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated on ${new Date().toLocaleString()} | Admin Portal`,
      105,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }
  
  doc.save(`${org?.organizationName || "Registration"}_Details.pdf`);
};

// Registration Details Modal
const RegistrationDetailsModal = ({ org, isOpen, onClose, onApprove, onReject, onRefresh }: any) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [documents, setDocuments] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [teamFetchError, setTeamFetchError] = useState<string | null>(null);
  const [docsFetchError, setDocsFetchError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<number | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const getUserId = () => {
    if (org?.user?.id) return org.user.id;
    if (org?.userId) return org.userId;
    return null;
  };

  const fetchTeamMembers = async () => {
    const userId = getUserId();
    if (!userId) {
      setTeamFetchError("User ID not found");
      return [];
    }

    setLoadingTeam(true);
    setTeamFetchError(null);
    const token = localStorage.getItem("token");
    const cleanToken = token?.replace("Bearer ", "");

    try {
      const response = await fetch(`${BASE_URL}/api/register/get/team/${userId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${cleanToken}`, "Content-Type": "application/json" }
      });
      const data = await response.json();

      if (response.ok && data.success === true) {
        const teamData = Array.isArray(data.data) ? data.data : [];
        setMembers(teamData);
        return teamData;
      } else {
        setTeamFetchError(data.message || "No team members found");
        setMembers([]);
        return [];
      }
    } catch (err) {
      setTeamFetchError("Network error");
      setMembers([]);
      return [];
    } finally {
      setLoadingTeam(false);
    }
  };

  const fetchDocuments = async () => {
    const userId = getUserId();
    if (!userId) {
      setDocsFetchError("User ID not found");
      return null;
    }

    setLoadingDocs(true);
    setDocsFetchError(null);
    const token = localStorage.getItem("token");
    const cleanToken = token?.replace("Bearer ", "");

    try {
      const response = await fetch(`${BASE_URL}/api/register/get/documents/${userId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${cleanToken}`, "Content-Type": "application/json" }
      });
      const data = await response.json();

      if (response.ok && data.success === true) {
        setDocuments(data.data);
        return data.data;
      } else {
        setDocsFetchError(data.message || "No documents found");
        setDocuments(null);
        return null;
      }
    } catch (err) {
      setDocsFetchError("Network error");
      setDocuments(null);
      return null;
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchAllDetails = async () => {
    setLoading(true);
    await Promise.all([fetchTeamMembers(), fetchDocuments()]);
    setPaymentStatus(org?.user?.loginStatus ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && org) {
      fetchAllDetails();
    } else {
      setMembers([]);
      setDocuments(null);
      setRejectionReason("");
      setShowRejectDialog(false);
      setTeamFetchError(null);
      setDocsFetchError(null);
      setPaymentStatus(null);
    }
  }, [isOpen, org]);

  const handleApprove = async () => {
    if (paymentStatus !== 1) {
      alert("Cannot approve. Payment pending.");
      return;
    }
    setActionLoading(true);
    await onApprove(org);
    setActionLoading(false);
    onClose();
    if (onRefresh) onRefresh();
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a reason");
      return;
    }
    setActionLoading(true);
    await onReject(org, rejectionReason);
    setActionLoading(false);
    setShowRejectDialog(false);
    onClose();
    if (onRefresh) onRefresh();
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const [teamData, docsData] = await Promise.all([fetchTeamMembers(), fetchDocuments()]);
      downloadRegistrationPDF(org, teamData || members, docsData || documents, paymentStatus ?? 0);
    } catch (error) {
      alert("Failed to generate PDF");
    } finally {
      setDownloadingPDF(false);
    }
  };

  const getFileUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    if (path.startsWith("/uploads/")) return `${BASE_URL}${path}`;
    return `${BASE_URL}/uploads/${path}`;
  };

  const formatRole = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'lead': 'Operation Theatre (OT)',
      'member': 'Intensive Care Unit (ICCU)',
      'admin': 'Central Sterile Supply Dept (CSSD)'
    };
    return roleMap[role?.toLowerCase()] || role;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl">
          <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 rounded-t-2xl">
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xl flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                  Registration Details
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={downloadingPDF} className="gap-2">
                    {downloadingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    PDF
                  </Button>
                  <StatusBadge status={org?.status} />
                </div>
              </DialogTitle>
              <DialogDescription className="mt-1">
                Complete details of {org?.organizationName}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6">
            {loading ? (
              <div className="text-center py-12 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-gray-500">Loading registration details...</p>
              </div>
            ) : (
              <>
                {/* Organization Details Card */}
                <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl border p-5">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 rounded-lg">
                      <Building2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    Organization Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div><span className="text-gray-500">Name:</span> <span className="font-medium">{org?.organizationName || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Reg Number:</span> <span className="font-mono text-xs">{org?.registrationNumber || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Email:</span> {org?.orgEmail || 'N/A'}</div>
                    <div><span className="text-gray-500">Phone:</span> {org?.orgPhone || 'N/A'}</div>
                    <div><span className="text-gray-500">Address:</span> {org?.address || 'N/A'}</div>
                    <div><span className="text-gray-500">Location:</span> {org?.district || 'N/A'}, {org?.state || 'N/A'}</div>
                    <div><span className="text-gray-500">Pincode:</span> {org?.pincode || 'N/A'}</div>
                    <div><span className="text-gray-500">Registered:</span> {org?.createdAt ? new Date(org.createdAt).toLocaleDateString() : 'N/A'}</div>
                    <div><span className="text-gray-500">User ID:</span> <span className="font-mono text-xs">{getUserId() || 'N/A'}</span></div>
                  </div>
                </div>

                {/* Payment Status Card */}
                <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-xl border border-blue-100 p-5">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    Payment Status
                  </h3>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Current Status:</p>
                      <PaymentStatusBadge paymentStatus={paymentStatus ?? 0} />
                    </div>
                    {paymentStatus === 0 && (
                      <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                        <AlertCircle className="h-4 w-4" />
                        Payment pending. Cannot approve until payment is completed.
                      </div>
                    )}
                    {paymentStatus === 1 && (
                      <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                        <CheckCircle2 className="h-4 w-4" />
                        Payment confirmed. Ready for approval.
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Members Card */}
                <div className="rounded-xl border p-5">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 rounded-lg">
                      <Users className="h-4 w-4 text-emerald-600" />
                    </div>
                    Team Members
                    <Badge variant="secondary" className="ml-2">{members.length} members</Badge>
                  </h3>

                  {loadingTeam ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>
                  ) : teamFetchError ? (
                    <div className="text-center py-6"><p className="text-amber-600">{teamFetchError}</p><Button variant="ghost" size="sm" onClick={fetchTeamMembers} className="mt-2">Retry</Button></div>
                  ) : members.length === 0 ? (
                    <div className="text-center py-6"><p className="text-gray-500">No team members found</p></div>
                  ) : (
                    <div className="overflow-x-auto -mx-5 px-5">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="p-3 text-left font-semibold text-gray-600 rounded-l-lg">#</th>
                            <th className="p-3 text-left font-semibold text-gray-600">Full Name</th>
                            <th className="p-3 text-left font-semibold text-gray-600 hidden sm:table-cell">Email</th>
                            <th className="p-3 text-left font-semibold text-gray-600">Department</th>
                            <th className="p-3 text-left font-semibold text-gray-600 rounded-r-lg">Role</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((member, index) => (
                            <tr key={member.id || index} className="border-t hover:bg-gray-50 transition-colors">
                              <td className="p-3">{index + 1}</td>
                              <td className="p-3 font-medium">{member.name || 'N/A'}</td>
                              <td className="p-3 text-gray-500 hidden sm:table-cell">{member.email || 'N/A'}</td>
                              <td className="p-3">
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                  {formatRole(member.role)}
                                </Badge>
                              </td>
                              <td className="p-3 capitalize">{member.role || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Documents Card */}
                <div className="rounded-xl border p-5">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 rounded-lg">
                      <FileText className="h-4 w-4 text-emerald-600" />
                    </div>
                    Uploaded Documents
                  </h3>
                  
                  {loadingDocs ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>
                  ) : docsFetchError ? (
                    <div className="text-center py-6"><p className="text-amber-600">{docsFetchError}</p><Button variant="ghost" size="sm" onClick={fetchDocuments} className="mt-2">Retry</Button></div>
                  ) : !documents ? (
                    <div className="text-center py-6"><p className="text-gray-500">No documents found</p></div>
                  ) : (
                    <div className="grid gap-3">
                      {[
                        { label: "🏢 Registration Certificate", desc: "Organization registration proof", path: documents.registrationCertPath },
                        { label: "🆔 Team Lead ID Proof", desc: "Government issued ID", path: documents.teamLeadIdPath },
                        { label: "📋 Nursing Council Registration", desc: "Professional registration", path: documents.nursingCouncilRegPath }
                      ].map((doc, idx) => (
                        <div key={idx} className="flex flex-wrap items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                          <div>
                            <p className="font-medium text-gray-800">{doc.label}</p>
                            <p className="text-xs text-gray-500">{doc.desc}</p>
                          </div>
                          {doc.path ? (
                            <a href={getFileUrl(doc.path)} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border shadow-sm hover:shadow transition-all">
                              <Eye className="h-3.5 w-3.5" /> View
                            </a>
                          ) : (
                            <span className="text-red-500 text-sm flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> Not uploaded</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Info Card */}
                <div className="bg-gray-50/80 rounded-xl p-5">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <div className="p-1.5 bg-gray-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-gray-600" />
                    </div>
                    Registration Status
                  </h3>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Current Status:</p>
                      <StatusBadge status={org?.status} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Submitted On:</p>
                      <p className="text-sm font-medium">{org?.createdAt ? new Date(org.createdAt).toLocaleString() : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="sticky bottom-0 bg-white border-t p-4 rounded-b-2xl gap-2 flex-wrap">
            {org?.status === 1 && (
              <>
                <Button variant="outline" onClick={() => setShowRejectDialog(true)} className="border-red-300 text-red-600 hover:bg-red-50" disabled={actionLoading}>
                  <ThumbsDown className="h-4 w-4 mr-2" /> Reject
                </Button>
                <Button onClick={handleApprove} className={`${paymentStatus === 1 ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600' : 'bg-gray-400 cursor-not-allowed'} shadow-md`} disabled={actionLoading || paymentStatus !== 1}>
                  {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ThumbsUp className="h-4 w-4 mr-2" />}
                  Approve Registration
                </Button>
              </>
            )}
            {org?.status === 2 && (
              <div className="w-full text-center"><Badge className="bg-emerald-100 text-emerald-800 px-4 py-2"><CheckCircle2 className="h-4 w-4 mr-2" /> Already Approved</Badge></div>
            )}
            {org?.status === 3 && (
              <div className="w-full text-center"><Badge className="bg-red-100 text-red-800 px-4 py-2"><XCircle className="h-4 w-4 mr-2" /> Already Rejected</Badge></div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><Ban className="h-5 w-5" /> Reject Registration</DialogTitle>
            <DialogDescription>Please provide a reason for rejection</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Enter rejection reason..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={4} className="resize-none" />
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button onClick={handleReject} className="bg-red-600 hover:bg-red-700" disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Main AdminDashboard Component
const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useIdleLogout();
  const [activeTab, setActiveTab] = useState(() => getAdminTabFromSearch(location.search));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrg, setSelectedOrg] = useState<OrganizationData | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({ isOpen: false, title: "", message: "", type: "info" });
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentStatuses, setPaymentStatuses] = useState<{ [key: number]: number }>({});
  const [userData, setUserData] = useState<UserData>({
    fullName: "",
    email: "",
    contact: "",
    id: 0,
    roleId: 0,
    loginStatus: 0
  });
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Get user initials
  const getUserInitials = (fullName: string) => {
    if (!fullName) return "AD";
    const nameParts = fullName.split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  // Get first name for welcome message
  const getFirstName = (fullName: string) => {
    if (!fullName) return "Admin";
    return fullName.split(" ")[0];
  };

  // Handle logout
  const handleLogout = () => {
    clearAuthSession("manual");
    navigate("/login", { replace: true });
  };

  // Load user data from localStorage
  useEffect(() => {
    if (!hasAuthSession()) {
      navigate("/login", { replace: true });
      return;
    }

    const storedUserData = localStorage.getItem("userData");
    const storedAdminData = localStorage.getItem("adminData");
    
    if (storedUserData) {
      const parsedData = JSON.parse(storedUserData);
      setUserData({
        fullName: parsedData.fullName || "Admin User",
        email: parsedData.email || "",
        contact: parsedData.contact || "",
        id: parsedData.id || 0,
        roleId: parsedData.roleId || 0,
        loginStatus: parsedData.loginStatus || 0
      });
    } else if (storedAdminData) {
      const parsedData = JSON.parse(storedAdminData);
      setUserData({
        fullName: parsedData.fullName || "Admin User",
        email: parsedData.email || "",
        contact: parsedData.contact || "",
        id: parsedData.id || 0,
        roleId: parsedData.roleId || 0,
        loginStatus: parsedData.loginStatus || 0
      });
    } else {
      // If no user data found, redirect to login
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    setActiveTab(getAdminTabFromSearch(location.search));
  }, [location.search]);

  const handleAdminNavSelect = (tabId: string) => {
    setActiveTab(tabId);
    navigate(tabId === "overview" ? "/admin" : `/admin?tab=${tabId}`, { replace: true });
  };

  const showDialog = (title: string, message: string, type: "info" | "error" | "success" | "warning" = "info") => {
    setDialog({ isOpen: true, title, message, type });
  };

  const closeDialog = () => {
    setDialog({ isOpen: false, title: "", message: "", type: "info" });
  };

  const fetchRegistrations = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const cleanToken = token?.replace("Bearer ", "");

    try {
      const response = await fetch(`${BASE_URL}/api/register/get/all`, {
        headers: { Authorization: `Bearer ${cleanToken}`, "Content-Type": "application/json" }
      });
      const data = await response.json();

      if (response.ok && data.success === true) {
        const orgs = data.data || [];
        setOrganizations(orgs);
        const paymentStatusMap: { [key: number]: number } = {};
        orgs.forEach((org: any) => { paymentStatusMap[org.id] = org?.user?.loginStatus ?? 0; });
        setPaymentStatuses(paymentStatusMap);
      } else {
        showDialog("Error", data.message || "Failed to fetch registrations", "error");
      }
    } catch (err) {
      showDialog("Network Error", "Please check your connection", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (org: OrganizationData) => {
    const userId = org?.user?.id || org?.userId;
    if (!userId) { showDialog("Error", "User ID missing!", "error"); return false; }

    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const cleanToken = token?.replace("Bearer ", "");
      const response = await fetch(`${BASE_URL}/api/register/approve/${userId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${cleanToken}`, "Content-Type": "application/json" }
      });
      const data = await response.json();

      if (response.ok && data.success === true) {
        showDialog("Success", `${org.organizationName} has been approved!`, "success");
        await fetchRegistrations();
        return true;
      } else {
        showDialog("Error", data.message || "Failed to approve", "error");
        return false;
      }
    } catch (err) {
      showDialog("Error", "Network error occurred", "error");
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (org: OrganizationData, reason: string) => {
    const userId = org?.user?.id || org?.userId;
    if (!userId) { showDialog("Error", "User ID missing!", "error"); return false; }

    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const cleanToken = token?.replace("Bearer ", "");
      const response = await fetch(`${BASE_URL}/api/register/reject/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${cleanToken}` },
        body: JSON.stringify({ rejectionReason: reason })
      });
      const data = await response.json();

      if (response.ok && data.success === true) {
        showDialog("Success", `${org.organizationName} has been rejected!`, "success");
        await fetchRegistrations();
        return true;
      } else {
        showDialog("Error", data.message || "Failed to reject", "error");
        return false;
      }
    } catch (err) {
      showDialog("Error", "Something went wrong!", "error");
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => { fetchRegistrations(); }, []);

  const stats = {
    total: organizations.length,
    pending: organizations.filter(o => o.status === 1).length,
    approved: organizations.filter(o => o.status === 2).length,
    rejected: organizations.filter(o => o.status === 3).length,
    paymentPending: organizations.filter(o => paymentStatuses[o.id] === 0).length,
    paymentCompleted: organizations.filter(o => paymentStatuses[o.id] === 1).length
  };

  const getFilteredOrganizations = () => {
    let filtered = organizations;
    if (statusFilter !== "all") filtered = filtered.filter(o => o.status === parseInt(statusFilter));
    if (searchTerm) filtered = filtered.filter(o =>
      o.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orgEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered;
  };

  const adminNav = adminNavItems;

  const filteredOrgs = getFilteredOrganizations();

  return (
    <>
      <CustomDialog isOpen={dialog.isOpen} onClose={closeDialog} title={dialog.title} message={dialog.message} type={dialog.type} />
      <RegistrationDetailsModal
        org={selectedOrg}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        onApprove={handleApprove}
        onReject={handleReject}
        onRefresh={fetchRegistrations}
      />

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-red-600" />
              Confirm Logout
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to logout? You will need to login again to access the dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminSidebar
          activeId={activeTab}
          items={adminNav}
          sidebarOpen={sidebarOpen}
          mobileMenuOpen={mobileMenuOpen}
          onSelect={handleAdminNavSelect}
          onLogoutClick={() => setShowLogoutDialog(true)}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Main Content */}
        <div className={`${sidebarOpen ? "lg:ml-72" : "lg:ml-20"} flex min-w-0 flex-1 flex-col overflow-x-hidden transition-[margin] duration-300`}>
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 flex items-center justify-between px-4 sm:px-6 py-3 shadow-sm">
            <div className="flex min-w-0 items-center gap-3">
              <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMobileMenuOpen(true)}>
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
              <button className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <ChevronLeft className="h-5 w-5 text-gray-600" /> : <ChevronRight className="h-5 w-5 text-gray-600" />}
              </button>
              <h1 className="truncate font-heading text-lg font-bold text-gray-800 sm:text-xl">
                {adminNav.find(n => n.id === activeTab)?.label || "Dashboard"}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                  {getUserInitials(userData.fullName)}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-700">{getFirstName(userData.fullName)}</p>
                  <p className="text-xs text-gray-400">Administrator</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-6">
            <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
              {activeTab === "overview" && (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: "Total Registrations", value: stats.total, icon: Users, color: "blue", trend: "+12%", trendUp: true },
                      { label: "Pending Approvals", value: stats.pending, icon: Clock, color: "amber", trend: "+3", trendUp: true },
                      { label: "Approved", value: stats.approved, icon: CheckCircle2, color: "emerald", trend: "+8", trendUp: true },
                      { label: "Rejected", value: stats.rejected, icon: XCircle, color: "red", trend: "-2", trendUp: false },
                    ].map((stat, idx) => (
                      <AnimatedCard key={stat.label} delay={idx * 0.1}>
                        <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                          <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between mb-3">
                              <div className={`p-2 rounded-xl bg-${stat.color}-100`}>
                                <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
                              </div>
                              <div className={`flex items-center gap-1 text-xs ${stat.trendUp ? 'text-emerald-600' : 'text-red-600'} bg-${stat.trendUp ? 'emerald' : 'red'}-50 px-2 py-0.5 rounded-full`}>
                                {stat.trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {stat.trend}
                              </div>
                            </div>
                            <p className="text-2xl sm:text-3xl font-bold text-gray-800">{stat.value}</p>
                            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                          </CardContent>
                        </Card>
                      </AnimatedCard>
                    ))}
                  </div>

                  {/* Payment Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AnimatedCard delay={0.2}>
                      <Card className="border-0 bg-gradient-to-r from-red-50 to-red-100/50 shadow-lg rounded-2xl overflow-hidden">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-red-600 font-medium">Pending Payments</p>
                              <p className="text-3xl font-bold text-red-700 mt-1">{stats.paymentPending}</p>
                              <p className="text-xs text-red-500 mt-2">Awaiting payment confirmation</p>
                            </div>
                            <div className="p-3 bg-red-200/50 rounded-2xl">
                              <Wallet className="h-8 w-8 text-red-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </AnimatedCard>
                    <AnimatedCard delay={0.3}>
                      <Card className="border-0 bg-gradient-to-r from-emerald-50 to-emerald-100/50 shadow-lg rounded-2xl overflow-hidden">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-emerald-600 font-medium">Completed Payments</p>
                              <p className="text-3xl font-bold text-emerald-700 mt-1">{stats.paymentCompleted}</p>
                              <p className="text-xs text-emerald-500 mt-2">Total amount received</p>
                            </div>
                            <div className="p-3 bg-emerald-200/50 rounded-2xl">
                              <Receipt className="h-8 w-8 text-emerald-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </AnimatedCard>
                  </div>

                  {/* Recent Registrations */}
                  <AnimatedCard delay={0.4}>
                    <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
                      <CardHeader className="border-b border-gray-100 pb-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                              <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            Recent Registrations
                          </CardTitle>
                          <Button variant="ghost" size="sm" onClick={fetchRegistrations} className="text-gray-500">
                            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        {loading ? (
                          <div className="text-center py-12 flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                            <p className="text-gray-500">Loading registrations...</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50/50">
                                <tr className="border-b border-gray-100">
                                  <th className="text-left p-4 text-xs font-semibold text-gray-500">Organization</th>
                                  <th className="text-left p-4 text-xs font-semibold text-gray-500 hidden md:table-cell">Email</th>
                                  <th className="text-left p-4 text-xs font-semibold text-gray-500">Payment</th>
                                  <th className="text-left p-4 text-xs font-semibold text-gray-500">Status</th>
                                  <th className="text-right p-4 text-xs font-semibold text-gray-500">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {organizations.slice(0, 5).map((org, idx) => (
                                  <motion.tr key={org.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4">
                                      <div>
                                        <p className="text-sm font-medium text-gray-800">{org.organizationName}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{org.registrationNumber}</p>
                                      </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500 hidden md:table-cell">{org.orgEmail}</td>
                                    <td className="p-4"><PaymentStatusBadge paymentStatus={paymentStatuses[org.id] ?? 0} /></td>
                                    <td className="p-4"><StatusBadge status={org.status} /></td>
                                    <td className="p-4 text-right">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-gray-100" onClick={() => { setSelectedOrg(org); setShowDetailsModal(true); }}>
                                        <Eye className="h-4 w-4 text-gray-500" />
                                      </Button>
                                    </td>
                                  </motion.tr>
                                ))}
                                {organizations.length === 0 && (
                                  <tr><td colSpan={5} className="text-center p-12 text-gray-500">No registrations found</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </AnimatedCard>
                </>
              )}

              {/* Registrations & Approvals Tab */}
              {(activeTab === "registrations" || activeTab === "approvals") && (
                <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
                  <CardHeader className="border-b border-gray-100 pb-4">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${activeTab === "approvals" ? "bg-amber-100" : "bg-blue-100"}`}>
                          {activeTab === "approvals" ? <CheckCircle2 className="h-4 w-4 text-amber-600" /> : <Users className="h-4 w-4 text-blue-600" />}
                        </div>
                        {activeTab === "registrations" ? "All Registrations" : "Pending Approvals"}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input 
                            placeholder="Search..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="pl-9 w-48 h-9 rounded-xl border-gray-200 focus:border-emerald-300 focus:ring-emerald-200"
                          />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-32 h-9 rounded-xl border-gray-200">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="1">Pending</SelectItem>
                            <SelectItem value="2">Approved</SelectItem>
                            <SelectItem value="3">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={fetchRegistrations} className="h-9 rounded-xl">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="text-center py-12 flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                        <p className="text-gray-500">Loading...</p>
                      </div>
                    ) : filteredOrgs.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">No registrations found</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50/50">
                            <tr className="border-b border-gray-100">
                              <th className="text-left p-4 text-xs font-semibold text-gray-500">Reg ID</th>
                              <th className="text-left p-4 text-xs font-semibold text-gray-500">Organization</th>
                              <th className="text-left p-4 text-xs font-semibold text-gray-500 hidden lg:table-cell">Email</th>
                              <th className="text-left p-4 text-xs font-semibold text-gray-500 hidden xl:table-cell">Location</th>
                              <th className="text-left p-4 text-xs font-semibold text-gray-500">Payment</th>
                              <th className="text-left p-4 text-xs font-semibold text-gray-500">Status</th>
                              <th className="text-right p-4 text-xs font-semibold text-gray-500">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredOrgs.map((org, idx) => (
                              <motion.tr key={org.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                <td className="p-4">
                                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{org.registrationNumber}</span>
                                </td>
                                <td className="p-4">
                                  <p className="text-sm font-medium text-gray-800">{org.organizationName}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">{org.orgPhone}</p>
                                </td>
                                <td className="p-4 text-sm text-gray-500 hidden lg:table-cell">{org.orgEmail}</td>
                                <td className="p-4 text-sm text-gray-500 hidden xl:table-cell">{org.district}, {org.state}</td>
                                <td className="p-4"><PaymentStatusBadge paymentStatus={paymentStatuses[org.id] ?? 0} /></td>
                                <td className="p-4"><StatusBadge status={org.status} /></td>
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-gray-100" onClick={() => { setSelectedOrg(org); setShowDetailsModal(true); }} title="View Details">
                                      <Eye className="h-4 w-4 text-gray-500" />
                                    </Button>
                                    {org.status === 1 && (
                                      <>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className={`h-8 w-8 rounded-lg ${paymentStatuses[org.id] === 1 ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-300 cursor-not-allowed'}`} 
                                          onClick={() => paymentStatuses[org.id] === 1 && handleApprove(org)} 
                                          disabled={actionLoading || paymentStatuses[org.id] !== 1}
                                          title={paymentStatuses[org.id] !== 1 ? "Payment pending" : "Approve"}
                                        >
                                          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50" onClick={() => { setSelectedOrg(org); setShowDetailsModal(true); }} title="Reject">
                                          <ThumbsDown className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Other Tabs */}
              {activeTab === "payments" && <PaymentsTab />}
              {activeTab === "quiz" && <QuizManagementTab />}
              {activeTab === "manage-exam" && <EvidencePage />}

              {/* Communication Tab */}
              {activeTab === "communication" && (
                <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
                  <CardHeader className="border-b border-gray-100">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <div className="p-1.5 bg-cyan-100 rounded-lg">
                        <MessageSquare className="h-4 w-4 text-cyan-600" />
                      </div>
                      Send Communication
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <Tabs defaultValue="email" className="w-full">
                      <TabsList className="mb-6 grid w-full grid-cols-2 sm:max-w-xs">
                        <TabsTrigger value="email" className="gap-2"><Mail className="h-4 w-4" /> Email</TabsTrigger>
                        <TabsTrigger value="sms" className="gap-2"><Phone className="h-4 w-4" /> SMS</TabsTrigger>
                      </TabsList>
                      <TabsContent value="email" className="space-y-5">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Recipients</label>
                          <Select>
                            <SelectTrigger className="rounded-xl border-gray-200"><SelectValue placeholder="Select group" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Registered Teams</SelectItem>
                              <SelectItem value="approved">Approved Teams</SelectItem>
                              <SelectItem value="pending">Pending Teams</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Subject</label>
                          <Input placeholder="Enter email subject" className="rounded-xl border-gray-200" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Message</label>
                          <Textarea placeholder="Write your message..." rows={5} className="rounded-xl border-gray-200 resize-none" />
                        </div>
                        <Button className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 shadow-md hover:from-emerald-700 hover:to-emerald-600 sm:w-auto">
                          <Send className="h-4 w-4 mr-2" /> Send Email
                        </Button>
                      </TabsContent>
                      <TabsContent value="sms" className="space-y-5">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Recipients</label>
                          <Select>
                            <SelectTrigger className="rounded-xl border-gray-200"><SelectValue placeholder="Select group" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Teams</SelectItem>
                              <SelectItem value="approved">Approved Teams</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Message <span className="text-xs text-gray-400">(160 chars max)</span></label>
                          <Textarea maxLength={160} rows={3} placeholder="SMS message..." className="rounded-xl border-gray-200 resize-none" />
                        </div>
                        <Button className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 shadow-md hover:from-emerald-700 hover:to-emerald-600 sm:w-auto">
                          <Send className="h-4 w-4 mr-2" /> Send SMS
                        </Button>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              {/* Leaderboard Tab */}
              {activeTab === "leaderboard" && (
                <LiveLeaderboard />
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
