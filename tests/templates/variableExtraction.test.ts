/**
 * Variable Extraction Utility Tests
 *
 * Tests for extracting and manipulating template variables
 */

import { describe, it, expect } from '@jest/globals';
import {
  extractVariables,
  isValidVariableName,
  countVariableOccurrences,
  replaceVariable,
  replaceAllVariables
} from '../../services/api/src/utils/variableExtraction';

describe('Variable Extraction', () => {
  describe('extractVariables', () => {
    it('should extract single variable from content', () => {
      const content = 'Dear {{name}}, welcome!';
      const variables = extractVariables(content);

      expect(variables).toEqual(['name']);
    });

    it('should extract multiple unique variables', () => {
      const content = 'Dear {{name}}, case {{case_number}} on {{date}}';
      const variables = extractVariables(content);

      expect(variables).toEqual(['case_number', 'date', 'name']);
    });

    it('should remove duplicates and sort alphabetically', () => {
      const content = '{{name}} and {{age}} and {{name}} again';
      const variables = extractVariables(content);

      expect(variables).toEqual(['age', 'name']);
    });

    it('should convert variables to lowercase', () => {
      const content = '{{Name}} and {{AGE}} and {{CasE_Number}}';
      const variables = extractVariables(content);

      expect(variables).toEqual(['age', 'case_number', 'name']);
    });

    it('should handle underscores in variable names', () => {
      const content = '{{first_name}} {{last_name}} {{case_number}}';
      const variables = extractVariables(content);

      expect(variables).toEqual(['case_number', 'first_name', 'last_name']);
    });

    it('should handle variables starting with underscore', () => {
      const content = '{{_private}} {{_internal_id}}';
      const variables = extractVariables(content);

      expect(variables).toEqual(['_internal_id', '_private']);
    });

    it('should return empty array for content without variables', () => {
      const content = 'This is plain text without any variables.';
      const variables = extractVariables(content);

      expect(variables).toEqual([]);
    });

    it('should handle empty content', () => {
      const variables = extractVariables('');
      expect(variables).toEqual([]);
    });

    it('should ignore malformed variable patterns', () => {
      const content = '{{valid}} {invalid} {{also_valid}} {{{malformed}}}';
      const variables = extractVariables(content);

      expect(variables).toEqual(['also_valid', 'valid']);
    });

    it('should handle numbers in variable names', () => {
      const content = '{{address1}} {{address2}} {{case123}}';
      const variables = extractVariables(content);

      expect(variables).toEqual(['address1', 'address2', 'case123']);
    });
  });

  describe('isValidVariableName', () => {
    it('should accept lowercase letters', () => {
      expect(isValidVariableName('name')).toBe(true);
      expect(isValidVariableName('firstname')).toBe(true);
    });

    it('should accept underscores', () => {
      expect(isValidVariableName('first_name')).toBe(true);
      expect(isValidVariableName('_private')).toBe(true);
    });

    it('should accept numbers after first character', () => {
      expect(isValidVariableName('address1')).toBe(true);
      expect(isValidVariableName('case_123')).toBe(true);
    });

    it('should reject uppercase letters', () => {
      expect(isValidVariableName('Name')).toBe(false);
      expect(isValidVariableName('CASE')).toBe(false);
    });

    it('should reject names starting with numbers', () => {
      expect(isValidVariableName('1address')).toBe(false);
      expect(isValidVariableName('123case')).toBe(false);
    });

    it('should reject names with special characters', () => {
      expect(isValidVariableName('name-test')).toBe(false);
      expect(isValidVariableName('name.test')).toBe(false);
      expect(isValidVariableName('name@test')).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(isValidVariableName('')).toBe(false);
    });
  });

  describe('countVariableOccurrences', () => {
    it('should count single occurrence', () => {
      const content = 'Dear {{name}}, welcome!';
      const count = countVariableOccurrences(content, 'name');

      expect(count).toBe(1);
    });

    it('should count multiple occurrences', () => {
      const content = '{{name}} is great. {{name}} is awesome. {{name}} rocks!';
      const count = countVariableOccurrences(content, 'name');

      expect(count).toBe(3);
    });

    it('should be case-insensitive', () => {
      const content = '{{Name}} and {{NAME}} and {{name}}';
      const count = countVariableOccurrences(content, 'name');

      expect(count).toBe(3);
    });

    it('should return 0 for non-existent variable', () => {
      const content = 'Dear {{name}}, welcome!';
      const count = countVariableOccurrences(content, 'age');

      expect(count).toBe(0);
    });

    it('should return 0 for empty content', () => {
      const count = countVariableOccurrences('', 'name');
      expect(count).toBe(0);
    });
  });

  describe('replaceVariable', () => {
    it('should replace single variable occurrence', () => {
      const content = 'Dear {{name}}, welcome!';
      const result = replaceVariable(content, 'name', 'John');

      expect(result).toBe('Dear John, welcome!');
    });

    it('should replace multiple occurrences', () => {
      const content = '{{name}} is {{name}} and {{name}}!';
      const result = replaceVariable(content, 'name', 'Alice');

      expect(result).toBe('Alice is Alice and Alice!');
    });

    it('should be case-insensitive', () => {
      const content = '{{Name}} and {{NAME}}';
      const result = replaceVariable(content, 'name', 'Bob');

      expect(result).toBe('Bob and Bob');
    });

    it('should leave other variables unchanged', () => {
      const content = '{{name}} is {{age}} years old';
      const result = replaceVariable(content, 'name', 'Charlie');

      expect(result).toBe('Charlie is {{age}} years old');
    });

    it('should handle empty replacement value', () => {
      const content = 'Dear {{name}}, welcome!';
      const result = replaceVariable(content, 'name', '');

      expect(result).toBe('Dear , welcome!');
    });
  });

  describe('replaceAllVariables', () => {
    it('should replace multiple different variables', () => {
      const content = '{{name}} is {{age}} years old';
      const result = replaceAllVariables(content, {
        name: 'Alice',
        age: '30'
      });

      expect(result).toBe('Alice is 30 years old');
    });

    it('should leave unreplaced variables in place', () => {
      const content = '{{name}} is {{age}} in {{city}}';
      const result = replaceAllVariables(content, {
        name: 'Bob',
        age: '25'
      });

      expect(result).toBe('Bob is 25 in {{city}}');
    });

    it('should handle empty values object', () => {
      const content = '{{name}} is {{age}}';
      const result = replaceAllVariables(content, {});

      expect(result).toBe('{{name}} is {{age}}');
    });

    it('should handle complex template with many variables', () => {
      const content =
        'Dear {{name}}, re: case {{case_number}} on {{date}}. ' +
        'Total: {{total}}.';

      const result = replaceAllVariables(content, {
        name: 'John Doe',
        case_number: '2024-001',
        date: '2024-01-15',
        total: '$50,000'
      });

      expect(result).toBe(
        'Dear John Doe, re: case 2024-001 on 2024-01-15. Total: $50,000.'
      );
    });
  });
});
