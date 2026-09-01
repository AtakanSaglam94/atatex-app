import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';

interface Props {
  onScan: (code: string) => void;
  onClose: () => void;
}

/**
 * Scan de code-barres via la caméra. Utilise l'API native BarcodeDetector
 * (Chrome / Android) et bascule sur @zxing/browser sinon (iOS Safari…).
 */
export function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        stopRef.current = () => stream.getTracks().forEach((t) => t.stop());

        const Native = (window as unknown as { BarcodeDetector?: new (o?: unknown) => { detect: (s: unknown) => Promise<{ rawValue: string }[]> } })
          .BarcodeDetector;

        if (Native) {
          const detector = new Native();
          const tick = async () => {
            if (cancelled) return;
            try {
              const codes = await detector.detect(video);
              if (codes[0]?.rawValue) {
                onScan(codes[0].rawValue);
                return;
              }
            } catch {
              /* frame non lisible */
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        } else {
          const { BrowserMultiFormatReader } = await import('@zxing/browser');
          const reader = new BrowserMultiFormatReader();
          const controls = await reader.decodeFromVideoElement(video, (res) => {
            if (res && !cancelled) onScan(res.getText());
          });
          stopRef.current = () => {
            controls.stop();
            stream.getTracks().forEach((t) => t.stop());
          };
        }
      } catch (e) {
        setError(
          (e as Error).name === 'NotAllowedError'
            ? 'Accès à la caméra refusé.'
            : `Caméra indisponible : ${(e as Error).message}`,
        );
      }
    }

    start();
    return () => {
      cancelled = true;
      stopRef.current();
    };
  }, [onScan]);

  return (
    <Modal title="Scanner un code-barres" size="sm" onClose={onClose}>
      {error ? (
        <div className="form-error">{error}</div>
      ) : (
        <p style={{ marginTop: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
          Vise le code-barres du produit ou du rouleau.
        </p>
      )}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          width: '100%',
          borderRadius: 'var(--radius-sm)',
          background: '#000',
          aspectRatio: '4 / 3',
          objectFit: 'cover',
          display: error ? 'none' : 'block',
        }}
      />
    </Modal>
  );
}
