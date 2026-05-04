import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Activity, AlertCircle, AlertTriangle, CheckCircle, ChevronRight,Clock, Flag, Languages, Menu, ShieldCheck, Video, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup } from "@/components/ui/radio-group";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BASE_URL1 } from "@/Service/api";
import { clearAuthSession } from "@/lib/session";
import {
  PNG_MIME_TYPE,
  canvasToBlob,
  getFileExtensionFromMimeType,
  getPreferredVideoMimeType,
} from "@/lib/evidenceMedia";
import {
  applyDashboardExamCompletionOverride,
  fetchDashboardData,
  getDashboardCandidateId,
  getDashboardUserId,
  getStoredDashboardUser,
  isDashboardQuizCompleted,
  saveDashboardExamCompletionOverride,
} from "@/lib/userDashboard";

interface Question {
  id: number;
  questionId: number;
  question: string;
  options: string[];
  correctAnswer: string;
  type: number;
}

interface ApiQuestion {
  id?: number;
  questionId?: number;
  question_id?: number;
  qb_id?: number;
  text?: string;
  question?: string;
  questionText?: string;
  options?: string[];
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  optiona?: string;
  optionb?: string;
  optionc?: string;
  optiond?: string;
  type?: number;
  correctAnswer?: string;
  correct_answer?: string;
  correctOption?: string | number;
  correct_option?: string | number;
  batchCode?: string;
}

interface Batch {
  id?: number;
  batch_id?: number;
  batchId?: number;
  batchCode: string;
  batch_code?: string;
  level: string;
  duration?: number;
  status?: string;
  questionBankId?: number;
  question_bank_id?: number;
  questionbankid?: number;
  questionBankName?: string;
  question_bank_name?: string;
  qbankName?: string;
  qbank_name?: string;
  bankName?: string;
  qbankId?: number;
  qbank_id?: number;
  qbid?: number;
  questionBank?: Partial<BatchQuestionBank>;
  question_bank?: Partial<BatchQuestionBank>;
}

interface BatchQuestionBank {
  id?: number;
  questionBankId?: number;
  question_bank_id?: number;
  qbankId?: number;
  qbank_id?: number;
  bankName?: string;
  name?: string;
  title?: string;
}

interface Candidate {
  candidate_id?: number;
  candidateId?: number;
  candidateID?: number;
  id?: number;
  name?: string;
  email?: string;
  enrollment_no?: string;
  enrollmentNo?: string;
  batchId?: number;
  batch_id?: number;
  batchCode?: string;
  batch_code?: string;
  questionBankId?: number;
  question_bank_id?: number;
  questionBankName?: string;
  question_bank_name?: string;
  qbankName?: string;
  qbank_name?: string;
  bankName?: string;
  qbankId?: number;
  qbank_id?: number;
  status?: string;
}

interface UIQuestion {
  id: number;
  questionId: number;
  question: string;
  options: string[];
  answered: boolean;
  flagged: boolean;
  type: number;
  answer: string | string[];
  correctAnswer?: string;
}

interface EvidenceReviewRow {
  questionId: number;
  question: string;
  questionType: number;
  responseId: string;
  responseText: string;
  correctAnswerId: string | null;
  correctAnswerText: string | null;
  isCorrect: boolean | null;
  marks: number | null;
  flagged: boolean;
  timeSpentSeconds: number;
}

interface EvidenceMediaEntry {
  id: string;
  type: "photo" | "video";
  url: string | null;
  filename: string;
  timestamp: string;
  uploaded: boolean;
  minute: number | null;
  mimeType?: string | null;
}

interface EvidenceSnapshot {
  candidate: {
    candidateId: number | null;
    name: string;
    batchCode: string;
    level: string | null;
  };
  overview: {
    startedAt: string;
    submittedAt: string | null;
    theoryTimeSeconds: number;
    tabSwitchCount: number;
    status: "in_progress" | "submitted" | "auto_submitted";
    locationName: string;
    latitude: number | null;
    longitude: number | null;
  };
  identity: {
    selfieUrl: string | null;
    documents: Array<{
      id: string;
      name: string;
      url: string | null;
      docId: string;
    }>;
  };
  media: EvidenceMediaEntry[];
  responses: EvidenceReviewRow[];
}

const normalizeToken = (value: string | null) => value?.replace(/^Bearer\s+/i, "").trim() || "";

const padNumber = (value: number) => String(value).padStart(2, "0");

const createUploadAudit = (date = new Date()) => ({
  uploadedAt: date.toISOString(),
  uploadDate: `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`,
  uploadTime: `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`,
});

const buildAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

const getAuthFetchOptions = (): RequestInit => {
  const authToken = normalizeToken(localStorage.getItem("token"));
  return authToken ? { headers: buildAuthHeaders(authToken) } : {};
};

const normalizeAlias = (value: string) => value.replace(/[_\-\s]/g, "").toLowerCase();

const readNumberByAliases = (value: Record<string, unknown> | null | undefined, aliases: string[]) => {
  if (!value) return null;

  const normalizedAliases = aliases.map(normalizeAlias);
  const matchedEntry = Object.entries(value).find(([key]) =>
    normalizedAliases.includes(normalizeAlias(key)),
  );

  if (!matchedEntry || matchedEntry[1] === null || matchedEntry[1] === undefined || matchedEntry[1] === "") {
    return null;
  }

  const parsed = Number(matchedEntry[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const unwrapApiData = (payload: unknown): unknown => {
  if (!payload || typeof payload !== "object") return payload;

  const record = payload as Record<string, unknown>;
  if ("data" in record) return record.data;
  if ("result" in record) return record.result;
  if ("items" in record) return record.items;
  if ("content" in record) return record.content;
  if ("rows" in record) return record.rows;
  if ("list" in record) return record.list;
  if ("users" in record) return record.users;
  if ("questions" in record) return record.questions;

  return payload;
};

const parseJsonResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { success: response.ok, message: text };
  }
};

const decodeJwtPayload = (token: string) => {
  const payloadPart = token.split(".")[1];
  if (!payloadPart) return null;

  const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return JSON.parse(atob(paddedBase64));
};

const getBatchIdFromRecord = (batch?: Partial<Batch> | null) =>
  readNumberByAliases(batch as Record<string, unknown>, ["batch_id", "batchId", "id"]) || null;

const getBatchCodeFromRecord = (batch?: Partial<Batch> | null) =>
  batch?.batchCode || batch?.batch_code || "";

const normalizeNameForMatch = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/[_\-\s]+/g, "")
    .toLowerCase();

const hasRelatedName = (left: unknown, right: unknown) => {
  const normalizedLeft = normalizeNameForMatch(left);
  const normalizedRight = normalizeNameForMatch(right);

  return Boolean(
    normalizedLeft &&
      normalizedRight &&
      (normalizedLeft === normalizedRight ||
        normalizedLeft.includes(normalizedRight) ||
        normalizedRight.includes(normalizedLeft)),
  );
};

const getBatchQuestionBankName = (batch?: Partial<Batch | Candidate> | null) => {
  if (!batch) return "";

  const batchRecord = batch as Record<string, unknown>;
  const nestedQuestionBank =
    batchRecord.questionBank && typeof batchRecord.questionBank === "object"
      ? (batchRecord.questionBank as Record<string, unknown>)
      : batchRecord.question_bank && typeof batchRecord.question_bank === "object"
        ? (batchRecord.question_bank as Record<string, unknown>)
        : null;
  const directNestedName =
    nestedQuestionBank?.bankName ||
    nestedQuestionBank?.name ||
    nestedQuestionBank?.title ||
    "";
  const stringQuestionBank =
    typeof batchRecord.questionBank === "string"
      ? batchRecord.questionBank
      : typeof batchRecord.question_bank === "string"
        ? batchRecord.question_bank
        : "";

  return String(
    batchRecord.questionBankName ||
      batchRecord.question_bank_name ||
      batchRecord.qbankName ||
      batchRecord.qbank_name ||
      batchRecord.bankName ||
      directNestedName ||
      stringQuestionBank ||
      "",
  ).trim();
};

const getBatchQuestionCount = (batch?: Partial<Batch> | null) =>
  readNumberByAliases(batch as Record<string, unknown>, [
    "total_questions",
    "totalQuestions",
    "questionCount",
    "questionsCount",
  ]) || 0;

const getDirectQuestionBankId = (record?: Partial<Batch | Candidate> | null) => {
  if (!record) return undefined;

  const batchRecord = record as Record<string, unknown>;
  const nestedQuestionBank =
    batchRecord.questionBank && typeof batchRecord.questionBank === "object"
      ? (batchRecord.questionBank as Record<string, unknown>)
      : batchRecord.question_bank && typeof batchRecord.question_bank === "object"
        ? (batchRecord.question_bank as Record<string, unknown>)
        : null;

  return (
    readNumberByAliases(batchRecord, [
      "questionBankId",
      "question_bank_id",
      "questionbankid",
      "qbankId",
      "qbank_id",
      "qbid",
    ]) ||
    readNumberByAliases(nestedQuestionBank, ["qbankId", "qbank_id", "questionBankId", "question_bank_id", "id"]) ||
    undefined
  );
};

const BATCH_QUESTION_BANK_STORAGE_KEY = "batchQuestionBankByKey";

const readBatchQuestionBankMap = (): Record<string, unknown> => {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(BATCH_QUESTION_BANK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const getBatchStorageKeys = (batch?: Partial<Batch> | null) => {
  if (!batch) return [];

  const batchRecord = batch as Record<string, unknown>;
  const batchId = readNumberByAliases(batchRecord, ["batch_id", "batchId", "id"]);
  const batchCode = String(batch.batchCode || batch.batch_code || batchRecord.code || "").trim();

  return [
    batchId ? `id:${batchId}` : "",
    batchCode ? `code:${batchCode.toLowerCase()}` : "",
  ].filter(Boolean);
};

const getRememberedBatchQuestionBankId = (batch?: Partial<Batch> | null) => {
  const linkMap = readBatchQuestionBankMap();

  for (const key of getBatchStorageKeys(batch)) {
    const matchedId = Number(linkMap[key]);
    if (Number.isFinite(matchedId) && matchedId > 0) return matchedId;
  }

  return undefined;
};

const rememberBatchQuestionBank = (batch: Partial<Batch> | null | undefined, qbankId?: number | null) => {
  if (!batch || !qbankId) return;
  const keys = getBatchStorageKeys(batch);
  if (keys.length === 0) return;

  const currentMap = readBatchQuestionBankMap();
  keys.forEach((key) => {
    currentMap[key] = qbankId;
  });
  localStorage.setItem(BATCH_QUESTION_BANK_STORAGE_KEY, JSON.stringify(currentMap));
};

const getBatchQuestionBankId = (batch?: Partial<Batch> | null) =>
  getDirectQuestionBankId(batch) || getRememberedBatchQuestionBankId(batch);

const getCandidateQuestionBankId = (candidate?: Partial<Candidate> | null) =>
  getDirectQuestionBankId(candidate);

const normalizeLevelValue = (value?: string | null) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized.includes("district")) return "district";
  if (normalized.includes("state")) return "state";
  if (normalized.includes("regional") || normalized.includes("region")) return "national";
  if (normalized.includes("national")) return "national";

  return "";
};

const getQuestionBankIdFromRecord = (bank: Record<string, unknown>) =>
  readNumberByAliases(bank, ["qbankId", "qbank_id", "questionBankId", "question_bank_id", "id"]);

const getQuestionBankNameFromRecord = (bank: Record<string, unknown>) =>
  String(bank.bankName || bank.name || bank.title || "").trim();

