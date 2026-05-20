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
  ThumbsUp, ThumbsDown, Eye, BarChart3, Upload, Send, Menu,
  XCircle, Clock, AlertCircle, Building2, FileText, Download, Plus, Trash2, Edit, Loader2,
  ChevronLeft, ChevronRight, LogOut, Settings, HelpCircle, TrendingUp, TrendingDown,
  Wallet, Receipt, Award, MessageSquare, Phone, AtSign, Sparkles, Star, Briefcase,
  Shield, Check, Ban, RefreshCw, MoreHorizontal, FileCheck, FileX, UserCheck
} from "lucide-react";
import AccountMenu from "@/components/AccountMenu";
import AdminSidebar, {
  adminNavItems,
  getAdminNavItemsForRole,
  isAdminNavItemAllowedForRole,
} from "@/components/admin/AdminSidebar";
import LiveLeaderboard from "@/components/admin/LiveLeaderboard";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { clearAuthSession, hasAuthSession } from "@/lib/session";
import { buildBackendFilePreviewUrl } from "@/lib/evidenceMedia";
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
  [key: string]: any;
  id: number;
  userId: number;
  organizationName: string;
  registrationNumber?: string;
  hospitalRegisteredId?: string;
  spocName?: string;
  hospitalCategory?: string;
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
  [key: string]: any;
  id: number;
  name: string;
  email: string;
  hospitalEmployeeId?: string;
  employeeId?: string;
  role: string;
  evidenceFileName?: string;
  employeeDocumentPath?: string;
  hospitalEmployeeDocumentPath?: string;
  evidencePath?: string;
  organizationId: number;
  userId: number;
}

interface Document {
  [key: string]: any;
  id: number;
  registrationCertPath: string;
  hospitalRegistrationCertificatePath?: string;
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

const getHospitalRegisteredId = (org?: OrganizationData | null) =>
  org?.hospitalRegisteredId || org?.registrationNumber || "N/A";

const parseRegistrationDateTime = (value: unknown): number => {
  if (!value) return 0;

  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value.map(Number);
    const parsed = new Date(year, month - 1, day, hour, minute, second).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === "number") {
    const timestamp = value < 1_000_000_000_000 ? value * 1000 : value;
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  const raw = String(value).trim();
  if (!raw) return 0;

  const numericValue = Number(raw);
  if (Number.isFinite(numericValue) && raw.length >= 10) {
    return numericValue < 1_000_000_000_000 ? numericValue * 1000 : numericValue;
  }

  const dayFirstMatch = raw.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[ T,]+(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(AM|PM)?)?/i
  );

