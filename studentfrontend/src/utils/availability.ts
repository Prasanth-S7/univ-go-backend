/**
 * Utility functions for availability key format validation
 */

/**
 * Validates that an availability key follows the correct format: "{teacher_course_id}:{batch}"
 * 
 * @param key - The availability key to validate
 * @returns true if the key is valid, false otherwise
 */
export function isValidAvailabilityKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // Check if key contains exactly one colon
  const parts = key.split(':');
  if (parts.length !== 2) {
    return false;
  }

  const [teacherCourseIdStr, batch] = parts;

  // Validate teacher_course_id part (must be a positive integer)
  const teacherCourseId = parseInt(teacherCourseIdStr, 10);
  if (isNaN(teacherCourseId) || teacherCourseId <= 0 || teacherCourseIdStr !== String(teacherCourseId)) {
    return false;
  }

  // Validate batch part (must be non-empty)
  if (!batch || batch.length === 0) {
    return false;
  }

  return true;
}

/**
 * Formats an availability key from teacher_course_id and batch
 * 
 * @param teacherCourseId - The teacher course ID
 * @param batch - The batch identifier (defaults to "theory" if not provided)
 * @returns The formatted availability key
 */
export function formatAvailabilityKey(teacherCourseId: number, batch?: string): string {
  const batchKey = batch || "theory";
  return `${teacherCourseId}:${batchKey}`;
}

/**
 * Parses an availability key into its components
 * 
 * @param key - The availability key to parse
 * @returns An object with teacher_course_id and batch, or null if invalid
 */
export function parseAvailabilityKey(key: string): { teacher_course_id: number; batch: string } | null {
  if (!isValidAvailabilityKey(key)) {
    return null;
  }

  const [teacherCourseIdStr, batch] = key.split(':');
  const teacher_course_id = parseInt(teacherCourseIdStr, 10);

  return {
    teacher_course_id,
    batch,
  };
}
