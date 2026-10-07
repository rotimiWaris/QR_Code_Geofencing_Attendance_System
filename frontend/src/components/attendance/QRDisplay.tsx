import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Maximize2, Minimize2, Copy, Check } from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { Button } from '@/components/common/Button';
import { cn } from '@/utils';

interface QRDisplayProps {
  token: string;
  size?: number;
  refreshInterval?: number;
  onRefresh?: () => void;
  isRotating?: boolean;
}

export function QRDisplay({ token, size = 280, refreshInterval = 60, onRefresh, isRotating = false }: QRDisplayProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(refreshInterval);
  const [currentToken, setCurrentToken] = useState(token);

  useEffect(() => {
    setCurrentToken(token);
    setCountdown(refreshInterval);
  }, [token, refreshInterval]);

  useEffect(() => {
    if (!isRotating || refreshInterval <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onRefresh?.();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRotating, refreshInterval, token, onRefresh]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const displaySize = isFullscreen ? Math.min(window.innerWidth - 80, 600) : size;

  return (
    <div className={cn('relative', isFullscreen && 'fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg')}>
      {isFullscreen && (
        <button
          onClick={() => setIsFullscreen(false)}
          className="absolute top-6 right-6 rounded-xl p-3 bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <Minimize2 className="h-6 w-6" />
        </button>
      )}
      <GlassCard className={cn('flex flex-col items-center', isFullscreen && 'p-12')}>
        <div className="relative">
          <div className={cn(
            'rounded-2xl bg-white p-4 transition-all duration-500',
            isRotating && countdown <= 5 && 'ring-4 ring-primary/30'
          )}>
            <QRCodeSVG
              value={currentToken}
              size={displaySize}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#070B18"
            />
          </div>
          {isRotating && (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
              <div className="rounded-full bg-background px-4 py-1 text-xs font-mono text-primary border border-primary/20">
                Refresh in {countdown}s
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-2 w-full max-w-xs">
          <code className="flex-1 rounded-lg bg-glass-light px-3 py-2 text-xs font-mono text-text-muted border border-glass-border truncate">
            {currentToken}
          </code>
          <Button variant="secondary" size="sm" onClick={handleCopy} leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {!isFullscreen && (
            <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(true)} leftIcon={<Maximize2 className="h-4 w-4" />}>
              Fullscreen
            </Button>
          )}
          {isRotating && (
            <Button variant="ghost" size="sm" onClick={onRefresh} leftIcon={<RefreshCw className="h-4 w-4" />}>
              Regenerate
            </Button>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
