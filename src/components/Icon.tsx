interface IconProps {
  name: keyof typeof PATHS;
  size?: number;
  className?: string;
}

const PATHS = {
  dashboard:
    'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  orders:
    'M4 7h16l-1.4 12.2A2 2 0 0 1 16.6 21H7.4a2 2 0 0 1-2-1.8L4 7zM8 7V5a4 4 0 0 1 8 0v2',
  stock:
    'M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10',
  clients:
    'M9 8a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 8zM2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6M17 14.1c2.6.7 4.5 2.9 4.5 5.9',
  catalog:
    'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z',
  invoices:
    'M6 2h9l4 4v16H6zM9 8h6M9 12h6M9 16h4',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0c.2.63.77 1.09 1.43 1.09H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  x: 'M18 6 6 18M6 6l12 12',
  check: 'M20 6 9 17l-5-5',
  download: 'M12 3v13m0 0-4.5-4.5M12 16l4.5-4.5M4 19.5h16',
  scissors:
    'M6 8.4A2.4 2.4 0 1 0 6 3.6a2.4 2.4 0 0 0 0 4.8zM6 20.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8zM8.4 9.6 20 20M20 4 8.4 15.6',
  copy: 'M9 9h10v10H9zM5 15H4V5h10v1',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  mail: 'M4 5h16v14H4zM4 6l8 6 8-6',
  tag: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-6.6-6.6A2 2 0 0 1 3.4 12V4h8a2 2 0 0 1 1.4.6l7.8 7.8a2 2 0 0 1 0 2.8zM7.5 7.5h.01',
  users:
    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  chart: 'M3 3v18h18M8 15v3M13 10v8M18 6v12',
  wallet: 'M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-4M3 7h16M16 12h4v4h-4a2 2 0 0 1 0-4z',
} as const;

export function Icon({ name, size = 18, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
