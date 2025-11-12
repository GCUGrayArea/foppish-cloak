/**
 * Demand Letter Workflow Types
 *
 * Types for demand letter creation, analysis, generation, and refinement workflow.
 */

import { LetterStatus } from '../db/types';

/**
 * Workflow state for demand letter processing
 */
export type WorkflowState =
  | 'draft' // Initial state, letter created
  | 'analyzing' // Document analysis in progress
  | 'analyzed' // Analysis complete, ready for generation
  | 'generating' // Letter generation in progress
  | 'generated' // Initial draft generated
  | 'refining' // Refinement in progress
  | 'complete' // Final letter complete
  | 'error'; // Error occurred in workflow

/**
 * Workflow action types
 */
export type WorkflowAction =
  | 'START_ANALYSIS'
  | 'ANALYSIS_COMPLETE'
  | 'ANALYSIS_ERROR'
  | 'START_GENERATION'
  | 'GENERATION_COMPLETE'
  | 'GENERATION_ERROR'
  | 'START_REFINEMENT'
  | 'REFINEMENT_COMPLETE'
  | 'REFINEMENT_ERROR'
  | 'MARK_COMPLETE'
  | 'RESET';

/**
 * Workflow transition definition
 */
export interface WorkflowTransition {
  from: WorkflowState;
  action: WorkflowAction;
  to: WorkflowState;
}

/**
 * Request to create new demand letter
 */
export interface CreateDemandLetterRequest {
  title: string;
  templateId?: string;
  documentIds?: string[];
}

/**
 * Request to analyze documents for a demand letter
 */
export interface AnalyzeDemandLetterRequest {
  letterId: string;
  documentIds: string[];
}

/**
 * Request to generate letter draft
 */
export interface GenerateDemandLetterRequest {
  letterId: string;
  templateId?: string;
  customInstructions?: string;
  tone?: 'formal' | 'assertive' | 'conciliatory';
}

/**
 * Request to refine existing letter
 */
export interface RefineDemandLetterRequest {
  letterId: string;
  feedback: string;
  sections?: string[]; // Specific sections to modify
}

/**
 * Document analysis result from AI service
 */
export interface DocumentAnalysisResult {
  success: boolean;
  documentId: string;
  extractedData: ExtractedData;
  processingTimeSeconds: number;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
  };
  modelId: string;
  extractionTimestamp: string;
  errorMessage?: string;
}

/**
 * Extracted data structure from documents
 */
export interface ExtractedData {
  parties?: PartyInfo[];
  incident?: IncidentInfo;
  damages?: DamageInfo[];
  documents?: DocumentReference[];
  timeline?: TimelineEvent[];
  claims?: ClaimInfo[];
  [key: string]: any; // Allow additional fields
}

/**
 * Party information (plaintiff, defendant, etc.)
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
 * Document reference in extracted data
 */
export interface DocumentReference {
  id: string;
  type: string;
  relevance: string;
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
 * Letter generation result from AI service
 */
export interface LetterGenerationResult {
  success: boolean;
  letter?: GeneratedLetter;
  processingTimeSeconds: number;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
  };
  modelId: string;
  generationTimestamp: string;
  errorMessage?: string;
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
 * Letter section
 */
export interface LetterSection {
  type: string;
  title: string;
  content: string;
  order: number;
}

/**
 * Letter refinement result from AI service
 */
export interface LetterRefinementResult {
  success: boolean;
  refinedLetter?: GeneratedLetter;
  changesSummary?: string;
  processingTimeSeconds: number;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
  };
  modelId: string;
  refinementTimestamp: string;
  conversationHistory?: ConversationHistory;
  errorMessage?: string;
}

/**
 * Conversation history for iterative refinement
 */
export interface ConversationHistory {
  turns: ConversationTurn[];
}

/**
 * Single conversation turn
 */
export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * Demand letter workflow status response
 */
export interface DemandLetterWorkflowStatus {
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
 * Workflow error
 */
export interface WorkflowError {
  stage: string;
  error: string;
  timestamp: string;
  recoverable: boolean;
}

/**
 * Demand letter with full details
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
  documents: {
    id: string;
    filename: string;
    uploadedAt: string;
  }[];
  revisions: {
    id: string;
    revisionNumber: number;
    changeType: string;
    changedAt: string;
    changedBy: string;
  }[];
  createdAt: Date;
  updatedAt?: Date;
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
