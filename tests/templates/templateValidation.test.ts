/**
 * Template Validation Utility Tests
 *
 * Tests for validating template content and metadata
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateTemplateContent,
  isValidTemplateName,
  sanitizeTemplateContent,
  createTemplateSchema,
  updateTemplateSchema
} from '../../services/api/src/utils/templateValidation';

describe('Template Validation', () => {
  describe('validateTemplateContent', () => {
    it('should accept valid template content', () => {
      const content = 'Dear {{name}}, regarding case {{case_number}}.';
      const result = validateTemplateContent(content);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject empty content', () => {
      const result = validateTemplateContent('');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Template content cannot be empty');
    });

    it('should reject whitespace-only content', () => {
      const result = validateTemplateContent('   \n\t  ');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Template content cannot be empty');
    });

    it('should reject content that is too short', () => {
      const result = validateTemplateContent('Short');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Template content is too short (minimum 10 characters)'
      );
    });

    it('should detect mismatched braces', () => {
      const content = 'Dear {{name}, regarding case {{case_number}}.';
      const result = validateTemplateContent(content);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Malformed variable syntax: mismatched opening and closing braces'
      );
    });

    it('should detect invalid variable names', () => {
      const content = 'Dear {{123invalid}}, regarding case {{name-test}}.';
      const result = validateTemplateContent(content);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should accept underscores in variable names', () => {
      const content = 'Dear {{first_name}} {{last_name}}, case {{case_number}}.';
      const result = validateTemplateContent(content);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept content with multiple valid variables', () => {
      const content = `
        Dear {{plaintiff_name}},

        Re: Case {{case_number}}
        Date: {{date}}
        Amount: {{demand_amount}}
      `;
      const result = validateTemplateContent(content);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept content without variables', () => {
      const content = 'This is a standard letter template without any variables.';
      const result = validateTemplateContent(content);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('isValidTemplateName', () => {
    it('should accept valid template names', () => {
      expect(isValidTemplateName('Personal Injury')).toBe(true);
      expect(isValidTemplateName('Contract Breach')).toBe(true);
      expect(isValidTemplateName('Demand Letter - Type A')).toBe(true);
    });

    it('should reject empty names', () => {
      expect(isValidTemplateName('')).toBe(false);
    });

    it('should reject whitespace-only names', () => {
      expect(isValidTemplateName('   ')).toBe(false);
    });

    it('should reject names exceeding 255 characters', () => {
      const longName = 'A'.repeat(256);
      expect(isValidTemplateName(longName)).toBe(false);
    });

    it('should accept names at the 255 character limit', () => {
      const maxName = 'A'.repeat(255);
      expect(isValidTemplateName(maxName)).toBe(true);
    });
  });

  describe('sanitizeTemplateContent', () => {
    it('should normalize line endings', () => {
      const content = 'Line 1\r\nLine 2\r\nLine 3';
      const result = sanitizeTemplateContent(content);

      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should trim trailing whitespace from lines', () => {
      const content = 'Line 1   \nLine 2\t\nLine 3  ';
      const result = sanitizeTemplateContent(content);

      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should collapse excessive blank lines', () => {
      const content = 'Paragraph 1\n\n\n\nParagraph 2\n\n\n\nParagraph 3';
      const result = sanitizeTemplateContent(content);

      expect(result).toBe('Paragraph 1\n\nParagraph 2\n\nParagraph 3');
    });

    it('should trim leading and trailing whitespace', () => {
      const content = '\n\n  Content here  \n\n';
      const result = sanitizeTemplateContent(content);

      expect(result).toBe('Content here');
    });

    it('should handle complex template with multiple formatting issues', () => {
      const content =
        '\n\n  Dear {{name}},  \r\n\r\n\r\n\r\n  Paragraph 2  \n\n\n  Paragraph 3\t\n\n';
      const result = sanitizeTemplateContent(content);

      expect(result).toBe('Dear {{name}},\n\nParagraph 2\n\nParagraph 3');
    });

    it('should preserve intended spacing within lines', () => {
      const content = 'First   Second   Third';
      const result = sanitizeTemplateContent(content);

      expect(result).toBe('First   Second   Third');
    });
  });

  describe('createTemplateSchema', () => {
    it('should validate valid create request', () => {
      const data = {
        name: 'Personal Injury',
        description: 'Template for personal injury cases',
        content: 'Dear {{name}}, regarding case {{case_number}}.',
        isDefault: false
      };

      const result = createTemplateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require name field', () => {
      const data = {
        content: 'Dear {{name}}.',
        isDefault: false
      };

      const result = createTemplateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require content field', () => {
      const data = {
        name: 'Test Template',
        isDefault: false
      };

      const result = createTemplateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow optional description', () => {
      const data = {
        name: 'Test Template',
        content: 'Dear {{name}}.'
      };

      const result = createTemplateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should allow optional isDefault', () => {
      const data = {
        name: 'Test Template',
        content: 'Dear {{name}}.'
      };

      const result = createTemplateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should trim name field', () => {
      const data = {
        name: '  Test Template  ',
        content: 'Dear {{name}}.'
      };

      const result = createTemplateSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Template');
      }
    });

    it('should reject empty name after trimming', () => {
      const data = {
        name: '   ',
        content: 'Dear {{name}}.'
      };

      const result = createTemplateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject name exceeding 255 characters', () => {
      const data = {
        name: 'A'.repeat(256),
        content: 'Dear {{name}}.'
      };

      const result = createTemplateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject description exceeding 1000 characters', () => {
      const data = {
        name: 'Test',
        description: 'A'.repeat(1001),
        content: 'Dear {{name}}.'
      };

      const result = createTemplateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('updateTemplateSchema', () => {
    it('should validate update with name only', () => {
      const data = { name: 'Updated Name' };
      const result = updateTemplateSchema.safeParse(data);

      expect(result.success).toBe(true);
    });

    it('should validate update with description only', () => {
      const data = { description: 'Updated description' };
      const result = updateTemplateSchema.safeParse(data);

      expect(result.success).toBe(true);
    });

    it('should validate update with content only', () => {
      const data = { content: 'Updated content with {{variable}}.' };
      const result = updateTemplateSchema.safeParse(data);

      expect(result.success).toBe(true);
    });

    it('should validate update with multiple fields', () => {
      const data = {
        name: 'Updated Name',
        description: 'Updated description',
        content: 'Updated {{content}}.'
      };
      const result = updateTemplateSchema.safeParse(data);

      expect(result.success).toBe(true);
    });

    it('should allow empty object (no updates)', () => {
      const data = {};
      const result = updateTemplateSchema.safeParse(data);

      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const data = { name: '' };
      const result = updateTemplateSchema.safeParse(data);

      expect(result.success).toBe(false);
    });

    it('should reject empty content', () => {
      const data = { content: '' };
      const result = updateTemplateSchema.safeParse(data);

      expect(result.success).toBe(false);
    });
  });
});
