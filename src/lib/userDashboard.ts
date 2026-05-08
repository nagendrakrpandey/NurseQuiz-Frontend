import { BASE_URL } from "@/Service/api";

export interface DashboardUser {
  fullName: string;
  email: string;
  contact: string;
  id: number | string | null;
  candidateId: number | string | null;
  roleId: number | string | null;
}

export interface DashboardNotification {
  title?: string;
  desc?: string;
  description?: string;
  type?: "warning" | "success" | "info" | "error" | string;
  time?: string;
  createdAt?: string;
}

export interface DashboardCertificate {
  name?: string;
  title?: string;
  status?: string;
  downloadUrl?: string | null;
  earnedDate?: string | null;
  scorePercentage?: number | string | null;
}

export interface DashboardStat {
  label?: string;
  value?: string | number;
  subtext?: string;
  color?: string;
  icon?: string;
}

export interface DashboardResponse {
  candidateId?: number | string | null;
  candidate_id?: number | string | null;
  registrationStatus?: string;
  currentStage?: string;
  nextStage?: string;
  quizStatus?: string;
  examStatus?: string;
  status?: string;
  resultStatus?: string;
  passStatus?: string;
  result?: string;
  eligibleForNextRound?: boolean;
  selected?: boolean;
  qualified?: boolean;
  passed?: boolean;
  score?: number | string | null;
  marks?: number | string | null;
  obtainedMarks?: number | string | null;
  obtMarks?: number | string | null;
  totalMarks?: number | string | null;
  passingMarks?: number | string | null;
  percentage?: number | string | null;
  percent?: number | string | null;
  scorePercentage?: number | string | null;
  resultPercentage?: number | string | null;
  passingPercentage?: number | string | null;
  qualifyingPercentage?: number | string | null;
  attemptedQuestions?: number | string | null;
  totalQuestions?: number | string | null;
  competitionLevels?: string[];
  activeLevel?: number;
  currentLevelIndex?: number;
  progressPercentage?: number;
  nextExamDate?: string;
  quizAvailable?: boolean;
  levelDates?: Record<string, string>;
  notifications?: DashboardNotification[];
  certificates?: DashboardCertificate[];
  stats?: DashboardStat[];
  welcomeMessage?: string;
  description?: string;
  competition?: {
    enabled?: boolean;
  };
  features?: {
    competition?: boolean;
    certificates?: boolean;
    notifications?: boolean;
  };
}

export interface DashboardExamCompletionOverride {
  userId: number | string;
  candidateId?: number | string | null;
  completedAt: string;
  currentStage?: string | null;
}

export interface DashboardScoreSummary {
  score: number;
  totalMarks: number;
  percentage: number;
  attemptedQuestions: number;
  totalQuestions: number;
  completed: boolean;
}

export interface DashboardExamResult {
  currentStage?: string;
  nextStage?: string;
  score?: number | string | null;
  resultStatus?: string;
  examStatus?: string;
  status?: string;
  message?: string;
  submitted?: boolean;
  completed?: boolean;
  inProgress?: boolean;
}

export class DashboardRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "DashboardRequestError";
    this.status = status;
  }
}

const safeJsonParse = <T>(value: string | null): T | null => {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const toNumberOrString = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "number" || typeof value === "string" ? value : String(value);
};

export const DASHBOARD_EXAM_COMPLETION_KEY = "dashboardExamCompletion";

export const getStoredDashboardUser = (): DashboardUser => {
  const storedUser = safeJsonParse<Record<string, unknown>>(localStorage.getItem("userData"));
  const storedCandidate = storedUser?.candidate as Record<string, unknown> | undefined;
  const userId = toNumberOrString(storedUser?.id ?? localStorage.getItem("userId"));
  const hasVerifiedCandidateId =
    storedUser?.candidateIdSource === "backend" || storedUser?.candidateIdSource === "candidateLookup";
  const candidateIdFromExplicitBackendField = toNumberOrString(
    storedUser?.candidate_id ??
      storedUser?.candidateID ??
      storedCandidate?.id ??
      storedCandidate?.candidateId ??
      storedCandidate?.candidate_id,
  );
  const candidateIdFromStorage = toNumberOrString(
    storedUser?.candidateId ?? localStorage.getItem("candidateId"),
  );
  const candidateId =
    candidateIdFromExplicitBackendField ||
    (hasVerifiedCandidateId ? candidateIdFromStorage : null) ||
    (candidateIdFromStorage && String(candidateIdFromStorage) !== String(userId)
      ? candidateIdFromStorage
      : null);

  return {
    fullName:
      String(storedUser?.fullName || localStorage.getItem("userName") || "").trim() || "User",
    email: String(storedUser?.email || localStorage.getItem("email") || "").trim(),
    contact: String(storedUser?.contact || localStorage.getItem("contact") || "").trim(),
    id: userId,
    candidateId,
    roleId: toNumberOrString(storedUser?.roleId ?? localStorage.getItem("roleId")),
  };
};

