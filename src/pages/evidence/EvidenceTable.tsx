import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { BASE_URL1 } from "@/Service/api";
import {
  EmptyState,
  fetchCandidateResponsesPayload,
  fetchJson,
  getBatchCode,
  getBatchId,
  getCandidateId,
  getCandidateUserId,
  normalizeBatch,
  normalizeCandidate,
  SectionHeader,
  unwrapApiData,
  type BatchOption,
  type CandidateListRow,
  type EvidenceRouteState,
  type LevelOption,
} from "./EvidenceShared";

const normalizeEmail = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "");
type ExamStatus = "completed" | "in_progress" | "not_started";
type EvidenceListMode = "completed" | "all";
type ExamStatusFilter = "all" | ExamStatus;
type CandidateWithExamStatus = CandidateListRow & { examStatus?: ExamStatus };
interface RegistrationInfo {
  userId: number | null;
  organizationName: string;
}

const normalizeResetExamStage = (value: unknown) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "DISTRICT") return "DISTRICT";
  if (normalized === "STATE") return "STATE";
  if (normalized === "REGIONAL" || normalized === "NATIONAL") return "REGIONAL";
  return "";
};

const getStoredAccessToken = () =>
  String(localStorage.getItem("token") || localStorage.getItem("authToken") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

const clearLocalResetState = (userId: number, batchId: number) => {
  [
    "dashboardExamStarted",
    "preExamDone",
    "instructionDone",
    `examElapsedSeconds:${userId}:${batchId}`,
  ].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

const toPositiveNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const readNumberByAliases = (record: Record<string, unknown>, aliases: string[]) => {
  const normalizedAliases = aliases.map((alias) => alias.replace(/[_\-\s]/g, "").toLowerCase());
  const matchedEntry = Object.entries(record).find(([key]) =>
    normalizedAliases.includes(key.replace(/[_\-\s]/g, "").toLowerCase())
  );

  return matchedEntry ? toPositiveNumber(matchedEntry[1]) : null;
};

const readStringByAliases = (record: Record<string, unknown> | null | undefined, aliases: string[]) => {
  if (!record) return "";

  const normalizedAliases = aliases.map((alias) => alias.replace(/[_\-\s]/g, "").toLowerCase());
  const matchedEntry = Object.entries(record).find(([key]) =>
    normalizedAliases.includes(key.replace(/[_\-\s]/g, "").toLowerCase())
  );

  return matchedEntry?.[1] === null || matchedEntry?.[1] === undefined ? "" : String(matchedEntry[1]).trim();
};

const isMeaningfulDisplayName = (value: unknown) => {
  const text = String(value || "").trim();
  return Boolean(text && !/^\d+$/.test(text));
};

const getOrganizationNameFromRecord = (record: Record<string, unknown> | null | undefined) =>
  [
    "hospitalName",
    "hospital_name",
    "organizationName",
    "organization_name",
    "orgName",
    "org_name",
    "institutionName",
    "instituteName",
    "collegeName",
    "companyName",
  ]
    .map((alias) => readStringByAliases(record, [alias]))
    .find(isMeaningfulDisplayName) || "";

const getCandidateHospitalName = (candidate: CandidateListRow | null | undefined) => {
  if (!candidate) return "";

  const record = candidate as unknown as Record<string, unknown>;
  const nestedRecords = ["organization", "registration", "hospital", "institute"]
    .map((key) => record[key])
    .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value)));

  return (
    getOrganizationNameFromRecord(record) ||
    nestedRecords.map(getOrganizationNameFromRecord).find(Boolean) ||
    (isMeaningfulDisplayName(candidate.name) ? candidate.name : "") ||
    "this candidate"
  );
};

const getCandidateOrganizationDisplayName = (candidate: CandidateListRow | null | undefined) => {
  if (!candidate) return "";

  const record = candidate as unknown as Record<string, unknown>;
  const nestedRecords = ["organization", "registration", "hospital", "institute"]
    .map((key) => record[key])
    .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value)));

  return (
    getOrganizationNameFromRecord(record) ||
    nestedRecords.map(getOrganizationNameFromRecord).find(Boolean) ||
    ""
  );
};

const readEmailsFromRecord = (record: Record<string, unknown>) =>
  ["email", "orgEmail", "organizationEmail", "userEmail", "contactEmail"]
    .map((key) => normalizeEmail(record[key]))
    .filter(Boolean);