const getQuestionBankQuestionCountFromRecord = (bank: Record<string, unknown>) =>
  readNumberByAliases(bank, ["totalQuestions", "total_questions", "questionCount", "questionsCount"]) || 0;

const getQuestionBankLevelFromRecord = (bank: Record<string, unknown>) =>
  normalizeLevelValue(
    String(
      bank.level ||
        bank.qbLevel ||
        bank.qb_level ||
        bank.qbankLevel ||
        bank.qbank_level ||
        bank.questionBankLevel ||
        bank.question_bank_level ||
        bank.levelName ||
        bank.level_name ||
        bank.examLevel ||
        bank.exam_level ||
        getQuestionBankNameFromRecord(bank) ||
        "",
    ),
  );

const getQuestionRowsFromPayload = (payload: unknown) => {
  const data = unwrapApiData(payload);
  return Array.isArray(data) ? data : [];
};

const fetchQuestionRowsFromUrl = async (url: string) => {
  const response = await fetch(url, getAuthFetchOptions());
  const result = (await parseJsonResponse(response)) as { success?: boolean } | null;

  if (!response.ok || result?.success === false) return [];
  return getQuestionRowsFromPayload(result);
};

const getCandidateIdFromRecord = (candidate?: Candidate | null) =>
  Number(candidate?.candidate_id ?? candidate?.candidateId ?? candidate?.candidateID ?? candidate?.id) || null;

const getStoredCandidateId = () => {
  const storedCandidateId = getDashboardCandidateId(getStoredDashboardUser());
  return Number(storedCandidateId) || null;
};

const getStoredUserId = () => {
  const storedUserId = getDashboardUserId(getStoredDashboardUser());
  return Number(storedUserId) || null;
};

const ALREADY_SUBMITTED_MESSAGE =
  "You have already submitted your exam. Your exam is already submitted. You will be redirected to login page in 5 seconds.";

const persistResolvedCandidateId = (resolvedCandidateId: number) => {
  localStorage.setItem("candidateId", String(resolvedCandidateId));

  const storedUser = localStorage.getItem("userData");
  if (!storedUser) return;

  try {
    const parsedUser = JSON.parse(storedUser);
    localStorage.setItem(
      "userData",
      JSON.stringify({
        ...parsedUser,
        candidateId: resolvedCandidateId,
        candidateIdSource: parsedUser.candidateIdSource || "candidateLookup",
      }),
    );
  } catch {
    // Ignore invalid stale storage.
  }
};

export default function Exam() {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const processedImageMinutesRef = useRef<Set<number>>(new Set());
  const processedVideoMinutesRef = useRef<Set<number>>(new Set());
  const captureStepRef = useRef(0);
  const captureInProgressRef = useRef(false);
  const examEndingRef = useRef(false);
  const examStartTimeRef = useRef(Date.now());
  const timeRemainingRef = useRef(0);

  const [questions, setQuestions] = useState<UIQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[]>("");
  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({});
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

  const [loading, setLoading] = useState(true);
  const [examValidationFailed, setExamValidationFailed] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [examStarted, setExamStarted] = useState(false);
  const [cameraState, setCameraState] = useState<"idle" | "requesting" | "active" | "error">("idle");
  const [errorDetails, setErrorDetails] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examDurationMinutes, setExamDurationMinutes] = useState(60);
  const [minSubmitTime, setMinSubmitTime] = useState(2);
  const [batchCode, setBatchCode] = useState("");
  const [batchDetails, setBatchDetails] = useState<Batch | null>(null);
  const [candidateId, setCandidateId] = useState<number | null>(null);
  const [candidateName, setCandidateName] = useState<string>("");

  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showStartFullscreenDialog, setShowStartFullscreenDialog] = useState(true);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [showFinalFullscreenWarning, setShowFinalFullscreenWarning] = useState(false);
  const [showAnswerAlert, setShowAnswerAlert] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showCancelTestDialog, setShowCancelTestDialog] = useState(false);
  const [showSubmitSuccessPopup, setShowSubmitSuccessPopup] = useState(false);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);
  const [showAutoSubmitPopup, setShowAutoSubmitPopup] = useState(false);
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false);
  const [tabSwitchWarningCount, setTabSwitchWarningCount] = useState(0);
  const [autoSubmitReason, setAutoSubmitReason] = useState("");
  const [autoSubmitInProgress, setAutoSubmitInProgress] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [examFrozen, setExamFrozen] = useState(false);

  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [maxTabSwitchCount] = useState(10);
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);
  const [maxFullscreenViolations] = useState(3);
  const [faceAlert, setFaceAlert] = useState<{ message: string; duration: number } | null>(null);
  const [faceCount, setFaceCount] = useState(0);
  const [totalVideoChunks, setTotalVideoChunks] = useState(0);
  const [recordedVideos, setRecordedVideos] = useState<Array<{ minute: number; timestamp: Date; filename: string; uploaded: boolean; url?: string; mimeType?: string }>>([]);
  const [capturedSelfies, setCapturedSelfies] = useState<Array<{ timestamp: Date; filename: string; url?: string; uploaded: boolean; mimeType?: string }>>([]);
  const [batchId, setBatchId] = useState<number | null>(null);
  const answeredCount = useMemo(() => questions.filter((q) => q.answered).length, [questions]);
  const flaggedCount = useMemo(() => questions.filter((q) => q.flagged).length, [questions]);
  const allQuestionsAnswered = useMemo(
    () => questions.length > 0 && questions.every((q) => q.answered),
    [questions]
  );
  const remainingCount = Math.max(questions.length - answeredCount, 0);
  const progressPercentage = questions.length ? (answeredCount / questions.length) * 100 : 0;
  const timeElapsedPercentage = examDurationMinutes
    ? Math.min(100, ((examDurationMinutes * 60 - timeRemaining) / (examDurationMinutes * 60)) * 100)
    : 0;
  const currentQuestionTime = questions[currentQuestion]
    ? questionTimes[questions[currentQuestion].questionId] || 0
    : 0;
  const pendingCount = Math.max(questions.length - answeredCount, 0);
  const navigatorStats = [
    { label: "Current", value: questions.length ? `Q${currentQuestion + 1}` : "0", className: "bg-primary" },
    { label: "Answered", value: answeredCount, className: "bg-emerald-500" },
    { label: "Flagged", value: flaggedCount, className: "bg-red-500" },
    { label: "Pending", value: pendingCount, className: "bg-slate-200" },
  ];

  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

  const readStoredUser = () => {
    const userData = localStorage.getItem("userData");
    try {
      return userData ? JSON.parse(userData) : {};
    } catch {
      return {};
    }
  };

  const findEnrolledBatchForUser = useCallback(async (
    levelHint: string,
    preferredBatchId?: number | null,
    preferredBatchCode?: string,
  ) => {
    const storedUser = readStoredUser();
    const email = (localStorage.getItem("email") || storedUser.email || "").toLowerCase();
    const enrollmentNo =
      localStorage.getItem("enrollment_no") ||
      localStorage.getItem("enrollmentNo") ||
      storedUser.enrollment_no ||
      storedUser.enrollmentNo ||
      "";
    const storedCandidateId = getStoredCandidateId();

    if (!email && !enrollmentNo && !storedCandidateId) return null;

    const normalizedLevelHint = normalizeLevelValue(levelHint) || "district";
    const levels = Array.from(new Set([normalizedLevelHint, "district", "state", "national"]));
    const normalizedPreferredBatchCode = normalizeNameForMatch(preferredBatchCode);
    const matchedEnrollments: Array<{
      batch: Batch;
      candidate: Candidate;
      candidateIdMatched: boolean;
      preferredBatchMatched: boolean;
      preferredCodeMatched: boolean;
    }> = [];

    const getLatestRecordTime = (batch: Batch, candidate: Candidate) => {
      const batchRecord = batch as unknown as Record<string, unknown>;
      const candidateRecord = candidate as unknown as Record<string, unknown>;
      const values = [
        batchRecord.start_date,
        batchRecord.startDate,
        batchRecord.end_date,
        batchRecord.endDate,
        batchRecord.created_at,
        batchRecord.createdAt,
        batchRecord.updated_at,
        batchRecord.updatedAt,
        candidateRecord.joined_at,
        candidateRecord.joinedAt,
        candidateRecord.enrolled_at,
        candidateRecord.enrolledAt,
        candidateRecord.created_at,
        candidateRecord.createdAt,
      ];

      return Math.max(
        0,
        ...values.map((value) => {
          const timestamp = new Date(String(value || "")).getTime();
          return Number.isFinite(timestamp) ? timestamp : 0;
        }),
      );
    };

    const getEnrollmentRank = (match: (typeof matchedEnrollments)[number]) => {
      const batchId = getBatchIdFromRecord(match.batch) || 0;
      const status = String(match.batch.status || "").trim().toLowerCase();
      const hasQuestionBankLink =
        Boolean(getBatchQuestionBankId(match.batch)) ||
        Boolean(getCandidateQuestionBankId(match.candidate));

      return (
        (match.preferredBatchMatched ? 1_000_000_000 : 0) +
        (match.preferredCodeMatched ? 500_000_000 : 0) +
        (match.candidateIdMatched ? 250_000_000 : 0) +
        (hasQuestionBankLink ? 50_000_000 : 0) +
        (status.includes("active") || status.includes("live") ? 10_000_000 : 0) +
        (status.includes("upcoming") ? 5_000_000 : 0) +
        (status.includes("completed") ? -5_000_000 : 0) +
        Math.floor(getLatestRecordTime(match.batch, match.candidate) / 100_000) +
        batchId
      );
    };

    for (const level of levels) {
      try {
        const batchResponse = await fetch(
          `${BASE_URL1}/batches?level=${encodeURIComponent(level)}`,
          getAuthFetchOptions(),
        );
        const batchResult = await parseJsonResponse(batchResponse);
        const batchData = unwrapApiData(batchResult);
        const levelBatches: Batch[] =
          batchResult?.success !== false && Array.isArray(batchData) ? batchData : [];

        const candidateResults = await Promise.all(
          levelBatches.map(async (batch) => {
            try {
              const batchId = getBatchIdFromRecord(batch);
              if (!batchId) return { batch, candidates: [] };

              const candidateResponse = await fetch(
                `${BASE_URL1}/candidates?batchId=${encodeURIComponent(batchId)}`,
                getAuthFetchOptions(),
              );
              const candidateResult = await parseJsonResponse(candidateResponse);
              const candidateData = unwrapApiData(candidateResult);

              return {
                batch,
                candidates:
                  candidateResult?.success !== false && Array.isArray(candidateData) ? candidateData : [],
              };
            } catch {
              return { batch, candidates: [] };
            }
          })
        );

        for (const { batch, candidates } of candidateResults) {
          const batchId = getBatchIdFromRecord(batch);
          const batchCode = getBatchCodeFromRecord(batch);
          const preferredBatchMatched = Boolean(preferredBatchId && batchId === preferredBatchId);
          const preferredCodeMatched =
            Boolean(normalizedPreferredBatchCode) &&
            normalizeNameForMatch(batchCode) === normalizedPreferredBatchCode;

          const batchMatches = candidates.filter((candidate: Candidate) => {
            const candidateId = getCandidateIdFromRecord(candidate);
            const candidateEmail = candidate.email?.toLowerCase();
            const candidateEnrollment = candidate.enrollment_no || candidate.enrollmentNo || "";
            return (
              (storedCandidateId && candidateId === storedCandidateId) ||
              (email && candidateEmail === email) ||
              (enrollmentNo && candidateEnrollment === enrollmentNo)
            );
          });

          batchMatches.forEach((candidate) =>
            matchedEnrollments.push({
              batch,
              candidate,
              candidateIdMatched: Boolean(
                storedCandidateId && getCandidateIdFromRecord(candidate) === storedCandidateId,
              ),
              preferredBatchMatched,
              preferredCodeMatched,
            }),
          );
        }
      } catch (error) {
        console.error(`Failed to search enrolled batch for ${level}:`, error);
      }
    }

    if (!matchedEnrollments.length) return null;

    return [...matchedEnrollments].sort((a, b) => getEnrollmentRank(b) - getEnrollmentRank(a))[0];
  }, []);

