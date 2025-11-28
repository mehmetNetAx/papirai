/**
 * Status types for date checks
 */
export type DateStatus = 'passed' | 'critical' | 'warning' | 'normal';

/**
 * Status information for a date check
 */
export interface DateStatusInfo {
  status: DateStatus;
  daysRemaining: number | null;
  message: string;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'gray';
  bgColor: string;
  textColor: string;
  borderColor: string;
}

/**
 * Check status of a date (client-side safe)
 */
export function checkDateStatus(
  date: Date | string | null | undefined,
  variableName: string,
  warningDays: number = 30,
  criticalDays: number = 7
): DateStatusInfo | null {
  if (!date) return null;

  const targetDate = date instanceof Date ? date : new Date(date);
  
  // Check if date is valid
  if (isNaN(targetDate.getTime())) {
    console.warn(`Invalid date for ${variableName}:`, date);
    return null;
  }

  const now = new Date();
  // Reset time to midnight for accurate day calculation
  const targetDateMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const daysRemaining = Math.ceil((targetDateMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24));

  let status: DateStatus;
  let message: string;
  let color: 'red' | 'orange' | 'yellow' | 'green' | 'gray';

  if (daysRemaining < 0) {
    status = 'passed';
    message = `${variableName} geçti (${Math.abs(daysRemaining)} gün önce)`;
    color = 'red';
  } else if (daysRemaining <= criticalDays) {
    status = 'critical';
    message = `Kritik: ${variableName} ${daysRemaining} gün içinde`;
    color = 'orange';
  } else if (daysRemaining <= warningDays) {
    status = 'warning';
    message = `Uyarı: ${variableName} ${daysRemaining} gün içinde`;
    color = 'yellow';
  } else {
    status = 'normal';
    message = `${variableName} ${daysRemaining} gün sonra`;
    color = 'green';
  }

  const colorMap = {
    red: {
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      textColor: 'text-red-700 dark:text-red-400',
      borderColor: 'border-red-200 dark:border-red-800',
    },
    orange: {
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      textColor: 'text-orange-700 dark:text-orange-400',
      borderColor: 'border-orange-200 dark:border-orange-800',
    },
    yellow: {
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      textColor: 'text-yellow-700 dark:text-yellow-400',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
    },
    green: {
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-700 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    gray: {
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      textColor: 'text-gray-700 dark:text-gray-400',
      borderColor: 'border-gray-200 dark:border-gray-800',
    },
  };

  return {
    status,
    daysRemaining,
    message,
    color,
    ...colorMap[color],
  };
}

