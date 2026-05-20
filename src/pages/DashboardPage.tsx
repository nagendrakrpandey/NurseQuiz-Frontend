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
import { BASE_URL1 } from "@/Service/api";
import { EXAM_INSTRUCTION_DONE_KEY, EXAM_PRECHECK_DONE_KEY } from "@/lib/session";
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

  if (normalized.includes("reject") || normalized.includes("fail") || normalized.includes("blocked") || normalized.includes("absent")) {
    return "text-destructive";
  }

  if (normalized.includes("progress")) return "text-info";

  return "text-warning";
};

const isExamSubmittedStatus = (dashboardData: DashboardResponse | null | undefined) => {
  const normalizeStatus = (status?: string | number | null) =>
    String(status ?? "")
      .trim()
      .replace(/[\s_-]+/g, "")
      .toUpperCase();
  const primaryStatus = normalizeStatus(
    dashboardData?.examStatus || dashboardData?.quizStatus || dashboardData?.status,
  );

  if (["INPROGRESS", "NOTSTARTED", "SCHEDULED", "ABSENT"].includes(primaryStatus)) {
    return false;
  }

  const completedStatuses = new Set([
    "SUBMITTED",
    "COMPLETED",
    "FINISHED",
  ]);
  const statuses = [
    dashboardData?.quizStatus,
    dashboardData?.examStatus,
    dashboardData?.status,
  ]
    .filter(Boolean)
    .map((status) => normalizeStatus(status));

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

const getStats = (dashboardData: DashboardResponse | null, examStatusValue?: string): StatCard[] => {
  const apiStats = dashboardData?.stats;
  const resolvedExamStatus =
    examStatusValue ||
    dashboardData?.examStatus ||
    dashboardData?.quizStatus ||
    dashboardData?.status ||
    "Not Started";

  if (Array.isArray(apiStats) && apiStats.length > 0) {
    const mappedStats = apiStats.map((stat: DashboardStat, index) => {
      const label = String(stat.label || `Stat ${index + 1}`);
      const isExamStatusStat = /(quiz|exam).*status|status.*(quiz|exam)/i.test(label);

      return {
        label,
        value: formatDashboardLabel(isExamStatusStat ? resolvedExamStatus : stat.value ?? "Not Available"),
        subtext: stat.subtext,
        icon: getStatIcon(stat.label, index),
        color: isExamStatusStat
          ? getStatusColor(resolvedExamStatus)
          : stat.color || getStatusColor(String(stat.value ?? "")),
      };
    });
    const hasExamStatus = mappedStats.some((stat) => /(quiz|exam).*status|status.*(quiz|exam)/i.test(stat.label));

    return hasExamStatus
      ? mappedStats
      : [
          ...mappedStats,
          {
            label: "Exam Status",
            value: formatDashboardLabel(resolvedExamStatus),
            icon: Clock,
            color: getStatusColor(resolvedExamStatus),
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
      value: formatDashboardLabel(resolvedExamStatus),
      icon: Clock,
      color: getStatusColor(resolvedExamStatus),
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
  const storedCandidate =
    storedUser.candidate && typeof storedUser.candidate === "object"
      ? storedUser.candidate as Record<string, unknown>
      : {};

  return {
    batchId: Number(
      localStorage.getItem("batchId") ||
        storedUser.batchId ||
        storedUser.batch_id ||
        storedCandidate.batchId ||
        storedCandidate.batch_id ||
        0,
    ) || null,
    batchCode: String(
      localStorage.getItem("batchCode") ||
        storedUser.batchCode ||
        storedUser.batch_code ||
        storedCandidate.batchCode ||
        storedCandidate.batch_code ||
        "",
    ).trim(),
    level: String(
      localStorage.getItem("level") ||
        storedUser.level ||
        storedCandidate.level ||
        storedUser.currentStage ||
        "",
    ).trim(),
  };
};

const DASHBOARD_EXAM_STARTED_KEY = "dashboardExamStarted";

const normalizeDashboardStatusCode = (value?: string | number | null) =>
  String(value ?? "")
    .trim()
    .replace(/[\s_-]+/g, "")
    .toUpperCase();

const readDashboardStringField = (
  dashboardData: DashboardResponse | Record<string, unknown> | null,
  aliases: string[],
) => {
  if (!dashboardData) return "";

  const normalizedAliases = aliases.map((alias) => alias.replace(/[_\-\s]/g, "").toLowerCase());
  const records = [
    dashboardData,
    (dashboardData as Record<string, unknown>).batch,
    (dashboardData as Record<string, unknown>).currentBatch,
    (dashboardData as Record<string, unknown>).batchDetails,
    (dashboardData as Record<string, unknown>).exam,
    (dashboardData as Record<string, unknown>).schedule,
  ].filter((record): record is Record<string, unknown> => Boolean(record && typeof record === "object"));

  for (const record of records) {
    const match = Object.entries(record).find(([key]) =>
      normalizedAliases.includes(key.replace(/[_\-\s]/g, "").toLowerCase()),
    );

    if (match?.[1] !== null && match?.[1] !== undefined && match?.[1] !== "") {
      return String(match[1]).trim();
    }
  }

  return "";
};

const readDashboardNumber = (
  dashboardData: DashboardResponse | Record<string, unknown> | null,
  aliases: string[],
) => {
  const value = readDashboardStringField(dashboardData, aliases);
  if (!value) return null;

  const parsed = Number(value.replace(/,/g, "").replace(/%$/, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const readDashboardBoolean = (
  dashboardData: DashboardResponse | Record<string, unknown> | null,
  aliases: string[],
) => {
  const value = readDashboardStringField(dashboardData, aliases).toLowerCase();
  if (!value) return false;
  return ["true", "1", "yes", "y", "started", "in_progress", "in progress"].includes(value);
};

const asDashboardRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

const unwrapDashboardApiData = (payload: unknown) => {
  const record = asDashboardRecord(payload);
  return record.data ?? record.result ?? record.batch ?? payload;
};

const getDashboardAuthHeaders = () => {
  const token = String(localStorage.getItem("token") || localStorage.getItem("authToken") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const headers: HeadersInit = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const getNestedDashboardRows = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.flatMap(getNestedDashboardRows);
  }

  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  const directRows = [record.data, record.result, record.rows, record.items, record.content].flatMap(getNestedDashboardRows);
  return [record, ...directRows];
};

const getEvidenceKindFromRecord = (record: Record<string, unknown>) => {
  const rawKind = String(
    record.kind ||
      record.type ||
      record.evidenceType ||
      record.evidence_type ||
      record.captureType ||
      record.capture_type ||
      record.mediaType ||
      record.media_type ||
      ""
  ).toLowerCase();
  const docId = Number(record.docId ?? record.doc_id ?? record.documentId ?? record.document_id ?? record.documentType ?? record.document_type);
  const filename = String(record.filename || record.fileName || record.file_name || record.url || record.path || "").toLowerCase();

  if (rawKind.includes("selfie") || rawKind.includes("face") || docId === 1 || filename.includes("selfie")) return "selfie";
  if (rawKind.includes("document") || rawKind.includes("doc") || docId === 2 || filename.includes("document")) return "document";
  return "";
};

const getEvidenceMemberKey = (record: Record<string, unknown>, fallbackIndex: number) =>
  String(
    record.teamMemberId ||
      record.team_member_id ||
      record.memberId ||
      record.member_id ||
      record.userId ||
      record.user_id ||
      record.name ||
      record.memberName ||
      record.member_name ||
      fallbackIndex
  );

const fetchDashboardJson = async (url: string) => {
  const response = await fetch(url, { headers: getDashboardAuthHeaders() });
  if (!response.ok) return null;
  return parseDashboardJsonResponse(response);
};

const hasCompletedExamCaptures = async (userId: number | string | null | undefined) => {
  const instructionDone =
    localStorage.getItem(EXAM_INSTRUCTION_DONE_KEY) === "true" ||
    sessionStorage.getItem(EXAM_INSTRUCTION_DONE_KEY) === "true";
  if (instructionDone) return true;

  const numericUserId = Number(userId || localStorage.getItem("userId"));
  if (!numericUserId) return false;

  try {
    const [teamPayload, evidencePayload] = await Promise.all([
      fetchDashboardJson(`${BASE_URL1}/register/get/team`),
      fetchDashboardJson(`${BASE_URL1}/evidence/user/${numericUserId}`),
    ]);

    const teamData = unwrapDashboardApiData(teamPayload);
    const teamRecord = asDashboardRecord(teamData);
    const teamRows: unknown[] = Array.isArray(teamData)
      ? teamData
      : Array.isArray(teamRecord.teamMembers)
        ? teamRecord.teamMembers
        : Array.isArray(teamRecord.team_members)
          ? teamRecord.team_members
          : [];
    const expectedMemberCount = teamRows.length;

    const evidenceRows = getNestedDashboardRows(evidencePayload);
    const selfieMembers = new Set<string>();
    const documentMembers = new Set<string>();

    evidenceRows.forEach((row, index) => {
      const kind = getEvidenceKindFromRecord(row);
      if (!kind) return;

      const memberKey = getEvidenceMemberKey(row, index);
      if (kind === "selfie") selfieMembers.add(memberKey);
      if (kind === "document") documentMembers.add(memberKey);
    });

    if (expectedMemberCount > 0) {
      return selfieMembers.size >= expectedMemberCount && documentMembers.size >= expectedMemberCount;
    }

    return selfieMembers.size > 0 && documentMembers.size > 0;
  } catch {
    return false;
  }
};

const clearExamStepFlags = () => {
  localStorage.removeItem(EXAM_PRECHECK_DONE_KEY);
  localStorage.removeItem(EXAM_INSTRUCTION_DONE_KEY);
  sessionStorage.removeItem(EXAM_PRECHECK_DONE_KEY);
  sessionStorage.removeItem(EXAM_INSTRUCTION_DONE_KEY);
};

const parseDashboardJsonResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: text };
  }
};

const readDashboardStoredUserRecord = () => {
  try {
    return asDashboardRecord(JSON.parse(localStorage.getItem("userData") || "{}"));
  } catch {
    return {};
  }
};

const readNumberFromRecord = (record: Record<string, unknown>, aliases: string[]) => {
  for (const alias of aliases) {
    const parsed = Number(record[alias]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return null;
};

const readStringFromRecord = (record: Record<string, unknown>, aliases: string[]) => {
  for (const alias of aliases) {
    const value = record[alias];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
};

const normalizeDashboardMatch = (value: unknown) => String(value || "").trim().toLowerCase();

const getDashboardBatchId = (batch: Record<string, unknown>) =>
  readNumberFromRecord(batch, ["id", "batchId", "batch_id"]);

const getDashboardBatchCode = (batch: Record<string, unknown>) =>
  readStringFromRecord(batch, ["batchCode", "batch_code", "code"]);

const getDashboardCandidateIdFromRecord = (candidate: Record<string, unknown>) =>
  readNumberFromRecord(candidate, ["id", "candidateId", "candidate_id", "candidateID"]);

const getStoredDashboardCandidateId = () => {
  const storedUser = readDashboardStoredUserRecord();
  const storedCandidate = asDashboardRecord(storedUser.candidate);

  return Number(
    localStorage.getItem("candidateId") ||
      storedUser.candidateId ||
      storedUser.candidate_id ||
      storedUser.candidateID ||
      storedCandidate.id ||
      storedCandidate.candidateId ||
      storedCandidate.candidate_id ||
      0,
  ) || null;
};

const getDashboardRecordTime = (batch: Record<string, unknown>, candidate?: Record<string, unknown>) => {
  const values = [
    batch.start_date,
    batch.startDate,
    batch.examStartDate,
    batch.end_date,
    batch.endDate,
    batch.created_at,
    batch.createdAt,
    batch.updated_at,
    batch.updatedAt,
    candidate?.joined_at,
    candidate?.joinedAt,
    candidate?.enrolled_at,
    candidate?.enrolledAt,
    candidate?.created_at,
    candidate?.createdAt,
  ];

  return Math.max(
    0,
    ...values.map((value) => {
      const timestamp = new Date(String(value || "")).getTime();
      return Number.isFinite(timestamp) ? timestamp : 0;
    }),
  );
};

const fetchDashboardBatchById = async (batchId: number) => {
  const response = await fetch(`${BASE_URL1}/batches/${encodeURIComponent(String(batchId))}`, {
    method: "GET",
    headers: getDashboardAuthHeaders(),
  });
  const payload = await parseDashboardJsonResponse(response);
  const batchData = unwrapDashboardApiData(payload);
  const batch = asDashboardRecord(Array.isArray(batchData) ? batchData[0] : batchData);

  if (!response.ok || !Object.keys(batch).length || asDashboardRecord(payload).success === false) {
    return null;
  }

  return batch;
};

const resolveDashboardBatchSchedule = async (dashboardData: DashboardResponse | null) => {
  const storedBatch = readStoredLoginBatch();
  if (storedBatch.batchId) {
    const batch = await fetchDashboardBatchById(storedBatch.batchId);
    if (batch) return batch;
  }

  const storedUser = readDashboardStoredUserRecord();
  const storedCandidate = asDashboardRecord(storedUser.candidate);
  const preferredBatchCode = normalizeDashboardMatch(
    storedBatch.batchCode ||
      storedUser.batchCode ||
      storedUser.batch_code ||
      storedCandidate.batchCode ||
      storedCandidate.batch_code,
  );
  const email = normalizeDashboardMatch(localStorage.getItem("email") || storedUser.email || storedCandidate.email);
  const enrollmentNo = normalizeDashboardMatch(
    localStorage.getItem("enrollment_no") ||
      localStorage.getItem("enrollmentNo") ||
      storedUser.enrollment_no ||
      storedUser.enrollmentNo ||
      storedUser.enrollmentNumber ||
      storedCandidate.enrollment_no ||
      storedCandidate.enrollmentNo,
  );
  const storedCandidateId = getStoredDashboardCandidateId();
  const levelHint = normalizeDashboardMatch(storedBatch.level || dashboardData?.currentStage || "district") || "district";
  const levels = Array.from(new Set([levelHint, "district", "regional", "state", "national"]));
  const matches: Array<{
    batch: Record<string, unknown>;
    candidate?: Record<string, unknown>;
    candidateMatched: boolean;
    preferredCodeMatched: boolean;
  }> = [];

  for (const level of levels) {
    try {
      const batchResponse = await fetch(`${BASE_URL1}/batches?level=${encodeURIComponent(level)}`, {
        method: "GET",
        headers: getDashboardAuthHeaders(),
      });
      const batchPayload = await parseDashboardJsonResponse(batchResponse);
      const batchData = unwrapDashboardApiData(batchPayload);
      const batches =
        batchResponse.ok && asDashboardRecord(batchPayload).success !== false && Array.isArray(batchData)
          ? batchData.map((item) => asDashboardRecord(item))
          : [];

      for (const batch of batches) {
        const batchId = getDashboardBatchId(batch);
        if (!batchId) continue;

        const batchCode = normalizeDashboardMatch(getDashboardBatchCode(batch));
        const preferredCodeMatched = Boolean(preferredBatchCode && batchCode === preferredBatchCode);

        if (preferredCodeMatched) {
          matches.push({ batch, candidateMatched: false, preferredCodeMatched });
        }

        if (!email && !enrollmentNo && !storedCandidateId) continue;

        try {
          const candidateResponse = await fetch(`${BASE_URL1}/candidates?batchId=${encodeURIComponent(String(batchId))}`, {
            method: "GET",
            headers: getDashboardAuthHeaders(),
          });
          const candidatePayload = await parseDashboardJsonResponse(candidateResponse);
          const candidateData = unwrapDashboardApiData(candidatePayload);
          const candidates =
            candidateResponse.ok && asDashboardRecord(candidatePayload).success !== false && Array.isArray(candidateData)
              ? candidateData.map((item) => asDashboardRecord(item))
              : [];

          candidates
            .filter((candidate) => {
              const candidateId = getDashboardCandidateIdFromRecord(candidate);
              const candidateEmail = normalizeDashboardMatch(candidate.email);
              const candidateEnrollment = normalizeDashboardMatch(candidate.enrollment_no || candidate.enrollmentNo);

              return (
                Boolean(storedCandidateId && candidateId === storedCandidateId) ||
                Boolean(email && candidateEmail === email) ||
                Boolean(enrollmentNo && candidateEnrollment === enrollmentNo)
              );
            })
            .forEach((candidate) => {
              matches.push({
                batch,
                candidate,
                candidateMatched: true,
                preferredCodeMatched,
              });
            });
        } catch (error) {
          console.warn(`Unable to load dashboard candidates for batch ${batchId}:`, error);
        }
      }
    } catch (error) {
      console.warn(`Unable to load dashboard batches for ${level}:`, error);
    }
  }

  if (!matches.length) return null;

  const bestMatch = [...matches].sort((a, b) => {
    const getRank = (match: typeof matches[number]) => {
      const status = normalizeDashboardMatch(match.batch.status);
      return (
        (match.preferredCodeMatched ? 1_000_000_000 : 0) +
        (match.candidateMatched ? 500_000_000 : 0) +
        (status.includes("active") || status.includes("live") ? 10_000_000 : 0) +
        (status.includes("upcoming") ? 5_000_000 : 0) +
        (status.includes("completed") ? -5_000_000 : 0) +
        Math.floor(getDashboardRecordTime(match.batch, match.candidate) / 100_000) +
        (getDashboardBatchId(match.batch) || 0)
      );
    };

    return getRank(b) - getRank(a);
  })[0];

  const nextBatchId = getDashboardBatchId(bestMatch.batch);
  const nextBatchCode = getDashboardBatchCode(bestMatch.batch);
  const nextLevel = readStringFromRecord(bestMatch.batch, ["level"]);

  if (nextBatchId) localStorage.setItem("batchId", String(nextBatchId));
  if (nextBatchCode) localStorage.setItem("batchCode", nextBatchCode);
  if (nextLevel) localStorage.setItem("level", nextLevel);

  return bestMatch.batch;
};

const padDatePart = (value: number) => String(value).padStart(2, "0");

const formatLocalDatePart = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

const normalizeTimePart = (value: string) => {
  const rawValue = value.trim();
  if (!rawValue) return "";

  if (rawValue.includes("T")) {
    const parsed = new Date(rawValue);
    return Number.isFinite(parsed.getTime())
      ? `${padDatePart(parsed.getHours())}:${padDatePart(parsed.getMinutes())}:${padDatePart(parsed.getSeconds())}`
      : "";
  }

  const meridiemMatch = rawValue.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)$/i);
  if (meridiemMatch) {
    let hours = Number(meridiemMatch[1]);
    const minutes = Number(meridiemMatch[2] || 0);
    const seconds = Number(meridiemMatch[3] || 0);
    const meridiem = meridiemMatch[4].toLowerCase();

    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;

    return `${padDatePart(hours)}:${padDatePart(minutes)}:${padDatePart(seconds)}`;
  }

  const timeMatch = rawValue.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    return `${padDatePart(Number(timeMatch[1]))}:${padDatePart(Number(timeMatch[2]))}:${padDatePart(Number(timeMatch[3] || 0))}`;
  }

  return "";
};

const normalizeDatePart = (value: string) => {
  const rawValue = value.trim();
  if (!rawValue) return "";

  const isoDateMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) return isoDateMatch[1];

  const parsed = new Date(rawValue);
  return Number.isFinite(parsed.getTime()) ? formatLocalDatePart(parsed) : "";
};

const isDateOnlyValue = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value.trim());

const parseDashboardDateTime = (dateValue: string, timeValue: string, endOfDay = false) => {
  const datePart = normalizeDatePart(dateValue);
  const timePart = normalizeTimePart(timeValue);

  if (datePart && timePart) {
    const parsed = new Date(`${datePart}T${timePart}`);
    if (Number.isFinite(parsed.getTime())) return parsed;
  }

  if (dateValue) {
    const parsed = new Date(dateValue);
    if (Number.isFinite(parsed.getTime())) {
      if (endOfDay && isDateOnlyValue(dateValue)) {
        parsed.setHours(23, 59, 59, 999);
      }
      return parsed;
    }
  }

  if (timeValue && timeValue.includes("T")) {
    const parsed = new Date(timeValue);
    if (Number.isFinite(parsed.getTime())) return parsed;
  }

  if (datePart) {
    const parsed = new Date(`${datePart}T${endOfDay ? "23:59:59" : "00:00:00"}`);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  return null;
};

const formatDashboardDateTime = (date: Date) =>
  date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const isSameLocalDay = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

const getStoredExamStartedOverride = (
  userId: number | string | null,
  currentStage?: string | null,
) => {
  if (!userId) return null;

  try {
    const stored = JSON.parse(localStorage.getItem(DASHBOARD_EXAM_STARTED_KEY) || "null") as {
      userId?: number | string | null;
      currentStage?: string | null;
      startedAt?: string;
    } | null;

    if (!stored || String(stored.userId || "") !== String(userId)) return null;
    if (
      stored.currentStage &&
      currentStage &&
      normalizeDashboardStatusCode(stored.currentStage) !== normalizeDashboardStatusCode(currentStage)
    ) {
      return null;
    }

    const startedAt = new Date(stored.startedAt || "").getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (!Number.isFinite(startedAt) || Date.now() - startedAt > sevenDaysMs) {
      localStorage.removeItem(DASHBOARD_EXAM_STARTED_KEY);
      return null;
    }

    return stored;
  } catch {
    localStorage.removeItem(DASHBOARD_EXAM_STARTED_KEY);
    return null;
  }
};

const saveExamStartedOverride = (
  userId: number | string | null,
  currentStage?: string | null,
) => {
  if (!userId) return;

  localStorage.setItem(
    DASHBOARD_EXAM_STARTED_KEY,
    JSON.stringify({
      userId,
      currentStage: currentStage || null,
      startedAt: new Date().toISOString(),
    }),
  );
};

const hasDashboardExamStarted = (
  dashboardData: DashboardResponse | null,
  userId: number | string | null,
) => {
  if (!dashboardData) return false;

  const attemptedQuestions = readDashboardNumber(dashboardData, ["attemptedQuestions", "attempted", "answeredQuestions"]);
  const responseCount = readDashboardNumber(dashboardData, ["responseCount", "responsesCount", "answersCount"]);
  const totalTimeTaken = readDashboardNumber(dashboardData, ["totalTimeTaken", "timeTaken", "elapsedTime"]);

  if ((attemptedQuestions ?? 0) > 0 || (responseCount ?? 0) > 0 || (totalTimeTaken ?? 0) > 0) {
    return true;
  }

  const startedAt = readDashboardStringField(dashboardData, [
    "startedAt",
    "examStartedAt",
    "examStartAt",
    "startAttemptAt",
    "attemptStartedAt",
  ]);

  if (startedAt && Number.isFinite(new Date(startedAt).getTime())) return true;

  return readDashboardBoolean(dashboardData, ["examStarted", "hasStarted", "isStarted", "startedByCandidate"]);
};

const getEffectiveExamStatus = (
  dashboardData: DashboardResponse | null,
  userId: number | string | null,
  scheduleData: DashboardResponse | Record<string, unknown> | null = dashboardData,
) => {
  if (isExamSubmittedStatus(dashboardData)) {
    return dashboardData?.examStatus || dashboardData?.quizStatus || dashboardData?.resultStatus || "COMPLETED";
  }

  const explicitStatus = normalizeDashboardStatusCode(
    dashboardData?.examStatus || dashboardData?.quizStatus || dashboardData?.status
  );
  if (explicitStatus === "NOTSTARTED") {
    localStorage.removeItem(DASHBOARD_EXAM_STARTED_KEY);
    return "NOT_STARTED";
  }

  const examWindow = getExamWindow(scheduleData || dashboardData);
  const now = new Date();
  if (examWindow.start) {
    if (isSameLocalDay(now, examWindow.start) && (!examWindow.end || now <= examWindow.end)) {
      return hasDashboardExamStarted(dashboardData, userId) ? "IN_PROGRESS" : "NOT_STARTED";
    }

    if (now < examWindow.start) return "SCHEDULED";
    if (examWindow.end && now > examWindow.end) return "ABSENT";
  }

  return hasDashboardExamStarted(dashboardData, userId) ? "IN_PROGRESS" : "NOT_STARTED";
};

const getExamWindow = (dashboardData: DashboardResponse | Record<string, unknown> | null) => {
  const dashboardResponse = dashboardData as DashboardResponse | null;
  const currentStage = String(dashboardResponse?.currentStage || "");
  const levelDates = dashboardResponse?.levelDates;
  const levelDate = currentStage ? getLevelDate(currentStage, levelDates) : "";
  const startValue =
    readDashboardStringField(dashboardData, [
      "startDate",
      "start_date",
      "examStartDate",
      "exam_start_date",
      "scheduleDate",
      "examDate",
      "date",
    ]) ||
    levelDate ||
    dashboardResponse?.nextExamDate ||
    "";
  const startTimeValue = readDashboardStringField(dashboardData, [
    "startTime",
    "start_time",
    "examStartTime",
    "exam_start_time",
    "fromTime",
    "from_time",
  ]);
  const explicitEndValue = readDashboardStringField(dashboardData, [
    "endDate",
    "end_date",
    "examEndDate",
    "exam_end_date",
    "scheduleEndDate",
  ]);
  const endValue = explicitEndValue || startValue;
  const endTimeValue = readDashboardStringField(dashboardData, [
    "endTime",
    "end_time",
    "examEndTime",
    "exam_end_time",
    "toTime",
    "to_time",
  ]);
  const start = parseDashboardDateTime(startValue, startTimeValue);
  const hasExplicitEnd = Boolean(explicitEndValue || endTimeValue);
  const end = hasExplicitEnd
    ? parseDashboardDateTime(endValue, endTimeValue, true)
    : parseDashboardDateTime(startValue, "23:59:59", true);
  const hasExplicitTime = Boolean(startTimeValue || endTimeValue);
  const label = start
    ? end && end.getTime() !== start.getTime()
      ? isSameLocalDay(start, end)
        ? `${formatDashboardDateTime(start)} to ${end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
        : `${formatDashboardDateTime(start)} to ${formatDashboardDateTime(end)}`
      : hasExplicitTime
        ? formatDashboardDateTime(start)
        : formatDashboardDate(startValue)
    : startValue
      ? formatDashboardDate(startValue)
      : "";

  return {
    start,
    end,
    label,
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
  const [scheduleBatch, setScheduleBatch] = useState<Record<string, unknown> | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const examCompleted = isExamSubmittedStatus(dashboardData);
  const effectiveExamStatus = getEffectiveExamStatus(dashboardData, userData.id, scheduleBatch || dashboardData);
  const examStatusLabel = formatDashboardLabel(effectiveExamStatus);

  const closeExamActionDialog = () => {
    setExamActionMessage("");
    if (examCompleted) setExamCompletedDialogDismissed(true);
  };

  const handleStartExam = async () => {
    if (examCompleted) {
      setExamActionMessage("Your exam is completed.");
      return;
    }

    const currentExamWindow = getExamWindow(scheduleBatch || dashboardData);
    const currentTime = new Date();
    if (!currentExamWindow.start || currentTime < currentExamWindow.start) {
      setExamActionMessage("Exam Scheduled");
      return;
    }
    if (currentExamWindow.end && currentTime > currentExamWindow.end) {
      setExamActionMessage("Exam window closed.");
      return;
    }

    setExamActionLoading(true);
    setExamActionMessage("");

    try {
      const storedBatch = readStoredLoginBatch();
      const selectedScheduleBatch = scheduleBatch || {};
      const resolvedBatchId = Number(
        getDashboardBatchId(selectedScheduleBatch) ||
          storedBatch.batchId ||
          readNumberFromRecord(asDashboardRecord(dashboardData), ["batchId", "batch_id", "id"]) ||
          0
      ) || null;
      const resolvedBatchCode = String(
        getDashboardBatchCode(selectedScheduleBatch) ||
          storedBatch.batchCode ||
          readStringFromRecord(asDashboardRecord(dashboardData), ["batchCode", "batch_code", "code"]) ||
          ""
      ).trim();
      const resolvedLevel = String(
        readStringFromRecord(selectedScheduleBatch, ["level"]) ||
          storedBatch.level ||
          dashboardData?.currentStage ||
          ""
      ).trim();

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
      if (effectiveExamStatus === "IN_PROGRESS") {
        const capturesComplete = await hasCompletedExamCaptures(userData.id);

        if (capturesComplete) {
          localStorage.setItem(EXAM_PRECHECK_DONE_KEY, "true");
          localStorage.setItem(EXAM_INSTRUCTION_DONE_KEY, "true");
          sessionStorage.setItem(EXAM_PRECHECK_DONE_KEY, "true");
          sessionStorage.setItem(EXAM_INSTRUCTION_DONE_KEY, "true");
          navigate(`/Exam${precheckSearch ? `?${precheckSearch}` : ""}`);
          return;
        }

        clearExamStepFlags();
        navigate(`/Precheck${precheckSearch ? `?${precheckSearch}` : ""}`);
        return;
      }

      clearExamStepFlags();
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

  useEffect(() => {
    let isActive = true;

    if (!dashboardData || examCompleted) {
      setScheduleBatch(null);
      setScheduleLoading(false);
      return;
    }

    setScheduleLoading(true);
    resolveDashboardBatchSchedule(dashboardData)
      .then((batch) => {
        if (!isActive) return;
        setScheduleBatch(batch);
      })
      .catch((scheduleError) => {
        if (!isActive) return;
        console.warn("Unable to load dashboard exam schedule:", scheduleError);
        setScheduleBatch(null);
      })
      .finally(() => {
        if (isActive) setScheduleLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [dashboardData, examCompleted]);

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
  const stats = getStats(dashboardData, effectiveExamStatus);
  const competitionLevels = getDashboardLevels(dashboardData);
  const certificates = getDashboardCertificates(dashboardData);
  const progressValue = getProgressPercentage(dashboardData);
  const activeLevel = getActiveLevelIndex(dashboardData);
  const quizAvailable = canStartDashboardQuiz(dashboardData);
  const examWindow = getExamWindow(scheduleBatch || dashboardData);
  const now = new Date();
  const examDateIsToday = Boolean(examWindow.start && isSameLocalDay(now, examWindow.start));
  const examScheduledForFuture = Boolean(examWindow.start && now < examWindow.start && !examDateIsToday);
  const examNotStartedYet = !examWindow.start || now < examWindow.start;
  const examWindowClosed = Boolean(examWindow.end && now > examWindow.end);
  const examOpenNow = !examNotStartedYet && !examWindowClosed;
  const canShowStartExam = quizAvailable && !scheduleLoading && Boolean(examWindow.start) && examOpenNow;
  const scheduledExamLabel = examWindow.label ? `Exam Scheduled: ${examWindow.label}` : "Exam Scheduled";

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
            {canShowStartExam ? (
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
            ) : quizAvailable && scheduleLoading ? (
              <Button
                variant="secondary"
                size="sm"
                className="w-full cursor-not-allowed opacity-80 sm:w-auto"
                disabled
                title="Checking exam schedule"
              >
                <Clock className="mr-2 h-4 w-4" />
                Checking Schedule
              </Button>
            ) : quizAvailable && examScheduledForFuture ? (
              <Button
                variant="secondary"
                size="sm"
                className="w-full cursor-not-allowed opacity-80 sm:w-auto"
                disabled
                title={scheduledExamLabel}
              >
                <Clock className="mr-2 h-4 w-4" />
                Exam Scheduled
              </Button>
            ) : quizAvailable && examWindowClosed ? (
              <Badge className="w-fit bg-destructive/20 text-primary-foreground hover:bg-destructive/20">
                Absent
              </Badge>
            ) : (
              <Badge className="w-fit bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20">
                {formatDashboardLabel(effectiveExamStatus || "Exam Not Available")}
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
