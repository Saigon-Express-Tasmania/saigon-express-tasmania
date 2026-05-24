import { AuthLayout } from '@/components/auth/AuthLayout';
import { ForgetPasswordForm } from '@/components/auth/ForgetPasswordForm';
import { SignInForm } from '@/components/auth/SignInForm';
import { useState } from 'react';

export function SignIn() {
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  return (
    <AuthLayout
      title={showForgotPassword ? 'Reset Password' : 'Welcome back'}
      description={
        showForgotPassword
          ? undefined
          : 'Enter your credentials to access the admin dashboard'
      }
    >
      {showForgotPassword ? (
        <ForgetPasswordForm onBack={() => setShowForgotPassword(false)} />
      ) : (
        <SignInForm onForgotPassword={() => setShowForgotPassword(true)} />
      )}
    </AuthLayout>
  );
}
