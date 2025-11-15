/**
 * Demand Letter Service
 *
 * Core CRUD operations for demand letters:
 * - Create demand letter
 * - Get demand letter by ID
 * - List demand letters
 *
 * For workflow operations (analyze, generate, refine), see DemandLetterWorkflowService
 */

import { DemandLetterModel } from '../db/models/DemandLetter';
import { DocumentService } from './DocumentService';
import { AIServiceClient } from './AIServiceClient';
import { DemandLetterWorkflowService } from './DemandLetterWorkflowService';
import type {
  CreateDemandLetterRequest,
  AnalyzeDemandLetterRequest,
  GenerateDemandLetterRequest,
  RefineDemandLetterRequest,
  DemandLetterDetails,
  DemandLetterWorkflowStatus,
} from '../types/demand-letter';
import { LetterStatus } from '../db/types';
import { associateDocuments, enrichLetterDetails } from './DemandLetterHelpers';

/**
 * Demand Letter Service
 */
export class DemandLetterService {
  private documentService: DocumentService;
  private aiService: AIServiceClient;
  private workflowService: DemandLetterWorkflowService;

  constructor() {
    this.documentService = new DocumentService();
    this.aiService = new AIServiceClient();
    this.workflowService = new DemandLetterWorkflowService(
      this.documentService,
      this.aiService
    );
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
      await associateDocuments(
        letter.id,
        request.documentIds,
        firmId,
        this.documentService
      );
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

    return enrichLetterDetails(letter, firmId);
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
      result.letters.map((letter) => enrichLetterDetails(letter, firmId))
    );

    return {
      letters: enrichedLetters,
      total: result.total,
    };
  }

  // ===== Workflow Operations (delegated to WorkflowService) =====

  /**
   * Analyze documents for a demand letter
   */
  async analyzeDemandLetter(
    request: AnalyzeDemandLetterRequest,
    firmId: string
  ): Promise<DemandLetterDetails> {
    return this.workflowService.analyzeDemandLetter(
      request,
      firmId,
      this.getDemandLetterById.bind(this)
    );
  }

  /**
   * Generate letter draft
   */
  async generateDemandLetter(
    request: GenerateDemandLetterRequest,
    firmId: string,
    userId: string
  ): Promise<DemandLetterDetails> {
    return this.workflowService.generateDemandLetter(
      request,
      firmId,
      userId,
      this.getDemandLetterById.bind(this)
    );
  }

  /**
   * Refine existing letter
   */
  async refineDemandLetter(
    request: RefineDemandLetterRequest,
    firmId: string,
    userId: string
  ): Promise<DemandLetterDetails> {
    return this.workflowService.refineDemandLetter(
      request,
      firmId,
      userId,
      this.getDemandLetterById.bind(this)
    );
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(
    letterId: string,
    firmId: string
  ): Promise<DemandLetterWorkflowStatus> {
    return this.workflowService.getWorkflowStatus(
      letterId,
      firmId,
      this.getDemandLetterById.bind(this)
    );
  }
}
