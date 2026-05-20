import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { EXAM_INSTRUCTION_DONE_KEY, EXAM_PRECHECK_DONE_KEY } from "@/lib/session";

interface RequireExamStepProps {
  step: "instruction" | "exam";
  children: ReactNode;
}

const hasStepFlag = (key: string) =>
  sessionStorage.getItem(key) === "true" || localStorage.getItem(key) === "true";

const RequireExamStep = ({ step, children }: RequireExamStepProps) => {
  const location = useLocation();
  const precheckDone = hasStepFlag(EXAM_PRECHECK_DONE_KEY);
  const instructionDone = hasStepFlag(EXAM_INSTRUCTION_DONE_KEY);

  if (!precheckDone) {
    return <Navigate to={`/Precheck${location.search}`} replace />;
  }

  if (step === "exam" && !instructionDone) {
    return <Navigate to={`/instruction${location.search}`} replace />;
  }

  return <>{children}</>;
};

export default RequireExamStep;
