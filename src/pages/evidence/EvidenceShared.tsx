import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  Image as ImageIcon,
  Layers,
  MapPin,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  User,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BASE_URL, BASE_URL1 } from "@/Service/api";

type MediaType = "photo" | "video";

interface CandidateDocument {
  id: string;
  name: string;
  email?: string;
  memberId?: number | null;
  url: string | null;
  docId: string;
  timestamp?: string | null;
}

interface EvidenceMediaEntry {
  id: string;
  type: MediaType;
  url: string | null;
  filename: string;
  memberId?: number | null;
  memberName?: string;
  timestamp: string | null;
  uploaded: boolean;
  minute: number | null;
}

interface QuestionReviewRow {
  questionId: number;
  question: string;
  questionType: number | string;
  responseId: string;
  responseText: string;
  correctAnswerId: string | null;
  correctAnswerText: string | null;
  isCorrect: boolean | null;
  marks: number | null;
  flagged?: boolean;
  timeSpentSeconds: number;
}

interface EvidenceViewData {
  candidate: {
    candidateId: number | null;
    name: string;
    batchId: number | null;
    batchCode: string;
    level: string | null;
  };
  overview: {
    startedAt: string;
    submittedAt: string | null;
    theoryTimeSeconds: number;
    tabSwitchCount: number;
    status: string;
    locationName: string;
    latitude: number | null;
    longitude: number | null;
  };
  identity: {
    selfieUrl: string | null;
    selfies: CandidateDocument[];
    documents: CandidateDocument[];
  };
  media: EvidenceMediaEntry[];
  responses: QuestionReviewRow[];
  sourceLabel: string;
}

interface LegacyDocument {
  id: string;
  name: string;
  url: string;
  docId: string;
}

interface LegacyMediaFile {
  id: string;
  url: string;
  type: MediaType;
  timestamp: string | null;
}

interface LegacyAnswerResponse {
  questionId: number;
  question: string;
  selectedOption: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
}

interface LegacyExamSession {
  startTime: string;
  endTime: string | null;
  totalTime: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  teamSelfie: string | null;
  documents: LegacyDocument[];
  randomMedia: LegacyMediaFile[];
  tabSwitches: Array<{ count: number }>;
  answers: LegacyAnswerResponse[];
}

type DetailView = "evidence";
type LevelOption = "state" | "district" | "national";

interface BatchOption {
  batch_id?: number;
  id?: number;
  level: string;
  batchCode?: string;
  batch_code?: string;
  duration?: number;
  status?: string;
  questionBankId?: number;
}

interface CandidateListRow {
  candidate_id?: number;
  id?: number;
  userId?: number;
  user_id?: number;
  organizationName?: string;
  name: string;
  email: string;
  phone?: string;
  enrollment_no?: string;
  enrollmentNo?: string;
  batchId?: number;
  batch_id?: number;
  batchCode?: string;
  status?: string;
  score?: number | null;
}

interface EvidenceRouteState {
  candidate?: CandidateListRow;
  batch?: BatchOption;
  view?: DetailView;
  evidenceSummary?: Partial<EvidenceViewData>;
}

const createPlaceholderImage = (
  title: string,
  subtitle: string,
  background: string,
  accent: string
) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <rect width="1200" height="900" rx="48" fill="${background}" />
      <rect x="72" y="72" width="1056" height="756" rx="36" fill="white" opacity="0.9" />
      <rect x="132" y="148" width="160" height="160" rx="80" fill="${accent}" opacity="0.18" />
      <rect x="348" y="162" width="404" height="44" rx="22" fill="${accent}" opacity="0.88" />
      <rect x="348" y="232" width="284" height="26" rx="13" fill="${accent}" opacity="0.34" />
      <rect x="132" y="390" width="936" height="220" rx="28" fill="${accent}" opacity="0.1" />
      <text x="132" y="704" font-size="54" font-family="Arial, sans-serif" font-weight="700" fill="#0f172a">${title}</text>
      <text x="132" y="760" font-size="28" font-family="Arial, sans-serif" fill="#475569">${subtitle}</text>
    </svg>
  `)}`;

const demoSelfie = createPlaceholderImage("Candidate Selfie", "Stored candidate preview", "#dbeafe", "#2563eb");
const demoDocument = createPlaceholderImage("Identity Document", "Candidate registration proof", "#dcfce7", "#059669");
const demoRandomPhoto = createPlaceholderImage("Random Photo", "Exam time capture", "#e2e8f0", "#0f172a");
const demoVideoPoster = createPlaceholderImage("Random Video", "15 second exam clip", "#fee2e2", "#dc2626");

