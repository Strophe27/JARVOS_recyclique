/**
 * Utility functions for date formatting in the reception context
 */

/**
 * Formats a timestamp for reception ticket display
 * @param dateString - ISO date string or null/undefined
 * @returns Formatted date string in DD/MM/YYYY HH:mm format, or "—" if null/undefined
 */
export const formatReceptionTimestamp = (dateString: string | null | undefined): string => {
  if (!dateString || dateString.trim() === '') {
    return '—';
  }

  try {
    const date = new Date(dateString.trim());

    // Check if date is valid and not invalid
    if (isNaN(date.getTime()) || date.getTime() === 0) {
      return '—';
    }

    // Format in local timezone as DD/MM/YYYY HH:mm
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.warn('Error formatting reception timestamp:', dateString, error);
    return '—';
  }
};

/**
 * Formats a timestamp for export CSV (ISO format)
 * @param dateString - ISO date string or null/undefined
 * @returns ISO date string or empty string for null/undefined
 */
export const formatTimestampForExport = (dateString: string | null | undefined): string => {
  if (!dateString) {
    return '';
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString();
  } catch (error) {
    console.warn('Error formatting date for export:', dateString, error);
    return '';
  }
};
