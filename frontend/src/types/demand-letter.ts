/**
 * Demand Letter Types
 *
 * Frontend types for demand letter creation, analysis, generation, and refinement.
 * Matches backend types from services/api/src/types/demand-letter.ts
 */

/**
 * Workflow state for demand letter processing
 */
export type WorkflowState =
  | 'draft'
  | 'analyzing'
  | 'analyzed'
  | 'generating'
  | 'generated'
  | 'refining'
  | 'complete'
  | 'error';

/**
 * Letter status
 */
export type LetterStatus = 'draft' | 'in_progress' | 'complete' | 'archived';

/**
 * Party information
 */
export interface PartyInfo {
  type: 'plaintiff' | 'defendant' | 'witness' | 'other';
  name: string;
  role?: string;
  contact?: {
    address?: string;
    phone?: string;
    email?: string;
  };
}

/**
 * Incident information
 */
export interface IncidentInfo {
  date?: string;
  location?: string;
  description?: string;
  type?: string;
}

/**
 * Damage information
 */
export interface DamageInfo {
  type: 'economic' | 'non-economic' | 'punitive';
  category: string;
  amount?: number;
  description: string;
  documentation?: string[];
}

/**
 * Timeline event
 */
export interface TimelineEvent {
  date: string;
  event: string;
  significance?: string;
}

/**
 * Legal claim information
 */
export interface ClaimInfo {
  type: string;
  basis: string;
  statute?: string;
  elements?: string[];
}

/**
 * Extracted data from document analysis
 */
export interface ExtractedData {
  parties?: PartyInfo[];
  incident?: IncidentInfo;
  damages?: DamageInfo[];
  timeline?: TimelineEvent[];
  claims?: ClaimInfo[];
  [key: string]: unknown;
}

/**
 * Letter section
 */
export interface LetterSection {
  type: string;
  title: string;
  content: string;
  order: number;
}

/**
 * Generated letter structure
 */
export interface GeneratedLetter {
  sections: LetterSection[];
  metadata: {
    templateId?: string;
    generatedAt: string;
    tone: string;
    wordCount: number;
  };
}

/**
 * Workflow error
 */
export interface WorkflowError {
  stage: string;
  error: string;
  timestamp: string;
  recoverable: boolean;
}

/**
 * Demand letter workflow status
 */
export interface WorkflowStatus {
  letterId: string;
  state: WorkflowState;
  status: LetterStatus;
  progress: {
    documentsAnalyzed: number;
    totalDocuments: number;
    generationComplete: boolean;
    refinementCount: number;
  };
  currentOperation?: {
    operation: string;
    startedAt: string;
    estimatedCompletion?: string;
  };
  errors?: WorkflowError[];
}

/**
 * Document reference in demand letter
 */
export interface DemandLetterDocument {
  id: string;
  filename: string;
  uploadedAt: string;
}

/**
 * Letter revision
 */
export interface LetterRevision {
  id: string;
  revisionNumber: number;
  changeType: string;
  changedAt: string;
  changedBy: string;
}

/**
 * Full demand letter details
 */
export interface DemandLetterDetails {
  id: string;
  firmId: string;
  createdBy: string;
  templateId?: string;
  title: string;
  status: LetterStatus;
  workflowState: WorkflowState;
  currentContent?: string;
  extractedData: ExtractedData;
  generationMetadata: {
    model?: string;
    generatedAt?: string;
    refinementCount?: number;
    totalTokens?: number;
  };
  documents: DemandLetterDocument[];
  revisions: LetterRevision[];
  createdAt: string;
  updatedAt?: string;
}

/**
 * Create demand letter request
 */
export interface CreateDemandLetterRequest {
  title: string;
  templateId?: string;
  documentIds?: string[];
}

/**
 * Generate letter request
 */
export interface GenerateDemandLetterRequest {
  letterId: string;
  templateId?: string;
  customInstructions?: string;
  tone?: 'formal' | 'assertive' | 'conciliatory';
}

/**
 * Refine letter request
 */
export interface RefineDemandLetterRequest {
  letterId: string;
  feedback: string;
  sections?: string[];
}

/**
 * List demand letters query parameters
 */
export interface ListDemandLettersQuery {
  status?: LetterStatus;
  createdBy?: string;
  templateId?: string;
  limit?: number;
  offset?: number;
}

/**
 * List demand letters response
 */
export interface ListDemandLettersResponse {
  letters: DemandLetterDetails[];
  total: number;
  limit: number;
  offset: number;
}