const getExamParams = useCallback(async () => {
  const params = new URLSearchParams(location.search);
  const storedUser = readStoredUser();

  const level =
    normalizeLevelValue(
      params.get("level") ||
        localStorage.getItem("level") ||
        storedUser.level,
    ) || "district";
const preferredBatchId =
  Number(params.get("batchId") || storedUser.batchId || storedUser.batch_id) || null;
const preferredBatchCode =
  params.get("batchCode") ||
  storedUser.batchCode ||
  storedUser.batch_code ||
  "";
const enrolled = await findEnrolledBatchForUser(level, preferredBatchId, preferredBatchCode);

if (!enrolled) {
  return {
    batchId: null,
    batchCode: "",
    level,
    batch: null as Batch | null,
    candidate: null as Candidate | null,
  };
}

return {
  batchId: getBatchIdFromRecord(enrolled.batch),
  batchCode: getBatchCodeFromRecord(enrolled.batch),
  level: enrolled.batch.level || level,
  batch: enrolled.batch,
  candidate: enrolled.candidate,
};
}, [findEnrolledBatchForUser, location.search]);

  const mergeCandidateQuestionBank = useCallback((batch: Batch | null, candidate: Candidate | null) => {
    if (!batch) return batch;

    const candidateQuestionBankId = getCandidateQuestionBankId(candidate);
    if (!candidateQuestionBankId || getBatchQuestionBankId(batch)) return batch;

    return {
      ...batch,
      questionBankId: candidateQuestionBankId,
      question_bank_id: candidateQuestionBankId,
      qbankId: candidateQuestionBankId,
      qbank_id: candidateQuestionBankId,
    };
  }, []);

  const fetchBatchDetailsById = useCallback(
    async (resolvedBatchId: number, level: string, fallbackBatch: Batch | null) => {
      let resolvedBatchDetails = fallbackBatch;

      try {
        const response = await fetch(`${BASE_URL1}/batches/${resolvedBatchId}`, getAuthFetchOptions());
        const result = await parseJsonResponse(response);
        const data = unwrapApiData(result);
        const detailRecord = Array.isArray(data) ? data[0] : data;

        if (response.ok && result?.success !== false && detailRecord && typeof detailRecord === "object") {
          resolvedBatchDetails = {
            ...(fallbackBatch || {}),
            ...(detailRecord as Batch),
          };
        }
      } catch (error) {
        console.warn("Batch detail lookup failed; trying level batch list.", error);
      }

      if (getBatchQuestionBankId(resolvedBatchDetails)) return resolvedBatchDetails;

      try {
        const response = await fetch(
          `${BASE_URL1}/batches?level=${encodeURIComponent(level)}`,
          getAuthFetchOptions(),
        );
        const result = await parseJsonResponse(response);
        const data = unwrapApiData(result);

        if (response.ok && result?.success !== false && Array.isArray(data)) {
          const matchedBatch = data.find(
            (item: Batch) => Number(getBatchIdFromRecord(item)) === Number(resolvedBatchId),
          );

          if (matchedBatch) {
            resolvedBatchDetails = {
              ...(resolvedBatchDetails || {}),
              ...matchedBatch,
            };
          }
        }
      } catch (error) {
        console.error("Failed to load batch details:", error);
      }

      return resolvedBatchDetails;
    },
    [],
  );

  const findQuestionBankIdForBatch = useCallback(async (
    resolvedBatchId: number,
    level: string,
    batch?: Batch | null,
  ) => {
    try {
      const bankResponse = await fetch(`${BASE_URL1}/questionBank/get-all`, getAuthFetchOptions());
      const bankResult = await parseJsonResponse(bankResponse);
      const bankData = unwrapApiData(bankResult);

      if (!bankResponse.ok || bankResult?.success === false || !Array.isArray(bankData)) {
        return undefined;
      }

      const normalizedLevel = normalizeLevelValue(level);
      const levelBanks = bankData
        .filter((bank): bank is Record<string, unknown> => Boolean(bank && typeof bank === "object"))
        .filter((bank) => {
          const bankLevel = getQuestionBankLevelFromRecord(bank);
          return !normalizedLevel || !bankLevel || bankLevel === normalizedLevel;
        });

      const linkedBankName = getBatchQuestionBankName(batch);
      const normalizedLinkedBankName = normalizeNameForMatch(linkedBankName);
      const batchCode = getBatchCodeFromRecord(batch);
      const batchCodePrefix = batchCode?.split(/[_\-\s]+/)[0] || "";

      if (normalizedLinkedBankName) {
        const matchedByName = levelBanks.find(
          (bank) => hasRelatedName(getQuestionBankNameFromRecord(bank), linkedBankName),
        );
        const matchedBankId = matchedByName ? getQuestionBankIdFromRecord(matchedByName) : null;
        if (matchedBankId) return matchedBankId;
      }

      if (batchCode || batchCodePrefix) {
        const matchedByBatchCode = levelBanks.find(
          (bank) =>
            hasRelatedName(getQuestionBankNameFromRecord(bank), batchCode) ||
            hasRelatedName(getQuestionBankNameFromRecord(bank), batchCodePrefix),
        );
        const matchedBankId = matchedByBatchCode ? getQuestionBankIdFromRecord(matchedByBatchCode) : null;
        if (matchedBankId) return matchedBankId;
      }

      const banksWithQuestions: Array<{ bankId: number; count: number; bank: Record<string, unknown> }> = [];

      for (const bank of levelBanks) {
        const bankId = getQuestionBankIdFromRecord(bank);
        if (!bankId) continue;

        try {
          const bankQuestions = await fetchQuestionRowsFromUrl(`${BASE_URL1}/questions/bank/${bankId}`);
          if (bankQuestions.length > 0) {
            banksWithQuestions.push({ bankId, count: bankQuestions.length, bank });
          }
        } catch {
          // Continue checking other banks.
        }
      }

      const batchQuestionCount = getBatchQuestionCount(batch);
      if (batchQuestionCount > 0) {
        const banksWithSameLoadedCount = banksWithQuestions.filter((bank) => bank.count === batchQuestionCount);
        if (banksWithSameLoadedCount.length === 1) {
          return banksWithSameLoadedCount[0].bankId;
        }

        const banksWithSameCount = levelBanks.filter(
          (bank) => getQuestionBankQuestionCountFromRecord(bank) === batchQuestionCount,
        );
        if (banksWithSameCount.length === 1) {
          return getQuestionBankIdFromRecord(banksWithSameCount[0]) || undefined;
        }
      }

      if (banksWithQuestions.length === 1) {
        return banksWithQuestions[0].bankId;
      }

      if (banksWithQuestions.length > 1) {
        const latestBankWithQuestions = [...banksWithQuestions].sort((a, b) => b.bankId - a.bankId)[0];
        console.warn(
          `No direct question bank link found for batch ${resolvedBatchId}; using latest question bank with questions.`,
          latestBankWithQuestions.bankId,
        );
        return latestBankWithQuestions.bankId;
      }

      const bankIds = levelBanks
        .map((bank) => getQuestionBankIdFromRecord(bank))
        .filter((bankId): bankId is number => Boolean(bankId));

      return bankIds.length === 1 ? bankIds[0] : undefined;
    } catch (error) {
      console.warn("Question bank lookup failed for batch:", error);
      return undefined;
    }
  }, []);

  const loadCandidateInfo = useCallback(async () => {
  const {
    batchId: resolvedBatchId,
    batchCode: resolvedBatchCode,
    level,
    batch,
    candidate,
  } = await getExamParams();

  let duration = 60;
  let resolvedBatchDetails = mergeCandidateQuestionBank(batch, candidate);

  if (!resolvedBatchId) {
    setExamValidationFailed(true);
    setValidationMessage(
      "you are not enrolled in this batch please connect with admin ."
    );
    setLoading(false);
    return null;
  }

  setBatchId(resolvedBatchId);
  localStorage.setItem("batchId", String(resolvedBatchId));

  if (resolvedBatchCode) {
    setBatchCode(resolvedBatchCode);
    localStorage.setItem("batchCode", resolvedBatchCode);
  }

  const resolvedCandidateId = getCandidateIdFromRecord(candidate) || getStoredCandidateId();

  if (resolvedCandidateId) {
    setCandidateId(resolvedCandidateId);
    persistResolvedCandidateId(resolvedCandidateId);
    setCandidateName(candidate?.name || "");
  }

  if (batch) {
    const mergedBatch = mergeCandidateQuestionBank(batch, candidate);
    setBatchDetails(mergedBatch);
    resolvedBatchDetails = mergedBatch;
    duration = Number(mergedBatch?.duration) || duration;

    const nextBatchCode = getBatchCodeFromRecord(mergedBatch);
    if (nextBatchCode) {
      setBatchCode(nextBatchCode);
      localStorage.setItem("batchCode", nextBatchCode);
    }
  }

  const detailedBatch = await fetchBatchDetailsById(resolvedBatchId, level, resolvedBatchDetails);
  if (detailedBatch) {
    resolvedBatchDetails = detailedBatch;
    setBatchDetails(detailedBatch);
    duration = Number(detailedBatch.duration) || duration;

    const nextBatchCode = getBatchCodeFromRecord(detailedBatch);
    if (nextBatchCode) {
      setBatchCode(nextBatchCode);
      localStorage.setItem("batchCode", nextBatchCode);
    }
  }

  setExamDurationMinutes(duration);
  setTimeRemaining(duration * 60);
  setMinSubmitTime(2);

  return {
    batchId: resolvedBatchId,
    batch: resolvedBatchDetails,
  };
}, [fetchBatchDetailsById, getExamParams, mergeCandidateQuestionBank]);

  const resolveExamBatchCode = useCallback(async () => {
    const storedUser = readStoredUser();
    const directBatchCode =
      batchCode ||
      localStorage.getItem("batchCode") ||
      storedUser.batchCode ||
      storedUser.batch_code ||
      "";

    if (directBatchCode) {
      localStorage.setItem("batchCode", directBatchCode);
      return directBatchCode;
    }

    const examParams = await getExamParams();
    if (examParams.batchCode) {
      setBatchCode(examParams.batchCode);
      localStorage.setItem("batchCode", examParams.batchCode);
      if (examParams.level) {
        localStorage.setItem("level", examParams.level);
      }
      return examParams.batchCode;
    }

    return "";
  }, [batchCode, getExamParams]);

const normalizeOptionValue = (value: unknown) => {
  if (value === null || value === undefined) return "";

  if (typeof value === "object") {
    const optionRecord = value as Record<string, unknown>;
    return String(
      optionRecord.text ||
        optionRecord.option ||
        optionRecord.value ||
        optionRecord.label ||
        optionRecord.name ||
        "",
    ).trim();
  }

  return String(value).trim();
};

const isMeaningfulOption = (value: string) =>
  value.replace(/[.\-_,;:\s]/g, "").trim().length > 0;