const safeJsonParse = <T,>(value: string | null): T | null => {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const readStoredUserName = () => {
  const directName = localStorage.getItem("userName");
  if (directName) return directName;

  const storedUser = safeJsonParse<Record<string, unknown>>(localStorage.getItem("userData"));
  const fallbackName = storedUser?.fullName || storedUser?.name;
  return typeof fallbackName === "string" && fallbackName.trim() ? fallbackName : "Candidate";
};

const createEmptyEvidence = (sourceLabel: string): EvidenceViewData => ({
  candidate: {
    candidateId: Number(localStorage.getItem("userId")) || null,
    name: readStoredUserName(),
    batchId: Number(localStorage.getItem("batchId")) || null,
    batchCode: localStorage.getItem("batchCode") || "",
    level: localStorage.getItem("level"),
  },
  overview: {
    startedAt: new Date().toISOString(),
    submittedAt: null,
    theoryTimeSeconds: 0,
    tabSwitchCount: 0,
    status: "in_progress",
    locationName: "Location not available",
    latitude: null,
    longitude: null,
  },
  identity: {
    selfieUrl: null,
    selfies: [],
    documents: [],
  },
  media: [],
  responses: [],
  sourceLabel,
});

const createDemoEvidence = (): EvidenceViewData => ({
  candidate: {
    candidateId: 10021,
    name: readStoredUserName(),
    batchId: Number(localStorage.getItem("batchId")) || 31,
    batchCode: localStorage.getItem("batchCode") || "DIST-APR-24",
    level: localStorage.getItem("level") || "district",
  },
  overview: {
    startedAt: new Date(Date.now() - 46 * 60 * 1000).toISOString(),
    submittedAt: new Date().toISOString(),
    theoryTimeSeconds: 41 * 60 + 24,
    tabSwitchCount: 3,
    status: "submitted",
    locationName: "District Nursing Center, Lucknow",
    latitude: 26.8467,
    longitude: 80.9462,
  },
  identity: {
    selfieUrl: demoSelfie,
    selfies: [
      {
        id: "selfie-1",
        name: readStoredUserName(),
        url: demoSelfie,
        docId: "1",
        timestamp: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
      },
    ],
    documents: [
      {
        id: "doc-1",
        name: "Aadhaar Front",
        url: demoDocument,
        docId: "ID-2308",
        timestamp: new Date(Date.now() - 47 * 60 * 1000).toISOString(),
      },
    ],
  },
  media: [
    {
      id: "photo-1",
      type: "photo",
      url: demoRandomPhoto,
      filename: "exam_photo_12m.jpg",
      timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
      uploaded: true,
      minute: 12,
    },
    {
      id: "photo-2",
      type: "photo",
      url: demoRandomPhoto,
      filename: "exam_photo_28m.jpg",
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      uploaded: true,
      minute: 28,
    },
    {
      id: "video-1",
      type: "video",
      url: null,
      filename: "exam_video_33m.webm",
      timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      uploaded: true,
      minute: 33,
    },
  ],
  responses: [
    {
      questionId: 1,
      question: "Patient triage priority for severe bleeding case?",
      questionType: 1,
      responseId: "2",
      responseText: "Immediate emergency care",
      correctAnswerId: "2",
      correctAnswerText: "Immediate emergency care",
      isCorrect: true,
      marks: 1,
      timeSpentSeconds: 39,
    },
    {
      questionId: 2,
      question: "Select PPE items needed for isolation room entry.",
      questionType: 2,
      responseId: "1-3",
      responseText: "Mask, Gloves",
      correctAnswerId: "1-2-3",
      correctAnswerText: "Mask, Gown, Gloves",
      isCorrect: false,
      marks: 0,
      timeSpentSeconds: 58,
    },
    {
      questionId: 3,
      question: "Hand hygiene is required before and after each patient touch.",
      questionType: 3,
      responseId: "1",
      responseText: "True",
      correctAnswerId: "1",
      correctAnswerText: "True",
      isCorrect: true,
      marks: 1,
      timeSpentSeconds: 21,
    },
  ],
  sourceLabel: "Demo preview",
});

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const formatDateTime = (value: string | null) => {
  const normalizedValue = normalizeTimestampValue(value);
  if (!normalizedValue) return "Not available";

  const parsed = new Date(normalizedValue);
  if (Number.isNaN(parsed.getTime())) return "Not available";
  return parsed.toLocaleString();
};

const formatCaptureDate = (value: string | null) => {
  const timestamp = getTimestampValue(value);
  if (!timestamp) return "Not available";

  return new Date(timestamp).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCaptureTime = (value: string | null) => {
  const timestamp = getTimestampValue(value);
  if (!timestamp) return "Not available";

  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatQuestionType = (value: number | string) => {
  if (typeof value === "string") return value;

  switch (value) {
    case 1:
      return "Single Choice";
    case 2:
      return "Multiple Choice";
    case 3:
      return "True / False";
    case 4:
      return "Fill Blank";
    case 5:
      return "Short Answer";
    case 6:
      return "Essay";
    default:
      return "Question";
  }
};

const formatStatus = (value: string) => value.replace(/_/g, " ");

const isRenderableImage = (value: string | null) =>
  Boolean(value) &&
  !value?.toLowerCase().includes(".pdf") &&
  !value?.toLowerCase().startsWith("data:application/pdf");

const normalizeTimestampValue = (value: unknown) => {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value) && value.length >= 5) {
    const parsed = new Date(
      Number(value[0]),
      Number(value[1]) - 1,
      Number(value[2]),
      Number(value[3]),
      Number(value[4]),
      Number(value[5] || 0),
      Math.floor(Number(value[6] || 0) / 1_000_000)
    );

    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const timestamp = value < 10_000_000_000 ? value * 1000 : value;
    const parsed = new Date(timestamp);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (typeof value !== "string" || !value.trim()) return null;

  const normalized = value.trim().replace(/^"|"$/g, "").replace(/(\.\d{3})\d+/, "$1");
  const databaseMatch = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/
  );

  if (databaseMatch) {
    const parsed = new Date(
      Number(databaseMatch[1]),
      Number(databaseMatch[2]) - 1,
      Number(databaseMatch[3]),
      Number(databaseMatch[4]),
      Number(databaseMatch[5]),
      Number(databaseMatch[6] || 0),
      Number((databaseMatch[7] || "0").padEnd(3, "0"))
    );

    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const buildTimestampFromParts = (dateValue: unknown, timeValue: unknown) => {
  if (typeof dateValue !== "string" || typeof timeValue !== "string") return null;
  if (!dateValue.trim() || !timeValue.trim()) return null;

  return normalizeTimestampValue(`${dateValue.trim()}T${timeValue.trim().replace(/-/g, ":")}`);
};

const toIsoDateFromParts = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
) => {
  const parsed = new Date(year, month - 1, day, hour, minute, second);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const parseTimestampFromFileName = (filename: string | null | undefined) => {
  if (!filename) return null;

  const normalized = filename.replace(/\\/g, "/").split("/").pop() || filename;
  const compactMatch = normalized.match(/(?:^|_)(\d{4})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})(?:[_.-]|$)/);
  if (compactMatch) {
    return toIsoDateFromParts(
      Number(compactMatch[1]),
      Number(compactMatch[2]),
      Number(compactMatch[3]),
      Number(compactMatch[4]),
      Number(compactMatch[5]),
      Number(compactMatch[6])
    );
  }

  const dashedMatch = normalized.match(/(?:^|_)(\d{2})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})(?:[_.-]|$)/);
  if (dashedMatch) {
    return toIsoDateFromParts(
      2000 + Number(dashedMatch[3]),
      Number(dashedMatch[2]),
      Number(dashedMatch[1]),
      Number(dashedMatch[4]),
      Number(dashedMatch[5]),
      Number(dashedMatch[6])
    );
  }

  return null;
};

