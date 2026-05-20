import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  Award,
  Clock,
  Loader2,
  Medal,
  RefreshCw,
  Search,
  Trophy,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  fetchJson,
  formatDateTime,
  formatDuration,
  getBatchCode,
  getBatchId,
  getCandidateId,
  getCandidateUserId,
  normalizeBatch,
  normalizeCandidate,
  unwrapApiData,
  type BatchOption,
  type CandidateListRow,
  type LevelOption,
} from "@/pages/evidence/EvidenceShared";

type LeaderboardStatus = "not_started" | "in_progress" | "completed";
type LeaderboardStatusFilter = LeaderboardStatus | "active";
type LevelFilter = LevelOption | "";

interface LeaderboardRow {
  rank: number;
  candidateId: number | null;
  organizationName: string;
  email: string;
  enrollmentNo: string;
  batchCode: string;
  score: number;
  totalMarks: number;
  percentage: number;
  attemptedQuestions: number;
  totalQuestions: number;
  timeSeconds: number;
  tabSwitchCount: number;
  lastActivity: string | null;
  status: LeaderboardStatus;
}

const LEVEL_OPTIONS: Array<{ value: LevelOption; label: string }> = [
  { value: "district", label: "District" },
  { value: "regional", label: "Regional" },
  { value: "state", label: "State" },
];

const STATUS_FILTER_OPTIONS: Array<{ value: LeaderboardStatusFilter; label: string }> = [
  { value: "active", label: "Started / Completed" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "not_started", label: "Not Started" },
];

const LIVE_REFRESH_MS = 10000;

const isLevelOption = (value: unknown): value is LevelOption =>
  LEVEL_OPTIONS.some((option) => option.value === value);

const isStatusFilter = (value: unknown): value is LeaderboardStatusFilter =>
  STATUS_FILTER_OPTIONS.some((option) => option.value === value);

const toFiniteNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readNumber = (record: Record<string, unknown>, aliases: string[]) => {
  const normalizedAliases = aliases.map((alias) => alias.replace(/[_\-\s]/g, "").toLowerCase());
  const matchedEntry = Object.entries(record).find(([key]) =>
    normalizedAliases.includes(key.replace(/[_\-\s]/g, "").toLowerCase())
  );

  return matchedEntry ? toFiniteNumber(matchedEntry[1]) : null;
};

const readText = (record: Record<string, unknown>, aliases: string[]) => {
  const normalizedAliases = aliases.map((alias) => alias.replace(/[_\-\s]/g, "").toLowerCase());
  const matchedEntry = Object.entries(record).find(([key]) =>
    normalizedAliases.includes(key.replace(/[_\-\s]/g, "").toLowerCase())
  );

  return matchedEntry && matchedEntry[1] !== null && matchedEntry[1] !== undefined
    ? String(matchedEntry[1]).trim()
    : "";
};

interface OrganizationDirectory {
  byEmail: Map<string, string>;
  byEnrollmentNo: Map<string, string>;
  byUserId: Map<string, string>;
}

const createOrganizationDirectory = (): OrganizationDirectory => ({
  byEmail: new Map(),
  byEnrollmentNo: new Map(),
  byUserId: new Map(),
});

const normalizeLookupKey = (value: unknown) => String(value || "").trim().toLowerCase();

const addLookupValue = (map: Map<string, string>, key: unknown, organizationName: string) => {
  const normalizedKey = normalizeLookupKey(key);
  if (normalizedKey && organizationName && !map.has(normalizedKey)) {
    map.set(normalizedKey, organizationName);
  }
};

const getNestedRecord = (record: Record<string, unknown>, key: string) =>
  record[key] && typeof record[key] === "object" ? (record[key] as Record<string, unknown>) : null;

const addOrganizationLookups = (
  record: Record<string, unknown>,
  directory: OrganizationDirectory,
  organizationName: string
) => {
  addLookupValue(directory.byEmail, readText(record, ["email", "orgEmail", "organizationEmail", "userEmail", "contactEmail"]), organizationName);
  addLookupValue(
    directory.byEnrollmentNo,
    readText(record, ["enrollmentNo", "enrollment_no", "hospitalRegisteredId", "hospital_registered_id", "registrationNumber", "registration_no", "organizationId"]),
    organizationName
  );

  const directUserId = readNumber(record, [
    "userId",
    "user_id",
    "orgUserId",
    "org_user_id",
    "organizationUserId",
    "organization_user_id",
    "registrationUserId",
    "registration_user_id",
  ]);
  if (directUserId) addLookupValue(directory.byUserId, directUserId, organizationName);

  ["user", "authUser", "organizationUser", "registrationUser"].forEach((key) => {
    const nestedRecord = getNestedRecord(record, key);
    if (!nestedRecord) return;

    addLookupValue(directory.byEmail, readText(nestedRecord, ["email", "userEmail", "contactEmail"]), organizationName);
    const nestedUserId = readNumber(nestedRecord, ["id", "userId", "user_id"]);
    if (nestedUserId) addLookupValue(directory.byUserId, nestedUserId, organizationName);
  });
};

