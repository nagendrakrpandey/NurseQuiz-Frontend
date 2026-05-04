import { useMatch, useParams } from "react-router-dom";
import EvidenceDetailsPage from "./evidence/EvidenceDetails";
import EvidenceReportPage from "./evidence/EvidenceReport";
import CandidateEvidenceList from "./evidence/EvidenceTable";

const EvidencePage = () => {
  const params = useParams();
  const reportMatch = useMatch("/Evidence/report/:candidateId");
  const reportCandidateId = Number(reportMatch?.params.candidateId);
  const candidateId = Number(params.candidateId ?? params.userId);

  if (reportCandidateId) {
    return <EvidenceReportPage candidateId={reportCandidateId} />;
  }

  if (candidateId) {
    return <EvidenceDetailsPage userId={candidateId} />;
  }

  return <CandidateEvidenceList />;
};

export default EvidencePage;
