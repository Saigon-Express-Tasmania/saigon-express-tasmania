"use client";

import { SubmitEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppImage from "@/components/AppImage";
import Link from "@/components/link";
import { LOGO_IMG_CLASS, LOGO_INTRINSIC, LOGO_URL } from "@/lib/site-images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAuthErrorMessage,
  registerWholesaleMemberApplication,
  requestPasswordReset,
  updatePassword,
  useSupabase,
} from "@/hooks/useSupabase";
import { supabase } from "@/lib/supabase/client";
import {
  buildWholesaleRegistrationStatus,
  clearWholesaleRegistrationStatus,
  getWholesaleRegistrationStatus,
  resolveWholesaleRegistrationStatus,
  saveWholesaleRegistrationStatus,
  WHOLESALE_REGISTRATION_MESSAGES,
  type WholesaleRegistrationStatus,
} from "@/lib/wholesale-registration-status";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  Building2,
  Mail,
  Phone,
  Lock,
  User,
  FileText,
  ArrowRight,
  X,
} from "lucide-react";

type LoginFieldErrors = {
  email?: string;
  password?: string;
};

type ForgotPasswordFieldErrors = {
  email?: string;
};

type ResetPasswordFieldErrors = {
  password?: string;
  confirm?: string;
};

type RegisterFieldErrors = {
  businessName?: string;
  contactName?: string;
  email?: string;
  password?: string;
  confirm?: string;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 mt-1">{message}</p>;
}

function withFieldError(baseClass: string, hasError: boolean) {
  return hasError
    ? `${baseClass} border-red-500 focus:border-red-500 focus:ring-red-500`
    : baseClass;
}

function validateLoginFields(
  email: string,
  password: string,
): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  if (!email.trim()) errors.email = "Please enter your email.";
  if (!password) errors.password = "Please enter your password.";
  return errors;
}

function validateForgotPasswordFields(email: string): ForgotPasswordFieldErrors {
  const errors: ForgotPasswordFieldErrors = {};
  if (!email.trim()) errors.email = "Please enter your email.";
  return errors;
}

