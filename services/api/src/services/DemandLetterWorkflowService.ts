/**
 * Demand Letter Workflow Service
 *
 * Manages the demand letter workflow state machine:
 * - Analyze source documents
 * - Generate letter draft
 * - Refine letter based on feedback
 * - Track workflow state and progress
 */

import { pool } from '../db/connection';
import { DemandLetterModel } from '../db/models/DemandLetter';
import { DocumentService } from './DocumentService';
import { AIServiceClient } from './AIServiceClient';
import type {
  AnalyzeDemandLetterRequest,
  GenerateDemandLetterRequest,
  RefineDemandLetterRequest,
  DemandLetterDetails,
  DemandLetterWorkflowStatus,
} from '../types/demand-letter';
import {
  analyzeDocuments,
  mergeExtractedData,
  getTemplateVariables,
  sectionsToContent,
  contentToSections,
  createRevision,
  getConversationHistory,
  validateWorkflowTransition,
  updateLetterStatus,
} from './DemandLetterHelpers';

/**
 * Demand Letter Workflow Service
 */
export class DemandLetterWorkflowService {
  private documentService: DocumentService;
  private aiService: AIServiceClient;

  constructor(
    documentService?: DocumentService,
    aiService?: AIServiceClient
  ) {
    this.documentService = documentService || new DocumentService();
    this.aiService = aiService || new AIServiceClient();
  }