const parseOptionsValue = (value: unknown) => {
  if (Array.isArray(value)) return value.map(normalizeOptionValue);

  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map(normalizeOptionValue);
  } catch {
    // Fall back to delimiter parsing below.
  }

  return trimmed.split(/\r?\n|\s*\|\s*/).map(normalizeOptionValue);
};

const getQuestionOptions = (q: ApiQuestion, type: number) => {
  const fieldOptions = [
    q.optionA || q.optiona,
    q.optionB || q.optionb,
    q.optionC || q.optionc,
    q.optionD || q.optiond,
  ].map(normalizeOptionValue);
  const arrayOptions = parseOptionsValue(q.options);
  const sourceOptions = fieldOptions.some(isMeaningfulOption) ? fieldOptions : arrayOptions;
  const uniqueOptions: string[] = [];

  sourceOptions.forEach((option) => {
    if (!isMeaningfulOption(option)) return;
    if (uniqueOptions.some((existing) => existing.trim().toLowerCase() === option.trim().toLowerCase())) return;
    uniqueOptions.push(option);
  });

  return uniqueOptions.slice(0, type === 3 ? 2 : 4);
};

 const mapApiQuestion = (q: ApiQuestion, index: number): UIQuestion => {
  const type = Number(q.type) || 1;

  const questionId = q.questionId || q.question_id || q.id || q.qb_id || index + 1;
  const options = getQuestionOptions(q, type);
  const correctAnswer =
    q.correctAnswer ??
    q.correct_answer ??
    q.correctOption ??
    q.correct_option ??
    "";

  return {
    id: index + 1,
    questionId,
    question: q.text || q.question || q.questionText || `Question ${index + 1}`,
    options,
    type,
    answered: false,
    flagged: false,
    answer: type === 2 ? [] : "",
    correctAnswer: String(correctAnswer),
  };
};

