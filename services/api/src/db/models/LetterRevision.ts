import { query } from '../connection';
import { LetterRevision, ChangeType } from '../types';

export class LetterRevisionModel {
  /**
   * Create a new letter revision
   * @param data Letter revision data
   * @returns Created revision
   */
  static async create(data: {
    letter_id: string;
    content: string;
    revision_number: number;
    change_type: ChangeType;
    changed_by: string;
    change_notes?: string;
  }): Promise<LetterRevision> {
    const sql = `
      INSERT INTO letter_revisions (
        letter_id, content, revision_number, change_type, changed_by, change_notes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await query<LetterRevision>(sql, [
      data.letter_id,
      data.content,
      data.revision_number,
      data.change_type,
      data.changed_by,
      data.change_notes || null,
    ]);

    return result.rows[0];
  }

  /**
   * Get latest revision number for letter
   * @param letterId Letter ID
   * @returns Latest revision number
   */
  static async getLatestRevisionNumber(letterId: string): Promise<number> {
    const sql = `
      SELECT COALESCE(MAX(revision_number), 0) as latest
      FROM letter_revisions
      WHERE letter_id = $1
    `;
    const result = await query<{ latest: number }>(sql, [letterId]);
    return result.rows[0].latest;
  }

  /**
   * List revisions for letter
   * @param letterId Letter ID
   * @returns Letter revisions
   */
  static async listByLetter(letterId: string): Promise<LetterRevision[]> {
    const sql = `
      SELECT * FROM letter_revisions
      WHERE letter_id = $1
      ORDER BY revision_number DESC
    `;
    const result = await query<LetterRevision>(sql, [letterId]);
    return result.rows;
  }

  /**
   * Find specific revision
   * @param letterId Letter ID
   * @param revisionNumber Revision number
   * @returns Letter revision or null
   */
  static async findByNumber(
    letterId: string,
    revisionNumber: number
  ): Promise<LetterRevision | null> {
    const sql = `
      SELECT * FROM letter_revisions
      WHERE letter_id = $1 AND revision_number = $2
    `;
    const result = await query<LetterRevision>(sql, [letterId, revisionNumber]);
    return result.rows[0] || null;
  }
}

export default LetterRevisionModel;
