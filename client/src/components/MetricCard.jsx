import React from 'react';

export function MetricCard({ title, value, subtext, icon: Icon, color = 'indigo', progress = null }) {
  const colorMap = {
    indigo: {
      bg: 'rgba(99, 102, 241, 0.15)',
      text: '#6366f1',
      bar: 'linear-gradient(90deg, #6366f1, #818cf8)'
    },
    cyan: {
      bg: 'rgba(6, 182, 212, 0.15)',
      text: '#06b6d4',
      bar: 'linear-gradient(90deg, #06b6d4, #38bdf8)'
    },
    emerald: {
      bg: 'rgba(16, 185, 129, 0.15)',
      text: '#10b981',
      bar: 'linear-gradient(90deg, #10b981, #34d399)'
    },
    amber: {
      bg: 'rgba(245, 158, 11, 0.15)',
      text: '#f59e0b',
      bar: 'linear-gradient(90deg, #f59e0b, #fbbf24)'
    }
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {title}
        </span>
        {Icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              background: scheme.bg,
              color: scheme.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={18} />
          </div>
        )}
      </div>

      <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </div>

      {progress !== null && (
        <div style={{ marginTop: '2px' }}>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                background: scheme.bar,
              }}
            />
          </div>
        </div>
      )}

      {subtext && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
