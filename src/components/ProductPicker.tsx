import { useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { BarcodeScanner } from './BarcodeScanner';
import { useData } from '@/data/DataProvider';
import { eur } from '@/lib/money';
import { UNIT_LABEL } from '@/lib/format';
import type { Product } from '@/types';

interface Props {
  value: string | null;
  onSelect: (product: Product | null) => void;
}

/**
 * Sélecteur de produit avec recherche (nom, référence, catégorie, code-barres),
 * navigation clavier, et scan caméra. Compatible douchette USB/Bluetooth :
 * elle « tape » le code-barres + Entrée → sélection automatique si correspondance.
 */
export function ProductPicker({ value, onSelect }: Props) {
  const { products, categories } = useData();
  const selected = products.find((p) => p.id === value) ?? null;

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const [scan, setScan] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const catName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const matches = useMemo(() => {
    const s = q.toLowerCase().trim();
    const list = products.filter((p) => p.active);
    if (!s) return list.slice(0, 40);
    return list
      .filter(
        (p) =>
          (p.name ?? '').toLowerCase().includes(s) ||
          (p.sku ?? '').toLowerCase().includes(s) ||
          (p.barcode ?? '').toLowerCase() === s ||
          (catName.get(p.category_id ?? '') ?? '').toLowerCase().includes(s),
      )
      .slice(0, 40);
  }, [products, q, catName]);

  function choose(p: Product) {
    onSelect(p);
    setOpen(false);
    setQ('');
  }

  function onScanned(code: string) {
    setScan(false);
    const hit = products.find((p) => p.barcode && p.barcode === code && p.active);
    if (hit) choose(hit);
    else {
      setQ(code);
      setOpen(true);
      inputRef.current?.focus();
    }
  }

  if (selected && !open) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 0 }}>
        <button
          type="button"
          className="input"
          style={{ flex: 1, minWidth: 0, textAlign: 'left', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          onClick={() => {
            setOpen(true);
            setQ('');
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          {selected.name}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => onSelect(null)}
          aria-label="Changer de produit"
        >
          <Icon name="x" size={14} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          ref={inputRef}
          className="input"
          style={{ flex: 1, minWidth: 0 }}
          placeholder="Rechercher un produit…"
          value={q}
          autoFocus={open}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setHi(0);
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHi((h) => Math.min(h + 1, matches.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHi((h) => Math.max(h - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const bc = products.find((p) => p.barcode && p.barcode === q.trim() && p.active);
              if (bc) choose(bc);
              else if (matches[hi]) choose(matches[hi]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => setScan(true)}
          aria-label="Scanner"
          title="Scanner (caméra)"
        >
          <Icon name="search" size={15} />📷
        </button>
      </div>

      {open && matches.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 20,
            background: 'var(--surface)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius-sm)',
            marginTop: 4,
            maxHeight: 260,
            overflowY: 'auto',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {matches.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
              onMouseEnter={() => setHi(i)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 10px',
                border: 'none',
                background: i === hi ? 'var(--accent-weak)' : 'transparent',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 500 }}>{p.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                {p.sku ? `${p.sku} · ` : ''}
                {catName.get(p.category_id ?? '') ?? ''} · {eur(p.price)}/{UNIT_LABEL[p.unit]}
              </div>
            </button>
          ))}
        </div>
      )}

      {scan && <BarcodeScanner onScan={onScanned} onClose={() => setScan(false)} />}
    </div>
  );
}