const collectOrganizationDirectory = (
  value: unknown,
  directory: OrganizationDirectory,
  inheritedOrganizationName = ""
) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectOrganizationDirectory(item, directory, inheritedOrganizationName));
    return;
  }

  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  const organizationName =
    readText(record, [
      "organizationName",
      "organization_name",
      "orgName",
      "org_name",
      "institutionName",
      "instituteName",
      "collegeName",
      "hospitalName",
    ]) || inheritedOrganizationName;

  if (organizationName) addOrganizationLookups(record, directory, organizationName);

  Object.values(record).forEach((item) => {
    if (item && typeof item === "object") {
      collectOrganizationDirectory(item, directory, organizationName);
    }
  });
};

const getOrganizationNameForCandidate = (
  candidate: CandidateListRow,
  directory: OrganizationDirectory
) => {
  const userId = getCandidateUserId(candidate);
  const email = candidate.email;
  const enrollmentNo = candidate.enrollment_no || candidate.enrollmentNo;

  return (
    (userId ? directory.byUserId.get(normalizeLookupKey(userId)) : "") ||
    directory.byEmail.get(normalizeLookupKey(email)) ||
    directory.byEnrollmentNo.get(normalizeLookupKey(enrollmentNo)) ||
    candidate.organizationName ||
    ""
  );
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

const parseTimestamp = (value: string) => {
  if (!value) return 0;
  const normalized = value.replace(/(\.\d{3})\d+/, "$1");
  const parsed = new Date(normalized).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getResponseRows = (payload: unknown) => {
  const data = unwrapApiData(payload);
  return Array.isArray(data) ? data.filter((item) => item && typeof item === "object") as Record<string, unknown>[] : [];
};

const getQuestionCount = (responses: Record<string, unknown>[]) => {
  const declaredCount = Math.max(
    0,
    ...responses.map((row) => readNumber(row, ["questionCount", "totalQuestions", "totalQuestion", "questionsCount"]) || 0)
  );

  return declaredCount || responses.length;
};

const getRowMarks = (row: Record<string, unknown>) =>
  readNumber(row, ["marks", "totalMarks", "questionMarks", "maxMarks"]) ?? 0;

const getObtainedMarks = (row: Record<string, unknown>) => {
  const directScore = readNumber(row, ["obtMarks", "obtainedMarks", "score", "marksObtained"]);
  if (directScore !== null) return directScore;

  const answer = readText(row, ["ansId", "answerId", "selectedOption", "responseId"]);
  const correct = readText(row, ["correctOption", "correctAnswer", "correctAnswerId", "correct_option"]);
  const marks = getRowMarks(row) || (correct ? 1 : 0);

  if (!answer || !correct) return 0;
  return normalizeAnswer(answer) === normalizeAnswer(correct) ? marks : 0;
};

const getTotalMarks = (row: Record<string, unknown>) => {
  const marks = getRowMarks(row);
  const correct = readText(row, ["correctOption", "correctAnswer", "correctAnswerId", "correct_option"]);
  return marks || (correct ? 1 : 0);
};

const readCandidateScore = (candidate: CandidateListRow) => {
  const record = candidate as unknown as Record<string, unknown>;
  return readNumber(record, [
    "score",
    "finalScore",
    "totalScore",
    "resultScore",
    "examScore",
    "obtainedScore",
    "obtainedMarks",
    "obtMarks",
    "marksObtained",
  ]);
};

const readCandidateTotalMarks = (candidate: CandidateListRow) => {
  const record = candidate as unknown as Record<string, unknown>;
  return readNumber(record, [
    "totalMarks",
    "maxMarks",
    "fullMarks",
    "questionCount",
    "totalQuestions",
    "questionsCount",
  ]);
};

const readCandidatePercentage = (candidate: CandidateListRow) => {
  const record = candidate as unknown as Record<string, unknown>;
  const percentage = readNumber(record, [
    "percentage",
    "percent",
    "scorePercentage",
    "resultPercentage",
  ]);

  if (percentage === null) return null;
  return percentage <= 1 ? percentage * 100 : percentage;
};

const getResponseSummaryScore = (responses: Record<string, unknown>[]) => {
  const summaryScores = responses
    .map((row) =>
      readNumber(row, [
        "finalScore",
        "totalScore",
        "resultScore",
        "examScore",
        "obtainedScore",
      ])
    )
    .filter((score): score is number => score !== null);

  return summaryScores.length ? Math.max(...summaryScores) : null;
};

const getTotalTimeSeconds = (responses: Record<string, unknown>[]) => {
  const totalTime = Math.max(
    0,
    ...responses.map((row) =>
      readNumber(row, [
        "totalTimeTaken",
        "TotalTimeTaken",
        "totalTimeSeconds",
        "examTimeSeconds",
        "timeTakenSeconds",
        "timeTaken",
      ]) || 0
    )
  );

  if (totalTime > 0) return totalTime;

  const questionTime = responses.reduce(
    (sum, row) =>
      sum +
      (readNumber(row, ["timeSpentSeconds", "timeSpent", "questionTime", "questionTimeSeconds"]) || 0),
    0
  );

  if (questionTime > 0) return questionTime;

  const timestamps = responses
    .map((row) => parseTimestamp(readText(row, ["submitTime", "submittedAt", "createdAt", "updatedAt"])))
    .filter(Boolean)
    .sort((first, second) => first - second);

  if (timestamps.length < 2) return 0;
  return Math.max(0, Math.round((timestamps[timestamps.length - 1] - timestamps[0]) / 1000));
};

const getLatestActivity = (responses: Record<string, unknown>[]) => {
  const latestTimestamp = Math.max(
    0,
    ...responses.map((row) => parseTimestamp(readText(row, ["submitTime", "submittedAt", "createdAt", "updatedAt"])))
  );

  return latestTimestamp ? new Date(latestTimestamp).toISOString() : null;
};

const buildLeaderboardRow = (
  candidate: CandidateListRow,
  batch: BatchOption,
  responses: Record<string, unknown>[]
): Omit<LeaderboardRow, "rank"> => {
  const candidateId = getCandidateId(candidate);
  const attemptedQuestions = responses.filter((row) =>
    isAttemptedAnswer(readText(row, ["ansId", "answerId", "selectedOption", "responseId"]))
  ).length;
  const totalQuestions = getQuestionCount(responses);
  const responseScore = responses.reduce((sum, row) => sum + getObtainedMarks(row), 0);
  const responseSummaryScore = getResponseSummaryScore(responses);
  const candidateScore = readCandidateScore(candidate);
  const score =
    responseSummaryScore ??
    (responseScore > 0 || candidateScore === null ? responseScore : candidateScore);
  const responseTotalMarks = responses.reduce((sum, row) => sum + getTotalMarks(row), 0) || totalQuestions;
  const candidateTotalMarks = readCandidateTotalMarks(candidate);
  const totalMarks = responseTotalMarks || candidateTotalMarks || totalQuestions;
  const candidatePercentage = readCandidatePercentage(candidate);
  const percentage = candidatePercentage ?? (totalMarks > 0 ? (score / totalMarks) * 100 : 0);
  const tabSwitchCount = Math.max(
    0,
    ...responses.map((row) => readNumber(row, ["tabSwitchCount", "tab_switch_count"]) || 0)
  );
  const lastActivity = getLatestActivity(responses);
  const status: LeaderboardStatus =
    attemptedQuestions === 0 ? "not_started" : totalQuestions > 0 && attemptedQuestions >= totalQuestions ? "completed" : "in_progress";

  return {
    candidateId,
    organizationName: candidate.organizationName || candidate.name || (candidateId ? `Organization #${candidateId}` : "Organization"),
    email: candidate.email || "--",
    enrollmentNo: candidate.enrollment_no || candidate.enrollmentNo || "--",
    batchCode: candidate.batchCode || getBatchCode(batch) || "--",
    score,
    totalMarks,
    percentage,
    attemptedQuestions,
    totalQuestions,
    timeSeconds: getTotalTimeSeconds(responses),
    tabSwitchCount,
    lastActivity,
    status,
  };
};

const rankRows = (rows: Array<Omit<LeaderboardRow, "rank">>): LeaderboardRow[] =>
  [...rows]
    .sort((first, second) => {
      if (second.percentage !== first.percentage) return second.percentage - first.percentage;
      if (second.score !== first.score) return second.score - first.score;
      if (second.attemptedQuestions !== first.attemptedQuestions) {
        return second.attemptedQuestions - first.attemptedQuestions;
      }
      if (first.timeSeconds !== second.timeSeconds) {
        return (first.timeSeconds || Number.MAX_SAFE_INTEGER) - (second.timeSeconds || Number.MAX_SAFE_INTEGER);
      }
      return first.organizationName.localeCompare(second.organizationName);
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));

const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-100">
        <Trophy className="h-4 w-4" />
      </span>
    );
  }

  if (rank === 2) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-600 ring-1 ring-slate-200">
        <Medal className="h-4 w-4" />
      </span>
    );
  }

  if (rank === 3) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-orange-700 ring-1 ring-orange-100">
        <Award className="h-4 w-4" />
      </span>
    );
  }

  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
      {rank}
    </span>
  );
};

