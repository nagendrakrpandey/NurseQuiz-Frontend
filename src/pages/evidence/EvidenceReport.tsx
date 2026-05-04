import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {AlertCircle, ArrowLeft, BarChart3, CheckCircle2, Clock, ClipboardList, FileQuestion, Hash,
  Layers, Loader2, RefreshCw, Trophy, User, XCircle} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  CompactInfoCard,
  EmptyState,
  SectionHeader,
  fetchJson,
  formatDateTime,
  formatDuration,
  getBatchCode,
  getCandidateId,
  unwrapApiData,
  type EvidenceRouteState,
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

const normalizeText = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const normalizeReportRow = (value: Record<string, unknown>, index: number): ReportResponseRow => ({
  obtMarks: toNumber(value.obtMarks || value.obtainedMarks || value.score),
  questionId: toNumber(value.questionId || value.question_id || index + 1, index + 1),
  question: String(value.question || value.questionText || `Question ${index + 1}`),
  optiona: normalizeText(value.optiona || value.optionA),
  optionb: normalizeText(value.optionb || value.optionB),
  optionc: normalizeText(value.optionc || value.optionC),
  optiond: normalizeText(value.optiond || value.optionD),
  ansId: String(value.ansId || value.answerId || value.selectedOption || ""),
  qbId: toNullableNumber(value.qbId || value.qb_id),
  correctOption: String(value.correctOption ?? value.correct_option ?? ""),
  marks: toNumber(value.marks || value.totalMarks),
  candidateId: toNullableNumber(value.candidateId || value.candidate_id),
  submitTime: normalizeText(value.submitTime || value.submit_time || value.submittedAt || value.submitted_at),
  tabSwitchCount: toNumber(value.tabSwitchCount || value.tab_switch_count),
});

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

  const ids = splitAnswerIds(value);
  const values = (ids.length > 0 ? ids : [value]).map((id) => {
    const option = getOptionEntries(row).find(
      (entry) => entry.id === id || entry.label.toLowerCase() === id.toLowerCase()
    );

    if (!option) return `Option ${id}`;
    return option.value ? `${option.label}. ${option.value}` : `Option ${id}`;
  });

  return values.join(", ");
};

const getScoreState = (row: ReportResponseRow): ScoreState => {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const displayCandidateId = getCandidateId(routeState.candidate) || responses[0]?.candidateId || candidateId;
  const candidateName = routeState.candidate?.name || `Candidate #${displayCandidateId}`;
  const batchCode = getBatchCode(routeState.batch) || routeState.candidate?.batchCode || "--";

  const reportSummary = useMemo(() => {
    const totalMarks = responses.reduce((sum, row) => sum + row.marks, 0);
    const obtainedMarks = responses.reduce((sum, row) => sum + row.obtMarks, 0);
    const correctCount = responses.filter((row) => getScoreState(row) === "correct").length;
    const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
    const maxTabSwitchCount = responses.reduce((maxCount, row) => Math.max(maxCount, row.tabSwitchCount), 0);
    const sortedSubmitTimes = responses
      .map((row) => getSubmitTimestamp(row.submitTime))
      .filter(Boolean)
      .sort((first, second) => first - second);
    const firstSubmitTime = sortedSubmitTimes[0] || 0;
    const lastSubmitTime = sortedSubmitTimes[sortedSubmitTimes.length - 1] || 0;
    const totalTimeSeconds = firstSubmitTime && lastSubmitTime
      ? Math.max(0, Math.round((lastSubmitTime - firstSubmitTime) / 1000))
      : 0;

    return {
      totalMarks,
      obtainedMarks,
      correctCount,
      percentage,
      maxTabSwitchCount,
      totalTimeSeconds,
      firstSubmitTime,
      lastSubmitTime,
    };
  }, [responses]);

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

    try {
      const payload = await fetchJson(`${BASE_URL1}/responses/${candidateId}`);
      const data = unwrapApiData(payload);
      const rows = Array.isArray(data) ? data : [];
      const count =
        payload && typeof payload === "object" && "count" in payload
          ? toNumber((payload as Record<string, unknown>).count, rows.length)
          : rows.length;

      setResponses(rows.map((row, index) => normalizeReportRow(row as Record<string, unknown>, index)));
      setServerCount(count);
    } catch (fetchError) {
      setResponses([]);
      setServerCount(null);
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [candidateId]);

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
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Candidate Report</h1>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                    {candidateName} - Candidate ID {displayCandidateId}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/Evidence")} className="border-sky-200 bg-white text-sky-700 hover:bg-sky-50">
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

          <div className="grid gap-3 bg-white px-4 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-7">
            <CompactInfoCard icon={User} label="Candidate" value={candidateName} tone="emerald" />
            <CompactInfoCard icon={Hash} label="Candidate ID" value={displayCandidateId} tone="cyan" />
            <CompactInfoCard icon={Layers} label="Batch" value={batchCode} tone="sky" />
            <CompactInfoCard icon={ClipboardList} label="Responses" value={serverCount ?? responses.length} tone="cyan" />
            <CompactInfoCard icon={Trophy} label="Score" value={`${reportSummary.obtainedMarks}/${reportSummary.totalMarks}`} detail={`${reportSummary.percentage.toFixed(1)}%`} tone="emerald" />
            <CompactInfoCard icon={AlertCircle} label="Tab Switches" value={reportSummary.maxTabSwitchCount} tone={reportSummary.maxTabSwitchCount ? "rose" : "emerald"} />
            <CompactInfoCard icon={Clock} label="Total Time" value={formatDuration(reportSummary.totalTimeSeconds)} detail="First to last submit" tone="amber" />
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
              description={`${reportSummary.correctCount} correct response${reportSummary.correctCount === 1 ? "" : "s"} out of ${responses.length}. Total tab switches: ${reportSummary.maxTabSwitchCount}.`}
            />
          </div>

          {!loading && responses.length > 0 && (
            <div className="mb-4 grid gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="font-semibold uppercase tracking-[0.08em] text-slate-500">First Submit</p>
                <p className="mt-1 font-medium text-slate-900">{reportSummary.firstSubmitTime ? formatDateTime(new Date(reportSummary.firstSubmitTime).toISOString()) : "--"}</p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-[0.08em] text-slate-500">Last Submit</p>
                <p className="mt-1 font-medium text-slate-900">{reportSummary.lastSubmitTime ? formatDateTime(new Date(reportSummary.lastSubmitTime).toISOString()) : "--"}</p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-[0.08em] text-slate-500">Calculated Time</p>
                <p className="mt-1 font-medium text-slate-900">{formatDuration(reportSummary.totalTimeSeconds)}</p>
              </div>
            </div>
          )}

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