const normalizeIdentityDocument = (
  value: unknown,
  index: number,
  fallbackDocId: string,
  fallbackName: string
): CandidateDocument => {
  const item = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const filename = getEvidenceFileName(item, fallbackName);

  return {
    id: String(readField(item, ["id", "evidenceId", "evidence_id"]) || `${fallbackDocId}-${index + 1}`),
    name: getEvidenceDisplayName(item, String(readField(item, ["name"]) || fallbackName)),
    email: getEvidenceEmail(item),
    memberId: getEvidenceMemberId(item),
    url: getEvidenceFileUrl(item) || (typeof (value as CandidateDocument)?.url === "string" ? (value as CandidateDocument).url : null),
    docId: String(readField(item, ["docId", "doc_id", "documentId", "document_id"]) || fallbackDocId),
    timestamp: getEvidenceTimestamp(item, filename),
  };
};

const mergePartialEvidence = (
  partial: Partial<EvidenceViewData>,
  sourceLabel: string
): EvidenceViewData => {
  const base = createEmptyEvidence(sourceLabel);

  return {
    candidate: {
      ...base.candidate,
      ...(partial.candidate || {}),
    },
    overview: {
      ...base.overview,
      ...(partial.overview || {}),
    },
    identity: {
      selfieUrl: partial.identity?.selfieUrl ?? base.identity.selfieUrl,
      selfies: Array.isArray(partial.identity?.selfies)
        ? partial.identity.selfies.map((item, index) => normalizeIdentityDocument(item, index, "1", `Selfie ${index + 1}`))
        : [],
      documents: Array.isArray(partial.identity?.documents)
        ? partial.identity.documents.map((item, index) => normalizeIdentityDocument(item, index, "2", `Document ${index + 1}`))
        : [],
    },
    media: Array.isArray(partial.media) ? normalizeEvidenceMediaRows(partial.media) : [],
    responses: Array.isArray(partial.responses) ? partial.responses : [],
    sourceLabel,
  };
};

