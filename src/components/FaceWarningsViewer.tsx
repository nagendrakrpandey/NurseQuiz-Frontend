import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, EyeOff, Loader2, RefreshCw, ScanFace, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCandidateFaceWarnings, type FaceWarningResponse } from "@/Service/api";

interface FaceWarningsViewerProps {
  candidateId?: number;
  userId?: number;
  batchId: number;
  batchCode?: string;
  maxDurationSeconds?: number;
}

const getWarningTypeLabel = (type: string): string => {
  const normalizedType = normalizeWarningType(type);
  const typeMap: Record<string, string> = {
    NOT_VISIBLE: "Face Not Visible",
    UNAUTHORIZED: "Unauthorized Face",
    NO_FACE: "No Face",
    API_ERROR: "API Error",
    MULTIPLE_FACES: "Multiple Faces",
  };
  if (normalizedType.includes("UNAUTHORIZED") || normalizedType.includes("UNKNOWN_FACE")) return "Unauthorized Face";
  if (normalizedType.includes("NO_FACE") || normalizedType.includes("NOFACE") || normalizedType.includes("FACE_MISSING")) return "No Face";
  if (normalizedType.includes("NOT_VISIBLE") || normalizedType.includes("FACE_NOT_VISIBLE")) return "Face Not Visible";

  return typeMap[type] || type.replace(/_/g, " ");
};

type WarningCategory = "unauthorized" | "notVisible" | "noFace";

interface WarningSummaryRow {
  key: string;
  memberId: string;
  memberName: string;
  unauthorized: number;
  notVisible: number;
  noFace: number;
  totalCount: number;
  totalDuration: number;
  durations: Record<WarningCategory, number>;
}

interface WarningTableRow {
  key: string;
  memberName: string;
  warningType: string;
  category: WarningCategory;
  count: number;
  duration: number;
}

interface WarningTotals {
  unauthorized: number;
  notVisible: number;
  noFace: number;
  total: number;
}

const normalizeWarningType = (type: string) => type.toUpperCase().replace(/[\s-]+/g, "_");

const getWarningBadgeColor = (type: string) => {
  const normalizedType = normalizeWarningType(type);

  switch (normalizedType) {
    case "NOT_VISIBLE":
    case "FACE_NOT_VISIBLE":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "UNAUTHORIZED":
    case "UNAUTHORIZED_FACE":
    case "UNAUTHORIZED_FACE_DETECTED":
      return "border-red-200 bg-red-50 text-red-700";
    case "NO_FACE":
    case "NO_FACE_DETECTED":
      return "border-orange-200 bg-orange-50 text-orange-700";
    default:
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }
};