const StatusBadge = ({ status }: { status: LeaderboardStatus }) => {
  if (status === "completed") {
    return (
      <Badge className="gap-1.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-50">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Completed
      </Badge>
    );
  }

  if (status === "in_progress") {
    return (
      <Badge className="gap-1.5 rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-100 hover:bg-sky-50">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
        Live
      </Badge>
    );
  }

  return (
    <Badge className="gap-1.5 rounded-full bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Not Started
    </Badge>
  );
};

const MetricTile = ({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: string;
}) => (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold leading-none text-slate-950">{value}</p>
      </div>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
    </div>
  </div>
);

const LiveLeaderboard = () => {
  const requestIdRef = useRef(0);
  const organizationDirectoryRef = useRef<OrganizationDirectory | null>(null);
  const [level, setLevel] = useState<LevelFilter>("");
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeaderboardStatusFilter>("active");
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState("");

  const selectedBatch = useMemo(
    () => batches.find((batch) => String(getBatchId(batch)) === selectedBatchId) || null,
    [batches, selectedBatchId]
  );

  const fetchCandidateResponses = useCallback(async (candidateId: number | null) => {
    if (!candidateId) return [];

    try {
      const payload = await fetchJson(`${BASE_URL1}/responses/${candidateId}`);
      return getResponseRows(payload);
    } catch (fetchError) {
      console.warn(`Unable to load responses for candidate ${candidateId}`, fetchError);
      return [];
    }
  }, []);

  const fetchOrganizationDirectory = useCallback(async () => {
    if (organizationDirectoryRef.current) return organizationDirectoryRef.current;

    const directory = createOrganizationDirectory();
    let loaded = false;

    try {
      const payload = await fetchJson(`${BASE_URL1}/register/get/all`);
      collectOrganizationDirectory(unwrapApiData(payload), directory);
      loaded = true;
    } catch (fetchError) {
      console.warn("Unable to load organization names for leaderboard", fetchError);
    }

    if (loaded) organizationDirectoryRef.current = directory;
    return directory;
  }, []);

  const loadLeaderboard = useCallback(
    async (availableBatches: BatchOption[], batchId: string, silent = false) => {
      const batchesToLoad =
        batchId === "all"
          ? availableBatches
          : availableBatches.filter((batch) => String(getBatchId(batch)) === batchId);

      if (!batchesToLoad.length) {
        setRows([]);
        return;
      }

      const currentRequestId = requestIdRef.current + 1;
      requestIdRef.current = currentRequestId;
      setError("");
      if (silent) {
        setRefreshing(true);
      } else {
        setLoadingRows(true);
      }

      try {
        const [organizationDirectory, batchCandidates] = await Promise.all([
          fetchOrganizationDirectory(),
          Promise.all(
            batchesToLoad.map(async (batch) => {
              const batchIdValue = getBatchId(batch);
              if (!batchIdValue) return [] as Array<{ batch: BatchOption; candidate: CandidateListRow }>;

              const payload = await fetchJson(`${BASE_URL1}/candidates?batchId=${encodeURIComponent(batchIdValue)}`);
              const data = unwrapApiData(payload);
              const candidates = Array.isArray(data)
                ? data.map((item) => normalizeCandidate(item as Record<string, unknown>))
                : [];

              return candidates.map((candidate) => ({ batch, candidate }));
            })
          ),
        ]);

        const candidateEntries = batchCandidates.flat().map(({ batch, candidate }) => ({
          batch,
          candidate: {
            ...candidate,
            organizationName: getOrganizationNameForCandidate(candidate, organizationDirectory) || candidate.organizationName,
          },
        }));
        const leaderboardRows = await Promise.all(
          candidateEntries.map(async ({ batch, candidate }) => {
            const responses = await fetchCandidateResponses(getCandidateId(candidate));
            return buildLeaderboardRow(candidate, batch, responses);
          })
        );

        if (requestIdRef.current !== currentRequestId) return;

        setRows(rankRows(leaderboardRows));
        setLastUpdated(new Date());
      } catch (fetchError) {
        if (requestIdRef.current !== currentRequestId) return;
        setRows([]);
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load leaderboard");
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setLoadingRows(false);
          setRefreshing(false);
        }
      }
    },
    [fetchCandidateResponses, fetchOrganizationDirectory]
  );

  const loadBatches = useCallback(
    async (nextLevel: LevelOption) => {
      setLoadingBatches(true);
      setError("");
      setRows([]);

      try {
        const payload = await fetchJson(`${BASE_URL1}/batches?level=${encodeURIComponent(nextLevel)}`);
        const data = unwrapApiData(payload);
        const normalizedBatches = Array.isArray(data)
          ? data.map((item) => normalizeBatch(item as Record<string, unknown>))
          : [];
        const nextBatchId = "all";

        setBatches(normalizedBatches);
        setSelectedBatchId(nextBatchId);
        await loadLeaderboard(normalizedBatches, nextBatchId);
      } catch (fetchError) {
        setBatches([]);
        setSelectedBatchId("all");
        setRows([]);
        setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch batches");
      } finally {
        setLoadingBatches(false);
      }
    },
    [loadLeaderboard]
  );

  useEffect(() => {
    if (!level) {
      setBatches([]);
      setSelectedBatchId("");
      setRows([]);
      setLastUpdated(null);
      setError("");
      return;
    }

    void loadBatches(level);
  }, [level, loadBatches]);

  useEffect(() => {
    if (!level || !autoRefresh || !batches.length || !selectedBatchId) return;

    const timer = window.setInterval(() => {
      void loadLeaderboard(batches, selectedBatchId, true);
    }, LIVE_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [autoRefresh, batches, loadLeaderboard, selectedBatchId]);

  const handleLevelChange = (nextLevel: string) => {
    if (!isLevelOption(nextLevel)) return;

    const typedLevel = nextLevel;
    if (typedLevel === level) return;

    setSelectedBatchId("all");
    setLevel(typedLevel);
  };

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId);
    void loadLeaderboard(batches, batchId);
  };

  const handleStatusFilterChange = (value: string) => {
    if (!isStatusFilter(value)) return;

    setStatusFilter(value);
  };

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus = statusFilter === "active" ? row.status !== "not_started" : row.status === statusFilter;
      const matchesSearch =
        !query ||
        [row.organizationName, row.email, row.enrollmentNo, row.batchCode]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [rows, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    const activeCount = rows.filter((row) => row.status !== "not_started").length;
    const completedCount = rows.filter((row) => row.status === "completed").length;
    const averageScore = rows.length
      ? rows.reduce((sum, row) => sum + row.percentage, 0) / rows.length
      : 0;
    const topScore = rows[0]?.percentage || 0;

    return {
      activeCount,
      completedCount,
      averageScore,
      topScore,
    };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-700">
              <Trophy className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-bold leading-tight text-slate-950">Live Leaderboard</h2>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">
                Ranking updates from saved exam responses, score, attempts, time, and tab switches.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 xl:w-auto xl:items-end">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[140px_minmax(190px,240px)_160px_118px_118px] xl:w-auto">
            <Select value={level} onValueChange={handleLevelChange}>
              <SelectTrigger className="h-10 w-full rounded-lg border-slate-200 bg-white">
                <SelectValue placeholder="Select Level" />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedBatchId} onValueChange={handleBatchChange} disabled={!level || loadingBatches}>
              <SelectTrigger className="h-10 w-full rounded-lg border-slate-200 bg-white">
                <SelectValue placeholder={!level ? "Select level first" : loadingBatches ? "Loading exams..." : "Exam"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All exams</SelectItem>
                {batches.map((batch) => {
                  const batchId = getBatchId(batch);
                  if (!batchId) return null;

                  return (
                    <SelectItem key={batchId} value={String(batchId)}>
                      {getBatchCode(batch) || `Exam ${batchId}`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="h-10 w-full rounded-lg border-slate-200 bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="h-10 w-full rounded-lg border-slate-200 bg-white"
              onClick={() => loadLeaderboard(batches, selectedBatchId)}
              disabled={!level || loadingRows || loadingBatches}
            >
              {loadingRows || refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>

            <Button
              variant={autoRefresh ? "default" : "outline"}
              className={
                autoRefresh
                  ? "h-10 w-full rounded-lg bg-emerald-600 shadow-none hover:bg-emerald-700"
                  : "h-10 w-full rounded-lg border-slate-200 bg-white"
              }
              onClick={() => setAutoRefresh((value) => !value)}
            >
              <Activity className="mr-2 h-4 w-4" />
              {autoRefresh ? "Live On" : "Live Off"}
            </Button>
            </div>
            <p className="text-xs text-slate-500">
              Auto refresh every 10s{lastUpdated ? ` | Updated ${lastUpdated.toLocaleTimeString()}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          icon={<Users className="h-5 w-5 text-blue-700" />}
          label="Organizations"
          value={rows.length}
          tone="bg-blue-100"
        />
        <MetricTile
          icon={<Activity className="h-5 w-5 text-emerald-700" />}
          label="Active / Completed"
          value={`${summary.activeCount}/${summary.completedCount}`}
          tone="bg-emerald-100"
        />
        <MetricTile
          icon={<Award className="h-5 w-5 text-amber-700" />}
          label="Top Score"
          value={`${Math.round(summary.topScore)}%`}
          tone="bg-amber-100"
        />
        <MetricTile
          icon={<Clock className="h-5 w-5 text-purple-700" />}
          label="Average Score"
          value={`${Math.round(summary.averageScore)}%`}
          tone="bg-purple-100"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/60 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-950">
              {!level
                ? "Select a level"
                : selectedBatch
                  ? `${getBatchCode(selectedBatch) || `Exam ${selectedBatchId}`} standings`
                  : "All exams standings"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {filteredRows.length} organization{filteredRows.length === 1 ? "" : "s"} shown
              {refreshing ? " - refreshing" : ""}
            </p>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search organization..."
              disabled={!level}
              className="h-10 rounded-lg border-slate-200 bg-white pl-9"
            />
          </div>
        </div>

        {error && (
          <div className="m-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {loadingRows || loadingBatches ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p>Loading live leaderboard...</p>
          </div>
        ) : filteredRows.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 bg-white">
                  <TableHead className="h-11 w-[84px] px-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Rank</TableHead>
                  <TableHead className="h-11 min-w-[240px] text-xs font-semibold uppercase tracking-wide text-slate-500">Organization Name</TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-slate-500">Exam</TableHead>
                  <TableHead className="h-11 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Score</TableHead>
                  <TableHead className="h-11 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Attempted</TableHead>
                  <TableHead className="h-11 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Time</TableHead>
                  <TableHead className="h-11 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Tab switch</TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</TableHead>
                  <TableHead className="h-11 min-w-[160px] text-xs font-semibold uppercase tracking-wide text-slate-500">Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={`${row.candidateId || row.email}-${row.batchCode}`} className="border-b border-slate-100 hover:bg-slate-50/70">
                    <TableCell className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <RankBadge rank={row.rank} />
                        <span className="text-sm font-bold text-slate-700">#{row.rank}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div>
                        <p className="font-semibold leading-5 text-slate-950">{row.organizationName}</p>
                        <p className="text-xs text-slate-500">{row.email}</p>
                        <p className="mt-0.5 text-[11px] font-mono text-slate-400">{row.enrollmentNo}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 font-medium text-slate-700">{row.batchCode}</TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="font-bold text-slate-950">{Math.round(row.percentage)}%</div>
                    </TableCell>
                    <TableCell className="py-4 text-right font-semibold text-slate-800">
                      {row.attemptedQuestions}/{row.totalQuestions || "--"}
                    </TableCell>
                    <TableCell className="py-4 text-right font-mono text-sm text-slate-700">
                      {row.timeSeconds > 0 ? formatDuration(row.timeSeconds) : "--"}
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <span
                        className={`inline-flex min-w-8 justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.tabSwitchCount > 0 ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                        }`}
                      >
                        {row.tabSwitchCount}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="py-4 text-sm text-slate-600">
                      {row.lastActivity ? formatDateTime(row.lastActivity) : "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-12">
            <EmptyState
              icon={Trophy}
              title={!level ? "Select a level" : "No leaderboard data"}
              description={
                !level
                  ? "Choose a level to load leaderboard data."
                  : "No enrolled organizations or saved responses were found for the selected filters."
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveLeaderboard;
