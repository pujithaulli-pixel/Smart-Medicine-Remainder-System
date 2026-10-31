import React from 'react';
import { IconPill } from './Icons';

export const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <div
      className={`empty-state-card ${className}`}
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1.5px dashed var(--border-strong)',
        maxWidth: '600px',
        margin: '20px auto'
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'var(--primary-50)',
          color: 'var(--primary-600)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}
      >
        {icon || <IconPill size={32} color="var(--primary-600)" />}
      </div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="btn btn-primary"
          style={{ minWidth: '180px' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
