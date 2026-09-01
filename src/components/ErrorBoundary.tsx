import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Étiquette de la zone protégée, affichée dans le message de diagnostic. */
  label?: string;
  /** Rendu de repli personnalisé (sinon panneau d'erreur générique). */
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

/**
 * Empêche qu'une erreur dans un écran ou une fenêtre fasse planter toute
 * l'application (écran blanc). Affiche le message exact pour faciliter le
 * diagnostic à distance, et propose de recharger en vidant le cache.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    console.error(`[ErrorBoundary${this.props.label ? ` · ${this.props.label}` : ''}]`, error, info);
  }

  reset = () => this.setState({ error: null, info: null });

  hardReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* ignore */
    }
    location.reload();
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        style={{
          margin: '24px auto',
          maxWidth: 640,
          padding: '20px 22px',
          border: '1px solid var(--line-strong, #d8cfc0)',
          borderRadius: 10,
          background: 'var(--paper, #fff)',
          color: 'var(--ink, #201a14)',
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>
          Une erreur est survenue{this.props.label ? ` — ${this.props.label}` : ''}
        </h2>
        <p style={{ margin: '0 0 14px', color: 'var(--ink-soft, #6b6152)' }}>
          Le reste de l'application continue de fonctionner. Envoie une capture de ce
          message si le problème persiste.
        </p>

        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            background: 'var(--surface-2, #f5f1e8)',
            border: '1px solid var(--line, #e6ddcd)',
            borderRadius: 6,
            padding: '10px 12px',
            fontSize: 12,
            maxHeight: 220,
            overflow: 'auto',
          }}
        >
          {error.name}: {error.message}
          {info?.componentStack ? `\n${info.componentStack}` : ''}
        </pre>

        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <button className="btn btn--primary" onClick={this.reset}>
            Réessayer
          </button>
          <button className="btn" onClick={() => location.reload()}>
            Recharger la page
          </button>
          <button className="btn btn--ghost" onClick={this.hardReload}>
            Vider le cache et recharger
          </button>
        </div>
      </div>
    );
  }
}