const collectRegistrationInfoByEmail = (
  value: unknown,
  registrationInfoByEmail: Map<string, RegistrationInfo>,
  inheritedInfo: RegistrationInfo = { userId: null, organizationName: "" }
) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectRegistrationInfoByEmail(item, registrationInfoByEmail, inheritedInfo));
    return;
  }

  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  const nestedUser = record.user && typeof record.user === "object" ? (record.user as Record<string, unknown>) : {};
  const nestedOrganization =
    record.organization && typeof record.organization === "object"
      ? (record.organization as Record<string, unknown>)
      : {};
  const nestedRegistration =
    record.registration && typeof record.registration === "object"
      ? (record.registration as Record<string, unknown>)
      : {};
  const currentUserId =
    readNumberByAliases(record, ["userId", "user_id", "orgUserId", "organizationUserId", "registrationUserId"]) ||
    readNumberByAliases(nestedUser, ["id", "userId", "user_id"]) ||
    inheritedInfo.userId;
  const currentInfo = {
    userId: currentUserId,
    organizationName:
      getOrganizationNameFromRecord(record) ||
      getOrganizationNameFromRecord(nestedOrganization) ||
      getOrganizationNameFromRecord(nestedRegistration) ||
      inheritedInfo.organizationName,
  };
  const rememberInfo = (email: string) => {
    const existingInfo = registrationInfoByEmail.get(email);
    registrationInfoByEmail.set(email, {
      userId: existingInfo?.userId || currentInfo.userId || null,
      organizationName: existingInfo?.organizationName || currentInfo.organizationName || "",
    });
  };

  readEmailsFromRecord(record).forEach((email) => {
    rememberInfo(email);
  });
  readEmailsFromRecord(nestedUser).forEach((email) => {
    rememberInfo(email);
  });

  Object.values(record).forEach((item) => {
    if (item && typeof item === "object") collectRegistrationInfoByEmail(item, registrationInfoByEmail, currentInfo);
  });
};

const fetchRegistrationInfoByEmail = async () => {
  const result = await fetchJson(`${BASE_URL1}/register/get/all`);
  const data = unwrapApiData(result);
  const registrationInfoByEmail = new Map<string, RegistrationInfo>();
  collectRegistrationInfoByEmail(data, registrationInfoByEmail);
  return registrationInfoByEmail;
};

const enrichCandidatesWithUserIds = async (candidateRows: CandidateListRow[]) => {
  const needsRegistrationInfo = candidateRows.some(
    (candidate) => normalizeEmail(candidate.email) || !getCandidateUserId(candidate) || !candidate.organizationName
  );
  if (!needsRegistrationInfo) return candidateRows;

  try {
    const registrationInfoByEmail = await fetchRegistrationInfoByEmail();

    return candidateRows.map((candidate) => {
      const existingUserId = getCandidateUserId(candidate);
      const matchedInfo = registrationInfoByEmail.get(normalizeEmail(candidate.email));
      const userId = existingUserId || matchedInfo?.userId;
      const organizationName =
        matchedInfo?.organizationName ||
        getCandidateOrganizationDisplayName(candidate) ||
        "";

      return userId || organizationName
        ? {
            ...candidate,
            organizationName,
            ...(userId ? { userId, user_id: userId } : {}),
          }
        : candidate;
    });
  } catch (error) {
    console.warn("Unable to resolve candidate user IDs from registrations", error);
    return candidateRows;
  }
};

const getCandidateRowKey = (candidate: CandidateListRow) =>
  String(getCandidateUserId(candidate) || getCandidateId(candidate) || candidate.email || candidate.name);

const readTextByAliases = (record: Record<string, unknown>, aliases: string[]) => {
  const normalizedAliases = aliases.map((alias) => alias.replace(/[_\-\s]/g, "").toLowerCase());
  const matchedEntry = Object.entries(record).find(([key]) =>
    normalizedAliases.includes(key.replace(/[_\-\s]/g, "").toLowerCase())
  );

  return matchedEntry?.[1] === null || matchedEntry?.[1] === undefined ? "" : String(matchedEntry?.[1]).trim();
};

const readLooseNumberByAliases = (record: Record<string, unknown>, aliases: string[]) => {
  const normalizedAliases = aliases.map((alias) => alias.replace(/[_\-\s]/g, "").toLowerCase());
  const matchedEntry = Object.entries(record).find(([key]) =>
    normalizedAliases.includes(key.replace(/[_\-\s]/g, "").toLowerCase())
  );
  const parsed = Number(matchedEntry?.[1]);

  return Number.isFinite(parsed) ? parsed : null;
};

const collectNestedRecords = (record: Record<string, unknown>, keys: string[]) =>
  keys
    .map((key) => record[key])
    .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value)));

const examStatusRecordKeys = [
  "candidate",
  "user",
  "organization",
  "registration",
  "examResult",
  "exam_result",
  "result",
  "exam",
  "examAttempt",
  "exam_attempt",
  "attempt",
  "latestAttempt",
  "latest_attempt",
];

