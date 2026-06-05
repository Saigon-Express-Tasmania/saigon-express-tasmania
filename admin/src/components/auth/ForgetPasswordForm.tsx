import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import supabase from '@/lib/supabase/client';
import { useState } from 'react';

interface ForgetPasswordFormProps {
  onBack?: () => void;
}

export function ForgetPasswordForm({ onBack }: ForgetPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${window.location.pathname}#/reset-password`,
      });

      if (error) throw error;

      setSuccess(true);
      setEmail('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to send reset email',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Reset password
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we'll send you a link to reset your
          password.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reset-email">Email</Label>
        <Input
          id="reset-email"
          type="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
          Password reset link sent! Check your email inbox.
        </div>
      )}

      <div className="flex gap-3">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            className="flex-1"
          >
            Back
          </Button>
        )}
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Sending...' : 'Send reset link'}
        </Button>
      </div>
    </form>
  );
}
