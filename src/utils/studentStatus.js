import { CheckCircle2, GraduationCap, UserMinus, ArrowRightLeft, UserX } from 'lucide-react';

export const STUDENT_STATUS_ACTIVE = 'active';
export const STUDENT_STATUS_PASSED_OUT = 'passed_out';
export const STUDENT_STATUS_LEFT = 'left';
export const STUDENT_STATUS_TRANSFERRED = 'transferred';
export const STUDENT_STATUS_STRUCK_OFF = 'struck_off';

export const STUDENT_STATUS_CONFIG = {
  [STUDENT_STATUS_ACTIVE]: {
    value: STUDENT_STATUS_ACTIVE,
    label: 'Active',
    description: 'Currently enrolled and attending classes',
    icon: CheckCircle2,
    badgeClasses: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400'
  },
  [STUDENT_STATUS_PASSED_OUT]: {
    value: STUDENT_STATUS_PASSED_OUT,
    label: 'Passed Out',
    description: 'Completed program and graduated',
    icon: GraduationCap,
    badgeClasses: 'bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-600/40',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  [STUDENT_STATUS_LEFT]: {
    value: STUDENT_STATUS_LEFT,
    label: 'Left / Withdrawn',
    description: 'Voluntarily withdrew or left the college',
    icon: UserMinus,
    badgeClasses: 'bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-600/40',
    iconColor: 'text-rose-600 dark:text-rose-400'
  },
  [STUDENT_STATUS_TRANSFERRED]: {
    value: STUDENT_STATUS_TRANSFERRED,
    label: 'Transferred',
    description: 'Transferred to another institution or college',
    icon: ArrowRightLeft,
    badgeClasses: 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-600/40',
    iconColor: 'text-amber-600 dark:text-amber-400'
  },
  [STUDENT_STATUS_STRUCK_OFF]: {
    value: STUDENT_STATUS_STRUCK_OFF,
    label: 'Struck Off',
    description: 'Struck off due to non-attendance or disciplinary action',
    icon: UserX,
    badgeClasses: 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600/50',
    iconColor: 'text-slate-600 dark:text-slate-400'
  }
};

/**
 * Return normalized status string. Missing, undefined, or null counts as 'active'.
 */
export function getStudentStatus(studentOrStatus) {
  if (!studentOrStatus) return STUDENT_STATUS_ACTIVE;
  const statusStr = typeof studentOrStatus === 'string'
    ? studentOrStatus
    : studentOrStatus.status;

  if (!statusStr || !STUDENT_STATUS_CONFIG[statusStr]) {
    return STUDENT_STATUS_ACTIVE;
  }
  return statusStr;
}

/**
 * Check if student is active (missing or undefined status counts as active)
 */
export function isActive(student) {
  return getStudentStatus(student) === STUDENT_STATUS_ACTIVE;
}

/**
 * Check if student is archived (status is anything other than 'active')
 */
export function isArchived(student) {
  return !isActive(student);
}

/**
 * Get status configuration object
 */
export function getStudentStatusConfig(studentOrStatus) {
  const statusKey = getStudentStatus(studentOrStatus);
  return STUDENT_STATUS_CONFIG[statusKey] || STUDENT_STATUS_CONFIG[STUDENT_STATUS_ACTIVE];
}

/**
 * List of archival statuses for "Change Status..." modal
 */
export const ARCHIVE_STATUS_OPTIONS = [
  { value: STUDENT_STATUS_PASSED_OUT, label: 'Passed Out', reasonRequired: false },
  { value: STUDENT_STATUS_LEFT, label: 'Left / Withdrawn', reasonRequired: true },
  { value: STUDENT_STATUS_TRANSFERRED, label: 'Transferred', reasonRequired: true },
  { value: STUDENT_STATUS_STRUCK_OFF, label: 'Struck Off', reasonRequired: true }
];