function validateResetPasswordFields(
  password: string,
  confirm: string,
): ResetPasswordFieldErrors {
  const errors: ResetPasswordFieldErrors = {};
  if (!password) {
    errors.password = "Please enter a new password.";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  if (!confirm) {
    errors.confirm = "Please confirm your new password.";
  } else if (password !== confirm) {
    errors.confirm = "Passwords do not match.";
  }
  return errors;
}

function validateRegisterFields(
  businessName: string,
  contactName: string,
  email: string,
  password: string,
  confirm: string,
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  if (!businessName.trim()) {
    errors.businessName = "Please enter your business name.";
  }
  if (!contactName.trim()) {
    errors.contactName = "Please enter a contact name.";
  }
  if (!email.trim()) {
    errors.email = "Please enter your email.";
  }
  if (!password) {
    errors.password = "Please enter a password.";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  if (!confirm) {
    errors.confirm = "Please confirm your password.";
  } else if (password !== confirm) {
    errors.confirm = "Passwords do not match.";
  }
  return errors;
}

type PortalMode = "login" | "register" | "forgot" | "reset";

function isRecoveryAuthHash(hash: string): boolean {
  return hash.includes("type=recovery") || hash.includes("access_token");
}

function modeFromHash(hash: string): PortalMode {
  if (isRecoveryAuthHash(hash)) return "reset";
  if (hash === "#register") return "register";
  if (hash === "#forgot-password") return "forgot";
  if (hash === "#reset-password") return "reset";
  return "login";
}

function hashFromMode(mode: PortalMode): string {
  if (mode === "register") return "#register";
  if (mode === "forgot") return "#forgot-password";
  if (mode === "reset") return "#reset-password";
  return "#sign-in";
}

function replaceModeHash(mode: PortalMode) {
  const nextHash = hashFromMode(mode);
  if (window.location.hash === nextHash) return;
  if (isRecoveryAuthHash(window.location.hash)) return;

  const url = `${window.location.pathname}${window.location.search}${nextHash}`;
  window.history.replaceState(null, "", url);
}

function MemberPortalContent() {
  const router = useRouter();
  const [mode, setMode] = useState<PortalMode>("login");
  const setModeWithHash = useCallback((nextMode: PortalMode) => {
    setMode(nextMode);
    replaceModeHash(nextMode);
  }, []);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");

  const [regBusinessName, setRegBusinessName] = useState("");
  const [regContactName, setRegContactName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regAbn, setRegAbn] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [portalType, setPortalType] = useState<"wholesale" | "warehouse">(
    "wholesale"
  );
  const [regBusinessType, setRegBusinessType] = useState<
    | "restaurant"
    | "cafe"
    | "catering"
    | "retail"
    | "hotel"
    | "school"
    | "corporate"
    | "other"
    | ""
  >("");

  const { signInWithPassword, profile, authMetadata, isSignedIn, signOut } =
    useSupabase();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [loginErrors, setLoginErrors] = useState<LoginFieldErrors>({});
  const [forgotErrors, setForgotErrors] = useState<ForgotPasswordFieldErrors>({});
  const [resetErrors, setResetErrors] = useState<ResetPasswordFieldErrors>({});
  const [registerErrors, setRegisterErrors] = useState<RegisterFieldErrors>({});
  const [registrationStatus, setRegistrationStatus] =
    useState<WholesaleRegistrationStatus | null>(null);

  useEffect(() => {
    const syncModeFromHash = () => {
      if (isPasswordRecovery) return;
      setMode(modeFromHash(window.location.hash));
    };

    syncModeFromHash();
    window.addEventListener("hashchange", syncModeFromHash);
    return () => window.removeEventListener("hashchange", syncModeFromHash);
  }, [isPasswordRecovery]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
        setMode("reset");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (mode === "reset" || isRecoveryAuthHash(window.location.hash)) {
      setIsPasswordRecovery(true);
    }
  }, [mode]);

  useEffect(() => {
    if (isSignedIn && !isPasswordRecovery) {
      clearWholesaleRegistrationStatus();
      setRegistrationStatus(null);
      router.replace("/member/dashboard");
    }
  }, [isPasswordRecovery, isSignedIn, router]);

  useEffect(() => {
    if (isSignedIn) return;

    const stored = getWholesaleRegistrationStatus();
    const resolved = resolveWholesaleRegistrationStatus(
      stored,
      profile,
      authMetadata,
    );
    if (resolved) {
      setRegistrationStatus(resolved);
    }
  }, [authMetadata, isSignedIn, profile]);

  const restoreRegistrationStatus = () => {
    const stored = getWholesaleRegistrationStatus();
    if (stored) {
      setRegistrationStatus(stored);
    }
  };

  const handleDismissRegistrationStatus = () => {
    clearWholesaleRegistrationStatus();
    setRegistrationStatus(null);
  };

  const handleForgotPassword = async (e: SubmitEvent) => {
    e.preventDefault();
    const errors = validateForgotPasswordFields(forgotEmail);
    setForgotErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Please enter your email.");
      return;
    }

    setIsSendingResetEmail(true);
    try {
      await requestPasswordReset(forgotEmail);
      setForgotPasswordSent(true);
      toast.success("If an account exists for that email, a reset link has been sent.");
    } catch (error) {
      toast.error(
        getAuthErrorMessage(
          error,
          "Unable to send reset email. Please try again.",
        ),
      );
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const handleResetPassword = async (e: SubmitEvent) => {
    e.preventDefault();
    const errors = validateResetPasswordFields(resetPassword, resetConfirm);
    setResetErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Please check your new password.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updatePassword(resetPassword);
      setIsPasswordRecovery(false);
      setResetPassword("");
      setResetConfirm("");
      setResetErrors({});
      replaceModeHash("login");
      setMode("login");
      toast.success("Password updated. Redirecting to your account...");
      router.replace("/member/dashboard");
    } catch (error) {
      toast.error(
        getAuthErrorMessage(
          error,
          "Unable to update password. Please request a new reset link.",
        ),
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogin = async (e: SubmitEvent) => {
    e.preventDefault();
    const errors = validateLoginFields(loginEmail, loginPassword);
    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Please enter your email and password.");
      return;
    }

    setIsSigningIn(true);
    try {
      await signInWithPassword(loginEmail, loginPassword);
      toast.success("Welcome back! Redirecting to your account...");
    } catch (error) {
      restoreRegistrationStatus();
      toast.error(
        getAuthErrorMessage(
          error,
          "Login failed. Please check your credentials.",
        ),
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleRegister = async (e: SubmitEvent) => {
    e.preventDefault();
    const errors = validateRegisterFields(
      regBusinessName,
      regContactName,
      regEmail,
      regPassword,
      regConfirm,
    );
    setRegisterErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerWholesaleMemberApplication({
        business_name: regBusinessName,
        contactName: regContactName,
        email: regEmail,
        phone: regPhone || undefined,
        abn: regAbn || undefined,
        business_category: regBusinessType || undefined,
        address: regAddress || undefined,
        password: regPassword,
        // Portal type kept for registration UX; not persisted on user_profiles yet
        business_type: portalType,
      });

      const status = buildWholesaleRegistrationStatus({
        email: regEmail,
        businessName: regBusinessName,
        businessType: portalType,
        emailConfirmationRequired: result.emailConfirmationRequired,
      });
      saveWholesaleRegistrationStatus(status);
      setRegistrationStatus(status);

      toast.success(status.message);
      setRegisterErrors({});
      setModeWithHash("login");
    } catch (error) {
      toast.error(
        getAuthErrorMessage(error, "Registration failed. Please try again."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "h-11 border-gray-200 focus:border-red-400 focus:ring-red-400";
  const inputClassSm =
    "h-10 border-gray-200 focus:border-red-400 focus:ring-red-400 text-sm";

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-start pt-24 pb-12 px-4 relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, #d0d0d0 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* <button
        type="button"
        onClick={() => router.push("/")}
        className="absolute top-6 left-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors z-10"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to site
      </button> */}

      <div className="relative z-10 w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-100 px-8 py-10">
        <div className="flex justify-center mb-6 px-2">
          <AppImage
            src={LOGO_URL}
            alt="Saigon Express"
            width={LOGO_INTRINSIC.width}
            height={LOGO_INTRINSIC.height}
            priority
            className={`h-10 sm:h-11 max-w-full ${LOGO_IMG_CLASS}`}
          />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Business Portal
          </h1>
          <p className="text-sm text-gray-500">
            {mode === "forgot"
              ? "Reset your password"
              : mode === "reset"
                ? "Choose a new password"
                : "Wholesale & Warehouse Members"}
          </p>
        </div>

        {registrationStatus && (
          <div className="relative mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 pr-10 text-sm text-amber-900">
            <button
              type="button"
              onClick={handleDismissRegistrationStatus}
              className="absolute top-3 right-3 rounded-md p-0.5 text-amber-700/70 hover:bg-amber-100 hover:text-amber-900 transition-colors"
              aria-label="Dismiss registration message"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="font-semibold">Awaiting confirmation</p>
            <p className="mt-1 leading-relaxed">{registrationStatus.message}</p>
            <p className="mt-2 text-xs opacity-80">
              {registrationStatus.businessName} · {registrationStatus.email} ·{" "}
              {registrationStatus.businessType === "wholesale"
                ? "Wholesale"
                : "Warehouse"}
            </p>
            <p className="mt-3 text-xs opacity-70 leading-relaxed">
              Not your account? You can ignore this message or dismiss it.
            </p>
          </div>
        )}

        {(mode === "login" || mode === "register") && (
          <div className="flex rounded-xl bg-gray-100 p-1 mb-7">
            {(["login", "register"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setModeWithHash(tab);
                  setLoginErrors({});
                  setRegisterErrors({});
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === tab
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-sm text-gray-500 leading-relaxed">
              Enter the email address for your business account and we&apos;ll
              send you a link to reset your password.
            </p>

            <div className="space-y-1.5">
              <Label
                htmlFor="forgot-email"
                className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => {
                    setForgotEmail(e.target.value);
                    if (forgotErrors.email) {
                      setForgotErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="business@example.com"
                  className={withFieldError(`pl-9 ${inputClass}`, !!forgotErrors.email)}
                  autoComplete="email"
                  aria-invalid={!!forgotErrors.email}
                />
              </div>
              <FieldError message={forgotErrors.email} />
            </div>

            {forgotPasswordSent && (
              <div
                role="status"
                className="rounded-xl border-2 border-red-600 bg-gradient-to-br from-red-50 via-[#f3edd9] to-amber-50 px-4 py-4 shadow-md ring-1 ring-red-200/80"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-sm">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-800">
                      Reset link sent
                    </p>
                    <p className="mt-1.5 text-sm font-medium text-red-950/90 leading-relaxed">
                      Check your inbox for a password reset link. It expires in
                      one hour. If you don&apos;t see it, check your spam folder.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSendingResetEmail}
              className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl mt-2 flex items-center justify-center gap-2"
            >
              {isSendingResetEmail ? "Sending..." : "Send Reset Link"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setForgotPasswordSent(false);
                setForgotErrors({});
                setModeWithHash("login");
              }}
              className="w-full flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to sign in
            </button>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-sm text-gray-500 leading-relaxed">
              Enter a new password for your account.
            </p>

            <div className="space-y-1.5">
              <Label
                htmlFor="reset-password"
                className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="reset-password"
                  type={showResetPassword ? "text" : "password"}
                  value={resetPassword}
                  onChange={(e) => {
                    setResetPassword(e.target.value);
                    if (resetErrors.password) {
                      setResetErrors((prev) => ({
                        ...prev,
                        password: undefined,
                      }));
                    }
                  }}
                  placeholder="Min 8 characters"
                  className={withFieldError(
                    `pl-9 pr-10 ${inputClass}`,
                    !!resetErrors.password,
                  )}
                  autoComplete="new-password"
                  aria-invalid={!!resetErrors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showResetPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <FieldError message={resetErrors.password} />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="reset-confirm"
                className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="reset-confirm"
                  type={showResetConfirm ? "text" : "password"}
                  value={resetConfirm}
                  onChange={(e) => {
                    setResetConfirm(e.target.value);
                    if (resetErrors.confirm) {
                      setResetErrors((prev) => ({
                        ...prev,
                        confirm: undefined,
                      }));
                    }
                  }}
                  placeholder="Repeat password"
                  className={withFieldError(
                    `pl-9 pr-10 ${inputClass}`,
                    !!resetErrors.confirm,
                  )}
                  autoComplete="new-password"
                  aria-invalid={!!resetErrors.confirm}
                />
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(!showResetConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showResetConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <FieldError message={resetErrors.confirm} />
            </div>

            <Button
              type="submit"
              disabled={isUpdatingPassword}
              className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl mt-2 flex items-center justify-center gap-2"
            >
              {isUpdatingPassword ? "Updating..." : "Update Password"}
            </Button>

            <button
              type="button"
              onClick={async () => {
                if (isPasswordRecovery) {
                  await signOut();
                }
                setIsPasswordRecovery(false);
                setResetPassword("");
                setResetConfirm("");
                setResetErrors({});
                setModeWithHash("login");
              }}
              className="w-full flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to sign in
            </button>
          </form>
        )}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="login-email"
                className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    if (loginErrors.email) {
                      setLoginErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="business@example.com"
                  className={withFieldError(`pl-9 ${inputClass}`, !!loginErrors.email)}
                  autoComplete="email"
                  aria-invalid={!!loginErrors.email}
                />
              </div>
              <FieldError message={loginErrors.email} />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="login-password"
                className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (loginErrors.password) {
                      setLoginErrors((prev) => ({
                        ...prev,
                        password: undefined,
                      }));
                    }
                  }}
                  placeholder="••••••••"
                  className={withFieldError(
                    `pl-9 pr-10 ${inputClass}`,
                    !!loginErrors.password,
                  )}
                  autoComplete="current-password"
                  aria-invalid={!!loginErrors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <FieldError message={loginErrors.password} />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(loginEmail);
                  setForgotPasswordSent(false);
                  setForgotErrors({});
                  setModeWithHash("forgot");
                }}
                className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={isSigningIn}
              className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl mt-2 flex items-center justify-center gap-2"
            >
              {isSigningIn ? (
                "Signing in..."
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Portal Type
              </Label>
              <div className="flex gap-2">
                {(["wholesale", "warehouse"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPortalType(type)}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-all ${
                      portalType === type
                        ? "bg-red-50 border-red-300 text-red-600"
                        : "border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {type === "wholesale" ? "Wholesale" : "Warehouse"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="reg-business-name"
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
                >
                  Business Name *
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    id="reg-business-name"
                    type="text"
                    value={regBusinessName}
                    onChange={(e) => {
                      setRegBusinessName(e.target.value);
                      if (registerErrors.businessName) {
                        setRegisterErrors((prev) => ({
                          ...prev,
                          businessName: undefined,
                        }));
                      }
                    }}
                    placeholder="Acme Pty Ltd"
                    className={withFieldError(
                      `pl-9 ${inputClassSm}`,
                      !!registerErrors.businessName,
                    )}
                    aria-invalid={!!registerErrors.businessName}
                  />
                </div>
                <FieldError message={registerErrors.businessName} />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="reg-contact-name"
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
                >
                  Contact Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    id="reg-contact-name"
                    type="text"
                    value={regContactName}
                    onChange={(e) => {
                      setRegContactName(e.target.value);
                      if (registerErrors.contactName) {
                        setRegisterErrors((prev) => ({
                          ...prev,
                          contactName: undefined,
                        }));
                      }
                    }}
                    placeholder="Jane Smith"
                    className={withFieldError(
                      `pl-9 ${inputClassSm}`,
                      !!registerErrors.contactName,
                    )}
                    aria-invalid={!!registerErrors.contactName}
                  />
                </div>
                <FieldError message={registerErrors.contactName} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="reg-email"
                className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                Email *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="reg-email"
                  type="email"
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    if (registerErrors.email) {
                      setRegisterErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="business@example.com"
                  className={withFieldError(`pl-9 ${inputClass}`, !!registerErrors.email)}
                  autoComplete="email"
                  aria-invalid={!!registerErrors.email}
                />
              </div>
              <FieldError message={registerErrors.email} />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="reg-business-type"
                className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                Business Type
              </Label>
              <div className="relative">
                <select
                  id="reg-business-type"
                  value={regBusinessType}
                  onChange={(e) =>
                    setRegBusinessType(e.target.value as typeof regBusinessType)
                  }
                  className="w-full h-10 px-4 rounded-md border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:border-red-400 focus:ring-red-400 appearance-none cursor-pointer"
                >
                  <option value="">Select business type (optional)</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="cafe">Café</option>
                  <option value="catering">Catering</option>
                  <option value="retail">Retail</option>
                  <option value="hotel">Hotel</option>
                  <option value="school">School</option>
                  <option value="corporate">Corporate</option>
                  <option value="other">Other</option>
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="reg-phone"
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
                >
                  Phone
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    id="reg-phone"
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="0400 000 000"
                    className={`pl-9 ${inputClassSm}`}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="reg-abn"
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
                >
                  ABN
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    id="reg-abn"
                    type="text"
                    value={regAbn}
                    onChange={(e) => setRegAbn(e.target.value)}
                    placeholder="12 345 678 901"
                    className={`pl-9 ${inputClassSm}`}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="reg-address"
                className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                Business Address
              </Label>
              <Input
                id="reg-address"
                type="text"
                value={regAddress}
                onChange={(e) => setRegAddress(e.target.value)}
                placeholder="123 Main St, Hobart TAS 7000"
                className={inputClassSm}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="reg-password"
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
                >
                  Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      if (registerErrors.password) {
                        setRegisterErrors((prev) => ({
                          ...prev,
                          password: undefined,
                        }));
                      }
                    }}
                    placeholder="Min 8 chars"
                    className={withFieldError(
                      `pl-9 pr-9 ${inputClassSm}`,
                      !!registerErrors.password,
                    )}
                    autoComplete="new-password"
                    aria-invalid={!!registerErrors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <FieldError message={registerErrors.password} />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="reg-confirm"
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
                >
                  Confirm *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    id="reg-confirm"
                    type={showConfirm ? "text" : "password"}
                    value={regConfirm}
                    onChange={(e) => {
                      setRegConfirm(e.target.value);
                      if (registerErrors.confirm) {
                        setRegisterErrors((prev) => ({
                          ...prev,
                          confirm: undefined,
                        }));
                      }
                    }}
                    placeholder="Repeat password"
                    className={withFieldError(
                      `pl-9 pr-9 ${inputClassSm}`,
                      !!registerErrors.confirm,
                    )}
                    autoComplete="new-password"
                    aria-invalid={!!registerErrors.confirm}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <FieldError message={registerErrors.confirm} />
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Registrations are confirmed by our team within 1–2 business days.
              No confirmation email is sent — you can sign in once your account
              has been confirmed.
            </p>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                "Submitting..."
              ) : (
                <>
                  Submit Application <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Looking for the customer portal?{" "}
            <Link
              href="/user-portal"
              className="text-red-600 hover:text-red-700 font-semibold transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div> */}
      </div>

      {/* <div className="relative z-10 text-center mt-6">
        <Link
          href="/wholesale/landing-shop"
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Back to Wholesale Shop
        </Link>
      </div> */}

      <p className="relative z-10 mt-6 text-xs text-gray-400 text-center">
        Saigon Express Tasmania · Business Portal
      </p>
    </div>
  );
}

export default function MemberPortal() {
  return <MemberPortalContent />;
}
