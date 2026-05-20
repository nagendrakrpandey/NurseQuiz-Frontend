import { useMatch, useParams } from "react-router-dom";
import EvidenceDetailsPage from "./evidence/EvidenceDetails";
import EvidenceReportPage from "./evidence/EvidenceReport";
import CandidateEvidenceList from "./evidence/EvidenceTable";

interface EvidencePageProps {
  evidenceMode?: "completed" | "all";
}

const EvidencePage = ({ evidenceMode = "completed" }: EvidencePageProps) => {
  const params = useParams();
  const evidenceReportMatch = useMatch("/Evidence/report/:candidateId");
  const allEvidenceReportMatch = useMatch("/AllEvidence/report/:candidateId");
  const reportMatch = evidenceReportMatch || allEvidenceReportMatch;
  const reportCandidateId = Number(reportMatch?.params.candidateId);
  const candidateId = Number(params.candidateId ?? params.userId);

  if (reportCandidateId) {
    return <EvidenceReportPage candidateId={reportCandidateId} />;
  }

  if (candidateId) {
    return <EvidenceDetailsPage userId={candidateId} />;
  }

  return <CandidateEvidenceList mode={evidenceMode} />;
};

export default EvidencePage;