  /**
   * Analyze documents for a demand letter
   */
  async analyzeDemandLetter(
    request: AnalyzeDemandLetterRequest,
    firmId: string,
    getCurrentLetter: (letterId: string, firmId: string) => Promise<DemandLetterDetails>
  ): Promise<DemandLetterDetails> {
    const letter = await getCurrentLetter(request.letterId, firmId);

    // Validate workflow state
    validateWorkflowTransition(letter.workflowState, 'START_ANALYSIS');

    // Update state to analyzing
    await updateLetterStatus(
      request.letterId,
      firmId,
      'analyzing',
      'analyzing'
    );

    try {
      // Analyze each document
      const analysisResults = await analyzeDocuments(
        request.documentIds,
        firmId,
        this.documentService,
        this.aiService
      );

      // Merge extracted data
      const mergedData = mergeExtractedData(analysisResults);

      // Update letter with analysis results
      await DemandLetterModel.update(request.letterId, firmId, {
        status: 'analyzing',
        extracted_data: mergedData,
      });

      // Transition to analyzed state
      await updateLetterStatus(request.letterId, firmId, 'analyzed', 'draft');

      return getCurrentLetter(request.letterId, firmId);
    } catch (error) {
      // Mark as error
      await updateLetterStatus(request.letterId, firmId, 'error', 'draft');

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
    userId: string,
    getCurrentLetter: (letterId: string, firmId: string) => Promise<DemandLetterDetails>
  ): Promise<DemandLetterDetails> {
    const letter = await getCurrentLetter(request.letterId, firmId);

    // Validate workflow state
    validateWorkflowTransition(letter.workflowState, 'START_GENERATION');

    // Update state to generating
    await updateLetterStatus(
      request.letterId,
      firmId,
      'generating',
      'generating'
    );

    try {
      // Generate letter using AI service
      const generatedLetter = await this.performLetterGeneration(
        request,
        letter,
        userId,
        firmId
      );

      // Convert sections to content
      const content = sectionsToContent(generatedLetter.letter.sections);

      // Create initial revision
      await createRevision(
        request.letterId,
        content,
        'ai_generation',
        userId,
        'Initial AI-generated draft'
      );

      // Update letter with generated content
      await this.updateLetterWithGeneratedContent(
        request.letterId,
        firmId,
        content,
        generatedLetter
      );

      // Transition to generated state
      await updateLetterStatus(
        request.letterId,
        firmId,
        'generated',
        'draft'
      );

      return getCurrentLetter(request.letterId, firmId);
    } catch (error) {
      // Mark as error
      await updateLetterStatus(request.letterId, firmId, 'error', 'draft');

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
    userId: string,
    getCurrentLetter: (letterId: string, firmId: string) => Promise<DemandLetterDetails>
  ): Promise<DemandLetterDetails> {
    const letter = await getCurrentLetter(request.letterId, firmId);

    // Validate workflow state
    validateWorkflowTransition(letter.workflowState, 'START_REFINEMENT');

    // Update state to refining
    await updateLetterStatus(
      request.letterId,
      firmId,
      'refining',
      'refining'
    );

    try {
      // Refine the letter using AI service
      const refinedContent = await this.performLetterRefinement(
        request,
        letter,
        userId,
        firmId
      );

      // Create refinement revision
      await createRevision(
        request.letterId,
        refinedContent.content,
        'ai_refinement',
        userId,
        refinedContent.summary
      );

      // Update letter with refined content and metadata
      await this.updateLetterWithRefinedContent(
        request.letterId,
        firmId,
        refinedContent.content,
        letter.generationMetadata,
        refinedContent.tokenUsage
      );

      // Transition back to generated state
      await updateLetterStatus(
        request.letterId,
        firmId,
        'generated',
        'draft'
      );

      return getCurrentLetter(request.letterId, firmId);
    } catch (error) {
      // Mark as error
      await updateLetterStatus(request.letterId, firmId, 'error', 'draft');

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
    firmId: string,
    getCurrentLetter: (letterId: string, firmId: string) => Promise<DemandLetterDetails>
  ): Promise<DemandLetterWorkflowStatus> {
    const letter = await getCurrentLetter(letterId, firmId);

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

  // ===== Private Helper Methods =====

  /**
   * Perform letter generation using AI service
   */
  private async performLetterGeneration(
    request: GenerateDemandLetterRequest,
    letter: DemandLetterDetails,
    userId: string,
    firmId: string
  ): Promise<any> {
    // Get template variables if template specified
    const templateVariables = await getTemplateVariables(
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

    return generationResult;
  }

  /**
   * Update letter with generated content and metadata
   */
  private async updateLetterWithGeneratedContent(
    letterId: string,
    firmId: string,
    content: string,
    generationResult: any
  ): Promise<void> {
    await DemandLetterModel.update(letterId, firmId, {
      current_content: content,
      status: 'draft',
      generation_metadata: {
        model: generationResult.modelId,
        generatedAt: generationResult.generationTimestamp,
        tokenUsage: generationResult.tokenUsage,
      },
    });
  }

  /**
   * Perform letter refinement using AI service
   */
  private async performLetterRefinement(
    request: RefineDemandLetterRequest,
    letter: DemandLetterDetails,
    userId: string,
    firmId: string
  ): Promise<{ content: string; summary: string; tokenUsage: any }> {
    // Parse current content into sections
    const currentLetter = contentToSections(
      letter.currentContent || '',
      letter.generationMetadata
    );

    // Get conversation history if exists
    const conversationHistory = await getConversationHistory(
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
    const refinedContent = sectionsToContent(
      refinementResult.refinedLetter.sections
    );

    return {
      content: refinedContent,
      summary: refinementResult.changesSummary || 'AI refinement',
      tokenUsage: refinementResult.tokenUsage
    };
  }

  /**
   * Update letter with refined content and metadata
   */
  private async updateLetterWithRefinedContent(
    letterId: string,
    firmId: string,
    content: string,
    currentMetadata: Record<string, any> | undefined,
    tokenUsage: any
  ): Promise<void> {
    const metadata = currentMetadata || {};
    await DemandLetterModel.update(letterId, firmId, {
      current_content: content,
      status: 'draft',
      generation_metadata: {
        ...metadata,
        lastRefinedAt: new Date().toISOString(),
        refinementCount: (metadata.refinementCount || 0) + 1,
        totalTokens:
          (metadata.totalTokens || 0) +
          tokenUsage.inputTokens +
          tokenUsage.outputTokens,
      },
    });
  }
}
