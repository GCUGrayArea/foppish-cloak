/**
 * Demand Letter Service
 *
 * Orchestrates the complete demand letter workflow:
 * - Create demand letter
 * - Analyze source documents
 * - Generate letter draft
 * - Refine letter based on feedback
 * - Manage workflow state
 */

import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/connection';
import { DemandLetterModel } from '../db/models/DemandLetter';
import { DocumentService } from './DocumentService';
import { AIServiceClient } from './AIServiceClient';
import { getNextState } from '../utils/workflowState';
import type {
  CreateDemandLetterRequest,
  AnalyzeDemandLetterRequest,
  GenerateDemandLetterRequest,
  RefineDemandLetterRequest,
  DemandLetterDetails,
  DemandLetterWorkflowStatus,
  WorkflowAction,
  ExtractedData,
} from '../types/demand-letter';
import { LetterStatus, DemandLetter } from '../db/types';

/**
 * Demand Letter Service
 */
export class DemandLetterService {
  private documentService: DocumentService;
  private aiService: AIServiceClient;

  constructor() {
    this.documentService = new DocumentService();
    this.aiService = new AIServiceClient();
  }

  /**
   * Create new demand letter
   */
  async createDemandLetter(
    request: CreateDemandLetterRequest,
    firmId: string,
    userId: string
  ): Promise<DemandLetterDetails> {
    // Create demand letter in database
    const letter = await DemandLetterModel.create({
      firm_id: firmId,
      created_by: userId,
      template_id: request.templateId,
      title: request.title,
      status: 'draft',
    });

    // Associate documents if provided
    if (request.documentIds && request.documentIds.length > 0) {
      await this.associateDocuments(letter.id, request.documentIds, firmId);
    }

    // Return full details
    return this.getDemandLetterById(letter.id, firmId);
  }

  /**
   * Get demand letter by ID
   */
  async getDemandLetterById(
    letterId: string,
    firmId: string
  ): Promise<DemandLetterDetails> {
    const letter = await DemandLetterModel.findById(letterId, firmId);

    if (!letter) {
      throw new Error('Demand letter not found');
    }

    return this.enrichLetterDetails(letter, firmId);
  }

