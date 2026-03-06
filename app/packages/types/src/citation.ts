export type ConfidenceTier = 'statutory' | 'interpretive' | 'advisory';

export interface SourceCitation {
  /** Unique ID for this citation */
  id: string;
  /** Source type */
  sourceType: 'statute' | 'regulation' | 'treaty' | 'guidance' | 'case_law' | 'commentary';
  /** Human-readable title */
  title: string;
  /** Specific section/article reference */
  reference: string;
  /** URL if available */
  url: string | null;
  /** Confidence tier for this source */
  confidence: ConfidenceTier;
  /** Date of the source material */
  asOfDate: string;
  /** Jurisdiction this applies to */
  jurisdiction: string;
}