const loadQuestions = useCallback(async (resolvedBatchId: number, questionBankId?: number) => {
  try {
    if (!resolvedBatchId) {
      throw new Error("Batch ID missing");
    }

    const fetchOptions = getAuthFetchOptions();

    const urls = questionBankId
      ? [
          `${BASE_URL1}/questions/bank/${questionBankId}/batch/${resolvedBatchId}`,
          `${BASE_URL1}/questions/bank/${questionBankId}`,
          `${BASE_URL1}/questions/batch/${resolvedBatchId}`,
        ]
      : [
          `${BASE_URL1}/questions/batch/${resolvedBatchId}`,
        ];

    let result: { success?: boolean; message?: string; data?: unknown; questions?: unknown; result?: unknown; items?: unknown } | null = null;
    let apiQuestions: ApiQuestion[] = [];
    let lastError = "Failed to load exam questions";

    for (const url of urls) {
      const response = await fetch(url, fetchOptions);
      const nextResult = (await parseJsonResponse(response)) as {
        success?: boolean;
        message?: string;
        data?: unknown;
        questions?: unknown;
        result?: unknown;
        items?: unknown;
      } | null;

      if (!response.ok || nextResult?.success === false) {
        lastError = nextResult?.message || lastError;
        continue;
      }

      result = nextResult;
      const questionData = unwrapApiData(nextResult);
      apiQuestions = Array.isArray(questionData) ? questionData : [];

      if (apiQuestions.length > 0) {
        break;
      }
    }

    if (!result || result.success === false) {
      throw new Error(lastError);
    }

    const formatted = apiQuestions.map(mapApiQuestion);

    if (!formatted.length) {
      throw new Error(
        questionBankId
          ? "No questions found in this batch's linked question bank. Please check the question bank questions."
          : "No questions found for this batch. Please check the linked question bank questions."
      );
    }

    setQuestions(formatted);
    setCurrentQuestion(0);
    setSelectedAnswer(formatted[0]?.type === 2 ? [] : "");
  } catch (error: unknown) {
    setExamValidationFailed(true);
    setValidationMessage(
      error instanceof Error
        ? error.message
        : "Failed to load exam questions. Please contact support."
    );
  } finally {
    setLoading(false);
  }
}, []);
useEffect(() => {
  let isActive = true;
  let redirectTimer: number | undefined;

  const init = async () => {
    setLoading(true);

    const userId = getStoredUserId();
    if (userId) {
      try {
        const dashboardData = applyDashboardExamCompletionOverride(
          await fetchDashboardData(userId),
          userId,
        );

        if (!isActive) return;

        if (isDashboardQuizCompleted(dashboardData)) {
          setExamValidationFailed(true);
          setValidationMessage(ALREADY_SUBMITTED_MESSAGE);
          setLoading(false);
          redirectTimer = window.setTimeout(() => {
            clearAuthSession("manual");
            navigate("/login", { replace: true });
          }, 5000);
          return;
        }
      } catch (error) {
        console.warn("Unable to verify submitted exam status:", error);
      }
    }

    if (!isActive) return;

    const candidateInfo = await loadCandidateInfo();
    const resolvedBatchId = candidateInfo?.batchId || null;
    let questionBankId = getBatchQuestionBankId(candidateInfo?.batch);

    if (!questionBankId && resolvedBatchId) {
      questionBankId = await findQuestionBankIdForBatch(
        resolvedBatchId,
        candidateInfo?.batch?.level || localStorage.getItem("level") || "district",
        candidateInfo?.batch,
      );
    }

    if (questionBankId && candidateInfo?.batch) {
      rememberBatchQuestionBank(candidateInfo.batch, questionBankId);
    }

    if (!isActive) return;

    if (resolvedBatchId && questionBankId) {
      await loadQuestions(resolvedBatchId, questionBankId);
    } else if (resolvedBatchId) {
      await loadQuestions(resolvedBatchId);
    }
  };

  void init();

  return () => {
    isActive = false;
    if (redirectTimer) window.clearTimeout(redirectTimer);
  };
}, [
  loadCandidateInfo,
  loadQuestions,
  findQuestionBankIdForBatch,
  navigate,
]);

  // Upload to evidence API using the same multipart flow as instruction page
  const uploadToEvidenceAPI = useCallback(async (
    file: Blob,
    type: "photo" | "video",
    fileName: string
  ): Promise<boolean> => {
    try {
      const authToken = normalizeToken(localStorage.getItem("token"));
      const resolvedBatchCode = await resolveExamBatchCode();
      const uploadAudit = createUploadAudit();

      if (!authToken) {
        console.error("Evidence upload blocked: missing auth token");
        return false;
      }
      if (!resolvedBatchCode) {
        console.error("Evidence upload blocked: missing batch code");
        return false;
      }

      const teamMemberId = candidateId || Number(localStorage.getItem("candidateId")) || getStoredCandidateId();
      if (!teamMemberId) {
        console.error("Evidence upload blocked: missing candidate ID");
        return false;
      }

      const teamMemberName = candidateName || localStorage.getItem("userName") || "Candidate";
      const formData = new FormData();

      formData.append("file", file, fileName);
      formData.append("teamMemberId", String(teamMemberId));
      formData.append("teamMemberName", teamMemberName);
      formData.append("type", type);
      formData.append("batchCode", resolvedBatchCode);
      formData.append("uploadedAt", uploadAudit.uploadedAt);
      formData.append("uploadDate", uploadAudit.uploadDate);
      formData.append("uploadTime", uploadAudit.uploadTime);

      const response = await fetch(`${BASE_URL1}/evidence/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || `${type} upload failed`);
      }

      return true;
    } catch (error) {
      console.error(`Failed to upload ${type}:`, error);
      return false;
    }
  }, [candidateId, candidateName, resolveExamBatchCode]);

  useEffect(() => {
    const preventEvent = (event: Event) => event.preventDefault();
    const blockedEvents = ["copy", "paste", "cut", "contextmenu", "selectstart", "dragstart", "drop"];

    blockedEvents.forEach((event) => document.addEventListener(event, preventEvent, true));
    return () => blockedEvents.forEach((event) => document.removeEventListener(event, preventEvent, true));
  }, []);

  useEffect(() => {
    if (questions.length > 0 && currentQuestion < questions.length) {
      const current = questions[currentQuestion];
      setSelectedAnswer(current.type === 2 ? (Array.isArray(current.answer) ? current.answer : []) : (current.answer as string) || "");
    }
  }, [currentQuestion, questions]);

  useEffect(() => {
    if (!examStarted || autoSubmitInProgress || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((remaining) => {
        if (remaining <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examStarted, autoSubmitInProgress, timeRemaining]);

  useEffect(() => {
    if (!examStarted) return;

    const interval = setInterval(() => {
      const current = questions[currentQuestion];
      if (!current) return;
      setQuestionTimes((prev) => ({
        ...prev,
        [current.questionId]: (prev[current.questionId] || 0) + 1,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestion, questions, examStarted]);

  useEffect(() => {
    if (!faceAlert) return;

    const interval = setInterval(() => {
      setFaceAlert((prev) => {
        if (!prev || prev.duration <= 1) return null;
        return { ...prev, duration: prev.duration - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [faceAlert]);

  useEffect(() => {
    if (!showTabSwitchWarning) return;

    const timer = setTimeout(() => {
      setShowTabSwitchWarning(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showTabSwitchWarning, tabSwitchWarningCount]);

  useEffect(() => {
    if (!examStarted || cameraState !== "active") return;

    const interval = setInterval(() => {
      if (document.hidden) return;
      setFaceCount((prev) => prev + 1);
    }, 7000);

    return () => clearInterval(interval);
  }, [cameraState, examStarted]);

  useEffect(() => {
    if (!examStarted) return;

    let lastSwitchTime = 0;
    const handleVisibilityChange = () => {
      const now = Date.now();
      if (!document.hidden || examEndingRef.current || now - lastSwitchTime < 1000) return;

      lastSwitchTime = now;
      setTabSwitchCount((prev) => {
        const next = prev + 1;
        if (next >= maxTabSwitchCount) {
          setShowTabSwitchWarning(false);
          setAutoSubmitReason(`Maximum tab switches (${maxTabSwitchCount}) exceeded`);
          setShowAutoSubmitPopup(true);
          setTimeout(() => {
            setShowAutoSubmitPopup(false);
            handleAutoSubmit();
          }, 2500);
        } else {
          setTabSwitchWarningCount(next);
          setShowTabSwitchWarning(true);
        }
        return next;
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [examStarted, maxTabSwitchCount]);

  useEffect(() => {
    if (!examStarted) return;

    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;

      if (!isFullscreen && !showSubmitDialog && !showCancelTestDialog && !showTimeUpDialog && !examEndingRef.current) {
        setFullscreenExitCount((prev) => {
          const next = prev + 1;
          if (next >= maxFullscreenViolations) {
            setShowFinalFullscreenWarning(true);
            setExamFrozen(true);
            setTimeout(() => {
              if (!document.fullscreenElement && !examEndingRef.current) {
                setAutoSubmitReason(`Fullscreen violation (${maxFullscreenViolations} times exceeded)`);
                setShowAutoSubmitPopup(true);
                setTimeout(() => {
                  setShowAutoSubmitPopup(false);
                  handleAutoSubmit();
                }, 2500);
              }
            }, 5000);
          } else {
            setShowFullscreenWarning(true);
            setExamFrozen(true);
          }
          return next;
        });
      }

      if (isFullscreen) {
        setExamFrozen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const blockedCombos =
        event.key === "F11" ||
        (event.ctrlKey && ["r", "R", "p", "w", "W"].includes(event.key)) ||
        (event.ctrlKey && event.shiftKey && ["I", "i"].includes(event.key)) ||
        (event.metaKey && ["r", "w"].includes(event.key)) ||
        (event.altKey && event.key === "Tab") ||
        event.key === "PrintScreen";

      if (blockedCombos) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!examEndingRef.current) {
        event.preventDefault();
        event.returnValue = "Are you sure you want to leave? The exam will be auto-submitted.";
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    examStarted,
    maxFullscreenViolations,
    showCancelTestDialog,
    showSubmitDialog,
    showTimeUpDialog,
  ]);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const requestFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      return true;
    } catch {
      return false;
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // Browser may block this if fullscreen is already gone.
    }
  }, []);

  const finishExamAndOpenDashboard = useCallback(async () => {
    ["preExamDone", "batchCode", "batchId", "level", "enrollment_no", "enrollmentNo"].forEach((key) =>
      localStorage.removeItem(key),
    );
    sessionStorage.clear();
    await exitFullscreen();
    navigate("/dashboard", { replace: true });
  }, [exitFullscreen, navigate]);

  const attachStreamToVideo = useCallback(async (stream: MediaStream) => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    video.muted = true;
    video.playsInline = true;
    await video.play().catch(() => undefined);
  }, []);

  const startCamera = useCallback(async () => {
    const activeStream = mediaStreamRef.current;
    if (activeStream?.getTracks().some((track) => track.readyState === "live")) {
      await attachStreamToVideo(activeStream);
      setCameraState("active");
      return;
    }

    setCameraState("requesting");
    setErrorDetails("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      await attachStreamToVideo(stream);

      setCameraState("active");
    } catch {
      setCameraState("error");
      setErrorDetails("Camera access failed. Please check browser permissions.");
    }
  }, [attachStreamToVideo]);

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    if (cameraState === "active" && mediaStreamRef.current) {
      attachStreamToVideo(mediaStreamRef.current);
    }
  }, [attachStreamToVideo, cameraState, examStarted]);

  const startExam = useCallback(async () => {
    const fullscreenSuccess = await requestFullscreen();
    if (!fullscreenSuccess) {
      setShowStartFullscreenDialog(true);
      return;
    }

    await startCamera();
    setExamStarted(true);
    setShowStartFullscreenDialog(false);
    examStartTimeRef.current = Date.now();
  }, [requestFullscreen, startCamera]);

  const updateCurrentQuestionAnswer = useCallback(
    (answer: string | string[]) => {
      setQuestions((prev) => {
        if (!prev[currentQuestion]) return prev;

        const updated = [...prev];
        const isAnswered =
          updated[currentQuestion].type === 2
            ? Array.isArray(answer) && answer.length > 0
            : typeof answer === "string" && answer.trim().length > 0;

        updated[currentQuestion] = {
          ...updated[currentQuestion],
          answer,
          answered: isAnswered,
        };

        return updated;
      });
    },
    [currentQuestion]
  );

  const getEffectiveQuestions = useCallback(() => {
    return questions.map((question, index) => {
      if (index !== currentQuestion) return question;

      const isAnswered =
        question.type === 2
          ? Array.isArray(selectedAnswer) && selectedAnswer.length > 0
          : typeof selectedAnswer === "string" && selectedAnswer.trim().length > 0;

      return { ...question, answer: selectedAnswer, answered: isAnswered };
    });
  }, [currentQuestion, questions, selectedAnswer]);

  const getAnswerForSave = (question: UIQuestion): string => {
    if (question.type === 2 && Array.isArray(question.answer)) {
      return question.answer
        .map((answer) => parseInt(answer, 10))
        .filter((answer) => !Number.isNaN(answer))
        .sort((a, b) => a - b)
        .join("-");
    }

    if (typeof question.answer === "string") return question.answer.trim();
    return "";
  };

  const normalizeChoiceAnswer = (value: string) =>
    value
      .split(/[^0-9]+/)
      .map((part) => parseInt(part, 10))
      .filter((part) => !Number.isNaN(part))
      .sort((a, b) => a - b)
      .join("-");

  const getAnswerPreview = (question: UIQuestion, answerId: string) => {
    if (!answerId) return "Not answered";

    if (question.type === 1 || question.type === 2 || question.type === 3) {
      const optionIndexes = normalizeChoiceAnswer(answerId)
        .split("-")
        .map((part) => parseInt(part, 10))
        .filter((part) => !Number.isNaN(part));

      if (!optionIndexes.length) return answerId;

      return optionIndexes
        .map((index) => question.options[index - 1] || `Option ${index}`)
        .join(", ");
    }

    return answerId;
  };

  const getCorrectnessState = (question: UIQuestion, answerId: string) => {
    const correctAnswerId = question.correctAnswer?.trim();
    if (!correctAnswerId) {
      return {
        correctAnswerId: null,
        correctAnswerText: null,
        isCorrect: null as boolean | null,
        marks: null as number | null,
      };
    }

    const normalizedResponse =
      question.type === 1 || question.type === 2 || question.type === 3
        ? normalizeChoiceAnswer(answerId)
        : answerId.trim().toLowerCase();
    const normalizedCorrect =
      question.type === 1 || question.type === 2 || question.type === 3
        ? normalizeChoiceAnswer(correctAnswerId)
        : correctAnswerId.trim().toLowerCase();
    const isCorrect = Boolean(normalizedResponse) && normalizedResponse === normalizedCorrect;

    return {
      correctAnswerId,
      correctAnswerText: getAnswerPreview(question, correctAnswerId),
      isCorrect,
      marks: isCorrect ? 1 : 0,
    };
  };

  const persistEvidenceSnapshot = useCallback(
    (
      effectiveQuestions: UIQuestion[],
      locationSnapshot: {
        latitude: number | null;
        longitude: number | null;
        locationName: string;
      },
      isFinalSubmit = false,
      isAutoSubmit = false
    ) => {
      const responses: EvidenceReviewRow[] = effectiveQuestions.map((question) => {
        const responseId = getAnswerForSave(question);
        const correctness = getCorrectnessState(question, responseId);

        return {
          questionId: question.questionId,
          question: question.question,
          questionType: question.type,
          responseId,
          responseText: getAnswerPreview(question, responseId),
          correctAnswerId: correctness.correctAnswerId,
          correctAnswerText: correctness.correctAnswerText,
          isCorrect: correctness.isCorrect,
          marks: correctness.marks,
          flagged: question.flagged,
          timeSpentSeconds: questionTimes[question.questionId] || 0,
        };
      });

      const media: EvidenceMediaEntry[] = [
        ...capturedSelfies.map((photo, index) => ({
          id: `photo-${index + 1}`,
          type: "photo" as const,
          url: photo.url || null,
          filename: photo.filename,
          timestamp: photo.timestamp.toISOString(),
          uploaded: photo.uploaded,
          minute: index + 1,
          mimeType: photo.mimeType || null,
        })),
        ...recordedVideos.map((video, index) => ({
          id: `video-${index + 1}`,
          type: "video" as const,
          url: video.url || null,
          filename: video.filename,
          timestamp: video.timestamp.toISOString(),
          uploaded: video.uploaded,
          minute: video.minute,
          mimeType: video.mimeType || null,
        })),
      ].sort((first, second) => new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime());

      const snapshot: EvidenceSnapshot = {
        candidate: {
          candidateId: candidateId || Number(localStorage.getItem("candidateId")) || getStoredCandidateId(),
          name: candidateName || localStorage.getItem("userName") || "Candidate",
          batchCode: batchCode || localStorage.getItem("batchCode") || "",
          level: batchDetails?.level || localStorage.getItem("level") || null,
        },
        overview: {
          startedAt: new Date(examStartTimeRef.current).toISOString(),
          submittedAt: isFinalSubmit || isAutoSubmit ? new Date().toISOString() : null,
          theoryTimeSeconds: examDurationMinutes * 60 - timeRemainingRef.current,
          tabSwitchCount,
          status: isAutoSubmit ? "auto_submitted" : isFinalSubmit ? "submitted" : "in_progress",
          locationName: locationSnapshot.locationName,
          latitude: locationSnapshot.latitude,
          longitude: locationSnapshot.longitude,
        },
        identity: {
          selfieUrl: capturedSelfies[0]?.url || null,
          documents: [],
        },
        media,
        responses,
      };

      localStorage.setItem("examEvidenceSummary", JSON.stringify(snapshot));
    },
    [
      batchCode,
      batchDetails?.level,
      candidateId,
      candidateName,
      capturedSelfies,
      examDurationMinutes,
      questionTimes,
      recordedVideos,
      tabSwitchCount,
    ]
  );

  const createMediaFileName = useCallback(
    (mediaType: "photo" | "video", mimeType: string, minute?: number) => {
      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getFullYear()).slice(-2)}`;
      const timeStr = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;
      const extension = getFileExtensionFromMimeType(mimeType);

      if (mediaType === "video" && minute !== undefined) {
        return `exam_${mediaType}_${dateStr}_${timeStr}_minute_${minute + 1}_of_${examDurationMinutes}.${extension}`;
      }

      return `exam_${mediaType}_${dateStr}_${timeStr}.${extension}`;
    },
    [examDurationMinutes]
  );

  const getCandidateIdFromToken = useCallback(() => {
    const token = normalizeToken(localStorage.getItem("token"));
    if (!token) return null;

    try {
      const payload = decodeJwtPayload(token);
      if (!payload) return null;
      return payload.candidateId || payload.candidate_id || payload.candidateID || null;
    } catch (e) {
      console.error("Invalid token");
      return null;
    }
  }, []);

  const buildSubmissionPayload = useCallback(
    (isAutoSubmit = false) => {
      const optionParts: string[] = [];
      const timeParts: string[] = [];
      const flagParts: string[] = [];

      getEffectiveQuestions().forEach((question) => {
        const answer = getAnswerForSave(question);

        if (!question.answered && !isAutoSubmit) return;
        if (answer) optionParts.push(`${question.questionId}_${answer}`);

        flagParts.push(`${question.questionId}_${question.flagged ? "1" : "0"}`);
        timeParts.push(`${question.questionId}_${questionTimes[question.questionId] || 0}`);
      });

      return {
        Option: optionParts.join(","),
        Time: timeParts.join(","),
        Flag: flagParts.join(","),
        TotalTimeTaken: examDurationMinutes * 60 - timeRemainingRef.current,
        IsAutoSubmit: isAutoSubmit,
      };
    },
    [examDurationMinutes, getEffectiveQuestions, questionTimes]
  );

  // ✅ FIXED saveAnswers function - 403 Error Solution
  const saveAnswers = useCallback(
    async (isFinalSubmit = false, isAutoSubmit = false) => {
      if (!examStarted && !isAutoSubmit) return false;

      setIsSaving(true);

      try {
        const effectiveQuestions = getEffectiveQuestions();
        const resolvedBatchCode = await resolveExamBatchCode();

        // Get token from localStorage
        const authToken = normalizeToken(localStorage.getItem("token"));
        
        if (!authToken) {
          console.error(" No token found in localStorage");
          setIsSaving(false);
          return false;
        }
        if (!resolvedBatchCode) {
          console.error(" Batch code missing");
          setIsSaving(false);
          return false;
        }

        const finalCandidateId =
          candidateId || Number(localStorage.getItem("candidateId")) || getStoredCandidateId() || getCandidateIdFromToken();
        if (!finalCandidateId) {
          console.error(" Candidate ID missing");
          setIsSaving(false);
          return false;
        }

        // Get location if available
        let latitude: number | null = null;
        let longitude: number | null = null;

        if (navigator.geolocation) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 })
            );
            latitude = pos.coords.latitude;
            longitude = pos.coords.longitude;
          } catch {
            console.warn("⚠️ Location not available");
          }
        }

        const locationSnapshot = {
          latitude,
          longitude,
          locationName: latitude && longitude ? `Lat: ${latitude}, Long: ${longitude}` : "Location not available",
        };

        // Get current question
        const currentQ = effectiveQuestions[currentQuestion];
        if (!currentQ) {
          setIsSaving(false);
          return false;
        }

        const answer = getAnswerForSave(currentQ);

        if (!answer && !isFinalSubmit && !isAutoSubmit) {
          setIsSaving(false);
          return true;
        }

        const submittedAt = new Date().toISOString();
        const totalTimeTaken = examDurationMinutes * 60 - timeRemainingRef.current;
        const isCompletedSubmit = isFinalSubmit || isAutoSubmit;
        const payload = {
          candidateId: finalCandidateId,
          questionId: currentQ.questionId,
          ansId: answer ? String(answer) : null,
          batchCode: resolvedBatchCode,
          tabSwitchCount,
          isActive: true,
          isFinalSubmit,
          isAutoSubmit,
          quizStatus: isCompletedSubmit ? "COMPLETED" : "IN_PROGRESS",
          examStatus: isCompletedSubmit ? "COMPLETED" : "IN_PROGRESS",
          status: isCompletedSubmit ? "COMPLETED" : "IN_PROGRESS",
          submitTime: submittedAt,
          submittedAt,
          questionCount: effectiveQuestions.length,
          totalTimeTaken,
          latitude,
          longitude,
          locationName: locationSnapshot.locationName,
        };

        persistEvidenceSnapshot(effectiveQuestions, locationSnapshot, isFinalSubmit, isAutoSubmit);

        console.log("🚀 Sending payload:", payload);
        console.log("🔐 TOKEN:", authToken);

        // ✅ FIXED: Proper headers format
        const response = await fetch(`${BASE_URL1}/responses/save`, {
          method: "POST",
          headers: buildAuthHeaders(authToken),
          body: JSON.stringify(payload),
        });

        console.log("📡 Response status:", response.status);
        console.log("📡 Response status text:", response.statusText);

        // Parse response
        let responseData;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          responseData = await response.json();
          console.log("📡 Response data:", responseData);
        } else {
          const textResponse = await response.text();
          console.log("📡 Text response:", textResponse);
          responseData = { message: textResponse };
        }

        if (!response.ok) {
          console.error(" Save failed with status:", response.status);
          console.error(" Error details:", responseData);
          
          // Show user-friendly error message
          if (response.status === 403) {
            alert("Authentication failed. Please login again.");
            navigate("/login");
          } else if (response.status === 401) {
            alert("Session expired. Please login again.");
            navigate("/login");
          }
          
          setIsSaving(false);
          return false;
        }

        setLastSaveTime(new Date());

        if (isCompletedSubmit) {
          const finalUserId = getStoredUserId();

          saveDashboardExamCompletionOverride({
            userId: finalUserId || finalCandidateId,
            candidateId: finalCandidateId,
            completedAt: submittedAt,
            currentStage: batchDetails?.level || localStorage.getItem("level") || null,
          });

          try {
            await fetch(`${BASE_URL1}/exam/complete`, {
              method: "POST",
              headers: buildAuthHeaders(authToken),
              body: JSON.stringify({
                userId: finalUserId || finalCandidateId,
                candidateId: finalCandidateId,
                batchCode: resolvedBatchCode,
                quizStatus: "COMPLETED",
                examStatus: "COMPLETED",
                status: "COMPLETED",
                completedAt: submittedAt,
                submittedAt,
                totalTimeTaken,
                isAutoSubmit,
              }),
            });
          } catch (completeError) {
            console.warn("Exam completion sync failed; dashboard will use local completion state.", completeError);
          }
        }

        setIsSaving(false);
        return true;

      } catch (error) {
        console.error("Save answers failed:", error);
        setIsSaving(false);
        return false;
      }
    },
    [
      examStarted,
      candidateId,
      batchCode,
      batchDetails?.level,
      tabSwitchCount,
      getEffectiveQuestions,
      currentQuestion,
      getCandidateIdFromToken,
      navigate,
      persistEvidenceSnapshot,
      resolveExamBatchCode,
    ]
  );

  const stopCameraAndRecording = useCallback(async () => {
    if (mediaRecorderRef.current?.state === "recording") {
      await new Promise<void>((resolve) => {
        if (!mediaRecorderRef.current) {
          resolve();
          return;
        }
        mediaRecorderRef.current.onstop = () => resolve();
        mediaRecorderRef.current.stop();
      });
    }

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setCameraState("idle");
  }, []);

  const handleAutoSubmit = useCallback(async () => {
    if (examEndingRef.current) return;

    examEndingRef.current = true;
    setAutoSubmitInProgress(true);
    updateCurrentQuestionAnswer(selectedAnswer);

    await stopCameraAndRecording();
    await saveAnswers(true, true);

    setTimeout(async () => {
      await finishExamAndOpenDashboard();
    }, 1500);
  }, [
    finishExamAndOpenDashboard,
    saveAnswers,
    selectedAnswer,
    stopCameraAndRecording,
    updateCurrentQuestionAnswer,
  ]);

  const capturePhoto = useCallback(
    async (minute: number) => {
      if (!examStarted || examEndingRef.current || !videoRef.current || cameraState !== "active") return;
      if (processedImageMinutesRef.current.has(minute)) return;

      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      processedImageMinutesRef.current.add(minute);

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToBlob(canvas, PNG_MIME_TYPE);
      const mimeType = blob.type || PNG_MIME_TYPE;
      const fileName = createMediaFileName("photo", mimeType, minute);

      const url = URL.createObjectURL(blob);
      const uploadSuccess = await uploadToEvidenceAPI(blob, "photo", fileName);

      setCapturedSelfies((prev) => [
        ...prev,
        {
          timestamp: new Date(),
          filename: fileName,
          url,
          uploaded: uploadSuccess,
          mimeType,
        },
      ]);
    },
    [cameraState, createMediaFileName, examStarted, uploadToEvidenceAPI]
  );

  const startVideoRecording = useCallback(
    async (minute: number) => {
      if (!examStarted || examEndingRef.current || !mediaStreamRef.current) return;
      if (processedVideoMinutesRef.current.has(minute)) return;
      if (mediaRecorderRef.current?.state === "recording") return;

      processedVideoMinutesRef.current.add(minute);
      recordedChunksRef.current = [];

      try {
        const mimeType = getPreferredVideoMimeType();
        const recorder = new MediaRecorder(mediaStreamRef.current, {
          mimeType,
          videoBitsPerSecond: 800_000,
        });

        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data?.size) recordedChunksRef.current.push(event.data);
        };

        recorder.start(1000);

        await new Promise((resolve) => setTimeout(resolve, 15000));

        if (recorder.state === "recording") {
          recorder.stop();
          
          const uploadSuccess = await new Promise<boolean>((resolve) => {
            recorder.onstop = async () => {
              const videoBlob = new Blob(recordedChunksRef.current, { type: mimeType });
              const previewUrl = URL.createObjectURL(videoBlob);
              const finalMimeType = videoBlob.type || mimeType;
              const fileName = createMediaFileName("video", finalMimeType, minute);
              const success = await uploadToEvidenceAPI(videoBlob, "video", fileName);

              resolve(success);
              setRecordedVideos((prev) => [
                ...prev,
                {
                  minute,
                  timestamp: new Date(),
                  filename: fileName,
                  uploaded: success,
                  url: previewUrl,
                  mimeType: finalMimeType,
                },
              ]);
            };
          });

          setTotalVideoChunks((prev) => prev + 1);
        }
      } catch (error) {
        console.error("Video recording failed:", error);
        processedVideoMinutesRef.current.delete(minute);
      }
    },
    [createMediaFileName, examStarted, uploadToEvidenceAPI]
  );

  useEffect(() => {
    if (!examStarted || cameraState !== "active" || examEndingRef.current) return;

    captureStepRef.current = 0;
    captureInProgressRef.current = false;

    const runCaptureStep = async () => {
      if (examEndingRef.current || captureInProgressRef.current) return;

      captureInProgressRef.current = true;

      try {
        const step = captureStepRef.current;
        const slot = Math.floor(step / 2);

        if (step % 2 === 0) {
          await capturePhoto(slot);
        } else {
          await startVideoRecording(slot);
        }

        captureStepRef.current = step + 1;
      } finally {
        captureInProgressRef.current = false;
      }
    };

    void runCaptureStep();
    const interval = setInterval(() => {
      void runCaptureStep();
    }, 30000);

    return () => {
      clearInterval(interval);
      captureInProgressRef.current = false;
    };
  }, [cameraState, examStarted, capturePhoto, startVideoRecording]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  };

  const hasMinimumTimeElapsed = useCallback(() => {
    const elapsedSeconds = (Date.now() - examStartTimeRef.current) / 1000;
    return elapsedSeconds >= minSubmitTime * 60;
  }, [minSubmitTime]);

  const isAnswerValid = () => {
    const current = questions[currentQuestion];
    if (!current) return false;
    if (current.type === 2) return Array.isArray(selectedAnswer) && selectedAnswer.length > 0;
    return typeof selectedAnswer === "string" && selectedAnswer.trim().length > 0;
  };

  const handleSingleChoiceSelect = (optionIndex: number) => {
    if (!examStarted) return;

    const answer = String(optionIndex + 1);
    setSelectedAnswer(answer);
    updateCurrentQuestionAnswer(answer);
  };

  const handleCheckboxChange = (optionIndex: number, checked: boolean) => {
    if (!examStarted || questions[currentQuestion]?.type !== 2) return;

    const optionValue = String(optionIndex + 1);
    const currentValues = Array.isArray(selectedAnswer) ? selectedAnswer : [];
    const nextValues = checked
      ? [...new Set([...currentValues, optionValue])]
      : currentValues.filter((value) => value !== optionValue);

    setSelectedAnswer(nextValues);
    updateCurrentQuestionAnswer(nextValues);
  };

  const handleTextAnswerChange = (value: string) => {
    if (!examStarted) return;
    setSelectedAnswer(value);
    updateCurrentQuestionAnswer(value);
  };

  const handlePreviousQuestion = () => {
    if (!examStarted) return;
    updateCurrentQuestionAnswer(selectedAnswer);
    setCurrentQuestion((prev) => Math.max(0, prev - 1));
  };

  const handleNextQuestion = () => {
    if (!examStarted) return;
    updateCurrentQuestionAnswer(selectedAnswer);
    setCurrentQuestion((prev) => Math.min(questions.length - 1, prev + 1));
  };

  const handleSaveAndNext = async () => {
    if (!examStarted || !isAnswerValid() || isSaving) return;

    try {
      updateCurrentQuestionAnswer(selectedAnswer);

      const success = await saveAnswers(false, false);
      if (!success) {
        console.error("Save failed, staying on same question");
        return;
      }

      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion((prev) => prev + 1);
      }

    } catch (error) {
      console.error("handleSaveAndNext error:", error);
    }
  };

  const handleFlagQuestion = () => {
    if (!examStarted) return;

    setQuestions((prev) => {
      const updated = [...prev];
      if (updated[currentQuestion]) {
        updated[currentQuestion] = {
          ...updated[currentQuestion],
          flagged: !updated[currentQuestion].flagged,
        };
      }
      return updated;
    });
  };

  const handleQuestionClick = (index: number) => {
    if (!examStarted) return;
    updateCurrentQuestionAnswer(selectedAnswer);
    setCurrentQuestion(index);
  };

  const handleSubmit = () => {
    if (!examStarted) return;

    updateCurrentQuestionAnswer(selectedAnswer);
    const effectiveQuestions = getEffectiveQuestions();
    const effectiveAllAnswered = effectiveQuestions.every((question) => question.answered);
    const effectiveFlaggedCount = effectiveQuestions.filter((question) => question.flagged).length;

    if (!hasMinimumTimeElapsed()) return;

    if (!effectiveAllAnswered) {
      const firstUnanswered = effectiveQuestions.findIndex((question) => !question.answered);
      if (firstUnanswered !== -1) setCurrentQuestion(firstUnanswered);
      setShowAnswerAlert(true);
      return;
    }

    if (effectiveFlaggedCount > 0) {
      const firstFlagged = effectiveQuestions.findIndex((question) => question.flagged);
      if (firstFlagged !== -1) setCurrentQuestion(firstFlagged);
      return;
    }

    setShowSubmitDialog(true);
  };

  const confirmSubmit = async () => {
    examEndingRef.current = true;
    updateCurrentQuestionAnswer(selectedAnswer);

    const finalPhotoSlot = processedImageMinutesRef.current.size;
    await capturePhoto(finalPhotoSlot);
    await stopCameraAndRecording();

    const saved = await saveAnswers(true, false);
    if (!saved) {
      examEndingRef.current = false;
      setShowSubmitDialog(false);
      return;
    }

    setShowSubmitDialog(false);
    setShowSubmitSuccessPopup(true);

    setTimeout(async () => {
      await finishExamAndOpenDashboard();
    }, 2500);
  };

  const handleCancelTest = () => setShowCancelTestDialog(true);

  const confirmCancelTest = async () => {
    examEndingRef.current = true;
    updateCurrentQuestionAnswer(selectedAnswer);
    await saveAnswers(false, false);
    await stopCameraAndRecording();
    setShowCancelTestDialog(false);
    await exitFullscreen();
    navigate("/");
  };

  const handleTimeUp = async () => {
    if (autoSubmitInProgress || examEndingRef.current) return;

    setAutoSubmitInProgress(true);
    examEndingRef.current = true;
    setAutoSubmitReason("Time has expired");
    setShowAutoSubmitPopup(true);
    updateCurrentQuestionAnswer(selectedAnswer);

    await stopCameraAndRecording();

    setTimeout(async () => {
      setShowAutoSubmitPopup(false);
      await saveAnswers(true, true);
      setShowTimeUpDialog(true);
      setTimeout(async () => {
        setShowTimeUpDialog(false);
        await finishExamAndOpenDashboard();
      }, 2500);
    }, 2500);
  };

  const getQuestionTypeLabel = (type: number) => {
    switch (type) {
      case 1:
        return "Single Choice";
      case 2:
        return "Multiple Choice";
      case 3:
        return "True/False";
      case 4:
        return "Fill in the Blanks";
      case 5:
        return "Short Answer";
      case 6:
        return "Essay";
      default:
        return "Question";
    }
  };

  const renderQuestionByType = () => {
    const current = questions[currentQuestion];
    if (!current) return null;

    if (current.type === 1 || current.type === 3) {
      const isTrueFalse = current.type === 3;

      return (
        <RadioGroup
          value={selectedAnswer as string}
          onValueChange={(value) => {
            setSelectedAnswer(value);
            updateCurrentQuestionAnswer(value);
          }}
          className="space-y-3"
        >
          {current.options.map((option, index) => {
            const value = String(index + 1);
            const selected = selectedAnswer === value;

            return (
              <button
                key={`${current.questionId}-${index}-${option}`}
                type="button"
                onClick={() => handleSingleChoiceSelect(index)}
                className={`w-full p-4 border rounded-lg text-left transition-all ${
                  selected
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full mr-3 text-sm font-semibold ${
                      selected ? "bg-primary text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {isTrueFalse ? (index === 0 ? "T" : "F") : String.fromCharCode(65 + index)}
                  </div>
                  <Label className="text-base cursor-pointer">{option}</Label>
                </div>
              </button>
            );
          })}
        </RadioGroup>
      );
    }

    if (current.type === 2) {
      return (
        <div className="space-y-3">
          {current.options.map((option, index) => {
            const value = String(index + 1);
            const checked = Array.isArray(selectedAnswer) && selectedAnswer.includes(value);

            return (
              <button
                key={`${current.questionId}-${index}-${option}`}
                type="button"
                onClick={() => handleCheckboxChange(index, !checked)}
                className={`w-full p-4 border rounded-lg text-left transition-all ${
                  checked
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(isChecked) => handleCheckboxChange(index, Boolean(isChecked))}
                    className="mr-3"
                  />
                  <Label className="text-base cursor-pointer">{option}</Label>
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    if (current.type === 4) {
      return (
        <Input
          value={selectedAnswer as string}
          onChange={(event) => handleTextAnswerChange(event.target.value)}
          placeholder="Enter your answer here..."
          className="h-12 text-lg"
        />
      );
    }

    return (
      <Textarea
        value={selectedAnswer as string}
        onChange={(event) => handleTextAnswerChange(event.target.value)}
        placeholder={current.type === 5 ? "Write your short answer here..." : "Write your essay here..."}
        className="min-h-[150px] text-base resize-y"
      />
    );
  };

  const renderQuestionButton = (question: UIQuestion, index: number, closeOnSelect = false) => {
    const isCurrent = currentQuestion === index;
    const statusClasses = isCurrent
      ? "bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20"
      : question.flagged
        ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
        : question.answered
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50";

    return (
      <button
        key={question.id}
        type="button"
        onClick={() => {
          handleQuestionClick(index);
          if (closeOnSelect) setShowMobileNav(false);
        }}
        aria-label={`Question ${question.id}${isCurrent ? ", current" : ""}`}
        className={`relative flex aspect-square min-h-8 items-center justify-center rounded-md border text-xs font-semibold transition-all sm:text-sm ${statusClasses}`}
      >
        {question.id}
        {question.flagged && !isCurrent && (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
        )}
      </button>
    );
  };

  const renderQuestionNavigator = (isMobile = false) => (
    <div className={`rounded-lg border bg-white shadow-sm ${isMobile ? "p-4" : "p-3 sticky top-24"}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold leading-none">Questions</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {answeredCount}/{questions.length} answered
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {questions.length} total
        </span>
      </div>

      <div
        className={`grid gap-1.5 overflow-y-auto pr-1 ${isMobile ? "max-h-[55vh]" : "max-h-[360px]"}`}
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(2rem, 1fr))" }}
      >
        {questions.map((question, index) => renderQuestionButton(question, index, isMobile))}
      </div>

      <div className="my-4 border-t" />

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {navigatorStats.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${item.className}`} />
              <span className="truncate text-slate-700">{item.label}</span>
            </div>
            <span className="text-xs font-semibold text-slate-500">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-semibold tabular-nums">{Math.round(progressPercentage)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {lastSaveTime && (
        <div className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
          Last saved: {lastSaveTime.toLocaleTimeString()}
        </div>
      )}
    </div>
  );

  if (examValidationFailed) {
    const isAlreadySubmitted = validationMessage.toLowerCase().includes("already submitted");
    const handleValidationExit = () => {
      if (isAlreadySubmitted) {
        clearAuthSession("manual");
        navigate("/login", { replace: true });
        return;
      }

      navigate("/");
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center p-6 sm:p-8 bg-card rounded-xl border max-w-md w-full">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Exam Not Available</h2>
          <p className="text-muted-foreground mb-4 text-sm sm:text-base">{validationMessage}</p>
          <Button onClick={handleValidationExit} className="w-full sm:w-auto">
            {isAlreadySubmitted ? "Go to Login" : "Return to Home"}
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-base sm:text-lg">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center p-6 sm:p-8 bg-card rounded-xl border max-w-md w-full">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Questions Available</h2>
          <Button onClick={() => navigate("/")} className="w-full sm:w-auto">
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Dialog
        open={showAutoSubmitPopup}
        onOpenChange={(open) => {
          if (!open) setShowAutoSubmitPopup(false);
        }}
      >
        <DialogContent className="sm:max-w-md" onInteractOutside={(event) => event.preventDefault()}>
          <div className="text-center py-6">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-10 w-10 text-orange-600" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-orange-600 mb-2">Auto-Submitting Exam</DialogTitle>
            <DialogDescription className="text-base">
              {autoSubmitReason}
              <br />
              Your exam is being auto-submitted. Please wait...
            </DialogDescription>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-orange-600 h-2 rounded-full animate-pulse" style={{ width: "100%" }} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showTabSwitchWarning}
        onOpenChange={(open) => {
          if (!open) setShowTabSwitchWarning(false);
        }}
      >
        <DialogContent className="sm:max-w-sm" onInteractOutside={(event) => event.preventDefault()}>
          <div className="text-center py-5">
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              </div>
            </div>
            <DialogTitle className="text-xl font-bold text-amber-700 mb-2">Tab Switch Warning</DialogTitle>
            <DialogDescription className="text-base">
              Tab switch detected ({tabSwitchWarningCount}). Please stay on the exam screen.
            </DialogDescription>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-amber-100">
              <div className="h-full w-full rounded-full bg-amber-500 animate-pulse" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showStartFullscreenDialog}
        onOpenChange={(open) => {
          if (!open && !examStarted) setShowStartFullscreenDialog(true);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-8 w-8" />
              <DialogTitle className="text-xl font-bold">Fullscreen Required to Start Exam</DialogTitle>
            </div>
            <DialogDescription className="text-base mt-2">
              Please enter fullscreen mode to start your exam. The exam will not begin until you are in fullscreen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={startExam}>
              Enter Fullscreen & Start Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showFullscreenWarning && !showFinalFullscreenWarning}
        onOpenChange={(open) => {
          if (!open) {
            setShowFullscreenWarning(false);
            setExamFrozen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" onInteractOutside={(event) => event.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-8 w-8" />
              <DialogTitle className="text-2xl font-bold">Fullscreen Required!</DialogTitle>
            </div>
            <DialogDescription className="text-base mt-2">
              You have exited fullscreen mode. This is violation {fullscreenExitCount} of {maxFullscreenViolations}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <p className="text-red-800 font-medium">Warning</p>
              <p className="text-red-700 text-sm mt-1">Please return to fullscreen mode immediately to continue your exam.</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={async () => {
                await requestFullscreen();
                setShowFullscreenWarning(false);
                setExamFrozen(false);
              }}
              className="w-full"
            >
              Return to Fullscreen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showFinalFullscreenWarning}
        onOpenChange={(open) => {
          if (!open && !examEndingRef.current) setShowFinalFullscreenWarning(false);
        }}
      >
        <DialogContent className="sm:max-w-md" onInteractOutside={(event) => event.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-8 w-8" />
              <DialogTitle className="text-2xl font-bold">Final Warning!</DialogTitle>
            </div>
            <DialogDescription className="text-base mt-2">
              This is your {maxFullscreenViolations}rd fullscreen violation. Your exam will be auto-submitted if you do not return to fullscreen.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-100 border-l-4 border-red-600 p-4">
              <p className="text-red-900 font-bold">Immediate Action Required</p>
              <p className="text-red-800 text-sm mt-1">Return to fullscreen mode now to prevent auto-submission.</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={async () => {
                await requestFullscreen();
                setShowFinalFullscreenWarning(false);
                setExamFrozen(false);
              }}
              className="w-full"
            >
              Return to Fullscreen Immediately
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showTimeUpDialog}
        onOpenChange={(open) => {
          if (!open) setShowTimeUpDialog(false);
        }}
      >
        <DialogContent className="sm:max-w-md" onInteractOutside={(event) => event.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-8 w-8" />
              <DialogTitle className="text-2xl font-bold">Time's Up! Exam Auto-Submitted</DialogTitle>
            </div>
            <DialogDescription className="text-base mt-2">
              Your exam time has expired. Your answers have been automatically submitted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
              <p className="text-amber-800 font-medium text-lg">
                {answeredCount} out of {questions.length} questions answered
              </p>
              <p className="text-amber-700 text-sm mt-2">Unanswered questions have been left blank.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubmitSuccessPopup} onOpenChange={setShowSubmitSuccessPopup}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(event) => event.preventDefault()}>
          <div className="text-center py-6">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-green-600 mb-2">Exam Submitted Successfully!</DialogTitle>
            <DialogDescription className="text-base">
              Your answers have been recorded.
              <br />
              Photos and videos have been saved as evidence.
              <br />
              You will be logged out in a moment.
            </DialogDescription>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{ width: "100%" }} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {examFrozen && !document.fullscreenElement && examStarted && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <div className="bg-card p-6 sm:p-8 rounded-xl border max-w-md w-full text-center shadow-2xl">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold mb-2">Exam Frozen</h2>
            <p className="text-muted-foreground mb-6 text-sm sm:text-base">
              Please return to fullscreen mode to continue your exam.
            </p>
            <Button
              onClick={requestFullscreen}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg w-full sm:w-auto"
            >
              Return to Fullscreen
            </Button>
          </div>
        </div>
      )}

      {examStarted && (
        <>
          <div className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
            <div className="container mx-auto px-3 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setShowMobileNav(!showMobileNav)}>
                  {showMobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
                <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold leading-tight">NursaQuiz</div>
                  <div className="hidden sm:block text-xs text-muted-foreground">
                    {batchCode ? `Batch: ${batchCode}` : "Secure theory assessment"}
                    {batchDetails?.level ? ` | ${batchDetails.level}` : ""}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <Select value={currentLanguage} onValueChange={setCurrentLanguage}>
                  <SelectTrigger className="h-9 w-[130px]">
                    <Languages className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>

                <div
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm sm:text-base border ${
                    timeRemaining <= 300
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-primary/10 text-primary border-primary/20"
                  }`}
                >
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-bold text-sm sm:text-base tabular-nums">{formatTime(timeRemaining)}</span>
                  <span className="hidden sm:inline text-xs opacity-70">({examDurationMinutes} min)</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleCancelTest} className="hidden md:flex border-red-300 text-red-600 text-xs sm:text-sm">
                  Cancel Test
                </Button>
              </div>
            </div>
            <div className="h-1 bg-slate-100">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${timeElapsedPercentage}%` }} />
            </div>
          </div>

          {showMobileNav && (
            <div className="lg:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setShowMobileNav(false)}>
              <div
                className="absolute top-0 left-0 h-full w-4/5 max-w-sm bg-white p-4 overflow-y-auto shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-base">Question Navigator</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowMobileNav(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {renderQuestionNavigator(true)}

                <Button variant="outline" onClick={handleCancelTest} className="w-full mt-4 border-red-300 text-red-600">
                  Cancel Test
                </Button>
              </div>
            </div>
          )}

          <div className="container mx-auto px-3 sm:px-4 py-4 pb-24 lg:pb-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg border bg-white p-3 shadow-sm">
                <div className="text-xs text-muted-foreground">Answered</div>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <span className="text-2xl font-bold text-emerald-600">{answeredCount}</span>
                  <span className="text-xs text-muted-foreground">of {questions.length}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progressPercentage}%` }} />
                </div>
              </div>
              <div className="rounded-lg border bg-white p-3 shadow-sm">
                <div className="text-xs text-muted-foreground">Remaining</div>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <span className="text-2xl font-bold text-slate-800">{remainingCount}</span>
                  <span className="text-xs text-muted-foreground">questions</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-slate-400" style={{ width: `${100 - progressPercentage}%` }} />
                </div>
              </div>
              <div className="rounded-lg border bg-white p-3 shadow-sm">
                <div className="text-xs text-muted-foreground">Flagged</div>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <span className="text-2xl font-bold text-red-600">{flaggedCount}</span>
                  <span className="text-xs text-muted-foreground">review</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-red-500" style={{ width: `${questions.length ? (flaggedCount / questions.length) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="rounded-lg border bg-white p-3 shadow-sm">
                <div className="text-xs text-muted-foreground">Current Question Time</div>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <span className="text-2xl font-bold text-primary tabular-nums">{formatTime(currentQuestionTime).slice(3)}</span>
                  <span className="text-xs text-muted-foreground">Q{currentQuestion + 1}</span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" />
                  <span>Live tracking</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="hidden lg:block lg:w-1/5 xl:w-1/6">
                {renderQuestionNavigator()}
              </div>

              <div className="flex-1 lg:w-3/5 xl:w-2/3">
                <div className="bg-white p-4 sm:p-6 rounded-lg border shadow-sm">
                  <div className="flex flex-wrap justify-between items-center gap-3 mb-4 sm:mb-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg sm:text-xl font-semibold">Question {currentQuestion + 1}</span>
                      <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-full whitespace-nowrap">
                        {getQuestionTypeLabel(questions[currentQuestion]?.type || 1)}
                      </span>
                      {questions[currentQuestion]?.flagged && (
                        <span className="text-xs bg-red-50 text-red-700 border border-red-100 px-2 py-1 rounded-full flex items-center gap-1">
                          <Flag className="w-3 h-3" /> Flagged
                        </span>
                      )}
                      {questions[currentQuestion]?.answered && (
                        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded-full">
                          Answer saved
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFlagQuestion}
                      className={questions[currentQuestion]?.flagged ? "border-red-200 text-red-600 hover:bg-red-50" : ""}
                    >
                      <Flag className="w-4 h-4 mr-1" />
                      {questions[currentQuestion]?.flagged ? "Unflag" : "Flag"}
                    </Button>
                  </div>

                  <div className="rounded-lg border bg-slate-50 p-4 sm:p-5 mb-4 sm:mb-6">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Question {currentQuestion + 1} of {questions.length}
                    </div>
                    <h2 className="text-base sm:text-lg md:text-xl font-semibold break-words leading-relaxed">
                      {questions[currentQuestion]?.question}
                    </h2>
                  </div>

                  <div className="overflow-x-auto">{renderQuestionByType()}</div>

                  <div className="flex flex-wrap justify-between items-center gap-3 pt-4 sm:pt-6 border-t mt-4 sm:mt-6">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={handlePreviousQuestion} disabled={currentQuestion === 0}>
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleNextQuestion} disabled={currentQuestion === questions.length - 1}>
                        Next
                      </Button>
                    </div>
                    <Button onClick={handleSaveAndNext} disabled={!isAnswerValid() || isSaving} size="sm" className="whitespace-nowrap">
                      {currentQuestion < questions.length - 1 ? "Save & Next" : "Save & Review"}
                      <ChevronRight className="ml-1 sm:ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-3 z-30 shadow-lg">
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="font-medium">
                        {answeredCount}/{questions.length}
                      </span>
                      <span className="mx-2">|</span>
                      <span className="text-red-600">{flaggedCount} flagged</span>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleSubmit}
                      disabled={flaggedCount > 0 || isSaving || !allQuestionsAnswered || !hasMinimumTimeElapsed()}
                    >
                      Submit Test
                    </Button>
                  </div>
                  {!hasMinimumTimeElapsed() && (
                    <div className="text-xs text-amber-600 mt-1 text-center">Min {minSubmitTime} min required</div>
                  )}
                </div>

                <div className="hidden lg:flex flex-col items-center gap-4 mt-6">
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={handleSubmit}
                    className="px-8 sm:px-10"
                    disabled={flaggedCount > 0 || isSaving || !allQuestionsAnswered || !hasMinimumTimeElapsed()}
                  >
                    Submit Test
                  </Button>
                  {!hasMinimumTimeElapsed() && (
                    <div className="text-sm text-amber-600 text-center">
                      Minimum {minSubmitTime} minutes required before submission
                    </div>
                  )}
                  {flaggedCount > 0 && <div className="text-sm text-red-600 text-center">Remove flags before submitting</div>}
                </div>
              </div>

              <div className="lg:w-1/5 xl:w-1/6">
                <div className="bg-white rounded-lg border shadow-sm sticky top-24 overflow-hidden">
                  <div className="p-3 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                          cameraState === "active"
                            ? "bg-green-500 animate-pulse"
                            : cameraState === "error"
                              ? "bg-red-500"
                              : "bg-yellow-500"
                        }`}
                      />
                      <h3 className="font-semibold text-xs sm:text-sm">AI Proctoring</h3>
                    </div>
                    <span className="text-xs px-2 py-0.5 sm:py-1 rounded-md bg-slate-100">
                      {cameraState === "active" ? "Active" : cameraState === "error" ? "Error" : "Starting..."}
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="relative aspect-video border rounded-lg overflow-hidden bg-black mb-3">
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ display: cameraState === "active" ? "block" : "none" }}
                      />
                      {cameraState !== "active" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90">
                          {cameraState === "error" ? (
                            <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 mb-2" />
                          ) : (
                            <Video className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mb-2" />
                          )}
                          <p className="text-white text-xs text-center px-2">{errorDetails || "Starting camera..."}</p>
                        </div>
                      )}
                    </div>

                    {faceAlert && (
                      <div className="flex gap-2 p-2 bg-yellow-50 rounded text-xs animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-yellow-600 shrink-0" />
                        <span className="truncate text-xs">{faceAlert.message}</span>
                        <span className="ml-auto text-xs font-mono shrink-0">{faceAlert.duration}s</span>
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-2 rounded-lg border bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      <ShieldCheck className="h-4 w-4" />
                      <span>{cameraState === "active" ? "Monitoring live" : "Monitoring pending"}</span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                
                    </div>

                    {(recordedVideos.some(v => v.uploaded) || capturedSelfies.some(s => s.uploaded)) && (
                      <div className="mt-3 text-xs text-center text-green-600">
                        ✓ Evidence uploaded successfully
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {examStarted && (
        <>
          <Dialog open={showAnswerAlert} onOpenChange={setShowAnswerAlert}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-red-600">All Questions Required</DialogTitle>
                <DialogDescription>
                  {answeredCount} of {questions.length} questions answered.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setShowAnswerAlert(false)} className="w-full sm:w-auto">
                  Continue Exam
                </Button>
                <Button
                  onClick={() => {
                    const firstUnanswered = getEffectiveQuestions().findIndex((question) => !question.answered);
                    if (firstUnanswered !== -1) setCurrentQuestion(firstUnanswered);
                    setShowAnswerAlert(false);
                  }}
                  className="w-full sm:w-auto"
                >
                  Go to First Unanswered
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Submit Exam</DialogTitle>
                <DialogDescription className="space-y-2">
                  <p>
                    {answeredCount} of {questions.length} questions answered.
                  </p>
                  <p>
                    {recordedVideos.filter(v => v.uploaded).length} videos recorded. {capturedSelfies.filter(s => s.uploaded).length} photos captured.
                  </p>
                  <p className="font-semibold text-red-600">This action cannot be undone.</p>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setShowSubmitDialog(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmSubmit} disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving ? "Submitting..." : "Submit Exam"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showCancelTestDialog} onOpenChange={setShowCancelTestDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-red-600">Cancel Exam</DialogTitle>
                <DialogDescription>
                  All progress will be saved locally, and this attempt will be recorded as incomplete.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setShowCancelTestDialog(false)} className="w-full sm:w-auto">
                  Continue Exam
                </Button>
                <Button variant="destructive" onClick={confirmCancelTest} disabled={isSaving} className="w-full sm:w-auto">
                  Cancel Exam
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