const readTextFromRecords = (records: Record<string, unknown>[], aliases: string[]) => {
  for (const record of records) {
    const value = readTextByAliases(record, aliases);
    if (value) return value;
  }

  return "";
};

const readNumberFromRecords = (records: Record<string, unknown>[], aliases: string[]) => {
  for (const record of records) {
    const value = readLooseNumberByAliases(record, aliases);
    if (value) return value;
  }

  return null;
};

const getRowsFromUnknownPayload = (payload: unknown) => {
  const data = unwrapApiData(payload);

  if (Array.isArray(data)) {
    return data.filter((item) => item && typeof item === "object") as Record<string, unknown>[];
  }

  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;
  const nestedRows = [
    record.examResults,
    record.results,
    record.examAttempts,
    record.exam_attempts,
    record.attempts,
    record.items,
    record.content,
    record.rows,
    record.data,
  ].find(Array.isArray);

  return Array.isArray(nestedRows)
    ? (nestedRows.filter((item) => item && typeof item === "object") as Record<string, unknown>[])
    : [record];
};

const normalizeStatusText = (value: unknown): ExamStatus | "" => {
  const normalized = String(value || "").replace(/[_\-\s]+/g, "").toLowerCase();
  if (!normalized) return "";
  if (/(notcompleted|incomplete|notstarted|pending|enrolled|new|notattempted)/.test(normalized)) return "not_started";
  if (/(complete|completed|submitted|submit|finish|finished|done)/.test(normalized)) return "completed";
  if (/(progress|started|start|running|ongoing|live|attempt)/.test(normalized)) return "in_progress";
  return "";
};

const getResponseRows = (payload: unknown) => {
  const data = unwrapApiData(payload);
  if (Array.isArray(data)) return data.filter((item) => item && typeof item === "object") as Record<string, unknown>[];

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const nestedArray = [record.responses, record.answers, record.result, record.data].find(Array.isArray);
    if (Array.isArray(nestedArray)) {
      return nestedArray.filter((item) => item && typeof item === "object") as Record<string, unknown>[];
    }
  }

  return [];
};

const isAttemptedAnswer = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return Boolean(normalized && normalized !== "0" && normalized !== "null" && normalized !== "undefined");
};

const getDeclaredQuestionCount = (responses: Record<string, unknown>[]) => {
  const declaredCount = Math.max(
    0,
    ...responses.map((row) => readLooseNumberByAliases(row, ["questionCount", "totalQuestions", "totalQuestion", "questionsCount"]) || 0)
  );

  return declaredCount;
};

const getCandidateReferenceIds = (candidate: CandidateListRow) => {
  const candidateRecord = candidate as unknown as Record<string, unknown>;
  const nestedRecords = collectNestedRecords(candidateRecord, examStatusRecordKeys);
  const ids = [
    getCandidateUserId(candidate),
    readNumberFromRecords([candidateRecord, ...nestedRecords], ["userId", "user_id", "orgUserId", "organizationUserId"]),
    getCandidateId(candidate),
    readNumberFromRecords([candidateRecord, ...nestedRecords], ["candidateId", "candidate_id", "candidateID"]),
  ];

  return Array.from(new Set(ids.filter((id): id is number => Boolean(id))));
};

const getCandidateUserReferenceIds = (candidate: CandidateListRow) => {
  const candidateRecord = candidate as unknown as Record<string, unknown>;
  const nestedRecords = collectNestedRecords(candidateRecord, examStatusRecordKeys);
  const ids = [
    getCandidateUserId(candidate),
    readNumberFromRecords([candidateRecord, ...nestedRecords], ["userId", "user_id", "orgUserId", "organizationUserId"]),
  ];

  return Array.from(new Set(ids.filter((id): id is number => Boolean(id))));
};

const getExamResultCandidateIds = (record: Record<string, unknown>) => {
  const nestedRecords = collectNestedRecords(record, examStatusRecordKeys);
  const ids = [
    readNumberFromRecords([record, ...nestedRecords], [
      "candidateId",
      "candidate_id",
      "candidateID",
      "userId",
      "user_id",
      "orgUserId",
      "organizationUserId",
      "registrationUserId",
    ]),
  ];

  return Array.from(new Set(ids.filter((id): id is number => Boolean(id))));
};

const getExamResultBatchId = (record: Record<string, unknown>) => {
  const nestedRecords = collectNestedRecords(record, [
    "batch",
    "exam",
    "examResult",
    "exam_result",
    "result",
    "examAttempt",
    "exam_attempt",
    "attempt",
  ]);
  return readNumberFromRecords([record, ...nestedRecords], ["batchId", "batch_id", "examId", "exam_id"]);
};

