import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {AlertCircle, ArrowLeft, BarChart3, CheckCircle2, Clock, ClipboardList, FileQuestion, Hash,
  Layers, Loader2, MapPin, RefreshCw, Trophy, User, XCircle} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BASE_URL1 } from "@/Service/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CompactInfoCard,
  deriveCandidateResponseOverview,
  EmptyState,
  SectionHeader,
  fetchCandidateEvidence,
  fetchJson,
  formatDateTime,
  formatDuration,
  getBatchCode,
  getCandidateId,
  getCandidateUserId,
  LocationAddress,
  unwrapApiData,
  type EvidenceRouteState,
  type EvidenceViewData,
} from "./EvidenceShared";

interface ReportResponseRow {
  obtMarks: number;
  questionId: number;
  question: string;
  optiona: string | null;
  optionb: string | null;
  optionc: string | null;
  optiond: string | null;
  ansId: string;
  qbId: number | null;
  correctOption: string;
  marks: number;
  candidateId: number | null;
  submitTime: string | null;
  tabSwitchCount: number;
  isCorrect: boolean | null;
}

type ScoreState = "correct" | "partial" | "incorrect" | "reviewed";

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toNullableNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const repairDisplayText = (value: string) =>
  value
    .replace(/Â°/g, "°")
    .replace(/�\s*([CF])/gi, "°$1")
    .replace(/&deg;/gi, "°")
    .replace(/&#176;/g, "°")
    .replace(/&#xB0;/gi, "°");

const normalizeText = (value: unknown) =>
  typeof value === "string" && value.trim() ? repairDisplayText(value.trim()) : null;

const normalizeAlias = (value: string) => value.replace(/[_\-\s]/g, "").toLowerCase();

const readField = (value: Record<string, unknown>, aliases: string[]) => {
  const normalizedAliases = aliases.map(normalizeAlias);
  const matchedEntry = Object.entries(value).find(([key]) => normalizedAliases.includes(normalizeAlias(key)));
  return matchedEntry?.[1];
};

const readText = (value: Record<string, unknown>, aliases: string[]) => normalizeText(readField(value, aliases));
const readNumber = (value: Record<string, unknown>, aliases: string[], fallback = 0) =>
  toNumber(readField(value, aliases), fallback);

const collectNestedRecords = (value: Record<string, unknown>) =>
  ["question", "questionData", "question_data", "questionBank", "question_bank", "qb", "response", "answer"]
    .map((key) => value[key])
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)));

const readFieldFromRecords = (records: Record<string, unknown>[], aliases: string[]) => {
  for (const record of records) {
    const value = readField(record, aliases);
    if (value !== null && value !== undefined && value !== "") return value;
  }

  return undefined;
};

const readTextFromRecords = (records: Record<string, unknown>[], aliases: string[]) =>
  normalizeText(readFieldFromRecords(records, aliases));

const readNumberFromRecords = (records: Record<string, unknown>[], aliases: string[], fallback = 0) =>
  toNumber(readFieldFromRecords(records, aliases), fallback);

const readPositiveNumberFromRecords = (records: Record<string, unknown>[], aliases: string[]) => {
  const parsed = Number(readFieldFromRecords(records, aliases));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizeOptionText = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return normalizeText(record.text || record.option || record.value || record.label || record.name);
  }

  return normalizeText(value);
};

const parseOptions = (value: unknown) => {
  if (Array.isArray(value)) return value.map(normalizeOptionText).filter(Boolean) as string[];
  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map(normalizeOptionText).filter(Boolean) as string[];
  } catch {
    // Use delimiter parsing below.
  }

  return trimmed
    .split(/\r?\n|\s*\|\s*|\s*;\s*/)
    .map(normalizeOptionText)
    .filter(Boolean) as string[];
};

