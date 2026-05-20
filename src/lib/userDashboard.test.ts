import {
  applyDashboardExamCompletionOverride,
  getDashboardEligibility,
  getDashboardScorePercentLabel,
  mergeDashboardScoreSummary,
  type DashboardResponse,
} from "./userDashboard";

const completedDashboard: DashboardResponse = {
  quizStatus: "COMPLETED",
  currentStage: "District",
  competitionLevels: ["District", "Regional", "State"],
};

describe("dashboard qualification", () => {
  it("uses calculated percentage over stale negative eligibility fields", () => {
    const dashboard = mergeDashboardScoreSummary(
      {
        ...completedDashboard,
        eligibleForNextRound: false,
        resultStatus: "FAILED",
      },
      {
        score: 35,
        totalMarks: 39,
        percentage: (35 / 39) * 100,
        attemptedQuestions: 22,
        totalQuestions: 22,
        completed: true,
      },
    );

    expect(getDashboardEligibility(dashboard)).toBe(true);
    expect(getDashboardScorePercentLabel(dashboard)).toBe("90%");
  });

  it("promotes qualifying candidates and adds a qualification certificate without score in the name", () => {
    const dashboard = mergeDashboardScoreSummary(completedDashboard, {
      score: 35,
      totalMarks: 39,
      percentage: (35 / 39) * 100,
      attemptedQuestions: 22,
      totalQuestions: 22,
      completed: true,
    });

    const result = applyDashboardExamCompletionOverride(dashboard, 101);  
    expect(result.currentStage).toBe("Regional");
    expect(result.activeLevel).toBe(1);
    expect(result.certificates?.some((certificate) =>
      certificate.name?.includes("Qualification Certificate") &&
     !certificate.name.includes("90%") &&
      certificate.status === "Available",
    )).toBe(true);
  });

  it("does not qualify scores below 35 percent", () => {
    const dashboard = mergeDashboardScoreSummary(completedDashboard, {
      score: 3,
      totalMarks: 36,
      percentage: (3 / 36) * 100,
      attemptedQuestions: 21,
      totalQuestions: 21,
      completed: true,
    });

    expect(getDashboardEligibility(dashboard)).toBe(false);
  });
});
