import React from 'react';

export const SummaryCard = ({
  icon,
  value,
  label,
  accentColor = 'teal',
  subtext,
  onClick
}) => {
  const colorMap = {
    teal: {
      bg: 'var(--primary-50)',
      iconColor: 'var(--primary-600)',
      border: 'var(--primary-200)'
    },
    purple: {
      bg: 'var(--accent-50)',
      iconColor: 'var(--accent-600)',
      border: 'var(--accent-100)'
    },
    green: {
      bg: '#ecfdf5',
      iconColor: '#059669',
      border: '#a7f3d0'
    },
    red: {
      bg: '#fef2f2',
      iconColor: '#dc2626',
      border: '#fecaca'
    },
    blue: {
      bg: '#eff6ff',
      iconColor: '#2563eb',
      border: '#bfdbfe'
    }
  };

  const scheme = colorMap[accentColor] || colorMap.teal;

  return (
    <div
      className="card summary-card"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '20px 24px',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '14px',
          backgroundColor: scheme.bg,
          color: scheme.iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '1.9rem',
            fontWeight: 800,
            lineHeight: 1.1,
            color: 'var(--text-main)',
            letterSpacing: '-0.02em'
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: '0.92rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginTop: '4px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {label}
        </div>
        {subtext && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
};
