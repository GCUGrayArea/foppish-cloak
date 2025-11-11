/**
 * Template Validation Utility
 *
 * Provides validation for template content, metadata, and structure.
 * Uses Zod for input validation.
 */

import { z } from 'zod';
import { extractVariables } from './variableExtraction';

/**
 * Validation schema for creating a new template
 */
export const createTemplateSchema = z.object({
  name: z.string()
    .min(1, 'Template name is required')
    .max(255, 'Template name must be 255 characters or less')
    .trim(),
  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .trim()
    .optional(),
  content: z.string()
    .min(1, 'Template content is required'),
  isDefault: z.boolean().optional()
});

/**
 * Validation schema for updating template metadata/content
 */
export const updateTemplateSchema = z.object({
  name: z.string()
    .min(1, 'Template name cannot be empty')
    .max(255, 'Template name must be 255 characters or less')
    .trim()
    .optional(),
  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .trim()
    .optional(),
  content: z.string()
    .min(1, 'Template content cannot be empty')
    .optional()
});

/**
 * Validation schema for template query parameters
 */
export const templateQuerySchema = z.object({
  isDefault: z.string()
    .transform(val => val === 'true')
    .optional(),
  search: z.string()
    .max(100, 'Search query too long')
    .trim()
    .optional(),
  page: z.string()
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0, 'Page must be greater than 0')
    .optional(),
  limit: z.string()
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100')
    .optional()
});

/**
 * Validation result with errors
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate template content for structural issues
 *
 * Checks for:
 * - Minimum content length
 * - Valid variable syntax
 * - No malformed variable patterns
 *
 * @param content - Template content to validate
 * @returns Validation result with any errors found
 */
export function validateTemplateContent(content: string): ValidationResult {
  const errors: string[] = [];

  // Check minimum length
  if (!content || content.trim().length === 0) {
    errors.push('Template content cannot be empty');
    return { valid: false, errors };
  }

  if (content.trim().length < 10) {
    errors.push('Template content is too short (minimum 10 characters)');
  }

  // Check for malformed variables (opening braces without closing)
  const openBraces = (content.match(/\{\{/g) || []).length;
  const closeBraces = (content.match(/\}\}/g) || []).length;

  if (openBraces !== closeBraces) {
    errors.push(
      'Malformed variable syntax: mismatched opening and closing braces'
    );
  }

  // Extract variables to check for invalid patterns
  try {
    const variables = extractVariables(content);

    // Check if there are any malformed variable-like patterns
    const allBracePatterns = content.match(/\{\{[^}]*\}\}/g) || [];
    const validVariableCount = variables.length;

    // Count unique valid variables in content
    const validPatternCount = allBracePatterns.filter(pattern => {
      const nameMatch = pattern.match(/\{\{([^}]+)\}\}/);
      if (!nameMatch) return false;
      const name = nameMatch[1];
      return /^[a-z_][a-z0-9_]*$/i.test(name);
    }).length;

    // If we have brace patterns that don't match valid variables
    if (allBracePatterns.length > 0 && validPatternCount < allBracePatterns.length) {
      errors.push(
        'Invalid variable syntax detected. Variables must start with a letter or underscore and contain only letters, numbers, and underscores'
      );
    }
  } catch (error) {
    errors.push('Error parsing template variables');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if template name is valid
 *
 * @param name - Template name to validate
 * @returns True if valid
 */
export function isValidTemplateName(name: string): boolean {
  return name && name.trim().length > 0 && name.trim().length <= 255;
}

/**
 * Sanitize template content for safe storage
 *
 * - Normalizes line endings to \n
 * - Trims trailing whitespace from lines
 * - Removes excessive blank lines
 *
 * @param content - Raw template content
 * @returns Sanitized content
 */
export function sanitizeTemplateContent(content: string): string {
  return content
    .replace(/\r\n/g, '\n') // Normalize line endings
    .split('\n')
    .map(line => line.trimEnd()) // Remove trailing whitespace from each line
    .join('\n')
    .replace(/\n{3,}/g, '\n\n') // Collapse excessive blank lines
    .trim();
}