const formatWarningDuration = (duration?: number) => {
  if (duration === 0) return "0.1s";
  if (!duration) return "-";

  const totalSeconds = Math.max(0, Math.floor(duration / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
};

const getWarningType = (warning: FaceWarningResponse) => warning.warningType || warning.warning_type || "";

const getWarningCount = (warning: FaceWarningResponse) =>
  Number(warning.warningCount ?? warning.warning_count ?? 1) || 1;

const normalizeDurationSecondsValue = (value: number, maxDurationSeconds?: number) => {
  if (!Number.isFinite(value) || value <= 0) return 0;

  const maxSeconds = Number(maxDurationSeconds);
  const hasExamLimit = Number.isFinite(maxSeconds) && maxSeconds > 0;

  // Some APIs send milliseconds in duration_seconds. If the value is far beyond
  // the exam duration, treat it as milliseconds before applying the display cap.
  if (hasExamLimit && value > maxSeconds && value >= 1000) {
    return Math.floor(value / 1000);
  }

  return value;
};

const getWarningDurationSeconds = (warning: FaceWarningResponse, maxDurationSeconds?: number) => {
  const durationSeconds = Number(warning.durationSeconds ?? warning.duration_seconds);
  if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
    return normalizeDurationSecondsValue(durationSeconds, maxDurationSeconds);
  }

  const durationMs = Number(warning.duration);
  if (Number.isFinite(durationMs) && durationMs > 0) return Math.floor(durationMs / 1000);

  return 0;
};

const clampDurationSeconds = (durationSeconds: number, maxDurationSeconds?: number) => {
  const normalizedDuration = Math.max(0, durationSeconds);
  const normalizedMax = Number(maxDurationSeconds);

  if (!Number.isFinite(normalizedMax) || normalizedMax <= 0) return normalizedDuration;

  return Math.min(normalizedDuration, normalizedMax);
};

const getWarningCategory = (warningType: string): WarningCategory | null => {
  const normalizedType = normalizeWarningType(warningType);

  if (normalizedType.includes("UNAUTHORIZED") || normalizedType.includes("UNKNOWN_FACE")) return "unauthorized";
  if (normalizedType.includes("NOT_VISIBLE") || normalizedType.includes("FACE_NOT_VISIBLE")) return "notVisible";
  if (normalizedType.includes("NO_FACE") || normalizedType.includes("NOFACE") || normalizedType.includes("FACE_MISSING")) return "noFace";

  return null;
};

const getWarningMemberId = (warning: FaceWarningResponse) => {
  const memberId = warning.memberId || warning.member_id;
  if (memberId !== null && memberId !== undefined && String(memberId).trim()) return String(memberId).trim();

  const detailsMemberId = warning.details?.match(/(?:memberId|member_id|teamMemberId|team_member_id)\s*[:=]\s*([^|,\s]+)/i)?.[1]?.trim();
  return detailsMemberId || "";
};

const getWarningMemberName = (warning: FaceWarningResponse) => {
  const memberName = warning.memberName || warning.member_name;
  if (memberName?.trim()) return memberName.trim();

  const memberFromDetails = warning.details?.match(/(?:member|candidate|team member)\s*:\s*([^|,]+)/i)?.[1]?.trim();
  if (memberFromDetails) return memberFromDetails;

  const userId = warning.userId || warning.user_id || warning.candidateId || warning.candidate_id;
  return userId ? `User #${userId}` : "Candidate";
};

const hasResolvedMemberName = (memberName: string) =>
  Boolean(memberName && !/^User #\d+$/i.test(memberName.trim()) && memberName.trim().toLowerCase() !== "candidate");

const buildWarningSummaryRows = (warnings: FaceWarningResponse[], maxDurationSeconds?: number) => {
  const rows = new Map<string, WarningSummaryRow>();

  warnings.forEach((warning) => {
    const warningType = getWarningType(warning);
    const category = getWarningCategory(warningType);
    if (!category) return;

    const memberName = getWarningMemberName(warning);
    const memberId = getWarningMemberId(warning);
    const warningCount = getWarningCount(warning);
    const warningDurationSeconds = clampDurationSeconds(getWarningDurationSeconds(warning, maxDurationSeconds), maxDurationSeconds);
    const key = memberId ? `member:${memberId}` : `name:${memberName.toLowerCase()}`;
    const row = rows.get(key) || {
      key,
      memberId,
      memberName,
      unauthorized: 0,
      notVisible: 0,
      noFace: 0,
      totalCount: 0,
      totalDuration: 0,
      durations: {
        unauthorized: 0,
        notVisible: 0,
        noFace: 0,
      },
    };

    row[category] += warningCount;
    row.totalCount += warningCount;
    row.totalDuration += warningDurationSeconds * 1000;
    row.durations[category] += warningDurationSeconds * 1000;
    rows.set(key, row);
  });

  return Array.from(rows.values()).sort((first, second) => first.memberName.localeCompare(second.memberName));
};

const buildWarningTableRows = (summaryRows: WarningSummaryRow[]) => {
  const createRow = (
    row: WarningSummaryRow,
    category: WarningCategory,
    warningType: string
  ): WarningTableRow => ({
    key: `${row.key}-${category}`,
    memberName: row.memberName,
    warningType,
    category,
    count: row[category],
    duration: row.durations[category],
  });

  const memberNotVisibleRows = summaryRows
    .filter((row) => row.notVisible > 0 && hasResolvedMemberName(row.memberName))
    .map((row) => createRow(row, "notVisible", "NOT_VISIBLE"));

  const fallbackNotVisibleRows = summaryRows
    .filter((row) => row.notVisible > 0 && !hasResolvedMemberName(row.memberName))
    .map((row) => createRow(row, "notVisible", "NOT_VISIBLE"));

  const noFaceRows = summaryRows
    .filter((row) => row.noFace > 0)
    .map((row) => createRow(row, "noFace", "NO_FACE"));

  const unauthorizedRows = summaryRows
    .filter((row) => row.unauthorized > 0)
    .map((row) => createRow(row, "unauthorized", "UNAUTHORIZED"));

  return [
    ...memberNotVisibleRows,
    ...fallbackNotVisibleRows,
    ...noFaceRows,
    ...unauthorizedRows,
  ];
};

const buildWarningTotals = (rows: WarningTableRow[]): WarningTotals =>
  rows.reduce(
    (totals, row) => ({
      ...totals,
      [row.category]: totals[row.category] + row.count,
      total: totals.total + row.count,
    }),
    {
      unauthorized: 0,
      notVisible: 0,
      noFace: 0,
      total: 0,
    }
  );

const normalizeWarningTableDurations = (rows: WarningTableRow[], maxDurationSeconds?: number) => {
  const maxSeconds = Number(maxDurationSeconds);
  if (!Number.isFinite(maxSeconds) || maxSeconds <= 0 || rows.length === 0) return rows;

  const maxDurationMs = maxSeconds * 1000;
  const rowsWithDisplayDuration = rows.map((row) => ({
    ...row,
    duration: row.duration > 0 ? row.duration : 100,
  }));
  const totalDuration = rowsWithDisplayDuration.reduce((sum, row) => sum + row.duration, 0);

  if (totalDuration <= maxDurationMs) return rowsWithDisplayDuration;

  const scale = maxDurationMs / totalDuration;
  return rowsWithDisplayDuration.map((row) => ({
    ...row,
    duration: Math.max(100, Math.floor(row.duration * scale)),
  }));
};

const getWarningCategoryLabel = (category: WarningCategory) => {
  const categoryLabels: Record<WarningCategory, string> = {
    unauthorized: "Unauthorized Face",
    notVisible: "Face Not Visible",
    noFace: "No Face",
  };

  return categoryLabels[category];
};

const getWarningCategoryBadgeColor = (category: WarningCategory) => {
  const categoryColors: Record<WarningCategory, string> = {
    unauthorized: "border-red-200 bg-red-50 text-red-700",
    notVisible: "border-amber-200 bg-amber-50 text-amber-700",
    noFace: "border-orange-200 bg-orange-50 text-orange-700",
  };

  return categoryColors[category];
};

const WarningStatusBadge = ({ category }: { category: WarningCategory }) => {
  return (
    <span className={`inline-flex max-w-full rounded-full border px-2 py-1 text-[11px] font-semibold leading-none ${getWarningCategoryBadgeColor(category)}`}>
      {getWarningCategoryLabel(category)}
    </span>
  );
};

const WarningTotalCard = ({
  category,
  count,
  icon: Icon,
}: {
  category: WarningCategory;
  count: number;
  icon: typeof AlertTriangle;
}) => (
  <div className={`rounded-lg border px-3 py-2 ${getWarningCategoryBadgeColor(category)}`}>
    <div className="flex min-h-[68px] flex-col justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/70">
          <Icon className="h-4 w-4" />
        </span>
        <p className="min-w-0 break-words text-[10px] font-extrabold uppercase leading-[13px] tracking-[0.03em]">
          {getWarningCategoryLabel(category)}
        </p>
      </div>
      <span className="block text-right text-2xl font-extrabold leading-none">{count}</span>
    </div>
  </div>
);

export const FaceWarningsViewer = ({
  candidateId,
  userId,
  batchId,
  maxDurationSeconds,
}: FaceWarningsViewerProps) => {
  const [warnings, setWarnings] = useState<FaceWarningResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchWarnings = async () => {
    const lookupUserId = userId || candidateId;
    if (!lookupUserId || !batchId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getCandidateFaceWarnings(lookupUserId, batchId, candidateId);
      setWarnings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch face warnings");
      setWarnings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && warnings.length === 0 && !error) {
      void fetchWarnings();
    }
  }, [isOpen]);

  const warningSummaryRows = useMemo(
    () => buildWarningSummaryRows(warnings, maxDurationSeconds),
    [maxDurationSeconds, warnings]
  );
  const warningTableRows = useMemo(
    () => normalizeWarningTableDurations(buildWarningTableRows(warningSummaryRows), maxDurationSeconds),
    [maxDurationSeconds, warningSummaryRows]
  );
  const warningTotals = useMemo(() => buildWarningTotals(warningTableRows), [warningTableRows]);

  return (
    <div className="w-full">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-11 w-full justify-start rounded-xl border-amber-200 bg-white px-3 font-semibold text-amber-700 shadow-sm hover:bg-amber-50"
      >
        <AlertTriangle className="h-4 w-4" />
        Face {warningTotals.total > 0 && `(${warningTotals.total})`}
        <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen && (
        <div className="mt-3 w-full overflow-hidden rounded-xl border border-amber-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
              <span className="text-sm text-amber-700">Loading face warnings...</span>
            </div>
          ) : error ? (
            <div className="m-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : warnings.length === 0 ? (
            <div className="m-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              No face warnings recorded for this candidate
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-amber-100 bg-amber-50/50 p-3">
                <div>
                  <p className="text-sm font-semibold text-amber-800">Face warning summary</p>
                  <p className="text-xs font-medium text-amber-700/80">Total warnings by face status</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchWarnings()}
                  className="h-9 shrink-0 border-amber-200 bg-white text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>

              <div className="grid gap-2 border-b border-amber-100 bg-white p-3 md:grid-cols-3">
                <WarningTotalCard category="notVisible" count={warningTotals.notVisible} icon={EyeOff} />
                <WarningTotalCard category="noFace" count={warningTotals.noFace} icon={ScanFace} />
                <WarningTotalCard category="unauthorized" count={warningTotals.unauthorized} icon={UserX} />
              </div>

              <div className="max-h-80 overflow-y-auto">
                {warningTableRows.length === 0 ? (
                  <div className="p-4 text-center text-sm text-amber-700">No matching face warning summary</div>
                ) : (
                  <Table className="w-full table-fixed">
                    <TableHeader className="sticky top-0 z-10 bg-white">
                      <TableRow className="hover:bg-white">
                        <TableHead className="w-[42%] px-3 py-3 text-xs font-bold uppercase text-slate-600">
                          Warning
                        </TableHead>
                        <TableHead className="w-[24%] px-2 py-3 text-xs font-bold uppercase text-slate-600">
                          Status
                        </TableHead>
                        <TableHead className="w-[14%] px-2 py-3 text-center text-xs font-bold uppercase text-slate-600">
                          Count
                        </TableHead>
                        <TableHead className="w-[20%] px-2 py-3 text-xs font-bold uppercase text-slate-600">
                          Duration
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {warningTableRows.map((row) => (
                        <TableRow key={row.key} className="hover:bg-amber-50/40">
                          <TableCell className="px-3 py-3">
                            <p className="break-words text-sm font-bold leading-snug text-slate-900">
                              {hasResolvedMemberName(row.memberName) ? row.memberName : getWarningCategoryLabel(row.category)}
                            </p>
                          </TableCell>
                          <TableCell className="px-2 py-3">
                            <WarningStatusBadge category={row.category} />
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center text-sm font-bold text-slate-900">{row.count}</TableCell>
                          <TableCell className="px-2 py-3 text-sm font-medium text-slate-700">
                            {formatWarningDuration(row.duration)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FaceWarningsViewer;
