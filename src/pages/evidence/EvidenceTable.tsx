import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Users,
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
import { BASE_URL1 } from "@/Service/api";
import {
  EmptyState,
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

const readEmailsFromRecord = (record: Record<string, unknown>) =>
  ["email", "orgEmail", "organizationEmail", "userEmail", "contactEmail"]
    .map((key) => normalizeEmail(record[key]))
    .filter(Boolean);

const collectUserIdsByEmail = (
  value: unknown,
  userIdsByEmail: Map<string, number>,
  inheritedUserId: number | null = null
) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectUserIdsByEmail(item, userIdsByEmail, inheritedUserId));
    return;
  }

  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  const nestedUser = record.user && typeof record.user === "object" ? (record.user as Record<string, unknown>) : {};
  const currentUserId =
    readNumberByAliases(record, ["userId", "user_id", "orgUserId", "organizationUserId", "registrationUserId"]) ||
    readNumberByAliases(nestedUser, ["id", "userId", "user_id"]) ||
    inheritedUserId;

  readEmailsFromRecord(record).forEach((email) => {
    if (currentUserId && !userIdsByEmail.has(email)) userIdsByEmail.set(email, currentUserId);
  });
  readEmailsFromRecord(nestedUser).forEach((email) => {
    if (currentUserId && !userIdsByEmail.has(email)) userIdsByEmail.set(email, currentUserId);
  });

  Object.values(record).forEach((item) => {
    if (item && typeof item === "object") collectUserIdsByEmail(item, userIdsByEmail, currentUserId);
  });
};

const fetchUserIdsByEmail = async () => {
  const result = await fetchJson(`${BASE_URL1}/register/get/all`);
  const data = unwrapApiData(result);
  const userIdsByEmail = new Map<string, number>();
  collectUserIdsByEmail(data, userIdsByEmail);
  return userIdsByEmail;
};

