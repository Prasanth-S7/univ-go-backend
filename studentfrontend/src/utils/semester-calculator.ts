/**
 * Calculates the current semester for a student based on available data.
 * Will attempt to:
 * 1. Use the current_semester value if directly available in user data
 * 2. Calculate based on batch year if available
 * 3. Make an educated guess based on current date
 * 
 * @returns {number} The calculated semester (1-8)
 */
export function calculateCurrentSemester(): number {
  // Get current student from localStorage as fallback
  const storedUser = localStorage.getItem('user');
  let userBatch = 0;
  
  if (storedUser) {
    try {
      const userData = JSON.parse(storedUser);
      // If batch is available in localStorage
      if (userData.batch) {
        userBatch = parseInt(userData.batch);
      }
      
      // If current_semester is directly available
      if (userData.current_semester) {
        return parseInt(userData.current_semester);
      }
    } catch (e) {
      console.error('Error parsing stored user data:', e);
    }
  }
  
  // If we have batch information, calculate semester
  if (userBatch > 0) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const yearDifference = currentYear - userBatch;
    
    // Calculate semester (2 per year)
    // If we're in the second half of the year (July-Dec), add 1 to semester
    let semester = yearDifference * 2 + (currentMonth >= 6 ? 1 : 0) + 1;
    
    // Cap at reasonable values (1-8 for undergrad, 1-4 for postgrad)
    return Math.min(Math.max(semester, 1), 8);
  }
  
  // If still no batch, use the current year to make an educated guess
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  
  // Assume first year, first or second semester based on month
  return currentMonth >= 6 ? 2 : 1;
}

/**
 * Formats a semester number with the appropriate ordinal suffix.
 * Examples: 1 -> "1st Semester", 2 -> "2nd Semester", etc.
 * 
 * @param {number} semester - The semester number to format
 * @returns {string} Formatted semester with ordinal suffix
 */
export function formatSemester(semester: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const suffix = semester % 10 < 4 && Math.floor(semester % 100 / 10) !== 1 
                ? suffixes[semester % 10] 
                : suffixes[0];
  return `${semester}${suffix} Semester`;
}

/**
 * Calculates the academic year based on the semester.
 * In a typical 4-year program, year 1 = semesters 1-2, year 2 = semesters 3-4, etc.
 * 
 * @param {number} semester - The semester number
 * @returns {number} The academic year
 */
export function calculateAcademicYear(semester: number): number {
  return Math.ceil(semester / 2);
}

/**
 * Estimates the batch year based on the current semester.
 * 
 * @param {number} semester - The semester number
 * @returns {number} The estimated batch year
 */
export function estimateBatchYear(semester: number): number {
  const currentYear = new Date().getFullYear();
  const academicYear = calculateAcademicYear(semester);
  return currentYear - academicYear + 1;
} 