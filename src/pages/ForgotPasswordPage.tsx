import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BASE_URL } from "@/Service/api";

interface ForgotPasswordLocationState {
  email?: string;
}

const FORGOT_PASSWORD_ENDPOINT = `${BASE_URL}/api/auth/forgot-password`;

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

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state || {}) as ForgotPasswordLocationState;
  const [email, setEmail] = useState(routeState.email || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canSubmit = useMemo(() => email.trim().length > 0 && !loading, [email, loading]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your registered email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(FORGOT_PASSWORD_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (!response.ok) {
        const message = await readResponseMessage(response);
        throw new Error(
          message ||
            (response.status === 404
              ? "Password reset service is not available yet. Please contact support."
              : "Unable to send reset instructions. Please try again.")
        );
      }

      const message = await readResponseMessage(response);
      setSuccess(message || "Password reset instructions have been sent to your registered email.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send reset instructions. Please try again."
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
            <h1 className="text-2xl font-bold tracking-tight">Forgot Password</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Enter your registered email.
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

          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Registered Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nurse@hospital.com"
                disabled={loading}
                autoComplete="email"
                className="h-11 rounded-xl border-white/15 bg-white/10 pl-10 text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:bg-white/15"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="mt-5 h-11 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 font-semibold text-white shadow-lg hover:from-emerald-600 hover:to-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Send Reset Link
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
            <Link to="/Signup" className="font-semibold text-emerald-300 transition hover:text-emerald-200">
              Create account
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
