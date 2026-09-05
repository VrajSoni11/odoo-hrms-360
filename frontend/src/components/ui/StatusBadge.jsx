import React from 'react';

// Maps a wide range of raw status strings used across the app (employee
// status, contract status, time-off status, attendance status, alert
// severity...) onto one of a handful of semantic badge styles, so every
// status pill in the product looks and reads the same way.
const STATUS_MAP = {
  active: 'active',
  inactive: 'inactive',
  draft: 'contract-draft',
  expired: 'contract-expired',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  refused: 'refused',
  present: 'present',
  absent: 'absent',
  late: 'late',
  low: 'low',
  medium: 'medium',
  high: 'high',
  info: 'info',
  warning: 'warning',
  critical: 'critical',
};

function toLabel(value) {
  if (!value) return '—';
  return String(value)
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StatusBadge({ status, children }) {
  const key = String(status || '').toLowerCase().replace(/\s+/g, '_');
  const variant = STATUS_MAP[key] || 'neutral';
  return (
    <span className={`badge badge-${variant}`}>
      {children || toLabel(status)}
    </span>
  );
}