  if (dayFirstMatch) {
    const [, dayRaw, monthRaw, yearRaw, hourRaw = "0", minuteRaw = "0", secondRaw = "0", meridiemRaw] = dayFirstMatch;
    let hour = Number(hourRaw);
    const meridiem = meridiemRaw?.toUpperCase();

    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;

    const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
    const parsed = new Date(
      year,
      Number(monthRaw) - 1,
      Number(dayRaw),
      hour,
      Number(minuteRaw),
      Number(secondRaw)
    ).getTime();

    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const getRegistrationTimestamp = (org: OrganizationData) => {
  const record = org as Record<string, any>;
  const dateValues = [
    record.createdAt,
    record.created_at,
    record.registeredAt,
    record.registered_at,
    record.registrationDate,
    record.registration_date,
    record.registrationDateTime,
    record.registration_date_time,
    record.createdOn,
    record.created_on,
    record.submittedAt,
    record.submitted_at,
  ];

  for (const value of dateValues) {
    const timestamp = parseRegistrationDateTime(value);
    if (timestamp) return timestamp;
  }

  return parseRegistrationDateTime(record.updatedAt || record.updated_at);
};

const sortRegistrationsByRecent = (items: OrganizationData[]) =>
  [...items].sort((a, b) => {
    const timeDifference = getRegistrationTimestamp(b) - getRegistrationTimestamp(a);
    if (timeDifference !== 0) return timeDifference;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });

const getTeamMemberEmployeeId = (member: TeamMember) =>
  String(
    member.hospitalEmployeeId ||
    member.employeeId ||
    member.hospital_employee_id ||
    member.employee_id ||
    "N/A"
  );

const TEAM_MEMBER_DOCUMENT_PATH_KEYS = [
  "employeeDocumentPath",
  "hospitalEmployeeDocumentPath",
  "evidencePath",
  "documentPath",
  "documentUrl",
  "uploadDocumentPath",
  "memberDocumentPath",
  "hospitalEmployeeIdDocumentPath",
  "memberEvidencePath",
  "candidateEvidencePath",
  "candidateDocumentPath",
  "idProofPath",
  "filePath",
  "path",
  "employeeDocument1",
  "employeeDocument2",
  "employeeDocument3",
  "uploadDocument1",
  "uploadDocument2",
  "uploadDocument3",
  "evidence1",
  "evidence2",
  "evidence3",
  "employeeDocument",
  "hospitalEmployeeDocument",
  "evidence",
  "evidenceUrl",
  "document",
  "uploadDocument",
  "memberEvidence",
  "memberDocument",
  "hospitalEmployeeIdDocument",
  "candidateEvidence",
  "candidateDocument",
  "fileUrl",
  "url",
];

const TEAM_MEMBER_DOCUMENT_NAME_KEYS = [
  "evidenceFileName",
  "employeeDocumentName",
  "hospitalEmployeeDocumentName",
  "documentFileName",
  "uploadDocumentName",
  "memberDocumentName",
  "originalFileName",
  "originalName",
  "fileOriginalName",
  "documentName",
  "fileName",
];

const readTeamMemberString = (member: TeamMember, keys: string[]) => {
  for (const key of keys) {
    const value = member[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
};

const getPathFileName = (path = "") => path.split(/[\\/]/).filter(Boolean).pop() || "";

const isLikelyEvidenceFile = (value = "") => /\.(pdf|png|jpe?g|webp|gif)(?:[?#].*)?$/i.test(value.trim());
const isEvidencePlaceholderFile = (value = "") => /\.(txt|text)(?:[?#].*)?$/i.test(value.trim());

const getTeamMemberEvidenceFileName = (member: TeamMember) => {
  const pathName = getPathFileName(readTeamMemberString(member, TEAM_MEMBER_DOCUMENT_PATH_KEYS));
  if (isLikelyEvidenceFile(pathName)) return pathName;

  const preferredName = readTeamMemberString(member, TEAM_MEMBER_DOCUMENT_NAME_KEYS);
  if (isLikelyEvidenceFile(preferredName)) return preferredName;

  if (pathName && !isEvidencePlaceholderFile(pathName)) return pathName;

  return isEvidencePlaceholderFile(preferredName) ? "" : preferredName;
};

const getTeamMemberDocumentPath = (member: TeamMember) => {
  const path = readTeamMemberString(member, TEAM_MEMBER_DOCUMENT_PATH_KEYS);

  if (path && !isEvidencePlaceholderFile(getPathFileName(path))) return path;
  const fileName = getTeamMemberEvidenceFileName(member);
  if (fileName && isLikelyEvidenceFile(fileName)) return `uploads/team-documents/${fileName}`;

  return "";
};

const getTeamMemberDocumentStatus = (member: TeamMember) =>
  getTeamMemberDocumentPath(member) ? "Submitted" : "Pending";

const asRecord = (value: unknown): Record<string, any> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};

const getOrganizationUserEmail = (org?: OrganizationData | null) => {
  const record = asRecord(org);
  const userRecord = asRecord(record.user || record.authUser || record.organizationUser || record.registrationUser);
  const email = String(
    userRecord.email ||
    userRecord.userEmail ||
    record.userEmail ||
    record.user_email ||
    record.authUserEmail ||
    record.organizationUserEmail ||
    record.registrationUserEmail ||
    ""
  ).trim();

  return email || "N/A";
};

const getOrganizationEnrollmentNo = (org?: OrganizationData | null) => {
  const record = asRecord(org);
  const userRecord = asRecord(record.user || record.authUser || record.organizationUser || record.registrationUser);
  const enrollmentNo = String(
    record.enrollmentNumber ||
    record.enrollmentNo ||
    record.enrollment_no ||
    record.enrollment_number ||
    record.enrollmentId ||
    record.enrollment_id ||
    userRecord.enrollmentNumber ||
    userRecord.enrollmentNo ||
    userRecord.enrollment_no ||
    userRecord.enrollment_number ||
    ""
  ).trim();

  return enrollmentNo || "N/A";
};

const unwrapArray = (payload: unknown) => {
  if (Array.isArray(payload)) return payload;

  const record = asRecord(payload);
  const candidates = [
    record.data,
    record.result,
    record.items,
    record.members,
    record.team,
    record.teamMembers,
    record.rows,
    record.content,
  ];

  const match = candidates.find(Array.isArray);
  return Array.isArray(match) ? match : [];
};

const unwrapDocument = (payload: unknown): Document | null => {
  if (Array.isArray(payload)) {
    const firstDocument = payload.find((item) => Object.keys(asRecord(item)).length);
    return firstDocument ? asRecord(firstDocument) as Document : null;
  }

  const record = asRecord(payload);
  const source = asRecord(record.data || record.result || record.document || record.documents || payload);
  return Object.keys(source).length ? source as Document : null;
};

const readResponsePayload = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: text };
  }
};

const getCleanToken = () =>
  String(localStorage.getItem("token") || localStorage.getItem("authToken") || "").replace(/^Bearer\s+/i, "").trim();

const encodeFileUrl = (url: string) => {
  if (/^(blob:|data:)/i.test(url)) return url;

  try {
    const parsed = new URL(url, window.location.origin);
    parsed.pathname = parsed.pathname
      .split("/")
      .map((segment) => {
        try {
          return encodeURIComponent(decodeURIComponent(segment));
        } catch {
          return encodeURIComponent(segment);
        }
      })
      .join("/");
    return parsed.toString();
  } catch {
    return encodeURI(url).replace(/#/g, "%23");
  }
};

const getTeamMemberEvidencePreviewUrl = (member: TeamMember) => {
  const documentPath = getTeamMemberDocumentPath(member);
  if (!documentPath) return "";

  const previewUrl = buildBackendFilePreviewUrl(documentPath, "team-documents");
  if (previewUrl && !/^(blob:|data:)/i.test(previewUrl)) return encodeFileUrl(previewUrl);

  if (/^https?:/i.test(documentPath)) return encodeFileUrl(documentPath);

  return "";
};

const inferEvidenceMimeType = (fileName = "", url = "") => {
  const value = `${fileName} ${url}`.split(/[?#]/)[0].toLowerCase();

  if (value.endsWith(".pdf")) return "application/pdf";
  if (/\.(png)$/.test(value)) return "image/png";
  if (/\.(jpe?g)$/.test(value)) return "image/jpeg";
  if (/\.(webp)$/.test(value)) return "image/webp";
  if (/\.(gif)$/.test(value)) return "image/gif";

  return "application/pdf";
};

const isEvidenceImage = (mimeType = "", fileName = "", url = "") => {
  const value = `${fileName} ${url}`.toLowerCase();
  return /^image\//i.test(mimeType) || /\.(png|jpe?g|webp|gif)(?:[?#]|\s|$)/i.test(value);
};

const triggerBlobDownload = (blob: Blob, fileName: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName || "evidence";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

const downloadEvidenceFile = async (urls: string[], fileName: string) => {
  const cleanUrls = urls.filter(Boolean);
  const cleanToken = getCleanToken();
  let lastError: Error | null = null;

  for (const url of cleanUrls) {
    const fetchAttempts: HeadersInit[] = [
      {
        Accept: "application/pdf,image/*,*/*",
        ...(url.includes("ngrok") ? { "ngrok-skip-browser-warning": "true" } : {}),
      },
    ];

    if (cleanToken) {
      fetchAttempts.push({
        Accept: "application/pdf,image/*,*/*",
        Authorization: `Bearer ${cleanToken}`,
        ...(url.includes("ngrok") ? { "ngrok-skip-browser-warning": "true" } : {}),
      });
    }

    for (const headers of fetchAttempts) {
      try {
        const response = await fetch(url, { method: "GET", headers });

        if (!response.ok) {
          lastError = new Error(`Unable to download evidence (${response.status})`);
          continue;
        }

        const responseMimeType = response.headers.get("content-type")?.split(";")[0]?.trim() || "";
        const fallbackMimeType = inferEvidenceMimeType(fileName, url);
        const blob = await response.blob();

        if (!blob.size) {
          lastError = new Error("Evidence file is empty");
          continue;
        }

        if (/text\/html/i.test(responseMimeType) && /\.pdf(?:[?#]|$)/i.test(fileName || url)) {
          lastError = new Error("Evidence URL returned HTML instead of PDF");
          continue;
        }

        const downloadMimeType = responseMimeType && !/octet-stream/i.test(responseMimeType)
          ? responseMimeType
          : fallbackMimeType;
        const downloadBlob = blob.type === downloadMimeType
          ? blob
          : new Blob([blob], { type: downloadMimeType });

        triggerBlobDownload(downloadBlob, fileName || getPathFileName(url) || "evidence");
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unable to download evidence");
      }
    }
  }

  throw lastError || new Error("Evidence download failed");
};

const decodeJwtUserId = (token: string) => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return "";

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=");
    const decodedPayload = JSON.parse(atob(paddedPayload));
    return String(decodedPayload.userId || decodedPayload.id || "").trim();
  } catch {
    return "";
  }
};

const getLocalUserId = (token = "") => {
  const storedUser = localStorage.getItem("userData") || localStorage.getItem("adminData");
  try {
    const parsed = storedUser ? JSON.parse(storedUser) : null;
    return String(parsed?.id || localStorage.getItem("userId") || decodeJwtUserId(token) || "").trim();
  } catch {
    return String(localStorage.getItem("userId") || decodeJwtUserId(token) || "").trim();
  }
};

const readUserId = (value: unknown) => {
  const record = asRecord(value);
  const user = asRecord(record.user);
  const parsed = Number(record.userId || record.user_id || record.userID || user.id || user.userId || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readOrganizationId = (value: unknown) => {
  const record = asRecord(value);
  const parsed = Number(record.organizationId || record.organization_id || record.registrationId || record.registration_id || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeTeamMember = (value: unknown): TeamMember => {
  const record = asRecord(value);
  return {
    ...record,
    id: Number(record.id || 0),
    name: String(record.name || record.fullName || record.memberName || ""),
    email: String(record.email || record.memberEmail || record.userEmail || ""),
    hospitalEmployeeId: String(record.hospitalEmployeeId || record.hospital_employee_id || record.employeeId || record.employee_id || ""),
    role: String(record.role || record.department || record.departmentName || ""),
    organizationId: readOrganizationId(record),
    userId: readUserId(record),
  };
};

const uniqueTeamMembers = (teamData: TeamMember[]) => {
  const seen = new Set<string>();

  return teamData.filter((member) => {
    const key = String(
      member.id ||
      `${member.email}-${member.role}-${getTeamMemberEmployeeId(member)}-${getTeamMemberDocumentPath(member)}`
    ).trim().toLowerCase();

    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getTeamMemberId = (member: TeamMember) => Number(member.id || 0);

const getTeamMemberSlotKey = (member: TeamMember) => {
  const evidenceField = String(member.evidenceField || member.documentField || "").trim().toLowerCase();
  const evidenceMatch = evidenceField.match(/employeeDocument(\d+)/i);
  if (evidenceMatch) return `document-${evidenceMatch[1]}`;
  if (evidenceField) return evidenceField;

  const roleKey = String(member.roleType || member.role || "").trim().toUpperCase();
  if (roleKey === "ICCU") return "role-ICU";
  if (["OT", "ICU", "CSSD"].includes(roleKey)) return `role-${roleKey}`;

  return "";
};

const getTeamMemberSortOrder = (member: TeamMember) => {
  const slotKey = getTeamMemberSlotKey(member);
  const documentMatch = slotKey.match(/^document-(\d+)$/);
  if (documentMatch) return Number(documentMatch[1]);

  const roleOrder: Record<string, number> = {
    "role-OT": 1,
    "role-ICU": 2,
    "role-ICCU": 2,
    "role-CSSD": 3,
  };
  return roleOrder[slotKey] || 99;
};

const sortTeamMembersForDisplay = (teamData: TeamMember[]) =>
  [...teamData].sort((a, b) => {
    const orderDiff = getTeamMemberSortOrder(a) - getTeamMemberSortOrder(b);
    if (orderDiff !== 0) return orderDiff;
    return getTeamMemberId(a) - getTeamMemberId(b);
  });

const selectCurrentTeamMembers = (teamData: TeamMember[]) => {
  const uniqueMembers = uniqueTeamMembers(teamData);
  if (uniqueMembers.length <= 3) return sortTeamMembersForDisplay(uniqueMembers);

  const latestBySlot = new Map<string, TeamMember>();
  uniqueMembers.forEach((member) => {
    const slotKey = getTeamMemberSlotKey(member);
    if (!slotKey) return;

    const existing = latestBySlot.get(slotKey);
    if (!existing || getTeamMemberId(member) > getTeamMemberId(existing)) {
      latestBySlot.set(slotKey, member);
    }
  });

  const slotMembers = sortTeamMembersForDisplay(Array.from(latestBySlot.values()));
  if (slotMembers.length >= 3) return slotMembers.slice(0, 3);

  return uniqueMembers
    .sort((a, b) => getTeamMemberId(b) - getTeamMemberId(a))
    .slice(0, 3)
    .sort((a, b) => getTeamMemberId(a) - getTeamMemberId(b));
};

const getEmbeddedTeamMembers = (org: OrganizationData | null) => {
  const record = asRecord(org);
  return unwrapArray(record.teamMembers || record.members || record.team || record.teamMemberList).map(normalizeTeamMember);
};

const getEmbeddedDocuments = (org: OrganizationData | null) => {
  const record = asRecord(org);
  return unwrapDocument(record.documents || record.document || record.uploadedDocuments || record.registrationDocument);
};

const isMatchingTeamMember = (member: TeamMember, userId: number | string | null, organizationId?: number) => {
  const memberUserId = readUserId(member);
  const memberOrgId = readOrganizationId(member);
  const selectedUserId = Number(userId || 0);

  if (selectedUserId > 0) return memberUserId === selectedUserId;
  return Number(organizationId || 0) > 0 && memberOrgId === Number(organizationId);
};

const isMatchingDocument = (document: Document, userId: number | string | null, organizationId?: number) => {
  const documentUserId = readUserId(document);
  const documentOrgId = readOrganizationId(document);
  const selectedUserId = Number(userId || 0);

  if (selectedUserId > 0) return documentUserId === selectedUserId;
  return Number(organizationId || 0) > 0 && documentOrgId === Number(organizationId);
};

const getResourceErrorMessage = (payload: unknown, fallback: string) => {
  const record = asRecord(payload);
  const message = String(record.message || record.error || fallback).trim();
  if (message.toLowerCase().includes("no static resource")) return fallback;
  return message || fallback;
};

const getRegistrationDocumentPath = (documents: Document | null, aliases: string[]) => {
  if (!documents) return "";
  const normalizedAliases = aliases.map((alias) => alias.replace(/[_\-\s]/g, "").toLowerCase());

  return String(
    Object.entries(documents).find(([key, value]) =>
      typeof value === "string" &&
      value.trim() &&
      normalizedAliases.includes(key.replace(/[_\-\s]/g, "").toLowerCase())
    )?.[1] || ""
  );
};

const buildUploadedDocumentItems = (documents: Document | null, members: TeamMember[]) => {
  const baseDocumentItems = documents
    ? [
        {
          label: "Hospital / Organization ID",
          desc: "Registration certificate, ID, or authorization document",
          path: getRegistrationDocumentPath(documents, [
            "hospitalOrganizationIdPath",
            "hospitalOrganizationIDPath",
            "hospitalOrganizationDocumentPath",
            "organizationIdDocumentPath",
            "organizationIDDocumentPath",
            "organizationDocumentPath",
            "hospitalIdDocumentPath",
            "hospitalIDDocumentPath",
            "hospitalRegistrationCertificatePath",
            "registrationCertPath",
            "hospitalRegistrationCertificate",
            "registrationCertificatePath",
          ]),
        },
        {
          label: "Team Lead ID Proof",
          desc: "Government issued ID",
          path: getRegistrationDocumentPath(documents, ["teamLeadIdPath", "teamLeadIdProofPath", "teamLeadDocumentPath"]),
        },
        {
          label: "Nursing Council Registration",
          desc: "Professional registration",
          path: getRegistrationDocumentPath(documents, ["nursingCouncilRegPath", "nursingCouncilRegistrationPath"]),
        },
      ]
    : [];

  const teamDocumentItems = members
    .map((member, index) => ({
      label: `${member.name || `Member ${index + 1}`} Document`,
      desc: `${formatTeamRoleForDocument(member.role)} team member document`,
      path: getTeamMemberDocumentPath(member),
    }))
    .filter((item) => item.path);

  const seenPaths = new Set<string>();
  return [...baseDocumentItems, ...teamDocumentItems].filter((item) => {
    if (!item.path) return true;
    const key = item.path.trim().toLowerCase();
    if (seenPaths.has(key)) return false;
    seenPaths.add(key);
    return true;
  });
};

const formatTeamRoleForDocument = (role?: string) => {
  const text = String(role || "").trim();
  return text || "Team";
};

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

const getAdminTabPath = (tabId: string) => tabId === "overview" ? "/admin" : `/admin?tab=${tabId}`;

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
const getRegistrationStatus = (status?: number | null) => (status === 1 || status === 3 ? status : 2);

const getOrganizationRegistrationStatus = (org?: OrganizationData | null) => {
  const loginStatus = Number(org?.user?.loginStatus ?? (org as Record<string, any> | null | undefined)?.loginStatus);
  if (loginStatus === 1) return 2;
  return getRegistrationStatus(org?.status);
};

const StatusBadge = ({ status }: { status: number }) => {
  const getStatusConfig = () => {
    switch (getRegistrationStatus(status)) {
      case 2:
        return { color: "bg-gradient-to-r from-emerald-500 to-emerald-600", icon: CheckCircle2, label: "APPROVED", textColor: "text-white" };
      case 3:
        return { color: "bg-gradient-to-r from-red-500 to-red-600", icon: XCircle, label: "REJECTED", textColor: "text-white" };
      case 1:
        return { color: "bg-gradient-to-r from-amber-500 to-amber-600", icon: Clock, label: "PENDING", textColor: "text-white" };
      default:
        return { color: "bg-gradient-to-r from-emerald-500 to-emerald-600", icon: CheckCircle2, label: "APPROVED", textColor: "text-white" };
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
    { label: "Hospital Registered ID:", value: getHospitalRegisteredId(org) },
    { label: "SPOC Name:", value: org?.spocName || "N/A" },
    { label: "Hospital Category:", value: org?.hospitalCategory || "N/A" },
    { label: "Email:", value: getOrganizationUserEmail(org) },
    { label: "Phone:", value: org?.orgPhone || "N/A" },
    { label: "Address:", value: org?.address || "N/A" },
    { label: "Location:", value: `${org?.district || "N/A"}, ${org?.state || "N/A"} (${org?.pincode || "N/A"})` },
    { label: "Registered On:", value: org?.createdAt ? new Date(org.createdAt).toLocaleString() : "N/A" },
    { label: "Enrollment No:", value: getOrganizationEnrollmentNo(org) }
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
  const normalizedStatus = getOrganizationRegistrationStatus(org);
  const statusText = normalizedStatus === 2 ? "APPROVED" : normalizedStatus === 3 ? "REJECTED" : "PENDING";
  const statusColor = normalizedStatus === 2 ? [16, 185, 129] : normalizedStatus === 3 ? [239, 68, 68] : [245, 158, 11];
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
        'member': 'ICU (Intensive Care Unit)',
        'admin': 'CSSD (Central Sterile Supply Department)'
      };
      return roleMap[role.toLowerCase()] || role.charAt(0).toUpperCase() + role.slice(1);
    };
    
    const tableData = members.map((member, index) => [
      (index + 1).toString(),
      member.name || "N/A",
      member.email || "N/A",
      getTeamMemberEmployeeId(member),
      formatRole(member.role)
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [["#", "Full Name", "Email", "Employee ID", "Department"]],
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
      { label: "Hospital Registration Certificate:", uploaded: !!(documents.hospitalRegistrationCertificatePath || documents.registrationCertPath) },
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

const downloadRegistrationPDFDesigned = (org: OrganizationData, members: TeamMember[], documents: Document | null, paymentStatus: number | null) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const generatedOn = new Date().toLocaleString();
  const paymentText = paymentStatus === 1 ? "PAID" : paymentStatus === 0 ? "PENDING" : "NOT INITIATED";
  const normalizedRegistrationStatus = getOrganizationRegistrationStatus(org);
  const registrationText = normalizedRegistrationStatus === 2 ? "APPROVED" : normalizedRegistrationStatus === 3 ? "REJECTED" : "PENDING";

  const sectionTitle = (title: string, y: number) => {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, "FD");
    doc.setFillColor(5, 150, 105);
    doc.roundedRect(margin, y, 2.5, 10, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(6, 95, 70);
    doc.text(title, margin + 6, y + 6.7);
  };

  const statusCard = (x: number, y: number, label: string, value: string, tone: "green" | "amber" | "red" | "slate") => {
    const colors = {
      green: { bg: [236, 253, 245], fg: [5, 150, 105] },
      amber: { bg: [255, 251, 235], fg: [217, 119, 6] },
      red: { bg: [254, 242, 242], fg: [220, 38, 38] },
      slate: { bg: [248, 250, 252], fg: [71, 85, 105] },
    }[tone];

    doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, 56, 21, 3, 3, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x + 4, y + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(colors.fg[0], colors.fg[1], colors.fg[2]);
    doc.text(value, x + 4, y + 15);
  };

  doc.setFillColor(6, 78, 59);
  doc.rect(0, 0, pageWidth, 48, "F");
  doc.setFillColor(5, 150, 105);
  doc.rect(0, 42, pageWidth, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text("Registration Details", margin, 19);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(org?.organizationName || "Organization", margin, 29);
  doc.setFontSize(8);
  doc.setTextColor(220, 252, 231);
  doc.text(`Hospital ID: ${getHospitalRegisteredId(org)} | Enrollment No: ${getOrganizationEnrollmentNo(org)}`, margin, 37);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(pageWidth - margin - 54, 12, 54, 12, 2, 2, "S");
  doc.text(`Generated ${generatedOn}`, pageWidth - margin - 2, 20, { align: "right" });

  let yPos = 58;
  statusCard(margin, yPos, "Payment", paymentText, paymentStatus === 1 ? "green" : paymentStatus === 0 ? "red" : "amber");
  statusCard(margin + 63, yPos, "Registration", registrationText, normalizedRegistrationStatus === 2 ? "green" : normalizedRegistrationStatus === 3 ? "red" : "amber");
  statusCard(margin + 126, yPos, "Team Size", `${members?.length || 0} members`, "slate");
  yPos += 32;

  sectionTitle("Organization Details", yPos);
  yPos += 13;

  autoTable(doc, {
    startY: yPos,
    body: [
      ["Organization", org?.organizationName || "N/A", "SPOC", org?.spocName || "N/A"],
      ["Category", org?.hospitalCategory || "N/A", "Phone", org?.orgPhone || "N/A"],
      ["Email", getOrganizationUserEmail(org), "Registered", org?.createdAt ? new Date(org.createdAt).toLocaleString() : "N/A"],
      ["Location", `${org?.district || "N/A"}, ${org?.state || "N/A"} (${org?.pincode || "N/A"})`, "User", `${org?.user?.fullName || "N/A"} (${org?.user?.email || "N/A"})`],
      ["Address", org?.address || "N/A", "", ""],
    ],
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 2.4, lineColor: [226, 232, 240], lineWidth: 0.1 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [71, 85, 105], cellWidth: 28 },
      1: { textColor: [15, 23, 42], cellWidth: 58 },
      2: { fontStyle: "bold", textColor: [71, 85, 105], cellWidth: 24 },
      3: { textColor: [15, 23, 42], cellWidth: 62 },
    },
    margin: { left: margin, right: margin },
  });
  yPos = (doc as any).lastAutoTable.finalY + 11;

  sectionTitle("Team Member Verification", yPos);
  yPos += 13;

  const teamEvidenceLinks = (members || []).map((member) => getTeamMemberEvidencePreviewUrl(member));
  const teamRows = (members || []).map((member, index) => [
    String(index + 1),
    member.name || "N/A",
    member.email || "N/A",
    getTeamMemberEmployeeId(member),
    member.role || "N/A",
    getTeamMemberDocumentStatus(member),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["#", "Full Name", "Email", "Employee ID", "Dept.", "Document Status"]],
    body: teamRows.length ? teamRows : [["-", "No team members found", "-", "-", "-", "-"]],
    theme: "grid",
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: "bold", halign: "left" },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2.7 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { lineColor: [226, 232, 240], lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: 9, halign: "center" },
      1: { cellWidth: 28, fontStyle: "bold" },
      2: { cellWidth: 43 },
      3: { cellWidth: 23 },
      4: { cellWidth: 18 },
      5: { cellWidth: 57, fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section !== "body" || data.column.index !== 5) return;

      const status = String(data.cell.raw || "");
      if (status === "Submitted") {
        data.cell.styles.textColor = [5, 150, 105];
        data.cell.styles.fillColor = [236, 253, 245];
      } else {
        data.cell.styles.textColor = [217, 119, 6];
        data.cell.styles.fillColor = [255, 251, 235];
      }
    },
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index !== 5) return;

      const evidenceUrl = teamEvidenceLinks[data.row.index];
      if (!evidenceUrl) return;

      const linkX = data.cell.x + data.cell.width - 14;
      const linkY = data.cell.y + data.cell.height / 2 + 1.2;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(5, 150, 105);
      (doc as any).textWithLink("View", linkX, linkY, { url: evidenceUrl });
    },
    margin: { left: margin, right: margin },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Nurse Quiz Admin Portal", margin, pageHeight - 10);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  }

  doc.save(`${org?.organizationName || "Registration"}_Details.pdf`);
};

// Registration Details Modal
const RegistrationDetailsModal = ({ org, isOpen, onClose, onApprove, onReject, onRefresh }: any) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [documents, setDocuments] = useState<Document | null>(null);
  const [previewEvidence, setPreviewEvidence] = useState<{ url: string; urls: string[]; memberName: string; fileName: string } | null>(null);
  const [previewSourceUrl, setPreviewSourceUrl] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
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
    const normalizedUserId = readUserId(org);
    if (normalizedUserId) return normalizedUserId;
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
    const cleanToken = getCleanToken();
    const localUserId = getLocalUserId(cleanToken);
    const endpoints = [
      { url: `${BASE_URL}/api/register/get/team/public/${userId}`, auth: false, scoped: true },
      { url: `${BASE_URL}/api/register/get/team`, auth: true, scoped: false },
      { url: `${BASE_URL}/api/register/get/team/${userId}`, auth: true, scoped: true },
      { url: `${BASE_URL}/api/register/get/team?userId=${encodeURIComponent(String(userId))}`, auth: true, scoped: true },
    ];

    try {
      for (const endpoint of endpoints) {
        const response = await fetch(endpoint.url, {
          method: "GET",
          headers: endpoint.auth
            ? { "Authorization": `Bearer ${cleanToken}`, "Content-Type": "application/json" }
            : { "Content-Type": "application/json" }
        });
        const data = await readResponsePayload(response);

        if (!response.ok) continue;

        const teamData = uniqueTeamMembers(unwrapArray(data).map(normalizeTeamMember));
        const scopedTeamData = teamData.filter((member) => isMatchingTeamMember(member, userId, org?.id));
        const isTokenEndpoint = endpoint.url.endsWith("/api/register/get/team");
        const hasScopeFields = teamData.some((member) => readUserId(member) > 0 || readOrganizationId(member) > 0);
        const canUseTokenResponse = isTokenEndpoint && String(userId) === localUserId;
        const finalTeamData = scopedTeamData.length
          ? scopedTeamData
          : (!hasScopeFields && (endpoint.scoped || (canUseTokenResponse && teamData.length <= 3)) ? teamData : []);

        if (finalTeamData.length) {
          const currentTeamData = selectCurrentTeamMembers(finalTeamData);
          setMembers(currentTeamData);
          return currentTeamData;
        }
      }

      const embeddedMembers = selectCurrentTeamMembers(getEmbeddedTeamMembers(org).filter((member) => isMatchingTeamMember(member, userId, org?.id)));
      setMembers(embeddedMembers);

      if (!embeddedMembers.length) {
        setTeamFetchError("Team data not found for this user.");
      }

      return embeddedMembers;
    } catch (err) {
      setTeamFetchError("Network error while loading team members");
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
    const cleanToken = getCleanToken();
    const localUserId = getLocalUserId(cleanToken);
    const scopedDocumentEndpoints = [
      `${BASE_URL}/api/register/get/documents/${userId}`,
      `${BASE_URL}/api/register/get/documents?userId=${encodeURIComponent(String(userId))}`,
    ];
    const tokenDocumentEndpoint = `${BASE_URL}/api/register/get/documents`;
    const endpoints = String(userId) === localUserId
      ? [tokenDocumentEndpoint, ...scopedDocumentEndpoints]
      : scopedDocumentEndpoints;

    try {
      for (const endpoint of endpoints) {
        const response = await fetch(endpoint, {
          method: "GET",
          headers: { "Authorization": `Bearer ${cleanToken}`, "Content-Type": "application/json" }
        });
        const data = await readResponsePayload(response);

        if (!response.ok) continue;

        const docsList = unwrapArray(data)
          .map((item) => asRecord(item) as Document)
          .filter((item) => Object.keys(item).length);
        const docsData = (
          docsList.find((item) => isMatchingDocument(item, userId, org?.id)) ||
          (docsList.length ? null : unwrapDocument(data))
        );
        const isTokenEndpoint = endpoint.endsWith("/api/register/get/documents");
        const isScopedEndpoint = endpoint.includes(`/${userId}`) || endpoint.includes(`userId=${encodeURIComponent(String(userId))}`);
        const hasScopeFields = Boolean(docsData && (readUserId(docsData) > 0 || readOrganizationId(docsData) > 0));
        const canUseTokenResponse = isTokenEndpoint && String(userId) === localUserId;
        const canUseDocument = Boolean(docsData && (isMatchingDocument(docsData, userId, org?.id) || (!hasScopeFields && (isScopedEndpoint || canUseTokenResponse))));

        if (docsData && canUseDocument) {
          setDocuments(docsData);
          return docsData;
        }
      }

      const embeddedDocuments = getEmbeddedDocuments(org);
      const scopedEmbeddedDocuments = embeddedDocuments && (
        isMatchingDocument(embeddedDocuments, userId, org?.id) ||
        (readUserId(embeddedDocuments) === 0 && readOrganizationId(embeddedDocuments) === 0)
      )
        ? embeddedDocuments
        : null;
      setDocuments(scopedEmbeddedDocuments);

      if (!scopedEmbeddedDocuments) {
        setDocsFetchError("Uploaded documents not found. Please login with the selected hospital token or provide an admin endpoint for user-wise documents.");
      }

      return scopedEmbeddedDocuments;
    } catch (err) {
      setDocsFetchError("Network error while loading documents");
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
      setPreviewEvidence(null);
      setPreviewSourceUrl(null);
      setPreviewMimeType("");
      setPreviewError("");
      setPreviewLoading(false);
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
      downloadRegistrationPDFDesigned(org, teamData || members, docsData || documents, paymentStatus ?? 0);
    } catch (error) {
      alert("Failed to generate PDF");
    } finally {
      setDownloadingPDF(false);
    }
  };

  const getFileUrl = (path: string) => {
    return getFileUrlCandidates(path)[0] || null;
  };

  const getFileUrlCandidates = (path: string) => {
    const rawPath = String(path || "").trim();
    if (!rawPath) return [];

    const urls: string[] = [];
    const addUrl = (url: string) => {
      const encodedUrl = encodeFileUrl(url);
      if (!urls.includes(encodedUrl)) urls.push(encodedUrl);
    };

    if (/^(blob:|data:)/i.test(rawPath)) {
      addUrl(rawPath);
      return urls;
    }

    const previewUrl = buildBackendFilePreviewUrl(rawPath, "team-documents");
    if (previewUrl) addUrl(previewUrl);

    const normalizedPath = rawPath.replace(/\\/g, "/");
    const addPreviewEndpointUrl = (path: string) => {
      addUrl(`${BASE_URL}/api/register/preview-file?path=${encodeURIComponent(path)}`);
    };
    const getUploadPathFromUrl = (url: string) => {
      try {
        const parsed = new URL(url, window.location.origin);
        const uploadsIndex = parsed.pathname.indexOf("/uploads/");
        if (uploadsIndex >= 0) {
          return `uploads/${decodeURIComponent(parsed.pathname.slice(uploadsIndex + "/uploads/".length))}`;
        }
      } catch {
        return "";
      }

      return "";
    };
    const addUploadProxyUrl = (uploadPath: string) => {
      const normalizedUploadPath = uploadPath.startsWith("/") ? uploadPath : `/${uploadPath}`;
      if (normalizedUploadPath.startsWith("/uploads/")) {
        addUrl(normalizedUploadPath);
      }
    };

    if (/^https?:/i.test(normalizedPath)) {
      const uploadPath = getUploadPathFromUrl(normalizedPath);
      addPreviewEndpointUrl(uploadPath || normalizedPath);
      if (uploadPath) addUrl(`${BASE_URL}/${uploadPath}`);
      addUrl(normalizedPath);
      return urls;
    }

    const uploadsIndex = normalizedPath.indexOf("uploads/");
    const uploadPath = uploadsIndex >= 0 ? normalizedPath.slice(uploadsIndex) : "";
    const previewPath = uploadPath || normalizedPath;
    addPreviewEndpointUrl(previewPath);

    if (uploadsIndex >= 0) {
      addUploadProxyUrl(uploadPath);
      addUrl(`${BASE_URL}/${uploadPath}`);
      return urls;
    }

    if (normalizedPath.startsWith("/")) addUrl(`${BASE_URL}${normalizedPath}`);
    if (normalizedPath.startsWith("uploads/")) addUrl(`${BASE_URL}/${normalizedPath}`);

    return urls;
  };

  useEffect(() => {
    if (!previewEvidence) {
      setPreviewSourceUrl(null);
      setPreviewMimeType("");
      setPreviewError("");
      setPreviewLoading(false);
      return;
    }

    let objectUrl: string | null = null;
    const controller = new AbortController();

    const loadPreview = async () => {
      setPreviewLoading(true);
      setPreviewError("");
      setPreviewSourceUrl(null);
      setPreviewMimeType("");

      const fetchUrls = previewEvidence.urls.length ? previewEvidence.urls : [previewEvidence.url];
      const directPreviewUrl = fetchUrls.find((url) => /^(https?:|\/|blob:|data:)/i.test(url)) || previewEvidence.url;

      try {
        const cleanToken = getCleanToken();
        let lastError: Error | null = null;

        for (const url of fetchUrls) {
          const fetchAttempts: HeadersInit[] = [
            {
              Accept: "application/pdf,image/*,*/*",
              ...(url.includes("ngrok") ? { "ngrok-skip-browser-warning": "true" } : {}),
            },
          ];

          if (cleanToken) {
            fetchAttempts.push({
              Accept: "application/pdf,image/*,*/*",
              Authorization: `Bearer ${cleanToken}`,
              ...(url.includes("ngrok") ? { "ngrok-skip-browser-warning": "true" } : {}),
            });
          }

          for (const headers of fetchAttempts) {
            try {
              const response = await fetch(url, {
                method: "GET",
                signal: controller.signal,
                headers,
              });

              if (!response.ok) {
                lastError = new Error(`Unable to load evidence (${response.status})`);
                continue;
              }

              const responseMimeType = response.headers.get("content-type")?.split(";")[0]?.trim() || "";
              const fallbackMimeType = inferEvidenceMimeType(previewEvidence.fileName, url);
              const blob = await response.blob();

              if (!blob.size) {
                lastError = new Error("Evidence file is empty");
                continue;
              }

              if (/text\/html/i.test(responseMimeType) && /\.pdf(?:[?#]|$)/i.test(previewEvidence.fileName || url)) {
                lastError = new Error("Evidence URL returned HTML instead of PDF");
                continue;
              }

              const previewMimeTypeValue = responseMimeType && !/octet-stream/i.test(responseMimeType)
                ? responseMimeType
                : fallbackMimeType;
              const previewBlob = blob.type === previewMimeTypeValue
                ? blob
                : new Blob([blob], { type: previewMimeTypeValue });

              objectUrl = URL.createObjectURL(previewBlob);
              setPreviewSourceUrl(objectUrl);
              setPreviewMimeType(previewBlob.type || previewMimeTypeValue);
              return;
            } catch (error: any) {
              if (error?.name === "AbortError") throw error;
              lastError = error instanceof Error ? error : new Error("Unable to load evidence");
            }
          }
        }

        throw lastError || new Error("Unable to load evidence");
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          const message = error instanceof Error ? error.message : "";
          if (/\b404\b|not found/i.test(message)) {
            setPreviewError("Evidence file backend uploads folder me nahi mili. Please document dobara upload karein.");
            setPreviewSourceUrl(null);
            setPreviewMimeType("");
            return;
          }

          const fallbackUrl = directPreviewUrl || "";
          if (fallbackUrl) {
            setPreviewSourceUrl(fallbackUrl);
            setPreviewMimeType(inferEvidenceMimeType(previewEvidence.fileName, fallbackUrl));
            setPreviewError("");
          } else {
            setPreviewError("Evidence preview abhi load nahi ho paaya. File backend se direct preview allow nahi ho rahi.");
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setPreviewLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewEvidence]);

  const formatRole = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'lead': 'Operation Theatre (OT)',
      'member': 'Intensive Care Unit (ICU)',
      'admin': 'Central Sterile Supply Dept (CSSD)',
      'iccu': 'ICU',
      'icu': 'ICU',
    };
    return roleMap[role?.toLowerCase()] || role;
  };

  const getMemberEvidenceMeta = (member: TeamMember, index: number) => {
    const documentPath = getTeamMemberDocumentPath(member);
    const documentUrls = documentPath ? getFileUrlCandidates(documentPath) : [];

    return {
      documentUrl: documentUrls[0] || null,
      documentUrls,
      evidenceFileName: getTeamMemberEvidenceFileName(member) || "Evidence PDF",
      memberName: member.name || `Member ${index + 1}`,
    };
  };

  const openMemberEvidencePreview = (member: TeamMember, index: number) => {
    const evidenceMeta = getMemberEvidenceMeta(member, index);
    if (!evidenceMeta.documentUrl) return;

    setPreviewEvidence({
      url: evidenceMeta.documentUrl,
      urls: evidenceMeta.documentUrls,
      memberName: evidenceMeta.memberName,
      fileName: evidenceMeta.evidenceFileName,
    });
  };

  const handleMemberEvidenceDownload = async (member: TeamMember, index: number) => {
    const evidenceMeta = getMemberEvidenceMeta(member, index);
    const downloadUrls = evidenceMeta.documentUrls.length ? evidenceMeta.documentUrls : [evidenceMeta.documentUrl || ""];
    if (!downloadUrls.some(Boolean)) return;

    try {
      await downloadEvidenceFile(downloadUrls, evidenceMeta.evidenceFileName);
    } catch (error) {
      console.error("Evidence download failed:", error);
      setPreviewError("Evidence download failed. Please try again.");
    }
  };

  const handlePreviewEvidenceDownload = async () => {
    if (!previewEvidence) return;

    try {
      await downloadEvidenceFile(
        previewEvidence.urls.length ? previewEvidence.urls : [previewEvidence.url],
        previewEvidence.fileName,
      );
    } catch (error) {
      console.error("Evidence download failed:", error);
      setPreviewError("Evidence download failed. Please try again.");
    }
  };

  const organizationDetailItems = [
    { label: "SPOC", value: org?.spocName || "N/A", icon: UserCheck },
    { label: "Category", value: org?.hospitalCategory || "N/A", icon: Briefcase },
    { label: "Email", value: getOrganizationUserEmail(org), icon: AtSign },
    { label: "Phone", value: org?.orgPhone || "N/A", icon: Phone },
    { label: "Location", value: `${org?.district || "N/A"}, ${org?.state || "N/A"} (${org?.pincode || "N/A"})`, icon: Building2 },
    { label: "Registered", value: org?.createdAt ? new Date(org.createdAt).toLocaleString() : "N/A", icon: Clock },
  ];
  const renderablePreviewUrl = previewSourceUrl || "";
  const previewUnavailable = Boolean(previewSourceUrl && !renderablePreviewUrl && !previewError);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="grid h-[calc(100svh-0.75rem)] max-h-[calc(100svh-0.75rem)] w-[calc(100vw-0.75rem)] max-w-6xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl sm:h-[calc(100svh-2rem)] sm:max-h-[calc(100svh-2rem)] sm:w-[calc(100vw-2rem)] sm:rounded-2xl [&>button:last-child]:right-3 [&>button:last-child]:top-3 [&>button:last-child]:bg-white/95 [&>button:last-child]:text-slate-950 [&>button:last-child]:opacity-100 [&>button:last-child]:shadow-sm [&>button:last-child]:hover:bg-white [&>button:last-child]:hover:text-black">
          <div className="border-b border-emerald-500 bg-gradient-to-r from-emerald-700 to-teal-600 px-3 py-3 text-white sm:px-6">
            <DialogHeader>
              <DialogTitle className="flex flex-col gap-3 pr-10 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex min-w-0 items-center gap-3 text-lg sm:text-xl">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/30">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">Registration Details</span>
                    <span className="mt-0.5 block truncate text-sm font-normal text-emerald-50">{org?.organizationName || "Organization"}</span>
                  </span>
                </span>
                <div className="mr-0 flex flex-wrap gap-2 sm:mr-8">
                  <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={downloadingPDF} className="gap-2 border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white">
                    {downloadingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    PDF
                  </Button>
                  <StatusBadge status={getOrganizationRegistrationStatus(org)} />
                </div>
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-emerald-50">
                Hospital ID {getHospitalRegisteredId(org)} | Enrollment No {getOrganizationEnrollmentNo(org)}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 overflow-y-auto overscroll-contain bg-slate-50/70 p-2 sm:p-3">
            {loading ? (
              <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-gray-500">Loading registration details...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-emerald-100 px-4 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Organization Profile</p>
                    <div className="mt-1 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold text-slate-950">{org?.organizationName || "N/A"}</h3>
                        <p className="line-clamp-1 max-w-4xl text-sm text-slate-600">{org?.address || "Address not available"}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <PaymentStatusBadge paymentStatus={paymentStatus ?? 0} />
                        <StatusBadge status={getOrganizationRegistrationStatus(org)} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2">
                    {organizationDetailItems.map((item) => (
                      <div key={item.label} className="grid grid-cols-1 gap-1 border-b border-slate-100 px-4 py-2 sm:grid-cols-[128px_minmax(0,1fr)] sm:gap-3 md:odd:pr-6 md:even:pl-6">
                        <p className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <item.icon className="h-3.5 w-3.5 text-emerald-600" />
                          {item.label}
                        </p>
                        <p className="break-words text-sm font-semibold leading-5 text-slate-950">{String(item.value || "N/A")}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-2 border-b border-emerald-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Team Members</p>
                      <h3 className="text-base font-bold text-slate-950">Employee Verification</h3>
                      <p className="text-sm text-slate-500">Employee ID, department, evidence and actions.</p>
                    </div>
                    <Badge className="w-fit rounded-full bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-600">{members.length} members</Badge>
                  </div>

                  {loadingTeam ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
                  ) : teamFetchError ? (
                    <div className="text-center py-8"><p className="text-amber-600">{teamFetchError}</p><Button variant="ghost" size="sm" onClick={fetchTeamMembers} className="mt-2">Retry</Button></div>
                  ) : members.length === 0 ? (
                    <div className="text-center py-8"><p className="text-gray-500">No team members found</p></div>
                  ) : (
                    <div className="min-h-0 flex-1">
                      <div className="space-y-3 p-3 md:hidden">
                        {members.map((member, index) => {
                          const evidenceMeta = getMemberEvidenceMeta(member, index);

                          return (
                            <div key={member.id || index} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-500">#{index + 1}</p>
                                  <h4 className="truncate text-base font-bold text-slate-950">{member.name || "N/A"}</h4>
                                  <p className="break-all text-xs text-slate-500">{member.email || "N/A"}</p>
                                </div>
                                <Badge variant="outline" className="shrink-0 rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                  {formatRole(member.role)}
                                </Badge>
                              </div>

                              <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                                <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                                  <span className="font-semibold text-slate-500">Employee ID</span>
                                  <span className="font-mono font-bold text-slate-950">{getTeamMemberEmployeeId(member)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                                  <span className="font-semibold text-slate-500">Evidence</span>
                                  {evidenceMeta.documentUrl ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                                      <FileText className="h-3.5 w-3.5" />
                                      Submitted
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">Not submitted</span>
                                  )}
                                </div>
                              </div>

                              {evidenceMeta.documentUrl ? (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openMemberEvidencePreview(member, index)}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50"
                                  >
                                    <Eye className="h-4 w-4" />
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleMemberEvidenceDownload(member, index)}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                                  >
                                    <Download className="h-4 w-4" />
                                    Download
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>

                      <div className="hidden overflow-x-auto md:block">
                      <table className="min-w-[980px] w-full table-fixed text-sm">
                        <thead className="bg-emerald-600 text-white">
                          <tr className="text-left text-xs font-bold uppercase tracking-wide">
                            <th className="w-12 px-4 py-2.5">#</th>
                            <th className="w-[25%] px-4 py-2.5">Member</th>
                            <th className="w-[15%] px-4 py-2.5">Employee ID</th>
                            <th className="w-[15%] px-4 py-2.5">Department</th>
                            <th className="w-[20%] px-4 py-2.5">Evidence</th>
                            <th className="w-[25%] px-4 py-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((member, index) => {
                            const evidenceMeta = getMemberEvidenceMeta(member, index);

                            return (
                              <tr key={member.id || index} className="border-b border-slate-100 transition-colors last:border-b-0 even:bg-slate-50/70 hover:bg-emerald-50/70">
                                <td className="px-4 py-3 font-semibold text-slate-500">{index + 1}</td>
                                <td className="px-4 py-3">
                                  <p className="font-bold text-slate-950">{member.name || "N/A"}</p>
                                  <p className="truncate text-xs text-slate-500">{member.email || "N/A"}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="font-mono text-sm font-bold text-slate-950">{getTeamMemberEmployeeId(member)}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                    {formatRole(member.role)}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  {evidenceMeta.documentUrl ? (
                                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                                      <FileText className="h-3.5 w-3.5 shrink-0" />
                                      Submitted
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">Not submitted</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {evidenceMeta.documentUrl ? (
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => openMemberEvidencePreview(member, index)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50"
                                      >
                                        <Eye className="h-4 w-4" />
                                        View
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleMemberEvidenceDownload(member, index)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                                      >
                                        <Download className="h-4 w-4" />
                                        Download
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="block text-right text-sm text-gray-400">N/A</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  )}
                </section>

              </div>
            )}
          </div>

          {getOrganizationRegistrationStatus(org) === 1 && (
          <DialogFooter className="border-t bg-white px-4 py-2 gap-2 flex-wrap">
              <>
                <Button variant="outline" onClick={() => setShowRejectDialog(true)} className="border-red-300 text-red-600 hover:bg-red-50" disabled={actionLoading}>
                  <ThumbsDown className="h-4 w-4 mr-2" /> Reject
                </Button>
                <Button onClick={handleApprove} className={`${paymentStatus === 1 ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600' : 'bg-gray-400 cursor-not-allowed'} shadow-md`} disabled={actionLoading || paymentStatus !== 1}>
                  {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ThumbsUp className="h-4 w-4 mr-2" />}
                  Approve Registration
                </Button>
              </>
          </DialogFooter>
          )}
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

      <Dialog open={Boolean(previewEvidence)} onOpenChange={(open) => !open && setPreviewEvidence(null)}>
        <DialogContent className="grid h-[calc(100svh-2rem)] max-h-[calc(100svh-2rem)] w-[calc(100vw-2rem)] max-w-5xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl [&>button:last-child]:right-4 [&>button:last-child]:top-4 [&>button:last-child]:bg-white [&>button:last-child]:text-slate-950 [&>button:last-child]:opacity-100 [&>button:last-child]:shadow-sm [&>button:last-child]:hover:bg-slate-100">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 pr-14">
            <DialogHeader className="min-w-0">
              <DialogTitle className="flex min-w-0 items-center gap-2 text-lg text-slate-950">
                <FileText className="h-5 w-5 shrink-0 text-emerald-600" />
                <span className="truncate">Evidence Preview</span>
              </DialogTitle>
              <DialogDescription className="truncate text-sm text-slate-500">
                {previewEvidence?.memberName || "Team member"} document
              </DialogDescription>
            </DialogHeader>
            {previewEvidence && (
              <button
                type="button"
                onClick={() => void handlePreviewEvidenceDownload()}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            )}
          </div>
          <div className="min-h-0 bg-slate-100 p-3">
            {previewLoading ? (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-white text-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="mt-3 text-sm font-semibold text-slate-700">Loading evidence preview...</p>
              </div>
            ) : previewError || previewUnavailable ? (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-center">
                <FileX className="h-10 w-10 text-slate-400" />
                <p className="mt-3 text-base font-semibold text-slate-800">
                  {previewError || "Evidence preview browser me direct open nahi ho paaya."}
                </p>
                {previewEvidence && (
                  <button
                    type="button"
                    onClick={() => void handlePreviewEvidenceDownload()}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <Download className="h-4 w-4" />
                    Download Evidence
                  </button>
                )}
              </div>
            ) : previewEvidence && renderablePreviewUrl && isEvidenceImage(previewMimeType, previewEvidence.fileName, previewEvidence.url) ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-slate-200 bg-white p-3">
                <img
                  src={renderablePreviewUrl}
                  alt={`${previewEvidence.memberName} evidence`}
                  className="max-h-full max-w-full rounded-lg object-contain"
                />
              </div>
            ) : previewEvidence && renderablePreviewUrl ? (
              <object
                title={`${previewEvidence.memberName} evidence preview`}
                data={renderablePreviewUrl}
                type={previewMimeType || inferEvidenceMimeType(previewEvidence.fileName, previewEvidence.url)}
                className="h-full w-full rounded-xl border border-slate-200 bg-white"
              >
                <div className="flex h-full flex-col items-center justify-center px-5 text-center">
                  <FileX className="h-10 w-10 text-slate-400" />
                  <p className="mt-3 text-base font-semibold text-slate-800">Evidence preview is not supported in this browser.</p>
                  <button
                    type="button"
                    onClick={() => void handlePreviewEvidenceDownload()}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <Download className="h-4 w-4" />
                    Download Evidence
                  </button>
                </div>
              </object>
            ) : (
              <div className="h-full rounded-xl border border-slate-200 bg-white" />
            )}
          </div>
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
    const nextTab = getAdminTabFromSearch(location.search);

    if (!isAdminNavItemAllowedForRole(nextTab, userData.roleId)) {
      setActiveTab("overview");
      if (location.search) navigate("/admin", { replace: true });
      return;
    }

    setActiveTab(nextTab);
  }, [location.search, navigate, userData.roleId]);

  const handleAdminNavSelect = (tabId: string) => {
    if (!isAdminNavItemAllowedForRole(tabId, userData.roleId)) {
      setActiveTab("overview");
      navigate("/admin", { replace: true });
      return;
    }

    const targetPath = getAdminTabPath(tabId);
    const currentPath = `${location.pathname}${location.search}`;
    if (currentPath === targetPath) return;

    setActiveTab(tabId);
    navigate(targetPath);
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
      const registrationsUrl = `${BASE_URL}/api/register/get/all`;
      const response = await fetch(registrationsUrl, {
        headers: { Authorization: `Bearer ${cleanToken}`, "Content-Type": "application/json" }
      });
      const data = await response.json();

      if (response.ok && data.success === true) {
        const orgs = sortRegistrationsByRecent(data.data || []);
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
    pending: organizations.filter(o => getOrganizationRegistrationStatus(o) === 1).length,
    approved: organizations.filter(o => getOrganizationRegistrationStatus(o) === 2).length,
    rejected: organizations.filter(o => getOrganizationRegistrationStatus(o) === 3).length,
    paymentPending: organizations.filter(o => paymentStatuses[o.id] === 0).length,
    paymentCompleted: organizations.filter(o => paymentStatuses[o.id] === 1).length
  };

  const getFilteredOrganizations = () => {
    let filtered = organizations;
    if (statusFilter !== "all") filtered = filtered.filter(o => getOrganizationRegistrationStatus(o) === parseInt(statusFilter));
    if (searchTerm) filtered = filtered.filter(o =>
      o.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getHospitalRegisteredId(o).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getOrganizationUserEmail(o).toLowerCase().includes(searchTerm.toLowerCase())
    );
    return sortRegistrationsByRecent(filtered);
  };

  const adminNav = getAdminNavItemsForRole(userData.roleId);

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
              <AccountMenu
                fullName={userData.fullName}
                subtitle="Administrator"
                initials={getUserInitials(userData.fullName)}
                dashboardPath="/admin"
                onLogout={() => setShowLogoutDialog(true)}
              />
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
                      { label: "Awaiting Review", value: stats.pending, icon: Clock, color: "amber", trend: "+3", trendUp: true },
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
                                  <th className="text-right p-4 text-xs font-semibold text-gray-500">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {organizations.slice(0, 5).map((org, idx) => (
                                  <motion.tr key={org.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4">
                                      <div>
                                        <p className="text-sm font-medium text-gray-800">{org.organizationName}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{getHospitalRegisteredId(org)}</p>
                                      </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500 hidden md:table-cell">{getOrganizationUserEmail(org)}</td>
                                    <td className="p-4"><PaymentStatusBadge paymentStatus={paymentStatuses[org.id] ?? 0} /></td>
                                    <td className="p-4 text-right">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 min-w-[86px] gap-1.5 rounded-lg border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100 hover:text-emerald-800"
                                        onClick={() => { setSelectedOrg(org); setShowDetailsModal(true); }}
                                        title="View complete application"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                        View
                                      </Button>
                                    </td>
                                  </motion.tr>
                                ))}
                                {organizations.length === 0 && (
                                  <tr><td colSpan={4} className="text-center p-12 text-gray-500">No registrations found</td></tr>
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
                <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <CardHeader className="border-b border-slate-100 bg-white px-6 py-5">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${activeTab === "approvals" ? "bg-amber-100" : "bg-blue-100"}`}>
                          {activeTab === "approvals" ? <CheckCircle2 className="h-4 w-4 text-amber-600" /> : <Users className="h-4 w-4 text-blue-600" />}
                        </div>
                        {activeTab === "registrations" ? "All Registrations" : "Registration Review"}
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
                        <table className="w-full table-fixed">
                          <thead className="bg-slate-50">
                            <tr className="border-b border-slate-100">
                              <th className="w-[13%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Hospital ID</th>
                              <th className="w-[18%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Organization</th>
                              <th className="w-[24%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hidden lg:table-cell">Email</th>
                              <th className="w-[21%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hidden xl:table-cell">Location</th>
                              <th className="w-[11%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Payment</th>
                              <th className="w-[13%] px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredOrgs.map((org, idx) => (
                              <motion.tr key={org.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }} className="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
                                <td className="px-5 py-4">
                                  <span className="inline-flex max-w-full rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700">{getHospitalRegisteredId(org)}</span>
                                </td>
                                <td className="px-5 py-4">
                                  <p className="truncate text-sm font-semibold text-slate-800">{org.organizationName}</p>
                                  <p className="mt-1 text-xs text-slate-400">{org.orgPhone}</p>
                                </td>
                                <td className="hidden px-5 py-4 text-sm text-slate-500 lg:table-cell">{getOrganizationUserEmail(org)}</td>
                                <td className="hidden px-5 py-4 text-sm text-slate-500 xl:table-cell">{org.district}, {org.state}</td>
                                <td className="px-5 py-4"><PaymentStatusBadge paymentStatus={paymentStatuses[org.id] ?? 0} /></td>
                                <td className="px-5 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {getOrganizationRegistrationStatus(org) === 1 && (
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
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 min-w-[86px] gap-1.5 rounded-lg border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100 hover:text-emerald-800"
                                      onClick={() => { setSelectedOrg(org); setShowDetailsModal(true); }}
                                      title="View complete application"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      View
                                    </Button>
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
              {activeTab === "manage-exam" && <EvidencePage evidenceMode="completed" />}
              {activeTab === "all-evidence" && <EvidencePage evidenceMode="all" />}

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
