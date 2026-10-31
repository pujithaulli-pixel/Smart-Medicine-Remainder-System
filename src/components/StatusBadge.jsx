import React from 'react';
import {
  IconCheckCircle,
  IconXCircle,
  IconClock,
  IconAlertCircle,
  IconSnooze
} from './Icons';
import { useApp } from '../context/AppContext';

export const StatusBadge = ({ status, className = '' }) => {
  const { t } = useApp();

  const getStatusConfig = () => {
    switch (status?.toLowerCase()) {
      case 'taken':
        return {
          label: t.medicine.statuses.taken,
          badgeClass: 'badge-taken',
          icon: <IconCheckCircle size={15} color="#065f46" />
        };
      case 'missed':
        return {
          label: t.medicine.statuses.missed,
          badgeClass: 'badge-missed',
          icon: <IconXCircle size={15} color="#991b1b" />
        };
      case 'due':
        return {
          label: t.medicine.statuses.due,
          badgeClass: 'badge-due',
          icon: <IconAlertCircle size={15} color="#92400e" />
        };
      case 'snoozed':
        return {
          label: t.medicine.statuses.snoozed,
          badgeClass: 'badge-snoozed',
          icon: <IconSnooze size={15} color="#5b21b6" />
        };
      case 'active':
        return {
          label: t.medicine.statuses.active,
          badgeClass: 'badge-active',
          icon: <IconCheckCircle size={15} color="#065f46" />
        };
      case 'completed':
        return {
          label: t.medicine.statuses.completed,
          badgeClass: 'badge-completed',
          icon: <IconCheckCircle size={15} color="#475569" />
        };
      case 'paused':
        return {
          label: t.medicine.statuses.paused,
          badgeClass: 'badge-paused',
          icon: <IconClock size={15} color="#92400e" />
        };
      case 'discontinued':
        return {
          label: t.medicine.statuses.discontinued,
          badgeClass: 'badge-discontinued',
          icon: <IconXCircle size={15} color="#991b1b" />
        };
      case 'upcoming':
      default:
        return {
          label: t.medicine.statuses.upcoming,
          badgeClass: 'badge-upcoming',
          icon: <IconClock size={15} color="#1e40af" />
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`badge ${config.badgeClass} ${className}`}>
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
