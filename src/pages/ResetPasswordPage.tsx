import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BASE_URL } from "@/Service/api";

const RESET_PASSWORD_ENDPOINT = `${BASE_URL}/api/auth/reset-password`;

const readResponseMessage = async (response: Response) => {
  const text = await response.text();
  if (!text) return "";

  try {
    const result = JSON.parse(text);
    return String(result.message || result.error || "").trim();
  } catch {
    return text.trim();
  }
};

const submitResetPassword = async (token: string, password: string) => {
  const response = await fetch(`${RESET_PASSWORD_ENDPOINT}/${encodeURIComponent(token)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      password,
      newPassword: password,
      confirmPassword: password,
    }),
  });

  const message = await readResponseMessage(response);
  if (response.ok) return message;

  throw new Error(message || "Unable to reset password. Please try again.");
};

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { token = "" } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canSubmit = useMemo(
    () => token.trim().length > 0 && password.length > 0 && confirmPassword.length > 0 && !loading,
    [confirmPassword, loading, password, token]
  );

  const clearMessages = () => {
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    clearMessages();
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    clearMessages();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedToken = token.trim();
    if (!trimmedToken) {
      setError("Password reset token is missing. Please use the link from your email.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and confirm password must match.");
      return;
    }

    setLoading(true);

    try {
      const message = await submitResetPassword(trimmedToken, password);
      setSuccess(message || "Password reset successfully. You can now login with your new password.");
      setPassword("");
      setConfirmPassword("");
      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center overflow-x-hidden bg-[#020617] px-4 py-8 text-white">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(520px,80vw)] w-[min(520px,80vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300/20 blur-[110px]" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-[430px]"
      >
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
              <Stethoscope className="h-4 w-4" />
            </span>
            <span className="text-xl font-black tracking-tight">NurseQuiz</span>
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-6">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300">
              <KeyRound className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Create a new password for your NurseQuiz account.
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-sm text-emerald-100">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => handlePasswordChange(event.target.value)}
                  placeholder="Enter new password"
                  disabled={loading || Boolean(success)}
                  autoComplete="new-password"
                  className="h-11 rounded-xl border-white/15 bg-white/10 pl-10 pr-10 text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:bg-white/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => handleConfirmPasswordChange(event.target.value)}
                  placeholder="Confirm new password"
                  disabled={loading || Boolean(success)}
                  autoComplete="new-password"
                  className="h-11 rounded-xl border-white/15 bg-white/10 pl-10 pr-10 text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:bg-white/15"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!canSubmit || Boolean(success)}
            className="mt-5 h-11 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 font-semibold text-white shadow-lg hover:from-emerald-600 hover:to-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Reset Password
              </>
            )}
          </Button>

          <div className="mt-5 flex flex-col gap-3 text-center text-sm sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="inline-flex items-center justify-center gap-2 text-slate-300 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </button>
            <Link to="/forgot-password" className="font-semibold text-emerald-300 transition hover:text-emerald-200">
              Request new link
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
