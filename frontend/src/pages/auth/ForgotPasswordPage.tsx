import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/schemas';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/common/Button';
import { GlassCard } from '@/components/common/GlassCard';
import { FormInput } from '@/components/forms/FormInput';
import { useState } from 'react';
import { apiClient } from '@/api/client';
import { errorMessage } from '@/components/admin/RegistryManager';

export function ForgotPasswordPage() {
  const { showToast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try { await apiClient.post('/auth/password-reset/', { email: data.email }); setSubmitted(true); }
    catch (error) { showToast(errorMessage(error), 'error'); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
          <p className="mt-2 text-sm text-text-muted">
            Request a reset link, or ask your administrator to reset your password.
          </p>
        </div>

        <GlassCard>
          {submitted ? (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-main">Reset link requested</h3>
              <p className="mt-2 text-sm text-text-muted">
                If an active account exists, a reset link has been issued. In local development, links appear in the Django server console unless email delivery is configured.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <FormInput
                label="Email"
                type="email"
                placeholder="you@university.edu"
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />
              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Send Reset Link
              </Button>
            </form>
          )}
        </GlassCard>

        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-main transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