const getExamResultRecordTime = (record: Record<string, unknown>) => {
  const timestamp = readTextByAliases(record, [
    "submittedAt",
    "submitted_at",
    "updatedAt",
    "updated_at",
    "createdAt",
    "created_at",
  ]);
  const parsed = timestamp ? new Date(timestamp).getTime() : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

const pickLatestExamResultRow = (rows: Record<string, unknown>[]) =>
  [...rows].sort((first, second) => {
    const secondId = readLooseNumberByAliases(second, ["id", "resultId", "result_id"]) || 0;
    const firstId = readLooseNumberByAliases(first, ["id", "resultId", "result_id"]) || 0;
    if (secondId !== firstId) return secondId - firstId;
    return getExamResultRecordTime(second) - getExamResultRecordTime(first);
  })[0] || null;

const getExamStatusFromResultRecord = (record: Record<string, unknown> | null | undefined): ExamStatus | "" => {
  if (!record) return "";
  const nestedRecords = collectNestedRecords(record, examStatusRecordKeys);

  return normalizeStatusText(
    readTextFromRecords([record, ...nestedRecords], [
      "examStatus",
      "exam_status",
      "quizStatus",
      "quiz_status",
      "attemptStatus",
      "attempt_status",
      "status",
    ])
  );
};

const fetchExamResultRowsForBatch = async (batchId: string) => {
  const urls = [
    `${BASE_URL1}/exam/results?batchId=${encodeURIComponent(batchId)}`,
    `${BASE_URL1}/exam/attempts?batchId=${encodeURIComponent(batchId)}`,
    `${BASE_URL1}/exam-attempts?batchId=${encodeURIComponent(batchId)}`,
    `${BASE_URL1}/exam_attempts?batchId=${encodeURIComponent(batchId)}`,
    `${BASE_URL1}/exam/results`,
    `${BASE_URL1}/exam/attempts`,
    `${BASE_URL1}/exam-attempts`,
    `${BASE_URL1}/exam_attempts`,
  ];

  for (const url of urls) {
    try {
      const payload = await fetchJson(url);
      const rows = getRowsFromUnknownPayload(payload);
      if (rows.length) return rows;
    } catch (error) {
      console.warn(`Unable to load exam results from ${url}`, error);
    }
  }

  return [];
};

const findCandidateExamResultRow = (
  candidate: CandidateListRow,
  rows: Record<string, unknown>[],
  batchId: string
) => {
  const candidateIds = getCandidateReferenceIds(candidate);
  const selectedBatchId = Number(batchId) || null;
  const matchedRows = rows.filter((row) => {
    const rowIds = getExamResultCandidateIds(row);
    const rowBatchId = getExamResultBatchId(row);
    const idMatches = candidateIds.some((candidateId) => rowIds.includes(candidateId));
    const batchMatches = !selectedBatchId || !rowBatchId || rowBatchId === selectedBatchId;

    return idMatches && batchMatches;
  });

  return pickLatestExamResultRow(matchedRows);
};

const fetchCandidateExamResultRow = async (candidate: CandidateListRow, batchId: string) => {
  const userIds = getCandidateUserReferenceIds(candidate);
  const candidateIds = getCandidateReferenceIds(candidate);
  const userIdUrls = userIds.flatMap((userId) => [
    `${BASE_URL1}/exam/result/${userId}`,
    `${BASE_URL1}/exam/results/user/${userId}`,
    `${BASE_URL1}/exam/results?userId=${userId}`,
    `${BASE_URL1}/exam/attempts?userId=${userId}`,
    `${BASE_URL1}/exam-attempts?userId=${userId}`,
  ]);
  const candidateIdUrls = candidateIds.flatMap((candidateId) => [
    `${BASE_URL1}/exam/results/candidate/${candidateId}`,
    `${BASE_URL1}/exam/results/${candidateId}`,
    `${BASE_URL1}/exam/result/candidate/${candidateId}`,
    `${BASE_URL1}/exam/attempts/candidate/${candidateId}`,
    `${BASE_URL1}/exam/attempt/${candidateId}`,
    `${BASE_URL1}/exam/attempt/candidate/${candidateId}`,
    `${BASE_URL1}/exam-attempts/candidate/${candidateId}`,
    `${BASE_URL1}/exam-attempts/${candidateId}`,
    `${BASE_URL1}/exam_attempts/candidate/${candidateId}`,
    `${BASE_URL1}/exam_attempts/${candidateId}`,
    `${BASE_URL1}/exam/results?candidateId=${candidateId}`,
    `${BASE_URL1}/exam/attempts?candidateId=${candidateId}`,
    `${BASE_URL1}/exam-attempts?candidateId=${candidateId}`,
  ]);
  const urls = Array.from(new Set([...userIdUrls, ...candidateIdUrls]));

  for (const url of urls) {
    try {
      const rows = getRowsFromUnknownPayload(await fetchJson(url));
      const matchedRow = findCandidateExamResultRow(candidate, rows, batchId);
      const singleRow = rows.length === 1 ? rows[0] : null;
      const singleRowIds = singleRow ? getExamResultCandidateIds(singleRow) : [];
      const singleRowStatus = getExamStatusFromResultRecord(singleRow);
      const fallbackRow =
        singleRow && singleRowStatus && singleRowIds.length === 0
          ? singleRow
          : null;
      const candidateRow = matchedRow || fallbackRow;
      if (getExamStatusFromResultRecord(candidateRow)) return candidateRow;
    } catch {
      // Try the next known backend shape.
    }
  }

  return null;
};

const getExamStatusFromRows = (candidate: CandidateListRow, responses: Record<string, unknown>[]): ExamStatus => {
  const candidateRecord = candidate as unknown as Record<string, unknown>;
  const nestedCandidateRecords = collectNestedRecords(candidateRecord, examStatusRecordKeys);
  const directStatus =
    normalizeStatusText(
      readTextFromRecords([candidateRecord, ...nestedCandidateRecords], [
        "examStatus",
        "exam_status",
        "quizStatus",
        "quiz_status",
        "attemptStatus",
        "attempt_status",
        "status",
      ])
    ) ||
    normalizeStatusText(readTextByAliases(responses[0] || {}, ["examStatus", "exam_status", "quizStatus", "quiz_status", "attemptStatus", "attempt_status", "status"]));

  if (directStatus === "in_progress") return "in_progress";
  if (directStatus === "not_started") return "not_started";
  if (directStatus === "completed") return "completed";

  const attemptedQuestions = responses.filter((row) =>
    isAttemptedAnswer(readTextByAliases(row, ["ansId", "answerId", "selectedOption", "responseId", "responseText"]))
  ).length;
  const totalQuestions = getDeclaredQuestionCount(responses);

  if (attemptedQuestions > 0 && totalQuestions > 0 && attemptedQuestions >= totalQuestions) {
    return "completed";
  }

  if (attemptedQuestions > 0) return "in_progress";
  return "not_started";
};

const fetchCandidateExamStatus = async (
  candidate: CandidateListRow,
  examResultRows: Record<string, unknown>[],
  batchId: string
): Promise<ExamStatus> => {
  const resultStatus = getExamStatusFromResultRecord(findCandidateExamResultRow(candidate, examResultRows, batchId));
  if (resultStatus) return resultStatus;

  const candidateResultStatus = getExamStatusFromResultRecord(await fetchCandidateExamResultRow(candidate, batchId));
  if (candidateResultStatus) return candidateResultStatus;

  const candidateId = getCandidateId(candidate);
  if (!candidateId) return getExamStatusFromRows(candidate, []);

  try {
    const payload = await fetchCandidateResponsesPayload(getCandidateReferenceIds(candidate));
    return getExamStatusFromRows(candidate, getResponseRows(payload));
  } catch (fetchError) {
    console.warn(`Unable to load exam status for candidate ${candidateId}`, fetchError);
    return getExamStatusFromRows(candidate, []);
  }
};

const StatusBadge = ({ status }: { status: ExamStatus }) => {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Completed
      </span>
    );
  }

  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
        <span className="h-2 w-2 rounded-full bg-sky-500" />
        In Progress
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
      <Clock className="h-3.5 w-3.5" />
      Not Started
    </span>
  );
};