const mapLegacySession = (session: LegacyExamSession): EvidenceViewData => ({
  candidate: {
    candidateId: Number(localStorage.getItem("userId")) || null,
    name: readStoredUserName(),
    batchId: Number(localStorage.getItem("batchId")) || null,
    batchCode: localStorage.getItem("batchCode") || "",
    level: localStorage.getItem("level"),
  },
  overview: {
    startedAt: session.startTime,
    submittedAt: session.endTime,
    theoryTimeSeconds: session.totalTime || 0,
    tabSwitchCount: session.tabSwitches.length,
    status: session.endTime ? "submitted" : "in_progress",
    locationName: session.location.address,
    latitude: session.location.lat,
    longitude: session.location.lng,
  },
  identity: {
    selfieUrl: session.teamSelfie,
    selfies: session.teamSelfie
      ? [
          {
            id: "legacy-selfie",
            name: readStoredUserName(),
            url: session.teamSelfie,
            docId: "1",
            timestamp: session.startTime,
          },
        ]
      : [],
    documents: session.documents.map((document) => ({
      id: document.id,
      name: document.name,
      url: document.url,
      docId: document.docId,
      timestamp: session.startTime,
    })),
  },
  media: session.randomMedia.map((media, index) => ({
    id: media.id || `${media.type}-${index + 1}`,
    type: media.type,
    url: media.url,
    filename: `${media.type}-${index + 1}`,
    timestamp: media.timestamp,
    uploaded: true,
    minute: index + 1,
  })),
  responses: session.answers.map((answer) => ({
    questionId: answer.questionId,
    question: answer.question,
    questionType: "Saved Answer",
    responseId: answer.selectedOption,
    responseText: answer.selectedOption,
    correctAnswerId: answer.correctAnswer,
    correctAnswerText: answer.correctAnswer,
    isCorrect: answer.isCorrect,
    marks: answer.isCorrect ? 1 : 0,
    timeSpentSeconds: answer.timeSpent,
  })),
  sourceLabel: "Legacy local data",
});

const readEvidenceData = (routeState: unknown): EvidenceViewData => {
  const stateObject = routeState && typeof routeState === "object" ? (routeState as Record<string, unknown>) : null;
  const routeSummary = stateObject?.evidenceSummary || stateObject;

  if (routeSummary && typeof routeSummary === "object" && "candidate" in routeSummary) {
    return mergePartialEvidence(routeSummary as Partial<EvidenceViewData>, "Route snapshot");
  }

  const storedSummary = safeJsonParse<Partial<EvidenceViewData>>(localStorage.getItem("examEvidenceSummary"));
  if (storedSummary) {
    return mergePartialEvidence(storedSummary, "Saved exam snapshot");
  }

  const legacySession = safeJsonParse<LegacyExamSession>(localStorage.getItem("examSession"));
  if (legacySession) {
    return mapLegacySession(legacySession);
  }

  return createDemoEvidence();
};

const normalizeToken = (value: string | null) => value?.replace(/^Bearer\s+/i, "").trim() || "";

