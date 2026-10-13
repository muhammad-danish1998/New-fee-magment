import React from 'react';
import { getStudentStatusConfig } from '../../utils/studentStatus';

export function StudentStatusBadge({ studentOrStatus, className = '', showActive = false }) {
  const config = getStudentStatusConfig(studentOrStatus);
  const IconComponent = config.icon;

  // By default, if active and showActive is false, don't show an unnecessary badge unless requested
  if (config.value === 'active' && !showActive) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap shadow-xs ${config.badgeClasses} ${className}`}
      title={config.description}
    >
      <IconComponent className={`w-3.5 h-3.5 shrink-0 ${config.iconColor}`} />
      <span>{config.label}</span>
    </span>
  );
}
