import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthSession, hasAuthSession } from "@/lib/session";
import {
  DashboardRequestError,
  applyDashboardExamCompletionOverride,
  fetchDashboardResponseScoreSummary,
  getDashboardCandidateId,
  type DashboardResponse,
  type DashboardUser,
  fetchDashboardData,
  fetchDashboardExamResult,
  getDashboardUserId,
  getStoredDashboardScoreSummary,
  getStoredDashboardUser,
  mergeDashboardExamResult,
  mergeDashboardScoreSummary,
} from "@/lib/userDashboard";

const EMPTY_USER: DashboardUser = {
  fullName: "User",
  email: "",
  contact: "",
  id: null,
  candidateId: null,
  roleId: null,
};

export const useDashboardData = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [userData, setUserData] = useState<DashboardUser>(EMPTY_USER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(
    async (signal?: AbortSignal, quiet = false) => {
      if (!hasAuthSession()) {
        navigate("/login", { replace: true });
        return;
      }

      const storedUser = getStoredDashboardUser();
      setUserData(storedUser);
      const userId = getDashboardUserId(storedUser);

      if (!userId) {
        setError("User details not found. Please login again.");
        setDashboardData(null);
        setLoading(false);
        return;
      }

      if (!quiet) setLoading(true);
      setError("");

      try {
        const response = await fetchDashboardData(userId, signal);
        if (signal?.aborted) return;
        const localScoreSummary = getStoredDashboardScoreSummary(storedUser);
        let dashboardWithScore = mergeDashboardScoreSummary(response, localScoreSummary);
        try {
          const examResult = await fetchDashboardExamResult(signal);
          if (signal?.aborted) return;
          dashboardWithScore = mergeDashboardExamResult(dashboardWithScore, examResult);
        } catch (examResultError) {
          if (signal?.aborted) return;
          console.warn("Unable to load exam result status; using dashboard/local result data.", examResultError);
        }
        const responseCandidateId =
          getDashboardCandidateId(storedUser) ||
          response.candidateId ||
          response.candidate_id ||
          userId;

        try {
          const responseScoreSummary = await fetchDashboardResponseScoreSummary(responseCandidateId, signal);
          if (signal?.aborted) return;
          dashboardWithScore = mergeDashboardScoreSummary(dashboardWithScore, responseScoreSummary);
        } catch (scoreError) {
          if (signal?.aborted) return;
          console.warn("Unable to load dashboard response score; using dashboard/local result data.", scoreError);
        }

        setDashboardData(applyDashboardExamCompletionOverride(dashboardWithScore, userId));
      } catch (requestError) {
        if (signal?.aborted) return;

        if (
          requestError instanceof DashboardRequestError &&
          (requestError.status === 401 || requestError.status === 403)
        ) {
          clearAuthSession("manual");
          navigate("/login", { replace: true });
          return;
        }

        setDashboardData(null);
        setError(requestError instanceof Error ? requestError.message : "Unable to load dashboard.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [navigate],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadDashboard(controller.signal);

    return () => controller.abort();
  }, [loadDashboard]);

  const refreshDashboard = useCallback(() => loadDashboard(undefined, true), [loadDashboard]);

  return {
    dashboardData,
    userData,
    loading,
    error,
    refreshDashboard,
  };
};