export const normalizeToken = (token: string | null | undefined) =>
  String(token || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

export const getStoredAuthToken = () =>
  normalizeToken(localStorage.getItem("token") || localStorage.getItem("authToken"));

export const buildApiUrl = (url: string) => {
  if (/^https?:\/\//i.test(url)) return url;

  const normalizedPath = url.startsWith("/") ? url : `/${url}`;
  return `${BASE_URL}${normalizedPath}`;
};

export const getDashboardCandidateId = (user: DashboardUser) => user.candidateId;
export const getDashboardUserId = (user: DashboardUser) => user.id;

export const fetchDashboardData = async (
  userId: number | string,
  signal?: AbortSignal,
): Promise<DashboardResponse> => {
  const token = getStoredAuthToken();

  if (!token) {
    throw new DashboardRequestError("Authentication token missing. Please login again.", 401);
  }

  const response = await fetch(`${BASE_URL}/api/user/dashboard/${encodeURIComponent(String(userId))}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal,
  });

  let result: unknown = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    const errorPayload = result as Record<string, unknown> | null;
    const message =
      String(errorPayload?.message || errorPayload?.error || "").trim() ||
      `Dashboard API failed with status ${response.status}`;
    throw new DashboardRequestError(message, response.status);
  }

  return (result || {}) as DashboardResponse;
};

const unwrapApiData = (payload: unknown): Record<string, unknown> => {
  if (!payload || typeof payload !== "object") return {};

  let record = payload as Record<string, unknown>;

  for (let depth = 0; depth < 4; depth += 1) {
    const nested = record.data || record.result || record.examResult || record.exam;
    if (!nested || typeof nested !== "object" || nested === record) break;
    record = nested as Record<string, unknown>;
  }

  return record;
};

const readApiField = (record: Record<string, unknown>, aliases: string[]) => {
  const normalizedAliases = aliases.map((alias) => alias.replace(/[_\-\s]/g, "").toLowerCase());
  return Object.entries(record).find(([key]) =>
    normalizedAliases.includes(key.replace(/[_\-\s]/g, "").toLowerCase()),
  )?.[1];
};

export const normalizeExamStage = (value?: string | number | null) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return "DISTRICT";
  if (normalized.includes("DISTRICT")) return "DISTRICT";
  if (normalized.includes("STATE")) return "STATE";
  if (normalized.includes("REGIONAL") || normalized.includes("REGION")) return "NATIONAL";
  if (normalized.includes("NATIONAL")) return "NATIONAL";
  return normalized.replace(/[\s-]+/g, "_");
};

const completedExamStatusCodes = new Set([
  "SUBMITTED",
  "COMPLETED",
  "FINISHED",
  "PASS",
  "PASSED",
  "FAIL",
  "FAILED",
  "SELECTED",
  "NOTSELECTED",
  "QUALIFIED",
  "NOTQUALIFIED",
]);

export const fetchDashboardExamResult = async (signal?: AbortSignal): Promise<DashboardExamResult | null> => {
  const token = getStoredAuthToken();

  if (!token) {
    throw new DashboardRequestError("Authentication token missing. Please login again.", 401);
  }

  const response = await fetch(`${BASE_URL}/api/exam/result`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal,
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const errorPayload = result as Record<string, unknown> | null;
    const message =
      String(errorPayload?.message || errorPayload?.error || "").trim() ||
      `Exam result API failed with status ${response.status}`;
    throw new DashboardRequestError(message, response.status);
  }

  const data = unwrapApiData(result);
  if (!Object.keys(data).length) return null;

  const status = String(readApiField(data, ["examStatus", "quizStatus", "status"]) || "").trim();
  const resultStatus = String(readApiField(data, ["resultStatus", "passStatus", "result"]) || "").trim();
  const message = String(readApiField(data, ["message"]) || "").trim();
  const normalizedStatus = normalizeStatusCode(status || resultStatus || message);
  const isCompleted = completedExamStatusCodes.has(normalizedStatus) || /already.*submit/i.test(message);

  return {
    currentStage: String(readApiField(data, ["currentStage", "stage"]) || "").trim() || undefined,
    nextStage: String(readApiField(data, ["nextStage"]) || "").trim() || undefined,
    score: toNumberOrString(readApiField(data, ["score", "marks", "obtainedMarks", "obtMarks"])),
    resultStatus: resultStatus || undefined,
    examStatus: status || undefined,
    status: status || undefined,
    message: message || undefined,
    submitted: isCompleted,
    completed: isCompleted,
    inProgress: ["INPROGRESS", "STARTED", "ONGOING"].includes(normalizedStatus),
  };
};

export const mergeDashboardExamResult = (
  dashboardData: DashboardResponse,
  examResult: DashboardExamResult | null,
): DashboardResponse => {
  if (!examResult) return dashboardData;

  const completed = Boolean(examResult.completed || examResult.submitted);
  const inProgress = Boolean(examResult.inProgress) && !completed;
  const examStatus = completed ? "COMPLETED" : inProgress ? "IN_PROGRESS" : examResult.examStatus || dashboardData.examStatus || "NOT_STARTED";

  return {
    ...dashboardData,
    currentStage: examResult.currentStage || dashboardData.currentStage,
    nextStage: examResult.nextStage || dashboardData.nextStage,
    score: examResult.score ?? dashboardData.score,
    marks: examResult.score ?? dashboardData.marks,
    obtainedMarks: examResult.score ?? dashboardData.obtainedMarks,
    resultStatus: examResult.resultStatus || dashboardData.resultStatus,
    quizStatus: examStatus,
    examStatus,
    status: examStatus,
    quizAvailable: completed ? false : dashboardData.quizAvailable,
  };
};

export const startDashboardExam = async (stage?: string | number | null) => {
  const token = getStoredAuthToken();

  if (!token) {
    throw new DashboardRequestError("Authentication token missing. Please login again.", 401);
  }

  const response = await fetch(`${BASE_URL}/api/exam/start`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ stage: normalizeExamStage(stage) }),
  });

  const result = await response.json().catch(() => null);
  const record = unwrapApiData(result);
  const batchRecord =
    record.batch && typeof record.batch === "object"
      ? record.batch as Record<string, unknown>
      : {};
  const message = String(readApiField(record, ["message", "error"]) || "").trim();
  const batchId = Number(
    readApiField(record, ["batchId", "batch_id", "id"]) ||
      readApiField(batchRecord, ["batchId", "batch_id", "id"]) ||
      0,
  ) || null;
  const batchCode = String(
    readApiField(record, ["batchCode", "batch_code", "code"]) ||
      readApiField(batchRecord, ["batchCode", "batch_code", "code"]) ||
      "",
  ).trim();
  const level = String(
    readApiField(record, ["level", "stage", "currentStage"]) ||
      readApiField(batchRecord, ["level"]) ||
      "",
  ).trim();

  if (!response.ok || (result && typeof result === "object" && (result as Record<string, unknown>).success === false)) {
    throw new DashboardRequestError(message || "Unable to start exam.", response.status);
  }

  return { message, stage: normalizeExamStage(stage), batchId, batchCode, level };
};

export const saveDashboardExamCompletionOverride = (
  override: DashboardExamCompletionOverride,
) => {
  localStorage.setItem(DASHBOARD_EXAM_COMPLETION_KEY, JSON.stringify(override));
};

export const getDashboardExamCompletionOverride = (
  userId: number | string | null,
) => {
  const storedOverride = safeJsonParse<DashboardExamCompletionOverride>(
    localStorage.getItem(DASHBOARD_EXAM_COMPLETION_KEY),
  );

  if (!storedOverride || !userId) return null;
  if (String(storedOverride.userId) !== String(userId)) return null;

  const completedAt = new Date(storedOverride.completedAt).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(completedAt) || Date.now() - completedAt > sevenDaysMs) {
    localStorage.removeItem(DASHBOARD_EXAM_COMPLETION_KEY);
    return null;
  }

  return storedOverride;
};

const normalizeStatusCode = (value?: string | number | boolean | null) =>
  String(value ?? "")
    .trim()
    .replace(/[\s_-]+/g, "")
    .toUpperCase();

const readDashboardNumber = (...values: Array<string | number | null | undefined>) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;

    const normalizedValue =
      typeof value === "string" ? value.trim().replace(/,/g, "").replace(/%$/, "") : value;
    const parsed = Number(normalizedValue);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
};

export const DASHBOARD_QUALIFYING_PERCENTAGE = 35;

const DEFAULT_COMPETITION_LEVELS = ["District", "State", "National"];

const normalizeAlias = (value: string) => value.replace(/[_\-\s]/g, "").toLowerCase();

const unwrapDashboardApiData = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return payload;

  const record = payload as Record<string, unknown>;
  if ("data" in record) return record.data;
  if ("result" in record) return record.result;
  if ("items" in record) return record.items;
  if ("responses" in record) return record.responses;

  return payload;
};

const getResponseRows = (payload: unknown) => {
  const data = unwrapDashboardApiData(payload);
  return Array.isArray(data)
    ? (data.filter((item) => item && typeof item === "object") as Record<string, unknown>[])
    : [];
};

const readResponseNumber = (record: Record<string, unknown>, aliases: string[]) => {
  const normalizedAliases = aliases.map(normalizeAlias);
  const matchedEntry = Object.entries(record).find(([key]) =>
    normalizedAliases.includes(normalizeAlias(key)),
  );

  if (!matchedEntry || matchedEntry[1] === null || matchedEntry[1] === undefined || matchedEntry[1] === "") {
    return null;
  }

  const parsed = Number(
    typeof matchedEntry[1] === "string"
      ? matchedEntry[1].trim().replace(/,/g, "").replace(/%$/, "")
      : matchedEntry[1],
  );
  return Number.isFinite(parsed) ? parsed : null;
};

const readResponseText = (record: Record<string, unknown>, aliases: string[]) => {
  const normalizedAliases = aliases.map(normalizeAlias);
  const matchedEntry = Object.entries(record).find(([key]) =>
    normalizedAliases.includes(normalizeAlias(key)),
  );

  return matchedEntry && matchedEntry[1] !== null && matchedEntry[1] !== undefined
    ? String(matchedEntry[1]).trim()
    : "";
};

const normalizeAnswer = (value: string) =>
  value
    .split(/[,\-\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second))
    .join("-");

const isAttemptedAnswer = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return Boolean(normalized && normalized !== "0" && normalized !== "null" && normalized !== "undefined");
};

const getResponseQuestionCount = (responses: Record<string, unknown>[]) => {
  const declaredCount = Math.max(
    0,
    ...responses.map(
      (row) =>
        readResponseNumber(row, ["questionCount", "totalQuestions", "totalQuestion", "questionsCount"]) || 0,
    ),
  );

  return declaredCount || responses.length;
};

const getResponseRowMarks = (row: Record<string, unknown>) =>
  readResponseNumber(row, ["totalMarks", "questionMarks", "maxMarks"]) ??
  readResponseNumber(row, ["marks"]) ??
  0;

const getResponseTotalMarks = (row: Record<string, unknown>) => {
  const marks = getResponseRowMarks(row);
  const correct = readResponseText(row, [
    "correctOption",
    "correctAnswer",
    "correctAnswerId",
    "correct_option",
  ]);

  return marks || (correct ? 1 : 0);
};

const getResponseObtainedMarks = (row: Record<string, unknown>) => {
  const directScore = readResponseNumber(row, ["obtMarks", "obtainedMarks", "score", "marksObtained"]);
  if (directScore !== null) return directScore;

  const isCorrectValue = row.isCorrect ?? row.correct;
  const totalMarks = getResponseTotalMarks(row);
  if (typeof isCorrectValue === "boolean") return isCorrectValue ? totalMarks || 1 : 0;

  const answer = readResponseText(row, ["ansId", "answerId", "selectedOption", "responseId"]);
  const correct = readResponseText(row, [
    "correctOption",
    "correctAnswer",
    "correctAnswerId",
    "correct_option",
  ]);

  if (!answer || !correct) return 0;
  return normalizeAnswer(answer) === normalizeAnswer(correct) ? totalMarks || 1 : 0;
};

export const getDashboardResponseScoreSummary = (
  responses: Record<string, unknown>[],
): DashboardScoreSummary | null => {
  if (!responses.length) return null;

  const attemptedQuestions = responses.filter((row) =>
    isAttemptedAnswer(readResponseText(row, ["ansId", "answerId", "selectedOption", "responseId"])),
  ).length;
  const totalQuestions = getResponseQuestionCount(responses);
  const score = responses.reduce((sum, row) => sum + getResponseObtainedMarks(row), 0);
  const totalMarks = responses.reduce((sum, row) => sum + getResponseTotalMarks(row), 0) || totalQuestions;
  const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

  return {
    score,
    totalMarks,
    percentage,
    attemptedQuestions,
    totalQuestions,
    completed: attemptedQuestions > 0 && totalQuestions > 0 && attemptedQuestions >= totalQuestions,
  };
};

export const fetchDashboardResponseScoreSummary = async (
  candidateId: number | string | null | undefined,
  signal?: AbortSignal,
) => {
  if (!candidateId) return null;

  const token = getStoredAuthToken();
  const response = await fetch(`${BASE_URL}/api/responses/${encodeURIComponent(String(candidateId))}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/json",
    },
    signal,
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const errorPayload = result as Record<string, unknown> | null;
    const message =
      String(errorPayload?.message || errorPayload?.error || "").trim() ||
      `Responses API failed with status ${response.status}`;
    throw new DashboardRequestError(message, response.status);
  }

  return getDashboardResponseScoreSummary(getResponseRows(result));
};

const getStoredEvidenceScoreSummary = (user: DashboardUser): DashboardScoreSummary | null => {
  if (typeof localStorage === "undefined") return null;

  const storedSummary = safeJsonParse<Record<string, unknown>>(localStorage.getItem("examEvidenceSummary"));
  const responses = getResponseRows(storedSummary?.responses);
  if (!storedSummary || !responses.length) return null;

  const candidate = storedSummary.candidate as Record<string, unknown> | undefined;
  const storedCandidateId = toNumberOrString(candidate?.candidateId ?? candidate?.candidate_id);
  const userIds = [user.candidateId, user.id].filter((value) => value !== null && value !== undefined);

  if (
    storedCandidateId &&
    userIds.length > 0 &&
    !userIds.some((value) => String(value) === String(storedCandidateId))
  ) {
    return null;
  }

  return getDashboardResponseScoreSummary(responses);
};

export const getStoredDashboardScoreSummary = (user: DashboardUser) => getStoredEvidenceScoreSummary(user);

export const mergeDashboardScoreSummary = (
  dashboardData: DashboardResponse,
  scoreSummary: DashboardScoreSummary | null,
): DashboardResponse => {
  if (!scoreSummary) return dashboardData;

  return {
    ...dashboardData,
    score: scoreSummary.score,
    obtainedMarks: scoreSummary.score,
    totalMarks: scoreSummary.totalMarks,
    percentage: scoreSummary.percentage,
    scorePercentage: scoreSummary.percentage,
    attemptedQuestions: scoreSummary.attemptedQuestions,
    totalQuestions: scoreSummary.totalQuestions,
    quizStatus: scoreSummary.completed ? "COMPLETED" : dashboardData.quizStatus,
    examStatus: scoreSummary.completed ? "COMPLETED" : dashboardData.examStatus,
    status: scoreSummary.completed ? "COMPLETED" : dashboardData.status,
  };
};

const getDashboardQualifyingPercentage = (dashboardData: DashboardResponse | null | undefined) =>
  readDashboardNumber(dashboardData?.qualifyingPercentage, dashboardData?.passingPercentage) ??
  DASHBOARD_QUALIFYING_PERCENTAGE;

export const getDashboardScoreSummary = (
  dashboardData: DashboardResponse | null | undefined,
): DashboardScoreSummary | null => {
  if (!dashboardData) return null;

  const explicitPercentage = readDashboardNumber(
    dashboardData.scorePercentage,
    dashboardData.percentage,
    dashboardData.percent,
    dashboardData.resultPercentage,
  );
  const score = readDashboardNumber(
    dashboardData.score,
    dashboardData.marks,
    dashboardData.obtainedMarks,
    dashboardData.obtMarks,
  );
  const totalMarks = readDashboardNumber(dashboardData.totalMarks);
  const attemptedQuestions = readDashboardNumber(dashboardData.attemptedQuestions) ?? 0;
  const totalQuestions = readDashboardNumber(dashboardData.totalQuestions) ?? 0;

  if (score !== null && totalMarks !== null && totalMarks > 0) {
    return {
      score,
      totalMarks,
      percentage: (score / totalMarks) * 100,
      attemptedQuestions,
      totalQuestions,
      completed: isDashboardQuizCompleted(dashboardData),
    };
  }

  if (explicitPercentage !== null) {
    return {
      score: score ?? 0,
      totalMarks: totalMarks ?? 100,
      percentage: explicitPercentage,
      attemptedQuestions,
      totalQuestions,
      completed: isDashboardQuizCompleted(dashboardData),
    };
  }

  if (score !== null && score >= 0 && score <= 100) {
    return {
      score,
      totalMarks: 100,
      percentage: score,
      attemptedQuestions,
      totalQuestions,
      completed: isDashboardQuizCompleted(dashboardData),
    };
  }

  return null;
};

export const getDashboardScorePercentLabel = (dashboardData: DashboardResponse | null | undefined) => {
  const scoreSummary = getDashboardScoreSummary(dashboardData);
  if (!scoreSummary) return "";

  return `${Math.round(scoreSummary.percentage)}%`;
};

const positiveResultStatuses = new Set([
  "PASS",
  "PASSED",
  "SELECTED",
  "QUALIFIED",
  "ELIGIBLE",
  "WINNER",
]);

const negativeResultStatuses = new Set([
  "FAIL",
  "FAILED",
  "NOTSELECTED",
  "NOTQUALIFIED",
  "NOTELIGIBLE",
  "REJECTED",
]);

export const isDashboardQuizCompleted = (dashboardData: DashboardResponse | null | undefined) => {
  const status = normalizeStatusCode(
    dashboardData?.quizStatus || dashboardData?.examStatus || dashboardData?.status,
  );

  return ["COMPLETED", "SUBMITTED", "FINISHED"].includes(status);
};

export const getDashboardEligibility = (dashboardData: DashboardResponse | null | undefined) => {
  if (!isDashboardQuizCompleted(dashboardData)) return null;

  const scoreSummary = getDashboardScoreSummary(dashboardData);
  if (scoreSummary) {
    return scoreSummary.percentage >= getDashboardQualifyingPercentage(dashboardData);
  }

  const score = readDashboardNumber(
    dashboardData?.score,
    dashboardData?.marks,
    dashboardData?.obtainedMarks,
    dashboardData?.obtMarks,
  );
  const passingMarks = readDashboardNumber(dashboardData?.passingMarks);

  if (score !== null && passingMarks !== null) return score >= passingMarks;

  const explicitEligibility =
    dashboardData?.eligibleForNextRound ??
    dashboardData?.selected ??
    dashboardData?.qualified ??
    dashboardData?.passed;

  if (typeof explicitEligibility === "boolean") return explicitEligibility;

  const resultStatus = normalizeStatusCode(
    dashboardData?.resultStatus || dashboardData?.passStatus || dashboardData?.result,
  );

  if (positiveResultStatuses.has(resultStatus)) return true;
  if (negativeResultStatuses.has(resultStatus)) return false;

  const certificates = Array.isArray(dashboardData?.certificates) ? dashboardData.certificates : [];
  const qualificationCertificate = certificates.find((certificate) => {
    const certificateName = getCertificateName(certificate).toLowerCase();
    return certificateName.includes("qualification") || certificateName.includes("selection");
  });

  if (qualificationCertificate) {
    const certificateStatus = normalizeStatusCode(qualificationCertificate.status);
    if (certificateStatus === "AVAILABLE") return true;
    if (certificateStatus === "LOCKED" || certificateStatus === "NOTAVAILABLE") return false;
  }

  return null;
};

const isStatusOrEligibilityNotification = (notification: DashboardNotification) => {
  const title = String(notification.title || "").toLowerCase();
  const description = String(notification.desc || notification.description || "").toLowerCase();
  const text = `${title} ${description}`;
  const resultMessagePattern =
    /congrat|sorry.*eligible|next\s*round.*eligible|eligible.*next\s*round|next\s*round.*qualif|qualif.*next\s*round/;

  return (
    title.includes("quiz status") ||
    title.includes("quiz completed") ||
    resultMessagePattern.test(text)
  );
};

const getCompletionNotifications = (dashboardData: DashboardResponse) => {
  const existingNotifications = Array.isArray(dashboardData.notifications)
    ? dashboardData.notifications.filter((notification) => !isStatusOrEligibilityNotification(notification))
    : [];

  return [
    {
      title: "Quiz Completed",
      desc: "Your quiz status is Completed",
      type: "success",
      time: "Now",
    },
    ...existingNotifications,
  ];
};

const getConfiguredDashboardLevels = (dashboardData: DashboardResponse | null | undefined) => {
  const levels = Array.isArray(dashboardData?.competitionLevels)
    ? dashboardData.competitionLevels.filter(Boolean)
    : [];

  if (levels.length > 0) return levels;

  const currentStage = normalizeStatusCode(dashboardData?.currentStage);
  return DEFAULT_COMPETITION_LEVELS.some((level) => normalizeStatusCode(level) === currentStage)
    ? DEFAULT_COMPETITION_LEVELS
    : [];
};

const getDashboardLevelIndex = (dashboardData: DashboardResponse) => {
  const levels = getConfiguredDashboardLevels(dashboardData);
  const activeLevel =
    typeof dashboardData.activeLevel === "number"
      ? dashboardData.activeLevel
      : dashboardData.currentLevelIndex;

  if (typeof activeLevel === "number" && activeLevel >= 0 && activeLevel < levels.length) {
    return activeLevel;
  }

  const currentStage = normalizeStatusCode(dashboardData.currentStage);
  const matchedIndex = levels.findIndex((level) => normalizeStatusCode(level) === currentStage);

  return matchedIndex >= 0 ? matchedIndex : 0;
};

const getLevelDateFromDashboard = (dashboardData: DashboardResponse, level?: string) => {
  if (!level || !dashboardData.levelDates) return "";

  const normalizedLevel = normalizeStatusCode(level);
  const matchedEntry = Object.entries(dashboardData.levelDates).find(
    ([key]) => normalizeStatusCode(key) === normalizedLevel,
  );

  return matchedEntry?.[1] || "";
};

const getPromotedDashboardFields = (dashboardData: DashboardResponse): Partial<DashboardResponse> => {
  if (getDashboardEligibility(dashboardData) !== true) return {};

  const levels = getConfiguredDashboardLevels(dashboardData);

  if (levels.length < 2) return {};

  const currentLevelIndex = getDashboardLevelIndex(dashboardData);
  if (currentLevelIndex >= levels.length - 1) return {};

  const nextLevelIndex = currentLevelIndex + 1;
  const nextStage = levels[nextLevelIndex];
  const nextExamDate = getLevelDateFromDashboard(dashboardData, nextStage);

  return {
    competitionLevels:
      Array.isArray(dashboardData.competitionLevels) && dashboardData.competitionLevels.length > 0
        ? dashboardData.competitionLevels
        : levels,
    currentStage: nextStage,
    activeLevel: nextLevelIndex,
    currentLevelIndex: nextLevelIndex,
    progressPercentage: Math.round(((nextLevelIndex + 1) / levels.length) * 100),
    nextExamDate: nextExamDate || dashboardData.nextExamDate,
  };
};

const getCompletedDashboardCertificates = (
  dashboardData: DashboardResponse,
  effectiveUserId: number | string | null,
) => {
  const participationCertificate = {
    name: "Participation Certificate",
    status: "Available",
    downloadUrl: effectiveUserId ? `/api/certificates/download/${effectiveUserId}/participation` : null,
  };
  const qualificationCertificate = {
    name: "Qualification Certificate",
    status: "Available",
    downloadUrl: effectiveUserId ? `/api/certificates/download/${effectiveUserId}/qualification` : null,
    scorePercentage: getDashboardScoreSummary(dashboardData)?.percentage ?? null,
  };
  const existingCertificates = Array.isArray(dashboardData.certificates)
    ? dashboardData.certificates
    : [];
  const hasParticipation = existingCertificates.some((certificate) =>
    getCertificateName(certificate).toLowerCase().includes("participation"),
  );
  const withParticipation = hasParticipation
    ? existingCertificates.map((certificate) =>
        getCertificateName(certificate).toLowerCase().includes("participation")
          ? {
              ...certificate,
              status: "Available",
              downloadUrl: certificate.downloadUrl || participationCertificate.downloadUrl,
            }
          : certificate,
      )
    : [participationCertificate, ...existingCertificates];

  if (getDashboardEligibility(dashboardData) !== true) return withParticipation;

  const hasQualification = withParticipation.some((certificate) => {
    const certificateName = getCertificateName(certificate).toLowerCase();
    return certificateName.includes("qualification") || certificateName.includes("selection");
  });

  return hasQualification
    ? withParticipation.map((certificate) => {
        const certificateName = getCertificateName(certificate);
        const normalizedName = certificateName.toLowerCase();
        const isQualification =
          normalizedName.includes("qualification") || normalizedName.includes("selection");
        if (!isQualification) return certificate;

        return {
          ...certificate,
          name: getCertificateName(certificate),
          status: "Available",
          downloadUrl: certificate.downloadUrl || qualificationCertificate.downloadUrl,
          scorePercentage: qualificationCertificate.scorePercentage,
        };
      })
    : [qualificationCertificate, ...withParticipation];
};

export const applyDashboardExamCompletionOverride = (
  dashboardData: DashboardResponse,
  userId: number | string | null,
) => {
  const override = getDashboardExamCompletionOverride(userId);
  const completed = Boolean(override) || isDashboardQuizCompleted(dashboardData);
  if (!completed) return dashboardData;

  const effectiveUserId = override?.userId || userId;
  const completedDashboardData = {
    ...dashboardData,
    quizStatus: "COMPLETED",
    examStatus: "COMPLETED",
    status: "COMPLETED",
    quizAvailable: false,
    currentStage: dashboardData.currentStage || override?.currentStage || undefined,
  };
  const promotedDashboardFields = getPromotedDashboardFields(completedDashboardData);
  const normalizedDashboardData = {
    ...completedDashboardData,
    ...promotedDashboardFields,
  };

  return {
    ...normalizedDashboardData,
    certificates: getCompletedDashboardCertificates(normalizedDashboardData, effectiveUserId),
    notifications: getCompletionNotifications(normalizedDashboardData),
  };
};

export const getFirstName = (fullName: string) => {
  const trimmedName = fullName.trim();
  if (!trimmedName) return "User";
  return trimmedName.split(/\s+/)[0];
};

export const getInitials = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const LABEL_OVERRIDES: Record<string, string> = {
  DISTRICT: "District",
  STATE: "State",
  REGIONAL: "Regional",
  NATIONAL: "National",
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  SELECTED: "Selected",
  WINNER: "Winner",
  APPROVED: "Approved",
  LOCKED: "Locked",
  AVAILABLE: "Available",
};

const normalizeLookupKey = (value: string) =>
  value.replace(/[\s_-]+/g, "").trim().toUpperCase();

const toTitleCase = (value: string) =>
  value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

export const formatDashboardLabel = (value?: string | number | null) => {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return "";

  const normalizedKey = rawValue.trim().toUpperCase();
  if (LABEL_OVERRIDES[normalizedKey]) return LABEL_OVERRIDES[normalizedKey];

  const looksLikeCode = /^[A-Z0-9_ -]+$/.test(rawValue) && /[A-Z]/.test(rawValue);
  if (!looksLikeCode) return rawValue;

  return toTitleCase(rawValue.replace(/[_-]+/g, " "));
};

export const formatDashboardMessage = (message?: string | null) =>
  String(message || "").replace(/\b[A-Z][A-Z0-9_]{2,}\b/g, (token) =>
    formatDashboardLabel(token),
  );

export const getDashboardLevels = (dashboardData: DashboardResponse | null) =>
  getConfiguredDashboardLevels(dashboardData);

export const getDashboardNotifications = (dashboardData: DashboardResponse | null) =>
  Array.isArray(dashboardData?.notifications)
    ? dashboardData.notifications.filter((notification) => !isStatusOrEligibilityNotification(notification))
    : [];

export const getDashboardCertificates = (dashboardData: DashboardResponse | null) =>
  Array.isArray(dashboardData?.certificates) ? dashboardData.certificates : [];

export const getActiveLevelIndex = (dashboardData: DashboardResponse | null) => {
  const activeLevel =
    typeof dashboardData?.activeLevel === "number"
      ? dashboardData.activeLevel
      : dashboardData?.currentLevelIndex;

  return typeof activeLevel === "number" && Number.isFinite(activeLevel) ? activeLevel : -1;
};

export const getProgressPercentage = (dashboardData: DashboardResponse | null) => {
  if (
    typeof dashboardData?.progressPercentage === "number" &&
    Number.isFinite(dashboardData.progressPercentage)
  ) {
    return Math.min(100, Math.max(0, dashboardData.progressPercentage));
  }

  const levels = getDashboardLevels(dashboardData);
  const activeLevel = getActiveLevelIndex(dashboardData);

  if (!levels.length || activeLevel < 0) return 0;
  return Math.min(100, Math.max(0, ((activeLevel + 1) / levels.length) * 100));
};

export const canStartDashboardQuiz = (dashboardData: DashboardResponse | null) => {
  if (dashboardData?.quizAvailable !== true) return false;
  return !isDashboardQuizCompleted(dashboardData);
};

export const formatDashboardDate = (value?: string | null) => {
  if (!value) return "";

  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export const getLevelDate = (
  level: string,
  levelDates?: Record<string, string> | null,
) => {
  if (!levelDates) return "";

  const directMatch = levelDates[level];
  if (directMatch) return directMatch;

  const normalizedLevel = normalizeLookupKey(level);
  const matchedEntry = Object.entries(levelDates).find(
    ([key]) => normalizeLookupKey(key) === normalizedLevel,
  );

  return matchedEntry?.[1] || "";
};

export const getNotificationDescription = (notification: DashboardNotification) =>
  formatDashboardMessage(notification.desc || notification.description || "");

export const getCertificateName = (certificate: DashboardCertificate) => {
  const certificateName = certificate.name || certificate.title || "Certificate";
  const isQualificationCertificate = /qualification|selection/i.test(certificateName);

  return isQualificationCertificate
    ? certificateName.replace(/\s*\(\s*\d+(?:\.\d+)?\s*%\s*\)\s*$/i, "").trim()
    : certificateName;
};

export const isCertificateAvailable = (status?: string) =>
  String(status || "").trim().toLowerCase() === "available";

export const getCertificateStatusLabel = (status?: string) => {
  const normalized = String(status || "").trim();
  if (!normalized) return "Not Available";
  return formatDashboardLabel(normalized);
};
