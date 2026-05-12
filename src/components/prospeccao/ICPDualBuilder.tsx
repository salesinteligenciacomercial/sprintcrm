import { ICPIntelligenceBuilder } from "./ICPIntelligenceBuilder";
import { PreSDRListAnalyzer } from "./PreSDRListAnalyzer";

export function ICPDualBuilder() {
  return (
    <div className="space-y-4">
      <ICPIntelligenceBuilder />
      <PreSDRListAnalyzer />
    </div>
  );
}
