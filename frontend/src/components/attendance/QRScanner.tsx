import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import { Button } from '@/components/common/Button';

export function QRScanner({ onScan }: { onScan: (value: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const callback = useRef(onScan);
  callback.current = onScan;
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let disposed = false;
    let scanned = false;
    let controls: IScannerControls | undefined;
    setError('');
    setStarting(true);
    const element = video.current;
    const start = async () => {
      try {
        if (!window.isSecureContext) throw new Error('Camera access requires HTTPS or localhost. Open the site over HTTPS.');
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not supported by this browser. Use a browser with camera support.');
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        if (disposed || !element) return;
        controls = await new BrowserQRCodeReader().decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: 'environment' } } },
          element,
          (result, _error, scannerControls) => {
            if (disposed || scanned || !result) return;
            scanned = true;
            scannerControls.stop();
            callback.current(result.getText());
          },
        );
        if (disposed || scanned) controls.stop();
        else setStarting(false);
      } catch (cause) {
        if (disposed) return;
        const name = cause instanceof Error ? cause.name : '';
        setError(name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access for this site in your browser settings, then retry.'
          : name === 'NotFoundError'
            ? 'No camera was found on this device.'
            : name === 'NotReadableError'
              ? 'The camera is unavailable or in use by another application. Close other camera apps and retry.'
              : cause instanceof Error ? cause.message : 'The camera could not be started.');
        setStarting(false);
      }
    };
    void start();
    return () => {
      disposed = true;
      controls?.stop();
      const stream = element?.srcObject;
      if (typeof MediaStream !== 'undefined' && stream instanceof MediaStream) stream.getTracks().forEach(track => track.stop());
    };
  }, [attempt]);

  return <div className="space-y-4">
    <video ref={video} muted playsInline autoPlay className="aspect-square w-full rounded-xl bg-black object-cover" aria-label="QR scanner camera preview" />
    {starting && <p className="text-center text-sm text-text-muted">Starting camera...</p>}
    {error ? <div role="alert" className="text-center"><p className="text-sm text-danger">{error}</p><Button className="mt-3" variant="secondary" onClick={() => setAttempt(value => value + 1)}>Retry camera</Button></div> : <p className="text-center text-xs text-text-muted">Point your camera at the QR displayed by your lecturer. GPS is requested only after QR verification.</p>}
  </div>;
}
