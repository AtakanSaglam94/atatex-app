import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 14,
        flexWrap: 'wrap',
        marginBottom: 20,
      }}
    >
      <div>
        <h1 style={{ fontSize: 25 }}>{title}</h1>
        {subtitle && (
          <div style={{ color: 'var(--ink-soft)', fontSize: 13.5, marginTop: 3 }}>{subtitle}</div>
        )}
      </div>
      {action}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        border: '1px solid var(--line-strong)',
        borderRadius: 'var(--radius-sm)',
        padding: '0 12px',
        background: 'var(--paper)',
        maxWidth: 360,
      }}
    >
      <Icon name="search" size={16} className="mono" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          border: 'none',
          background: 'none',
          outline: 'none',
          padding: '10px 0',
          width: '100%',
        }}
      />
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  padded,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <div className="card" style={{ marginBottom: 18, overflow: 'hidden' }}>
      {title && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            padding: '13px 16px',
            borderBottom: '1px solid var(--line)',
            flexWrap: 'wrap',
          }}
        >
          <h3 style={{ fontSize: 15 }}>{title}</h3>
          {action}
        </div>
      )}
      <div style={padded ? { padding: 16 } : undefined}>{children}</div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="empty">{message}</div>;
}