const enrichCandidatesWithUserIds = async (candidateRows: CandidateListRow[]) => {
  if (candidateRows.every((candidate) => getCandidateUserId(candidate))) return candidateRows;

  try {
    const userIdsByEmail = await fetchUserIdsByEmail();

    return candidateRows.map((candidate) => {
      const existingUserId = getCandidateUserId(candidate);
      const matchedUserId = userIdsByEmail.get(normalizeEmail(candidate.email));
      const userId = existingUserId || matchedUserId;

      return userId
        ? {
            ...candidate,
            userId,
            user_id: userId,
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

const CandidateEvidenceList = () => {
  const navigate = useNavigate();
  const [level, setLevel] = useState<LevelOption | "">("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [candidates, setCandidates] = useState<CandidateListRow[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [resolvingUserId, setResolvingUserId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const selectedBatch = useMemo(
    () => batches.find((batch) => String(getBatchId(batch)) === selectedBatchId) || null,
    [batches, selectedBatchId]
  );

  const fetchBatches = async (nextLevel: LevelOption) => {
    setLoadingBatches(true);
    setError("");
    setSelectedBatchId("");
    setCandidates([]);

    try {
      const result = await fetchJson(`${BASE_URL1}/batches?level=${encodeURIComponent(nextLevel)}`);
      const data = unwrapApiData(result);
      const normalizedBatches = Array.isArray(data)
        ? data.map((item) => normalizeBatch(item as Record<string, unknown>))
        : [];
      setBatches(normalizedBatches);
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
    setCandidates([]);

    try {
      const result = await fetchJson(`${BASE_URL1}/candidates?batchId=${encodeURIComponent(batchId)}`);
      const data = unwrapApiData(result);
      const normalizedCandidates = Array.isArray(data)
        ? data.map((item) => normalizeCandidate(item as Record<string, unknown>))
        : [];
      const candidatesWithUserIds = await enrichCandidatesWithUserIds(normalizedCandidates);
      setCandidates(candidatesWithUserIds);
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
    fetchBatches(typedLevel);
  };

  const handleBatchChange = (batchId: string) => {
    const nextBatch = batches.find((batch) => String(getBatchId(batch)) === batchId) || null;
    setSelectedBatchId(batchId);
    localStorage.setItem("batchId", batchId);
    if (nextBatch) {
      localStorage.setItem("batchCode", getBatchCode(nextBatch) || "");
      localStorage.setItem("level", nextBatch.level || level || "");
    }
    fetchCandidates(batchId);
  };

  const openCandidatePage = async (candidate: CandidateListRow, target: "evidence" | "report") => {
    if (target === "report") {
      const reportCandidateId = getCandidateId(candidate);

      if (!reportCandidateId) {
        setError("Candidate ID missing for this candidate. Please include candidate_id/id in candidates API response.");
        return;
      }

      navigate(`/Evidence/report/${reportCandidateId}`, {
        state: {
          candidate,
          batch: selectedBatch,
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

    navigate(`/Evidence/${evidenceUserId}`, {
      state: {
        candidate: resolvedCandidate,
        batch: selectedBatch,
      } satisfies EvidenceRouteState,
    });
  };

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
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Candidate Evidence</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  Select a level and batch to view enrolled candidates, then open evidence by user ID.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 bg-white px-4 py-4 sm:px-6 lg:grid-cols-[260px_1fr]">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Level</label>
              <Select value={level} onValueChange={handleLevelChange}>
                <SelectTrigger className="h-10 border-sky-200 bg-white focus:ring-sky-200">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="state">State</SelectItem>
                  <SelectItem value="district">District</SelectItem>
                  <SelectItem value="national">National</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Batch</label>
              <Select value={selectedBatchId} onValueChange={handleBatchChange} disabled={!level || loadingBatches || batches.length === 0}>
                <SelectTrigger className="h-10 border-sky-200 bg-white focus:ring-sky-200">
                  <SelectValue placeholder={loadingBatches ? "Loading batches..." : level ? "Select batch" : "Select level first"} />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch) => {
                    const batchId = getBatchId(batch);
                    if (!batchId) return null;

                    return (
                      <SelectItem key={batchId} value={String(batchId)}>
                        {getBatchCode(batch) || `Batch ${batchId}`} ({batch.level})
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

        <section className="mt-4 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeader
              icon={Users}
              title="Candidate List"
              description={selectedBatch ? `Showing candidates for ${getBatchCode(selectedBatch) || `Batch ${selectedBatchId}`}.` : "Candidates appear after selecting a batch."}
            />
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

          {!selectedBatch ? (
            <EmptyState
              icon={Search}
              title="Select level and batch"
              description="Choose the candidate level first, then select a batch to load enrolled candidates."
            />
          ) : loadingCandidates ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-sky-200 bg-sky-50/60">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-600" />
                <p className="mt-3 text-sm font-medium text-slate-600">Loading candidates...</p>
              </div>
            </div>
          ) : candidates.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-sky-100">
              <Table className="text-xs">
                <TableHeader className="bg-sky-50">
                  <TableRow className="hover:bg-sky-50">
                    <TableHead className="h-10 min-w-[90px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">User ID</TableHead>
                    <TableHead className="h-10 min-w-[110px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Candidate ID</TableHead>
                    <TableHead className="h-10 min-w-[210px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Candidate</TableHead>
                    <TableHead className="h-10 min-w-[220px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Email</TableHead>
                    <TableHead className="h-10 min-w-[140px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Phone</TableHead>
                    <TableHead className="h-10 min-w-[130px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Enrollment</TableHead>
                    <TableHead className="h-10 min-w-[110px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Status</TableHead>
                    <TableHead className="h-10 min-w-[90px] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Score</TableHead>
                    <TableHead className="h-10 min-w-[190px] px-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate) => {
                    const candidateId = getCandidateId(candidate);
                    const userId = getCandidateUserId(candidate);
                    const rowKey = getCandidateRowKey(candidate);
                    const isResolvingUserId = resolvingUserId === rowKey;

                    return (
                      <TableRow key={rowKey} className="hover:bg-sky-50/60">
                        <TableCell className="px-3 py-3 font-semibold text-slate-900">{userId || "--"}</TableCell>
                        <TableCell className="px-3 py-3 font-semibold text-slate-600">{candidateId || "--"}</TableCell>
                        <TableCell className="px-3 py-3">
                          <p className="font-semibold text-slate-900">{candidate.name || "--"}</p>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-slate-600">{candidate.email || "--"}</TableCell>
                        <TableCell className="px-3 py-3 text-slate-600">{candidate.phone || "--"}</TableCell>
                        <TableCell className="px-3 py-3 font-mono text-[11px] text-slate-600">{candidate.enrollment_no || candidate.enrollmentNo || "--"}</TableCell>
                        <TableCell className="px-3 py-3">
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-emerald-700">
                            {candidate.status || "enrolled"}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-3 font-semibold text-slate-800">{candidate.score ?? "--"}</TableCell>
                        <TableCell className="px-3 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              disabled={isResolvingUserId}
                              onClick={() => openCandidatePage(candidate, "evidence")}
                              className="h-8 bg-sky-600 text-white hover:bg-sky-700"
                            >
                              {isResolvingUserId ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                              {isResolvingUserId ? "Checking" : "Evidence"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isResolvingUserId}
                              onClick={() => openCandidatePage(candidate, "report")}
                              className="h-8 border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                            >
                              {isResolvingUserId ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                              Report
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
              title="No candidates found"
              description="No enrolled candidates were returned for the selected batch."
            />
          )}
        </section>
      </div>
    </div>
  );
};


export default CandidateEvidenceList;