const readOptionsFromRecords = (records: Record<string, unknown>[]) => {
  const directOptions = parseOptions(readFieldFromRecords(records, ["options", "optionList", "option_list", "choices", "answers"]));
  if (directOptions.length) return directOptions.slice(0, 4);

  return [
    readTextFromRecords(records, ["optiona", "optionA", "option1", "option_1", "a"]),
    readTextFromRecords(records, ["optionb", "optionB", "option2", "option_2", "b"]),
    readTextFromRecords(records, ["optionc", "optionC", "option3", "option_3", "c"]),
    readTextFromRecords(records, ["optiond", "optionD", "option4", "option_4", "d"]),
  ];
};

const getQuestionRowId = (row: Record<string, unknown>) =>
  readPositiveNumberFromRecords([row], ["questionId", "question_id", "qbId", "qb_id", "id"]);

const getResponseQuestionId = (row: Record<string, unknown>) =>
  readPositiveNumberFromRecords([row], ["questionId", "question_id", "qbId", "qb_id"]);

const getRowTimestamp = (row: Record<string, unknown>) => {
  const value = readText(row, ["submitTime", "submit_time", "submittedAt", "submitted_at", "createdOn", "created_on", "createdAt", "created_at"]);
  const parsed = value ? new Date(value.replace(/(\.\d{3})\d+/, "$1")).getTime() : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortResponseRows = (rows: Record<string, unknown>[]) =>
  [...rows].sort((first, second) => {
    const timeDiff = getRowTimestamp(first) - getRowTimestamp(second);
    if (timeDiff !== 0) return timeDiff;
    return (
      readNumber(first, ["recordId", "record_id", "id"], 0) -
      readNumber(second, ["recordId", "record_id", "id"], 0)
    );
  });

const getRowsFromQuestionPayload = (payload: unknown) => {
  const data = unwrapApiData(payload);
  if (Array.isArray(data)) return data.filter((item) => item && typeof item === "object") as Record<string, unknown>[];
  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;
  const nestedRows = [record.questions, record.data, record.items, record.rows, record.content].find(Array.isArray);
  return Array.isArray(nestedRows)
    ? (nestedRows.filter((item) => item && typeof item === "object") as Record<string, unknown>[])
    : [];
};

const fetchReportQuestionRows = async (batchId: number | string | null | undefined, questionBankId: number | string | null | undefined) => {
  const urls = [
    questionBankId && batchId ? `/questions/bank/${questionBankId}/batch/${batchId}` : "",
    questionBankId ? `/questions/bank/${questionBankId}` : "",
    batchId ? `/questions/batch/${batchId}` : "",
  ].filter(Boolean) as string[];

  for (const path of urls) {
    try {
      const rows = getRowsFromQuestionPayload(await fetchJson(path.startsWith("http") ? path : `${BASE_URL1}${path}`));
      if (rows.length) return rows;
    } catch (error) {
      console.warn(`Unable to load report questions from ${path}`, error);
    }
  }

  return [];
};

const mergeResponsesWithQuestions = (responses: Record<string, unknown>[], questions: Record<string, unknown>[]) => {
  if (!questions.length) return responses;

  const questionById = new Map<number, Record<string, unknown>>();
  questions.forEach((question) => {
    const questionId = getQuestionRowId(question);
    if (questionId) questionById.set(questionId, question);
  });

  return responses.map((response, index) => {
    const responseQuestionId = getResponseQuestionId(response);
    const question = (responseQuestionId && questionById.get(responseQuestionId)) || questions[index];
    return question ? { ...response, question } : response;
  });
};

const normalizeAnswer = (value: string) =>
  value
    .split(/[,\-\s]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join(",");

const extractPackedAnswer = (value: unknown, questionId: number) => {
  const rawValue = typeof value === "string" ? value.trim() : "";
  if (!rawValue || !questionId) return "";

  const parts = rawValue.split(",").map((item) => item.trim()).filter(Boolean);
  const matchedPart = parts.find((part) => part.startsWith(`${questionId}_`));
  return matchedPart ? matchedPart.slice(String(questionId).length + 1) : "";
};

const readBoolean = (value: Record<string, unknown>, aliases: string[]) => {
  const rawValue = readField(value, aliases);
  if (typeof rawValue === "boolean") return rawValue;
  if (typeof rawValue === "number") return rawValue === 1;
  if (typeof rawValue === "string" && rawValue.trim()) {
    const normalized = rawValue.trim().toLowerCase();
    if (["true", "1", "yes", "correct"].includes(normalized)) return true;
    if (["false", "0", "no", "incorrect"].includes(normalized)) return false;
  }
  return null;
};

const inferMarks = (value: Record<string, unknown>, answer: string, correctAnswer: string) => {
  const directMarks = readNumber(value, ["marks", "totalMarks", "questionMarks", "maxMarks"], 0);
  if (directMarks > 0) return directMarks;
  return correctAnswer ? 1 : 0;
};

const inferObtainedMarks = (
  value: Record<string, unknown>,
  answer: string,
  correctAnswer: string,
  marks: number,
  isCorrect: boolean | null
) => {
  const directScore = readField(value, [
    "obtMarks",
    "obtainedMarks",
    "marksObtained",
    "score",
    "obt_marks",
    "obtained_marks",
    "marks_obtained",
  ]);
  if (directScore !== undefined && directScore !== null && directScore !== "") return toNumber(directScore);

  if (isCorrect !== null) return isCorrect ? marks : 0;

  if (answer && correctAnswer && normalizeAnswer(answer) === normalizeAnswer(correctAnswer)) return marks;
  return 0;
};

const normalizeReportRow = (value: Record<string, unknown>, index: number): ReportResponseRow => {
  const records = [value, ...collectNestedRecords(value)];
  const questionId = readNumberFromRecords(records, ["questionId", "question_id", "qbId", "qb_id", "id"], index + 1);
  const rawAnswer = readFieldFromRecords(records, [
    "ansId",
    "ans_id",
    "answerId",
    "answer_id",
    "selectedOption",
    "selected_option",
    "selectedAnswer",
    "selected_answer",
    "selectedOptionId",
    "selected_option_id",
    "responseId",
    "response_id",
    "responseText",
    "response_text",
    "answerText",
    "answer_text",
    "answer",
  ]);
  const ansId = String(rawAnswer || extractPackedAnswer(readField(value, ["Option", "option"]), questionId) || "");
  const correctOption = String(readFieldFromRecords(records, [
    "correctOption",
    "correct_option",
    "correctOptionId",
    "correct_option_id",
    "correctAnswer",
    "correct_answer",
    "correctAnswerId",
    "correct_answer_id",
    "correctAnswerText",
    "correct_answer_text",
    "correctAns",
    "correct_ans",
    "rightAnswer",
    "right_answer",
    "rightOption",
    "right_option",
    "answerKey",
    "answer_key",
  ]) || "");
  const directCorrect = readBoolean(value, ["isCorrect", "is_correct", "correct", "answerCorrect", "answer_correct"]);
  const derivedCorrect = ansId && correctOption ? normalizeAnswer(ansId) === normalizeAnswer(correctOption) : null;
  const isCorrect = directCorrect ?? derivedCorrect;
  const marks = inferMarks(value, ansId, correctOption);
  const options = readOptionsFromRecords(records);

  return {
    obtMarks: inferObtainedMarks(value, ansId, correctOption, marks, isCorrect),
    questionId,
    question: String(
      readTextFromRecords(records, ["question", "questionText", "question_text", "title", "text", "questionName", "question_name"]) ||
        `Question ${index + 1}`
    ),
    optiona: options[0] || null,
    optionb: options[1] || null,
    optionc: options[2] || null,
    optiond: options[3] || null,
    ansId,
    qbId: toNullableNumber(readFieldFromRecords(records, ["qbId", "qb_id", "questionBankId", "question_bank_id"])),
    correctOption,
    marks,
    candidateId: toNullableNumber(readFieldFromRecords(records, ["candidateId", "candidate_id"])),
    submitTime: readTextFromRecords(records, ["submitTime", "submit_time", "submittedAt", "submitted_at", "createdOn", "created_on", "createdAt", "created_at"]) || null,
    tabSwitchCount: readNumberFromRecords(records, ["tabSwitchCount", "tab_switch_count"]),
    isCorrect,
  };
};

const normalizeDateTimeValue = (value: string | null) => {
  if (!value) return null;
  return value.replace(/(\.\d{3})\d+/, "$1");
};

const getSubmitTimestamp = (value: string | null) => {
  const normalizedValue = normalizeDateTimeValue(value);
  if (!normalizedValue) return 0;

  const parsed = new Date(normalizedValue).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatSubmitTime = (value: string | null) => {
  const normalizedValue = normalizeDateTimeValue(value);
  return normalizedValue ? formatDateTime(normalizedValue) : "--";
};

const getReportRowsFromPayload = (payload: unknown) => {
  const data = unwrapApiData(payload);
  if (Array.isArray(data)) return data.filter((item) => item && typeof item === "object") as Record<string, unknown>[];

  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;
  const nestedRows = [
    record.responses,
    record.answers,
    record.responseDetails,
    record.candidateResponses,
    record.candidate_responses,
    record.rows,
    record.items,
    record.data,
  ].find(Array.isArray);

  return Array.isArray(nestedRows)
    ? (nestedRows.filter((item) => item && typeof item === "object") as Record<string, unknown>[])
    : [];
};

const fetchCandidateReportPayload = async (candidateId: number, fallbackUserId: number) => {
  const ids = Array.from(new Set([candidateId, fallbackUserId].filter(Boolean)));
  let lastError: unknown = null;

  for (const id of ids) {
    try {
      const payload = await fetchJson(`${BASE_URL1}/responses/${id}`);
      const rows = getReportRowsFromPayload(payload);
      const hasJoinedQuestionData = rows.some((row) =>
        readText(row, ["question", "questionText", "question_text"]) ||
        readText(row, ["correctOption", "correct_option", "correctAnswer", "correct_answer"]) ||
        readNumber(row, ["marks"], 0) > 0
      );

      if (hasJoinedQuestionData || rows.length > 0) return payload;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return null;
};

const getOptionEntries = (row: ReportResponseRow) => [
  { id: "1", label: "A", value: row.optiona },
  { id: "2", label: "B", value: row.optionb },
  { id: "3", label: "C", value: row.optionc },
  { id: "4", label: "D", value: row.optiond },
];

const splitAnswerIds = (value: string) =>
  value
    .split(/[,\-\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const formatOptionValue = (row: ReportResponseRow, value: string) => {
  if (!value || value === "0") return "--";

  const trimmedValue = repairDisplayText(value.trim());
  const looksLikeChoiceIds = /^[A-Da-d1-4](?:[,\-\s]+[A-Da-d1-4])*$/.test(trimmedValue);
  if (!looksLikeChoiceIds) return trimmedValue;

  const ids = splitAnswerIds(trimmedValue);
  const values = (ids.length > 0 ? ids : [trimmedValue]).map((id) => {
    const option = getOptionEntries(row).find(
      (entry) => entry.id === id || entry.label.toLowerCase() === id.toLowerCase()
    );

    if (!option) return value;
    return option.value ? `${option.label}. ${option.value}` : `Option ${id}`;
  });

  return values.join(", ");
};

const getScoreState = (row: ReportResponseRow): ScoreState => {
  if (row.isCorrect === true) return "correct";
  if (row.isCorrect === false) return "incorrect";
  if (row.marks > 0 && row.obtMarks >= row.marks) return "correct";
  if (row.obtMarks > 0) return "partial";
  if (row.marks > 0) return "incorrect";
  return "reviewed";
};

const ScoreBadge = ({ row }: { row: ReportResponseRow }) => {
  const state = getScoreState(row);

  if (state === "correct") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Correct
      </span>
    );
  }

  if (state === "partial") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
        Partial
      </span>
    );
  }

  if (state === "incorrect") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
        <XCircle className="h-3.5 w-3.5" />
        Incorrect
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
      Reviewed
    </span>
  );
};

const EvidenceReportPage = ({ candidateId }: { candidateId: number }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state || {}) as EvidenceRouteState;
  const [responses, setResponses] = useState<ReportResponseRow[]>([]);
  const [serverCount, setServerCount] = useState<number | null>(null);
  const [evidenceOverview, setEvidenceOverview] = useState<EvidenceViewData["overview"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const displayCandidateId = getCandidateId(routeState.candidate) || responses[0]?.candidateId || candidateId;
  const reportUserId = getCandidateUserId(routeState.candidate) || candidateId;
  const candidateName = routeState.candidate?.name || `Candidate #${displayCandidateId}`;
  const batchCode = getBatchCode(routeState.batch) || routeState.candidate?.batchCode || "--";

  const reportSummary = useMemo(() => {
    const totalMarks = responses.reduce((sum, row) => sum + row.marks, 0);
    const obtainedMarks = responses.reduce((sum, row) => sum + row.obtMarks, 0);
    const correctCount = responses.filter((row) => getScoreState(row) === "correct").length;
    const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
    const responseTabSwitchCount = responses.reduce((maxCount, row) => Math.max(maxCount, row.tabSwitchCount), 0);
    const maxTabSwitchCount = Math.max(responseTabSwitchCount, Number(evidenceOverview?.tabSwitchCount) || 0);
    const sortedSubmitTimes = responses
      .map((row) => getSubmitTimestamp(row.submitTime))
      .filter(Boolean)
      .sort((first, second) => first - second);
    const firstSubmitTime = sortedSubmitTimes[0] || 0;
    const lastSubmitTime = sortedSubmitTimes[sortedSubmitTimes.length - 1] || 0;
    const calculatedTimeSeconds = firstSubmitTime && lastSubmitTime
      ? Math.max(0, Math.round((lastSubmitTime - firstSubmitTime) / 1000))
      : 0;
    const totalTimeSeconds = Number(evidenceOverview?.theoryTimeSeconds) || calculatedTimeSeconds;

    return {
      totalMarks,
      obtainedMarks,
      correctCount,
      percentage,
      maxTabSwitchCount,
      totalTimeSeconds,
      calculatedTimeSeconds,
      firstSubmitTime,
      lastSubmitTime,
    };
  }, [evidenceOverview, responses]);

  const timeSpentByRowKey = useMemo(() => {
    const sortedRows = responses
      .map((row, index) => ({
        key: `${row.questionId}-${row.qbId || index}-${index}`,
        submitTimestamp: getSubmitTimestamp(row.submitTime),
      }))
      .filter((item) => item.submitTimestamp > 0)
      .sort((first, second) => first.submitTimestamp - second.submitTimestamp);
    const timeByKey = new Map<string, number>();

    sortedRows.forEach((item, index) => {
      if (index === 0) {
        timeByKey.set(item.key, 0);
        return;
      }

      const previous = sortedRows[index - 1];
      timeByKey.set(item.key, Math.max(0, Math.round((item.submitTimestamp - previous.submitTimestamp) / 1000)));
    });

    return timeByKey;
  }, [responses]);

  const loadReport = async () => {
    setLoading(true);
    setError("");
    setResponses([]);
    setServerCount(null);
    setEvidenceOverview(null);

    try {
      const [responsePayload, evidenceResult] = await Promise.allSettled([
        fetchCandidateReportPayload(candidateId, reportUserId),
        fetchCandidateEvidence(reportUserId, routeState.candidate, routeState.batch, location.state),
      ]);

      if (responsePayload.status === "rejected") {
        throw responsePayload.reason;
      }

      const payload = responsePayload.value;
      const fallbackOverview = evidenceResult.status === "fulfilled" ? evidenceResult.value.overview : null;
      const rows = sortResponseRows(getReportRowsFromPayload(payload));
      const questionRows = await fetchReportQuestionRows(
        routeState.batch?.id || routeState.batch?.batch_id || routeState.candidate?.batchId || routeState.candidate?.batch_id,
        routeState.batch?.questionBankId,
      );
      const reportRows = mergeResponsesWithQuestions(rows, questionRows);
      const count =
        payload && typeof payload === "object" && "count" in payload
          ? toNumber((payload as Record<string, unknown>).count, reportRows.length)
          : reportRows.length;

      if (fallbackOverview) {
        setEvidenceOverview(deriveCandidateResponseOverview(payload, fallbackOverview));
      } else {
        const emptyOverview: EvidenceViewData["overview"] = {
          startedAt: new Date().toISOString(),
          submittedAt: null,
          theoryTimeSeconds: 0,
          tabSwitchCount: 0,
          status: "not_started",
          locationName: "Location not available",
          latitude: null,
          longitude: null,
        };
        setEvidenceOverview(deriveCandidateResponseOverview(payload, emptyOverview));
      }

      setResponses(reportRows.map((row, index) => normalizeReportRow(row as Record<string, unknown>, index)));
      setServerCount(count);
    } catch (fetchError) {
      setResponses([]);
      setServerCount(null);
      setEvidenceOverview(null);
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, [candidateId, location.key, reportUserId]);

  return (
    <div className="min-h-screen bg-[#f3fbff] text-slate-900">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 lg:py-6">
        <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="border-b border-sky-100 bg-gradient-to-r from-emerald-50 via-cyan-50 to-white px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-200">
                  <BarChart3 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Log Report</h1>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                    {candidateName}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/Evidence", { state: routeState.backState || routeState })} className="border-sky-200 bg-white text-sky-700 hover:bg-sky-50">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button variant="outline" size="sm" onClick={loadReport} className="border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <section className="mt-4 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeader
              icon={FileQuestion}
              title="Response Report"
              description={`${reportSummary.correctCount} correct response${reportSummary.correctCount === 1 ? "" : "s"} out of ${responses.length}. Tab switch: ${reportSummary.maxTabSwitchCount}. Total time: ${formatDuration(reportSummary.totalTimeSeconds)}.`}
            />
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-sky-200 bg-sky-50/60">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
                <p className="mt-3 text-sm font-medium text-slate-600">Loading report...</p>
              </div>
            </div>
          ) : responses.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-sky-100">
              <Table className="text-xs">
                <TableHeader className="bg-sky-50">
                  <TableRow className="hover:bg-sky-50">
                    <TableHead className="h-10 w-[64px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">#</TableHead>
                    <TableHead className="h-10 min-w-[320px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Question</TableHead>
                    <TableHead className="h-10 min-w-[180px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Selected</TableHead>
                    <TableHead className="h-10 min-w-[180px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Correct</TableHead>
                    <TableHead className="h-10 min-w-[110px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Time Spent</TableHead>
                    <TableHead className="h-10 min-w-[90px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Marks</TableHead>
                    <TableHead className="h-10 min-w-[110px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((row, index) => {
                    const options = getOptionEntries(row).filter((option) => option.value);
                    const rowKey = `${row.questionId}-${row.qbId || index}-${index}`;
                    const timeSpentSeconds = timeSpentByRowKey.get(rowKey) ?? 0;

                    return (
                      <TableRow key={rowKey} className="hover:bg-sky-50/60">
                        <TableCell className="px-3 py-3 font-semibold text-slate-700">{index + 1}</TableCell>
                        <TableCell className="px-3 py-3">
                          <p className="font-semibold leading-5 text-slate-900">{row.question}</p>
                          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                            <span>Question ID {row.questionId}</span>
                            {row.qbId && <span>- QB {row.qbId}</span>}
                          </div>
                          {options.length > 0 && (
                            <div className="mt-2 grid gap-1 text-[11px] text-slate-600 sm:grid-cols-2">
                              {options.map((option) => (
                                <span key={option.id} className="rounded-md bg-slate-50 px-2 py-1">
                                  {option.label}. {option.value}
                                </span>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-3 font-medium text-slate-700">{formatOptionValue(row, row.ansId)}</TableCell>
                        <TableCell className="px-3 py-3 font-medium text-slate-700">{formatOptionValue(row, row.correctOption)}</TableCell>

                        <TableCell className="px-3 py-3 font-semibold text-slate-800">{formatDuration(timeSpentSeconds)}</TableCell>
                        <TableCell className="px-3 py-3 font-semibold text-slate-800">
                          {row.obtMarks}/{row.marks}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <ScoreBadge row={row} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={FileQuestion}
              title="No responses found"
              description="No report rows were returned for this candidate."
            />
          )}
        </section>
      </div>
    </div>
  );
};

export default EvidenceReportPage;