const buildRequestHeaders = () => {
  const token = normalizeToken(localStorage.getItem("token"));

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

const unwrapApiData = (payload: unknown): unknown => {
  if (!payload || typeof payload !== "object") return payload;

  const record = payload as Record<string, unknown>;
  if ("data" in record) return record.data;
  if ("result" in record) return record.result;
  if ("evidence" in record) return record.evidence;
  if ("items" in record) return record.items;

  return payload;
};

const fetchJson = async (url: string) => {
  const response = await fetch(url, {
    headers: buildRequestHeaders(),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error((result && typeof result === "object" && "message" in result ? String(result.message) : "") || `Request failed: ${response.status}`);
  }

  if (result && typeof result === "object" && "success" in result && result.success === false) {
    throw new Error("message" in result ? String(result.message) : "Request failed");
  }

  return result;
};

const getBatchId = (batch: BatchOption | null | undefined) => batch?.batch_id || batch?.id || null;
const getBatchCode = (batch: BatchOption | null | undefined) => batch?.batchCode || batch?.batch_code || "";
const getCandidateId = (candidate: CandidateListRow | null | undefined) => candidate?.candidate_id || candidate?.id || null;
const getCandidateUserId = (candidate: CandidateListRow | null | undefined) =>
  candidate?.userId || candidate?.user_id || null;

const readNumberField = (value: Record<string, unknown>, aliases: string[]) => {
  const normalizedAliases = aliases.map((alias) => alias.replace(/[_\-\s]/g, "").toLowerCase());
  const matchedEntry = Object.entries(value).find(([key]) =>
    normalizedAliases.includes(key.replace(/[_\-\s]/g, "").toLowerCase())
  );

  if (!matchedEntry) return undefined;

  const parsed = Number(matchedEntry[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const readField = (value: Record<string, unknown>, aliases: string[]) => {
  const normalizedAliases = aliases.map((alias) => alias.replace(/[_\-\s]/g, "").toLowerCase());
  const matchedEntry = Object.entries(value).find(([key]) =>
    normalizedAliases.includes(key.replace(/[_\-\s]/g, "").toLowerCase())
  );

  return matchedEntry?.[1];
};

const normalizeFileUrl = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return null;

  const url = value.trim().replace(/\\/g, "/");
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return `${BASE_URL}/${url}`;
};

const normalizeBatch = (value: Record<string, unknown>): BatchOption => ({
  batch_id: Number(value.batch_id || value.id) || undefined,
  id: Number(value.id || value.batch_id) || undefined,
  level: String(value.level || ""),
  batchCode: String(value.batchCode || value.batch_code || ""),
  batch_code: String(value.batch_code || value.batchCode || ""),
  duration: Number(value.duration) || undefined,
  status: value.status ? String(value.status) : undefined,
  questionBankId: Number(value.questionBankId || value.question_bank_id) || undefined,
});

const normalizeCandidate = (value: Record<string, unknown>): CandidateListRow => {
  const nestedSourceEntries = ["user", "organization", "registration", "teamMember"]
    .map((key) =>
      value[key] && typeof value[key] === "object"
        ? [key, value[key] as Record<string, unknown>] as const
        : null
    )
    .filter(Boolean) as Array<readonly [string, Record<string, unknown>]>;
  const nestedSources = nestedSourceEntries.map(([, source]) => source);
  const organizationSources = [
    value,
    ...nestedSourceEntries
      .filter(([key]) => key === "organization" || key === "registration")
      .map(([, source]) => source),
  ];
  const readTextFromSources = (sources: Record<string, unknown>[], aliases: string[]) => {
    for (const source of sources) {
      const field = readField(source, aliases);
      if (field !== null && field !== undefined && String(field).trim()) return String(field).trim();
    }

    return "";
  };
  const userId =
    readNumberField(value, [
      "userId",
      "user_id",
      "orgUserId",
      "org_user_id",
      "organizationUserId",
      "organization_user_id",
      "registrationUserId",
      "registration_user_id",
    ]) ||
    nestedSources
      .map((source) => readNumberField(source, ["userId", "user_id", "id"]))
      .find(Boolean);
  const organizationName =
    readTextFromSources(organizationSources, [
      "organizationName",
      "organization_name",
      "orgName",
      "org_name",
      "institutionName",
      "instituteName",
      "collegeName",
      "hospitalName",
      "companyName",
    ]) ||
    readTextFromSources(
      nestedSourceEntries
        .filter(([key]) => key === "organization")
        .map(([, source]) => source),
      ["name", "fullName"]
    );
  const name = readTextFromSources([value, ...nestedSources], ["name", "fullName", "candidateName"]) || organizationName || "Candidate";

  return {
    candidate_id: Number(value.candidate_id || value.candidateId || value.candidateID || value.id) || undefined,
    id: Number(value.id) || undefined,
    userId,
    user_id: userId,
    organizationName,
    name,
    email: readTextFromSources([value, ...nestedSources], ["email", "orgEmail", "organizationEmail", "userEmail", "contactEmail"]),
    phone: readTextFromSources([value, ...nestedSources], ["phone", "contact", "mobile", "orgPhone"]),
    enrollment_no: String(value.enrollment_no || value.enrollmentNo || ""),
    enrollmentNo: String(value.enrollmentNo || value.enrollment_no || ""),
    batchId: Number(value.batchId || value.batch_id) || undefined,
    batch_id: Number(value.batch_id || value.batchId) || undefined,
    batchCode: value.batchCode ? String(value.batchCode) : undefined,
    status: value.status ? String(value.status) : undefined,
    score: value.score === null || value.score === undefined ? null : Number(value.score),
  };
};

const buildCandidateEvidenceBase = (
  candidateId: number | null,
  candidate: CandidateListRow | null | undefined,
  batch: BatchOption | null | undefined,
  sourceLabel: string
): EvidenceViewData => {
  const base = createEmptyEvidence(sourceLabel);

  return {
    ...base,
    candidate: {
      candidateId,
      name: candidate?.name || (candidateId ? `Candidate #${candidateId}` : "Candidate"),
      batchId: getBatchId(batch) || candidate?.batchId || candidate?.batch_id || base.candidate.batchId,
      batchCode: getBatchCode(batch) || candidate?.batchCode || base.candidate.batchCode,
      level: batch?.level || base.candidate.level,
    },
    sourceLabel,
  };
};

const normalizeQuestionReviewRow = (value: Record<string, unknown>, index: number): QuestionReviewRow => ({
  questionId: Number(value.questionId || value.qbId || value.qb_id || value.id || index + 1),
  question: String(value.question || value.questionText || value.text || `Question ${index + 1}`),
  questionType: (value.questionType || value.type || "Saved Answer") as number | string,
  responseId: String(value.responseId || value.ansId || value.answerId || value.selectedOption || ""),
  responseText: String(value.responseText || value.answerText || value.selectedOption || value.ansId || ""),
  correctAnswerId:
    value.correctAnswerId || value.correctAnswer || value.correct_answer
      ? String(value.correctAnswerId || value.correctAnswer || value.correct_answer)
      : null,
  correctAnswerText:
    value.correctAnswerText || value.correctAnswer || value.correct_answer
      ? String(value.correctAnswerText || value.correctAnswer || value.correct_answer)
      : null,
  isCorrect:
    typeof value.isCorrect === "boolean"
      ? value.isCorrect
      : typeof value.correct === "boolean"
        ? value.correct
        : null,
  marks: value.marks === null || value.marks === undefined ? null : Number(value.marks),
  flagged: Boolean(value.flagged || value.isFlagged),
  timeSpentSeconds: Number(value.timeSpentSeconds || value.timeSpent || value.time || 0),
});

const extractRows = (payload: unknown) => {
  const data = unwrapApiData(payload);
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;
  const possibleLists = [
    record.evidence,
    record.evidenceList,
    record.evidence_list,
    record.uploads,
    record.uploadedFiles,
    record.uploaded_files,
    record.files,
    record.media,
    record.documents,
    record.docs,
    record.identity,
    record.records,
    record.items,
    record.rows,
  ];

  return possibleLists.find(Array.isArray) as unknown[] | undefined || [];
};

const getEvidenceDocId = (item: Record<string, unknown>) =>
  Number(readField(item, ["docId", "doc_id", "documentId", "document_id", "documentType", "document_type"])) || 0;

const getEvidenceKind = (item: Record<string, unknown>) => {
  const type = String(item.type || "").toLowerCase();
  if (type === "selfie" || type === "document" || type === "photo" || type === "video") return type;

  switch (getEvidenceDocId(item)) {
    case 1:
      return "selfie";
    case 2:
      return "document";
    case 3:
      return "photo";
    case 4:
      return "video";
    default:
      return "";
  }
};

const getEvidenceFileUrl = (item: Record<string, unknown>) =>
  normalizeFileUrl(
    readField(item, [
      "imageData",
      "image_data",
      "url",
      "fileUrl",
      "file_url",
      "filePath",
      "file_path",
      "path",
      "location",
      "mediaUrl",
      "media_url",
      "evidenceUrl",
      "evidence_url",
    ])
  );

const getEvidenceFileName = (item: Record<string, unknown>, fallback: string) =>
  String(
    readField(item, [
      "filename",
      "fileName",
      "file_name",
      "originalFileName",
      "original_file_name",
      "imageData",
      "image_data",
      "url",
      "fileUrl",
      "file_url",
      "filePath",
      "file_path",
      "mediaUrl",
      "media_url",
      "evidenceUrl",
      "evidence_url",
    ]) ||
      fallback
  )
    .replace(/\\/g, "/")
    .split("/")
    .pop() || fallback;

const getEvidenceTimestamp = (item: Record<string, unknown>, fallbackFilename?: string) => {
  const directValue = readField(item, [
    "timestamp",
    "timeStamp",
    "capturedAt",
    "captured_at",
    "captureAt",
    "capture_at",
    "captureTime",
    "capture_time",
    "captureDateTime",
    "capture_date_time",
    "capturedDateTime",
    "captured_date_time",
    "uploadedAt",
    "uploaded_at",
    "uploadAt",
    "upload_at",
    "uploadTime",
    "upload_time",
    "uploadedTime",
    "uploaded_time",
    "uploadDateTime",
    "upload_date_time",
    "createdAt",
    "created_at",
    "createdOn",
    "created_on",
    "createdTime",
    "created_time",
    "updatedAt",
    "updated_at",
    "submitTime",
    "submit_time",
    "dateTime",
    "date_time",
    "createdDateTime",
    "created_date_time",
    "uploadedDateTime",
    "uploaded_date_time",
  ]);
  const directTimestamp = normalizeTimestampValue(directValue);

  if (directTimestamp) return directTimestamp;

  const partTimestamp = buildTimestampFromParts(
    readField(item, ["uploadDate", "upload_date", "uploadedDate", "uploaded_date", "captureDate", "capture_date", "capturedDate", "captured_date", "createdDate", "created_date"]),
    readField(item, ["uploadTime", "upload_time", "uploadedTime", "uploaded_time", "captureTime", "capture_time", "capturedTime", "captured_time", "createdTime", "created_time"])
  );

  if (partTimestamp) return partTimestamp;

  return parseTimestampFromFileName(fallbackFilename || getEvidenceFileName(item, ""));
};

const getEvidenceDisplayName = (item: Record<string, unknown>, fallback: string) =>
  String(
    readField(item, [
      "teamMemberName",
      "team_member_name",
      "memberName",
      "member_name",
      "candidateName",
      "candidate_name",
      "name",
    ]) ||
      fallback
  );

const getEvidenceMemberId = (item: Record<string, unknown>) =>
  Number(readField(item, ["teamMemberId", "team_member_id", "memberId", "member_id", "candidateId", "candidate_id", "userId", "user_id"])) || null;

const getEvidenceEmail = (item: Record<string, unknown>) =>
  String(readField(item, ["email", "teamMemberEmail", "team_member_email", "memberEmail", "member_email"]) || "");

const normalizeEvidenceMediaRows = (rows: unknown[]): EvidenceViewData["media"] =>
  rows
    .map((row, index) => {
      const item = row as Record<string, unknown>;
      const kind = getEvidenceKind(item);

      if (kind !== "photo" && kind !== "video") return null;
      const filename = getEvidenceFileName(item, `${kind}-${index + 1}`);

      return {
        id: String(item.id || item.evidenceId || `${kind}-${index + 1}`),
        type: kind,
        url: getEvidenceFileUrl(item),
        filename,
        memberId: getEvidenceMemberId(item),
        memberName: getEvidenceDisplayName(item, "Team member"),
        timestamp: getEvidenceTimestamp(item, filename),
        uploaded: item.uploaded === undefined ? true : Boolean(item.uploaded),
        minute: item.minute === null || item.minute === undefined ? null : Number(item.minute),
      } satisfies EvidenceMediaEntry;
    })
    .filter(Boolean) as EvidenceViewData["media"];

const normalizeApiEvidence = (
  payload: unknown,
  fallback: EvidenceViewData,
  sourceLabel: string
): EvidenceViewData | null => {
  const data = unwrapApiData(payload);

  if (data && typeof data === "object" && "candidate" in data && !extractRows(data).length) {
    return mergePartialEvidence(data as Partial<EvidenceViewData>, sourceLabel);
  }

  const record = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  const rows = extractRows(payload);
  const responseRows =
    (Array.isArray(record.responses) && record.responses) ||
    (Array.isArray(record.answers) && record.answers) ||
    (Array.isArray(record.responseDetails) && record.responseDetails) ||
    [];

  if (!rows.length && !responseRows.length && !Object.keys(record).length) return null;

  const identityRows = rows.filter((row) => {
    const kind = getEvidenceKind(row as Record<string, unknown>);
    return kind === "selfie" || kind === "document";
  });
  const mediaRows = rows.filter((row) => {
    const kind = getEvidenceKind(row as Record<string, unknown>);
    return kind === "photo" || kind === "video";
  });
  const selfieRow = identityRows.find((row) => getEvidenceKind(row as Record<string, unknown>) === "selfie") as
    | Record<string, unknown>
    | undefined;

  const selfies: CandidateDocument[] = identityRows
    .filter((row) => getEvidenceKind(row as Record<string, unknown>) === "selfie")
    .map((row, index) => {
      const item = row as Record<string, unknown>;
      const docId = getEvidenceDocId(item);

      return {
        id: String(item.id || item.evidenceId || `selfie-${index + 1}`),
        name: getEvidenceDisplayName(item, `Member ${index + 1}`),
        email: getEvidenceEmail(item),
        memberId: getEvidenceMemberId(item),
        url: getEvidenceFileUrl(item),
        docId: String(docId || item.id || "1"),
        timestamp: getEvidenceTimestamp(item, getEvidenceFileName(item, `selfie-${index + 1}`)),
      };
    });

  const documents: CandidateDocument[] = identityRows
    .filter((row) => getEvidenceKind(row as Record<string, unknown>) === "document")
    .map((row, index) => {
      const item = row as Record<string, unknown>;
      const docId = getEvidenceDocId(item);
      return {
        id: String(item.id || item.evidenceId || `doc-${index + 1}`),
        name: getEvidenceDisplayName(item, getEvidenceFileName(item, `Document ${index + 1}`)),
        email: getEvidenceEmail(item),
        memberId: getEvidenceMemberId(item),
        url: getEvidenceFileUrl(item),
        docId: String(docId || item.id || ""),
        timestamp: getEvidenceTimestamp(item, getEvidenceFileName(item, `Document ${index + 1}`)),
      };
    });

  const media = normalizeEvidenceMediaRows(mediaRows);

  const overviewRecord = (record.overview && typeof record.overview === "object" ? record.overview : record) as Record<string, unknown>;
  const responses = responseRows.map((row, index) => normalizeQuestionReviewRow(row as Record<string, unknown>, index));
  const firstRow = (rows.find((row) => row && typeof row === "object") || {}) as Record<string, unknown>;
  const batchId =
    readNumberField(record, ["batchId", "batch_id"]) ||
    readNumberField(firstRow, ["batchId", "batch_id"]) ||
    fallback.candidate.batchId;
  const batchCode = String(record.batchCode || record.batch_code || firstRow.batchCode || firstRow.batch_code || fallback.candidate.batchCode || "");
  const level = record.level || firstRow.level || fallback.candidate.level;

  return {
    ...fallback,
    candidate: {
      ...fallback.candidate,
      batchId,
      batchCode,
      level: level ? String(level) : fallback.candidate.level,
    },
    overview: {
      ...fallback.overview,
      startedAt: String(overviewRecord.startedAt || overviewRecord.startTime || fallback.overview.startedAt),
      submittedAt: overviewRecord.submittedAt || overviewRecord.endTime || overviewRecord.submitTime ? String(overviewRecord.submittedAt || overviewRecord.endTime || overviewRecord.submitTime) : fallback.overview.submittedAt,
      theoryTimeSeconds: Number(overviewRecord.theoryTimeSeconds || overviewRecord.totalTime || overviewRecord.TotalTimeTaken || fallback.overview.theoryTimeSeconds),
      tabSwitchCount: Number(overviewRecord.tabSwitchCount || overviewRecord.tab_switch_count || fallback.overview.tabSwitchCount),
      status: String(overviewRecord.status || fallback.overview.status),
      locationName: String(overviewRecord.locationName || overviewRecord.address || fallback.overview.locationName),
      latitude: overviewRecord.latitude === null || overviewRecord.latitude === undefined ? fallback.overview.latitude : Number(overviewRecord.latitude),
      longitude: overviewRecord.longitude === null || overviewRecord.longitude === undefined ? fallback.overview.longitude : Number(overviewRecord.longitude),
    },
    identity: {
      selfieUrl: selfies[0]?.url || (selfieRow ? getEvidenceFileUrl(selfieRow) || fallback.identity.selfieUrl : fallback.identity.selfieUrl),
      selfies: selfies.length > 0 ? selfies : fallback.identity.selfies,
      documents,
    },
    media,
    responses,
    sourceLabel,
  };
};

const fetchRandomEvidenceMedia = async (teamMemberId: number): Promise<EvidenceViewData["media"]> => {
  const payload = await fetchJson(`${BASE_URL1}/evidence/random-media/team/${teamMemberId}`);
  return normalizeEvidenceMediaRows(extractRows(payload));
};

const fetchCandidateEvidence = async (
  candidateId: number,
  candidate: CandidateListRow | null | undefined,
  batch: BatchOption | null | undefined,
  _routeState: unknown
) => {
  const fallback = buildCandidateEvidenceBase(candidateId, candidate, batch, "Evidence API");
  const endpoint = `${BASE_URL1}/evidence/user/${candidateId}`;

  try {
    const payload = await fetchJson(endpoint);
    return normalizeApiEvidence(payload, fallback, "Evidence API") || fallback;
  } catch (error) {
    console.warn(`Evidence endpoint failed: ${endpoint}`, error);
    return fallback;
  }
};

type Tone = "sky" | "cyan" | "emerald" | "amber" | "rose" | "slate";
type IconComponent = ComponentType<{ className?: string }>;

const toneIconClass: Record<Tone, string> = {
  sky: "bg-sky-100 text-sky-700",
  cyan: "bg-cyan-100 text-cyan-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  slate: "bg-slate-100 text-slate-700",
};

const toneDotClass: Record<Tone, string> = {
  sky: "bg-sky-500 ring-sky-100",
  cyan: "bg-cyan-500 ring-cyan-100",
  emerald: "bg-emerald-500 ring-emerald-100",
  amber: "bg-amber-500 ring-amber-100",
  rose: "bg-rose-500 ring-rose-100",
  slate: "bg-slate-500 ring-slate-100",
};

const getTimestampValue = (value: string | null) => {
  const normalizedValue = normalizeTimestampValue(value);
  if (!normalizedValue) return 0;

  const parsed = new Date(normalizedValue).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const SectionHeader = ({
  icon: Icon,
  title,
  description,
}: {
  icon: IconComponent;
  title: string;
  description?: string;
}) => (
  <div className="mb-4 flex items-start justify-between gap-3">
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-slate-950">{title}</h2>
        {description && <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>}
      </div>
    </div>
  </div>
);

const CompactInfoCard = ({
  icon: Icon,
  label,
  value,
  detail,
  tone = "sky",
}: {
  icon: IconComponent;
  label: string;
  value: string | number | null;
  detail?: string;
  tone?: Tone;
}) => {
  const displayValue = value === 0 ? "0" : value || "--";

  return (
    <div className="rounded-xl border border-sky-100 bg-white px-3 py-3 shadow-sm">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneIconClass[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-950" title={String(displayValue)}>
            {displayValue}
          </p>
          {detail && <p className="mt-0.5 truncate text-xs text-slate-500" title={detail}>{detail}</p>}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({
  icon: Icon,
  label,
  value,
  detail,
  tone = "sky",
}: {
  icon: IconComponent;
  label: string;
  value: string | number;
  detail?: string;
  tone?: Tone;
}) => (
  <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{value}</p>
      </div>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneIconClass[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
    {detail && <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>}
  </div>
);

const EmptyState = ({
  icon: Icon,
  title,
  description,
}: {
  icon: IconComponent;
  title: string;
  description: string;
}) => (
  <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-sky-200 bg-sky-50/60 p-6 text-center">
    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sky-700 shadow-sm">
      <Icon className="h-5 w-5" />
    </span>
    <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{description}</p>
  </div>
);

const ResultBadge = ({ value }: { value: boolean | null }) => {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Correct
      </span>
    );
  }

  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
        <XCircle className="h-3.5 w-3.5" />
        Incorrect
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
      Pending
    </span>
  );
};


export type {
  BatchOption,
  CandidateListRow,
  DetailView,
  EvidenceRouteState,
  EvidenceViewData,
  LevelOption,
  Tone,
};

export {
  buildCandidateEvidenceBase,
  CompactInfoCard,
  demoVideoPoster,
  EmptyState,
  fetchCandidateEvidence,
  fetchJson,
  fetchRandomEvidenceMedia,
  formatCaptureDate,
  formatCaptureTime,
  formatDateTime,
  formatDuration,
  formatQuestionType,
  formatStatus,
  getBatchCode,
  getBatchId,
  getCandidateId,
  getCandidateUserId,
  getTimestampValue,
  isRenderableImage,
  MetricCard,
  normalizeBatch,
  normalizeCandidate,
  ResultBadge,
  SectionHeader,
  toneDotClass,
  toneIconClass,
  unwrapApiData,
};
