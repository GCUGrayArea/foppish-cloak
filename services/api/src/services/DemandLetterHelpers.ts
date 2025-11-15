/**
 * Demand Letter Helper Utilities
 *
 * Shared helper functions for demand letter operations:
 * - Document association and analysis
 * - Data merging and conversion
 * - Revision management
 * - Workflow state management
 * - Letter enrichment
 */

import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/connection';
import { DemandLetterModel } from '../db/models/DemandLetter';
import { DocumentService } from './DocumentService';
import { AIServiceClient } from './AIServiceClient';
import { getNextState } from '../utils/workflowState';
import type {
  ExtractedData,
  DemandLetterDetails,
  WorkflowAction,
} from '../types/demand-letter';
import { LetterStatus, DemandLetter } from '../db/types';

/**
 * Associate documents with letter
 */
export async function associateDocuments(
  letterId: string,
  documentIds: string[],
  firmId: string,
  documentService: DocumentService
): Promise<void> {
  for (const documentId of documentIds) {
    // Verify document exists and belongs to firm
    const document = await documentService.getDocumentById(
      documentId,
      firmId
    );

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    // Create association
    await pool.query(
      `INSERT INTO letter_documents (id, letter_id, document_id)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [uuidv4(), letterId, documentId]
    );
  }
}

/**
 * Analyze multiple documents
 */
export async function analyzeDocuments(
  documentIds: string[],
  firmId: string,
  documentService: DocumentService,
  aiService: AIServiceClient
): Promise<ExtractedData[]> {
  const results: ExtractedData[] = [];

  for (const documentId of documentIds) {
    // Get document content
    const document = await documentService.getDocumentById(
      documentId,
      firmId
    );

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    // Get document text (assuming it's stored or extracted)
    const documentText = await getDocumentText(document.id, firmId, documentService);

    // Analyze with AI service
    const analysisResult = await aiService.analyzeDocument({
      documentId: document.id,
      documentText,
      documentType: document.fileType,
      firmId,
    });

    if (analysisResult.success) {
      results.push(analysisResult.extractedData as ExtractedData);
    }
  }

  return results;
}

/**
 * Get document text content
 */
export async function getDocumentText(
  documentId: string,
  firmId: string,
  documentService: DocumentService
): Promise<string> {
  // In production, this would extract text from the document
  // For now, return placeholder
  // TODO: Implement text extraction in PR-009
  const content = await documentService.getLocalFileContent(
    documentId,
    firmId
  );
  return content.toString('utf-8');
}

/**
 * Merge extracted data from multiple documents
 */
export function mergeExtractedData(dataArray: ExtractedData[]): ExtractedData {
  const merged: ExtractedData = {
    parties: [],
    damages: [],
    documents: [],
    timeline: [],
    claims: [],
  };

  for (const data of dataArray) {
    if (data.parties) merged.parties!.push(...data.parties);
    if (data.damages) merged.damages!.push(...data.damages);
    if (data.documents) merged.documents!.push(...data.documents);
    if (data.timeline) merged.timeline!.push(...data.timeline);
    if (data.claims) merged.claims!.push(...data.claims);

    // Merge incident info (take first non-null)
    if (data.incident && !merged.incident) {
      merged.incident = data.incident;
    }
  }

  return merged;
}

/**
 * Get template variables
 */
export async function getTemplateVariables(
  templateId: string | undefined,
  firmId: string
): Promise<Record<string, any>> {
  if (!templateId) {
    return {};
  }

  // Query template
  const result = await pool.query(
    `SELECT tv.variables
     FROM templates t
     JOIN template_versions tv ON t.current_version_id = tv.id
     WHERE t.id = $1 AND t.firm_id = $2`,
    [templateId, firmId]
  );

  if (result.rows.length === 0) {
    return {};
  }

  return result.rows[0].variables || {};
}

/**
 * Convert sections array to content string
 */
export function sectionsToContent(
  sections: Array<{ type: string; title: string; content: string; order: number }>
): string {
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return sortedSections
    .map((section) => `## ${section.title}\n\n${section.content}`)
    .join('\n\n');
}

/**
 * Convert content string to sections array
 */
export function contentToSections(
  content: string,
  metadata: Record<string, any>
): any {
  // Parse markdown-style sections
  const sections = content.split(/\n## /).filter((s) => s.trim());

  return {
    sections: sections.map((section, index) => {
      const lines = section.split('\n');
      const title = lines[0].replace('## ', '').trim();
      const sectionContent = lines.slice(1).join('\n').trim();

      return {
        type: 'section',
        title,
        content: sectionContent,
        order: index + 1,
      };
    }),
    metadata: metadata || {},
  };
}

/**
 * Create letter revision
 */
export async function createRevision(
  letterId: string,
  content: string,
  changeType: 'initial' | 'ai_generation' | 'manual_edit' | 'ai_refinement',
  changedBy: string,
  notes?: string
): Promise<void> {
  // Get current revision number
  const countResult = await pool.query(
    `SELECT COUNT(*) as count FROM letter_revisions WHERE letter_id = $1`,
    [letterId]
  );

  const revisionNumber = parseInt(countResult.rows[0].count, 10) + 1;

  // Insert revision
  await pool.query(
    `INSERT INTO letter_revisions
     (id, letter_id, content, revision_number, change_type, changed_by, change_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [uuidv4(), letterId, content, revisionNumber, changeType, changedBy, notes]
  );
}

/**
 * Get conversation history for iterative refinement
 */
export async function getConversationHistory(
  letterId: string
): Promise<any | undefined> {
  // Get all AI refinement revisions
  const result = await pool.query(
    `SELECT change_notes, created_at
     FROM letter_revisions
     WHERE letter_id = $1 AND change_type = 'ai_refinement'
     ORDER BY revision_number ASC`,
    [letterId]
  );

  if (result.rows.length === 0) {
    return undefined;
  }

  // Build conversation history
  return {
    turns: result.rows.map((row) => ({
      role: 'user',
      content: row.change_notes,
      timestamp: row.created_at,
    })),
  };
}

/**
 * Validate workflow transition
 */
export function validateWorkflowTransition(
  currentState: string,
  action: WorkflowAction
): void {
  const nextState = getNextState(currentState as any, action);

  if (!nextState) {
    throw new Error(
      `Invalid workflow transition: ${action} from ${currentState}`
    );
  }
}

/**
 * Update letter status and workflow state
 */
export async function updateLetterStatus(
  letterId: string,
  firmId: string,
  workflowState: string,
  status: LetterStatus
): Promise<void> {
  await pool.query(
    `UPDATE demand_letters
     SET status = $1, updated_at = NOW()
     WHERE id = $2 AND firm_id = $3`,
    [status, letterId, firmId]
  );

  // Store workflow state in generation_metadata
  const letter = await DemandLetterModel.findById(letterId, firmId);
  if (letter) {
    await DemandLetterModel.update(letterId, firmId, {
      generation_metadata: {
        ...(letter.generation_metadata || {}),
        workflowState,
      },
    });
  }
}

/**
 * Enrich letter with related data
 */
export async function enrichLetterDetails(
  letter: DemandLetter,
  firmId: string
): Promise<DemandLetterDetails> {
  // Get associated documents
  const docsResult = await pool.query(
    `SELECT d.id, d.filename, d.created_at as uploaded_at
     FROM documents d
     JOIN letter_documents ld ON d.id = ld.document_id
     WHERE ld.letter_id = $1 AND d.firm_id = $2`,
    [letter.id, firmId]
  );

  // Get revisions
  const revisionsResult = await pool.query(
    `SELECT id, revision_number, change_type, created_at as changed_at, changed_by
     FROM letter_revisions
     WHERE letter_id = $1
     ORDER BY revision_number DESC
     LIMIT 10`,
    [letter.id]
  );

  // Extract workflow state from metadata
  const metadata = letter.generation_metadata || {};
  const workflowState = metadata.workflowState || 'draft';

  return {
    id: letter.id,
    firmId: letter.firm_id,
    createdBy: letter.created_by,
    templateId: letter.template_id,
    title: letter.title,
    status: letter.status,
    workflowState: workflowState as any,
    currentContent: letter.current_content,
    extractedData: letter.extracted_data,
    generationMetadata: metadata,
    documents: docsResult.rows.map((row) => ({
      id: row.id,
      filename: row.filename,
      uploadedAt: row.uploaded_at,
    })),
    revisions: revisionsResult.rows.map((row) => ({
      id: row.id,
      revisionNumber: row.revision_number,
      changeType: row.change_type,
      changedAt: row.changed_at,
      changedBy: row.changed_by,
    })),
    createdAt: letter.created_at,
    updatedAt: letter.updated_at,
  };
}