interface CandidateEvidenceListProps {
  mode?: EvidenceListMode;
}

const CandidateEvidenceList = ({ mode = "completed" }: CandidateEvidenceListProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAllEvidenceMode = mode === "all";
  const [level, setLevel] = useState<LevelOption | "">("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExamStatusFilter>("all");
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [candidates, setCandidates] = useState<CandidateWithExamStatus[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [resolvingUserId, setResolvingUserId] = useState<string | null>(null);
  const [resettingRowKey, setResettingRowKey] = useState<string | null>(null);
  const [pendingResetCandidate, setPendingResetCandidate] = useState<CandidateWithExamStatus | null>(null);
  const [resetMessage, setResetMessage] = useState("");
  const [error, setError] = useState("");

  const selectedBatch = useMemo(
    () => batches.find((batch) => String(getBatchId(batch)) === selectedBatchId) || null,
    [batches, selectedBatchId]
  );
  const visibleCandidates = useMemo(() => {
    if (statusFilter === "all") return candidates;
    return candidates.filter((candidate) => (candidate.examStatus || "not_started") === statusFilter);
  }, [candidates, statusFilter]);
  const filteredCandidates = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return visibleCandidates;

    return visibleCandidates.filter((candidate) =>
      [
        candidate.organizationName,
        candidate.name,
        candidate.email,
        candidate.phone,
        candidate.enrollment_no,
        candidate.enrollmentNo,
        candidate.examStatus,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [searchTerm, visibleCandidates]);

  const fetchBatches = async (nextLevel: LevelOption, preferredBatchId = "") => {
    setLoadingBatches(true);
    setError("");
    if (!preferredBatchId) setSelectedBatchId("");
    setSearchTerm("");
    setStatusFilter("all");
    setCandidates([]);

    try {
      const result = await fetchJson(`${BASE_URL1}/batches?level=${encodeURIComponent(nextLevel)}`);
      const data = unwrapApiData(result);
      const normalizedBatches = Array.isArray(data)
        ? data.map((item) => normalizeBatch(item as Record<string, unknown>))
        : [];
      setBatches(normalizedBatches);
      if (preferredBatchId && normalizedBatches.some((batch) => String(getBatchId(batch)) === preferredBatchId)) {
        setSelectedBatchId(preferredBatchId);
        await fetchCandidates(preferredBatchId);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch batches");
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  const fetchCandidates = async (batchId: string) => {
    if (!batchId) return;

    setLoadingCandidates(true);
    setError("");
    setResetMessage("");
    setCandidates([]);

    try {
      const result = await fetchJson(`${BASE_URL1}/candidates?batchId=${encodeURIComponent(batchId)}`);
      const data = unwrapApiData(result);
      const normalizedCandidates = Array.isArray(data)
        ? data.map((item) => normalizeCandidate(item as Record<string, unknown>))
        : [];
      const candidatesWithUserIds = await enrichCandidatesWithUserIds(normalizedCandidates);
      const examResultRows = await fetchExamResultRowsForBatch(batchId);
      const candidatesWithStatus = await Promise.all(
        candidatesWithUserIds.map(async (candidate) => ({
          ...candidate,
          examStatus: await fetchCandidateExamStatus(candidate, examResultRows, batchId),
        }))
      );
      setCandidates(candidatesWithStatus);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch candidates");
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleLevelChange = (nextLevel: string) => {
    const typedLevel = nextLevel as LevelOption;
    setLevel(typedLevel);
    localStorage.setItem("level", typedLevel);
    setSearchTerm("");
    setStatusFilter("all");
    fetchBatches(typedLevel);
  };

  const handleBatchChange = (batchId: string) => {
    const nextBatch = batches.find((batch) => String(getBatchId(batch)) === batchId) || null;
    setSelectedBatchId(batchId);
    setSearchTerm("");
    setStatusFilter("all");
    setCandidates([]);
    setError("");
    setResetMessage("");
    localStorage.setItem("batchId", batchId);
    if (nextBatch) {
      localStorage.setItem("batchCode", getBatchCode(nextBatch) || "");
      localStorage.setItem("level", nextBatch.level || level || "");
    }
    fetchCandidates(batchId);
  };

  const resetCandidateExam = async (candidate: CandidateWithExamStatus) => {
    const rowKey = getCandidateRowKey(candidate);
    const userId = getCandidateUserId(candidate);
    const batchId = Number(selectedBatchId || getBatchId(selectedBatch));
    const batchCode = getBatchCode(selectedBatch) || "";
    const stage = normalizeResetExamStage(selectedBatch?.level || level);

    if (!userId) {
      setError("User ID missing for this candidate. Please include userId/user_id in candidates API response.");
      return;
    }

    if (!batchId || !batchCode || !stage) {
      setError("Batch ID, batch code, or stage missing. Please select a valid exam before reset.");
      return;
    }

    setResettingRowKey(rowKey);
    setPendingResetCandidate(null);
    setError("");
    setResetMessage("");

    try {
      const token = getStoredAccessToken();
      const response = await fetch(`${BASE_URL1}/exam/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId,
          batchId,
          batchCode,
          stage,
          deleteFiles: true,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || `Reset failed: ${response.status}`);
      }

      setResetMessage(result?.message || "Exam reset successfully.");
      clearLocalResetState(userId, batchId);
      await fetchCandidates(selectedBatchId);
      setCandidates((currentCandidates) =>
        currentCandidates.map((item) =>
          getCandidateRowKey(item) === rowKey ? { ...item, examStatus: "not_started" } : item
        )
      );
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Failed to reset exam.");
    } finally {
      setResettingRowKey(null);
    }
  };

  const openCandidatePage = async (candidate: CandidateListRow, target: "evidence" | "report") => {
    if ((candidate as CandidateWithExamStatus).examStatus !== "completed") {
      setError("Evidence and report are available only after the exam is completed.");
      return;
    }

    const backState = { level, batch: selectedBatch, batchId: selectedBatchId };
    const evidenceBasePath = isAllEvidenceMode ? "/AllEvidence" : "/Evidence";
    if (target === "report") {
      const reportCandidateId = getCandidateId(candidate);

      if (!reportCandidateId) {
        setError("Candidate ID missing for this candidate. Please include candidate_id/id in candidates API response.");
        return;
      }

      navigate(`${evidenceBasePath}/report/${reportCandidateId}`, {
        state: {
          candidate,
          batch: selectedBatch,
          backState,
        } satisfies EvidenceRouteState,
      });
      return;
    }

    let resolvedCandidate = candidate;
    let evidenceUserId = getCandidateUserId(resolvedCandidate);

    if (!evidenceUserId) {
      const rowKey = getCandidateRowKey(candidate);
      setResolvingUserId(rowKey);
      setError("");

      const [candidateWithUserId] = await enrichCandidatesWithUserIds([candidate]);
      resolvedCandidate = candidateWithUserId || candidate;
      evidenceUserId = getCandidateUserId(resolvedCandidate);

      if (evidenceUserId) {
        setCandidates((currentCandidates) =>
          currentCandidates.map((item) =>
            getCandidateRowKey(item) === rowKey
              ? {
                  ...item,
                  userId: evidenceUserId,
                  user_id: evidenceUserId,
                }
              : item
          )
        );
      }

      setResolvingUserId(null);
    }

    if (!evidenceUserId) {
      setError("User ID missing for this candidate. Please include userId/user_id in candidates API response.");
      return;
    }

    navigate(`${evidenceBasePath}/${evidenceUserId}`, {
      state: {
        candidate: resolvedCandidate,
        batch: selectedBatch,
        backState,
      } satisfies EvidenceRouteState,
    });
  };

  useEffect(() => {
    const routeState = (location.state || {}) as EvidenceRouteState & {
      level?: LevelOption;
      batchId?: string | number;
      backState?: { level?: LevelOption; batchId?: string | number };
    };
    const savedLevel = routeState.level || routeState.backState?.level || "";
    const savedBatchId = String(routeState.batchId || routeState.backState?.batchId || "");

    if (savedLevel) {
      setLevel(savedLevel);
      void fetchBatches(savedLevel, savedBatchId);
    }
  }, [location.key]);

  return (
    <div className="min-h-screen bg-[#f3fbff] text-slate-900">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 lg:py-6">
        <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-cyan-50 to-white px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm shadow-sky-200">
                <Users className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {isAllEvidenceMode ? "All Evidence" : "Exam Evidence"}
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  {isAllEvidenceMode
                    ? "Select a level and exam to view every enrolled organization by exam status."
                    : "Select a level and exam to view organizations by exam status. Evidence opens after completion."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 bg-white px-4 py-4 sm:px-6 lg:grid-cols-[260px_minmax(260px,520px)]">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Level</label>
              <Select value={level} onValueChange={handleLevelChange}>
                <SelectTrigger className="h-10 border-sky-200 bg-white focus:ring-sky-200">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="district">District</SelectItem>
                  <SelectItem value="regional">Regional</SelectItem>
                  <SelectItem value="state">State</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Exam</label>
              <Select value={selectedBatchId} onValueChange={handleBatchChange} disabled={!level || loadingBatches || batches.length === 0}>
                <SelectTrigger className="h-10 border-sky-200 bg-white focus:ring-sky-200">
                  <SelectValue placeholder={loadingBatches ? "Loading exams..." : level ? "Select exam" : "Select level first"} />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch) => {
                    const batchId = getBatchId(batch);
                    if (!batchId) return null;

                    return (
                      <SelectItem key={batchId} value={String(batchId)}>
                        {getBatchCode(batch) || `Exam ${batchId}`} ({batch.level})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        {resetMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {resetMessage}
          </div>
        )}

        <section className="mt-4 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeader
              icon={Users}
              title="Organization List"
              description={
                selectedBatch
                  ? `Showing ${statusFilter === "all" ? "all organizations" : statusFilter.replace("_", " ")} for ${getBatchCode(selectedBatch) || `Exam ${selectedBatchId}`}.`
                  : "Organizations appear after selecting an exam."
              }
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {selectedBatch && (
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ExamStatusFilter)}>
                  <SelectTrigger className="h-9 w-full border-sky-200 bg-white focus:ring-sky-200 sm:w-44">
                    <SelectValue placeholder="Exam status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {selectedBatch && (
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search candidate..."
                    className="h-9 border-sky-200 bg-white pl-9 focus:ring-sky-200"
                  />
                </div>
              )}
              {selectedBatch && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchCandidates(selectedBatchId)}
                  className="w-fit border-sky-200 text-sky-700 hover:bg-sky-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              )}
            </div>
          </div>

          {!selectedBatch ? (
            <EmptyState
              icon={Search}
              title="Select level and exam"
              description="Choose the level first, then select an exam to load enrolled organizations."
            />
          ) : loadingCandidates ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-sky-200 bg-sky-50/60">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-600" />
                <p className="mt-3 text-sm font-medium text-slate-600">Loading candidates...</p>
              </div>
            </div>
          ) : filteredCandidates.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-sky-100">
              <Table className="text-xs">
                <TableHeader className="bg-sky-50">
                  <TableRow className="hover:bg-sky-50">
                    <TableHead className="h-10 min-w-[220px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Organization Name</TableHead>
                    <TableHead className="h-10 min-w-[180px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">SPOC Name</TableHead>
                    <TableHead className="h-10 min-w-[220px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">SPOC Email</TableHead>
                    <TableHead className="h-10 min-w-[150px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">SPOC Mobile Number</TableHead>
                    <TableHead className="h-10 min-w-[130px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Exam Status</TableHead>
                    <TableHead className="h-10 min-w-[310px] px-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.map((candidate) => {
                    const rowKey = getCandidateRowKey(candidate);
                    const isResolvingUserId = resolvingUserId === rowKey;
                    const isResetting = resettingRowKey === rowKey;
                    const isCompleted = candidate.examStatus === "completed";
                    const organizationName = getCandidateOrganizationDisplayName(candidate);

                    return (
                      <TableRow key={rowKey} className="hover:bg-sky-50/60">
                        <TableCell className="px-3 py-3">
                          <p className="font-semibold text-slate-900">{organizationName || "--"}</p>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-slate-700">{candidate.name || "--"}</TableCell>
                        <TableCell className="px-3 py-3 text-slate-600">{candidate.email || "--"}</TableCell>
                        <TableCell className="px-3 py-3 text-slate-600">{candidate.phone || "--"}</TableCell>
                        <TableCell className="px-3 py-3">
                          <StatusBadge status={candidate.examStatus || "not_started"} />
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              disabled={!isCompleted || isResolvingUserId}
                              onClick={() => openCandidatePage(candidate, "evidence")}
                              title={isCompleted ? "Open evidence" : "Available after exam completion"}
                              className="h-8 bg-sky-600 text-white hover:bg-sky-700 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              {isResolvingUserId ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                              {isResolvingUserId ? "Checking" : "Evidence"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!isCompleted || isResolvingUserId}
                              onClick={() => openCandidatePage(candidate, "report")}
                              title={isCompleted ? "Open report" : "Available after exam completion"}
                              className="h-8 border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              {isResolvingUserId ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                              Report
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={candidate.examStatus === "not_started" || isResetting || loadingCandidates}
                              onClick={() => setPendingResetCandidate(candidate)}
                              title={candidate.examStatus === "not_started" ? "Reset is available after exam starts" : "Reset candidate exam"}
                              className="h-8 border-rose-200 bg-white text-rose-700 hover:bg-rose-50 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                              Reset
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title={
                candidates.length > 0 ? "No matching candidates" : "No candidates found"
              }
              description={
                candidates.length > 0
                  ? "Try changing the search text or exam status filter."
                  : "No enrolled candidates were returned for the selected batch."
              }
            />
          )}
        </section>
      </div>
      <AlertDialog
        open={Boolean(pendingResetCandidate)}
        onOpenChange={(open) => {
          if (!open) setPendingResetCandidate(null);
        }}
      >
        <AlertDialogContent className="max-w-md rounded-xl border-slate-200 bg-white p-0 shadow-2xl">
          <AlertDialogHeader className="border-b border-slate-100 px-6 py-5">
            <AlertDialogTitle className="text-xl font-semibold text-slate-900">Reset exam?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-slate-600">
              This will clear the exam attempt for{" "}
              <span className="font-semibold text-slate-900">
                {getCandidateHospitalName(pendingResetCandidate)}
              </span>{" "}
              and allow the candidate to start again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 px-6 py-4 sm:space-x-0">
            <AlertDialogCancel
              disabled={Boolean(resettingRowKey)}
              className="mt-0 border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!pendingResetCandidate || Boolean(resettingRowKey)}
              onClick={(event) => {
                event.preventDefault();
                if (pendingResetCandidate) resetCandidateExam(pendingResetCandidate);
              }}
              className="bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500"
            >
              {resettingRowKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};


export default CandidateEvidenceList;
