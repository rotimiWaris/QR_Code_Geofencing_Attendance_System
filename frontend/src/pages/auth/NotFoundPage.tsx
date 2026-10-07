import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { GlassCard } from '@/components/common/GlassCard';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <GlassCard className="py-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-danger/10 border border-danger/20">
            <AlertTriangle className="h-10 w-10 text-danger" />
          </div>
          <h1 className="text-6xl font-bold text-text-main">404</h1>
          <p className="mt-4 text-lg font-medium text-text-main">Page not found</p>
          <p className="mt-2 text-sm text-text-muted">
            The page you are looking for does not exist or has been moved.
          </p>
          <Link to="/" className="mt-8 inline-block">
            <Button leftIcon={<Home className="h-4 w-4" />}>
              Back to Home
            </Button>
          </Link>
        </GlassCard>
      </div>
    </div>
  );
}