  /**
   * Analyze documents for a demand letter
   */
  async analyzeDemandLetter(
    request: AnalyzeDemandLetterRequest,
    firmId: string
  ): Promise<DemandLetterDetails> {
    const letter = await this.getDemandLetterById(request.letterId, firmId);

    // Validate workflow state
    this.validateWorkflowTransition(letter.workflowState, 'START_ANALYSIS');

    // Update state to analyzing
    await this.updateLetterStatus(
      request.letterId,
      firmId,
      'analyzing',
      'analyzing'
    );

    try {
      // Analyze each document
      const analysisResults = await this.analyzeDocuments(
        request.documentIds,
        firmId
      );

      // Merge extracted data
      const mergedData = this.mergeExtractedData(analysisResults);

      // Update letter with analysis results
      await DemandLetterModel.update(request.letterId, firmId, {
        status: 'analyzing',
        extracted_data: mergedData,
      });

      // Transition to analyzed state
      await this.updateLetterStatus(request.letterId, firmId, 'analyzed', 'draft');

      return this.getDemandLetterById(request.letterId, firmId);
    } catch (error) {
      // Mark as error
      await this.updateLetterStatus(request.letterId, firmId, 'error', 'draft');

      throw new Error(
        `Document analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate letter draft
   */
  async generateDemandLetter(
    request: GenerateDemandLetterRequest,
    firmId: string,
    userId: string
  ): Promise<DemandLetterDetails> {
    const letter = await this.getDemandLetterById(request.letterId, firmId);

    // Validate workflow state
    this.validateWorkflowTransition(letter.workflowState, 'START_GENERATION');

    // Update state to generating
    await this.updateLetterStatus(
      request.letterId,
      firmId,
      'generating',
      'generating'
    );

    try {
      // Get template variables if template specified
      const templateVariables = await this.getTemplateVariables(
        request.templateId,
        firmId
      );

      // Generate letter using AI service
      const generationResult = await this.aiService.generateLetter({
        caseId: request.letterId,
        extractedData: letter.extractedData,
        templateVariables,
        tone: request.tone || 'formal',
        customInstructions: request.customInstructions,
        firmId,
        userId,
      });

      if (!generationResult.success || !generationResult.letter) {
        throw new Error(
          generationResult.errorMessage || 'Letter generation failed'
        );
      }

      // Convert sections to content
      const content = this.sectionsToContent(generationResult.letter.sections);

      // Create initial revision
      await this.createRevision(
        request.letterId,
        content,
        'ai_generation',
        userId,
        'Initial AI-generated draft'
      );

      // Update letter with generated content
      await DemandLetterModel.update(request.letterId, firmId, {
        current_content: content,
        status: 'draft',
        generation_metadata: {
          model: generationResult.modelId,
          generatedAt: generationResult.generationTimestamp,
          tokenUsage: generationResult.tokenUsage,
        },
      });

      // Transition to generated state
      await this.updateLetterStatus(
        request.letterId,
        firmId,
        'generated',
        'draft'
      );

      return this.getDemandLetterById(request.letterId, firmId);
    } catch (error) {
      // Mark as error
      await this.updateLetterStatus(request.letterId, firmId, 'error', 'draft');

      throw new Error(
        `Letter generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Refine existing letter
   */
  async refineDemandLetter(
    request: RefineDemandLetterRequest,
    firmId: string,
    userId: string
  ): Promise<DemandLetterDetails> {
    const letter = await this.getDemandLetterById(request.letterId, firmId);

    // Validate workflow state
    this.validateWorkflowTransition(letter.workflowState, 'START_REFINEMENT');

    // Update state to refining
    await this.updateLetterStatus(
      request.letterId,
      firmId,
      'refining',
      'refining'
    );

    try {
      // Parse current content into sections
      const currentLetter = this.contentToSections(
        letter.currentContent || '',
        letter.generationMetadata
      );

      // Get conversation history if exists
      const conversationHistory = await this.getConversationHistory(
        request.letterId
      );

      // Refine letter using AI service
      const refinementResult = await this.aiService.refineLetter({
        letterId: request.letterId,
        currentLetter,
        feedback: {
          instruction: request.feedback,
          sections: request.sections,
        },
        conversationHistory,
        firmId,
        userId,
      });

      if (!refinementResult.success || !refinementResult.refinedLetter) {
        throw new Error(
          refinementResult.errorMessage || 'Letter refinement failed'
        );
      }

      // Convert sections to content
      const refinedContent = this.sectionsToContent(
        refinementResult.refinedLetter.sections
      );

      // Create refinement revision
      await this.createRevision(
        request.letterId,
        refinedContent,
        'ai_refinement',
        userId,
        refinementResult.changesSummary || 'AI refinement'
      );

      // Update letter
      const currentMeta = letter.generationMetadata || {};
      await DemandLetterModel.update(request.letterId, firmId, {
        current_content: refinedContent,
        status: 'draft',
        generation_metadata: {
          ...currentMeta,
          lastRefinedAt: refinementResult.refinementTimestamp,
          refinementCount: (currentMeta.refinementCount || 0) + 1,
          totalTokens:
            (currentMeta.totalTokens || 0) +
            refinementResult.tokenUsage.inputTokens +
            refinementResult.tokenUsage.outputTokens,
        },
      });

      // Transition back to generated state
      await this.updateLetterStatus(
        request.letterId,
        firmId,
        'generated',
        'draft'
      );

      return this.getDemandLetterById(request.letterId, firmId);
    } catch (error) {
      // Mark as error
      await this.updateLetterStatus(request.letterId, firmId, 'error', 'draft');

      throw new Error(
        `Letter refinement failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(
    letterId: string,
    firmId: string
  ): Promise<DemandLetterWorkflowStatus> {
    const letter = await this.getDemandLetterById(letterId, firmId);

    // Count documents
    const documentsResult = await pool.query(
      `SELECT COUNT(*) as count FROM letter_documents WHERE letter_id = $1`,
      [letterId]
    );
    const totalDocuments = parseInt(documentsResult.rows[0].count, 10);

    // Get refinement count from metadata
    const metadata = letter.generationMetadata || {};
    const refinementCount = metadata.refinementCount || 0;

    return {
      letterId: letter.id,
      state: letter.workflowState,
      status: letter.status,
      progress: {
        documentsAnalyzed: totalDocuments,
        totalDocuments,
        generationComplete: !!letter.currentContent,
        refinementCount,
      },
    };
  }

  /**
   * List demand letters for a firm
   */
  async listDemandLetters(
    firmId: string,
    options: {
      status?: LetterStatus;
      createdBy?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ letters: DemandLetterDetails[]; total: number }> {
    const result = await DemandLetterModel.listByFirm(firmId, options);

    const enrichedLetters = await Promise.all(
      result.letters.map((letter) => this.enrichLetterDetails(letter, firmId))
    );

    return {
      letters: enrichedLetters,
      total: result.total,
    };
  }

  // ===== Helper Methods =====

  /**
   * Associate documents with letter
   */
  private async associateDocuments(
    letterId: string,
    documentIds: string[],
    firmId: string
  ): Promise<void> {
    for (const documentId of documentIds) {
      // Verify document exists and belongs to firm
      const document = await this.documentService.getDocumentById(
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
  private async analyzeDocuments(
    documentIds: string[],
    firmId: string
  ): Promise<ExtractedData[]> {
    const results: ExtractedData[] = [];

    for (const documentId of documentIds) {
      // Get document content
      const document = await this.documentService.getDocumentById(
        documentId,
        firmId
      );

      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      // Get document text (assuming it's stored or extracted)
      const documentText = await this.getDocumentText(document.id, firmId);

      // Analyze with AI service
      const analysisResult = await this.aiService.analyzeDocument({
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
  private async getDocumentText(
    documentId: string,
    firmId: string
  ): Promise<string> {
    // In production, this would extract text from the document
    // For now, return placeholder
    // TODO: Implement text extraction in PR-009
    const content = await this.documentService.getLocalFileContent(
      documentId,
      firmId
    );
    return content.toString('utf-8');
  }

  /**
   * Merge extracted data from multiple documents
   */
  private mergeExtractedData(dataArray: ExtractedData[]): ExtractedData {
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
  private async getTemplateVariables(
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
  private sectionsToContent(
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
  private contentToSections(
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
  private async createRevision(
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
  private async getConversationHistory(
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
  private validateWorkflowTransition(
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
  private async updateLetterStatus(
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
  private async enrichLetterDetails(
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
}
