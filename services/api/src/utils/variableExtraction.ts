/**
 * Variable Extraction Utility
 *
 * Extracts template variables from content using custom regex parser.
 * Variables follow the format: {{variable_name}}
 */

/**
 * Regular expression for matching template variables
 * Matches: {{variable_name}} where variable_name follows:
 * - Starts with lowercase letter or underscore
 * - Contains only lowercase letters, numbers, and underscores
 */
const VARIABLE_REGEX = /\{\{([a-z_][a-z0-9_]*)\}\}/gi;

/**
 * Extract all unique variables from template content
 *
 * Variables are case-insensitive and returned in lowercase.
 * Duplicates are removed and result is sorted alphabetically.
 *
 * @param content - Template content containing variables
 * @returns Sorted array of unique variable names (lowercase)
 *
 * @example
 * extractVariables("Dear {{plaintiff_name}}, regarding {{case_number}}")
 * // Returns: ["case_number", "plaintiff_name"]
 */
export function extractVariables(content: string): string[] {
  const matches = content.matchAll(VARIABLE_REGEX);
  const variables = new Set<string>();

  for (const match of matches) {
    // Extract variable name and convert to lowercase
    variables.add(match[1].toLowerCase());
  }

  // Return sorted array for consistent ordering
  return Array.from(variables).sort();
}

/**
 * Validate that a variable name follows the correct format
 *
 * Valid format:
 * - Starts with lowercase letter or underscore
 * - Contains only lowercase letters, numbers, and underscores
 *
 * @param variableName - Variable name to validate (without braces)
 * @returns True if variable name is valid
 *
 * @example
 * isValidVariableName("plaintiff_name") // true
 * isValidVariableName("Plaintiff_Name") // false (uppercase)
 * isValidVariableName("123_invalid") // false (starts with number)
 */
export function isValidVariableName(variableName: string): boolean {
  const nameRegex = /^[a-z_][a-z0-9_]*$/;
  return nameRegex.test(variableName);
}

/**
 * Count occurrences of a specific variable in content
 *
 * @param content - Template content
 * @param variableName - Variable name to count (without braces)
 * @returns Number of times the variable appears
 *
 * @example
 * countVariableOccurrences("{{name}} and {{name}}", "name") // 2
 */
export function countVariableOccurrences(
  content: string,
  variableName: string
): number {
  const regex = new RegExp(`\\{\\{${variableName}\\}\\}`, 'gi');
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Replace a variable in content with a value
 *
 * Replaces all occurrences of the variable (case-insensitive).
 *
 * @param content - Template content
 * @param variableName - Variable name to replace (without braces)
 * @param value - Value to insert
 * @returns Content with variable replaced
 *
 * @example
 * replaceVariable("Dear {{name}}", "name", "John")
 * // Returns: "Dear John"
 */
export function replaceVariable(
  content: string,
  variableName: string,
  value: string
): string {
  const regex = new RegExp(`\\{\\{${variableName}\\}\\}`, 'gi');
  return content.replace(regex, value);
}

/**
 * Replace all variables in content with provided values
 *
 * Variables without values are left unchanged.
 *
 * @param content - Template content
 * @param values - Map of variable names to values
 * @returns Content with variables replaced
 *
 * @example
 * replaceAllVariables(
 *   "Dear {{name}}, case {{case_number}}",
 *   { name: "John", case_number: "12345" }
 * )
 * // Returns: "Dear John, case 12345"
 */
export function replaceAllVariables(
  content: string,
  values: Record<string, string>
): string {
  let result = content;

  for (const [variableName, value] of Object.entries(values)) {
    result = replaceVariable(result, variableName, value);
  }

  return result;
}
