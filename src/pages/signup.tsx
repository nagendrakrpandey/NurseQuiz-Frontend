import React, { useState, FormEvent, useRef, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Mail, Phone, Lock, AlertCircle, CheckCircle2, ShieldCheck, Eye, EyeOff, KeyRound, Send, Stethoscope, GraduationCap, Heart } from 'lucide-react';
import { Link } from "react-router-dom";
import { BASE_URL } from '@/Service/api';
import bg from "@/assets/e1.jpg";

const SignupForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    contact: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // OTP States
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otp, setOtp] = useState<string>('');
  const [isOtpVerified, setIsOtpVerified] = useState<boolean>(false);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Refs to disable autofill
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Disable autocomplete for all form fields
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('spellcheck', 'false');
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
    if (otpError) setOtpError(null);

    if (e.target.name === 'email') {
      setOtpSent(false);
      setIsOtpVerified(false);
      setOtp('');
      setOtpSuccess(null);
      setOtpError(null);
    }
  };

const handleSendOtp = async () => {
  const email = formData.email.trim().toLowerCase();

  // ✅ Strong email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;

  // ❌ Empty or invalid format
  if (!email || !emailRegex.test(email)) {
    setOtpError("Please enter a valid email address");
    return;
  }

  // ❌ Block fake/test domains (optional but useful)
  const blockedDomains = [
    "test.com",
    "fake.com",
    "example.com",
    "mailinator.com",
    "tempmail.com",
    "10minutemail.com"
  ];

  const domain = email.split("@")[1];

  if (blockedDomains.includes(domain)) {
    setOtpError("Please use a real email address");
    return;
  }

  // ❌ Prevent multiple clicks
  if (isSendingOtp || resendCooldown > 0) return;

  setIsSendingOtp(true);
  setOtpError(null);
  setOtpSuccess(null);

  try {
    const response = await fetch(
      `${BASE_URL}/api/auth/send-otp?email=${encodeURIComponent(email)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      }
    );

    const resultText = await response.text();

    // ✅ Success case
    if (response.ok && (resultText === "OTP Sent" || resultText.toLowerCase().includes("otp"))) {
      setOtpSent(true);
      setOtpSuccess("OTP sent successfully!");

      // ⏱ cooldown start
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } 
    //  Email already exists
    else if (resultText.toLowerCase().includes("already")) {
      setOtpError("Email already registered. Try another email.");
    } 
  
    else {
      setOtpError("Failed to send OTP. Try again.");
    }

  } catch (err) {
    setOtpError("Server error! Could not send OTP");
  } finally {
    setIsSendingOtp(false);
  }
};
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setOtpError("Enter valid 6-digit OTP");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);
    setOtpSuccess(null);

    try {
      const response = await fetch(
        `${BASE_URL}/api/auth/verify-otp?email=${encodeURIComponent(formData.email)}&otp=${otp}`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );

      const result = await response.text();

      if (result === "OTP_VERIFIED" || result.includes("VERIFIED")) {
        setIsOtpVerified(true);
        setOtpSuccess("Email verified!");
        setOtpError(null);
        setOtpSent(false);
        setOtp('');
      } else {
        setIsOtpVerified(false);
        setOtpError("Invalid OTP");
      }
    } catch (err) {
      setOtpError("Verification failed");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const parseSignupResponse = async (response: Response) => {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }

    return { success: response.ok, message: await response.text() };
  };

  const isSignupSuccess = (response: Response, result: { success?: boolean; message?: string }) =>
    response.ok && (result.success === true || result.message === "User registered successfully");

  const getSignupErrorMessage = (message?: string) => {
    const normalizedMessage = String(message || "").toLowerCase();
    const duplicateError =
      normalizedMessage.includes("duplicate") ||
      normalizedMessage.includes("already") ||
      normalizedMessage.includes("exist");

    if (
      duplicateError &&
      (
        normalizedMessage.includes("contact") ||
        normalizedMessage.includes("mobile") ||
        normalizedMessage.includes("phone")
      )
    ) {
      return "Mobile number already exists";
    }

    return message || "Signup failed";
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!isOtpVerified) {
      setError("Please verify your email first");
      return;
    }

    const trimmedFullName = formData.fullName.trim();

    if (!trimmedFullName) {
      setError("Full name is required");
      return;
    }

    if (trimmedFullName.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    if (!/^[0-9]{10}$/.test(formData.contact)) {
      setError("Contact number must be 10 digits");
      return;
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Valid email is required");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody = {
        fullName: trimmedFullName,
        contact: formData.contact,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      };

      const response = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      const result = await parseSignupResponse(response);

      if (isSignupSuccess(response, result)) {
        setSuccess(true);

        setFormData({
          fullName: '',
          contact: '',
          email: '',
          password: '',
          confirmPassword: ''
        });

        setOtpSent(false);
        setIsOtpVerified(false);
        setOtp('');
        setOtpSuccess(null);

        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError(getSignupErrorMessage(result.message));
      }
    } catch (err) {
      setError("Network error! Please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return Math.min(strength, 4);
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthLabels = ["Weak", "Fair", "Good", "Strong", "Excellent"];
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-emerald-500"];

  return (
    <div className="flex min-h-svh bg-[#020617] overflow-x-hidden">
      {/* LEFT SIDE - Hero Section */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center p-8 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={bg}
            alt="Nursing Excellence"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/80 via-transparent to-green-900/30" />
        </div>

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 w-full max-w-md"
        >
            <div className="rounded-3xl border border-white/20 bg-white/[0.02] p-6 shadow-xl mt-96 backdrop-blur-md transition-all hover:border-green-400/70">
              <div className="h-10 w-10 rounded-xl bg-green-500/20 border border-white/20 flex items-center justify-center mb-4">
                <Stethoscope className="h-5 w-5 text-green-300" />
              </div>

            <h1 className="text-3xl font-black text-white leading-tight mb-3 tracking-tight">
              Join <span className="text-green-400">NurseQuiz</span>
            </h1>

            <p className="text-gray-300 text-sm leading-relaxed mb-6">
              Start your journey to clinical excellence with professional nursing education.
            </p>

            <div className="flex gap-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">Certified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <GraduationCap className="h-3 w-3 text-green-400" />
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">Professional</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Heart className="h-3 w-3 text-rose-400" />
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">Community</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* RIGHT SIDE - SIGNUP FORM */}
      <div className="relative flex min-h-svh flex-1 items-center justify-center overflow-y-auto bg-white/5 p-4 py-8 lg:bg-transparent">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(500px,80vw)] w-[min(500px,80vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-200/30 blur-[100px]" />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[420px] relative z-10"
        >
          {/* Header */}
          <div className="text-center mb-5">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="p-1.5 rounded-lg bg-white text-green-600 shadow-sm group-hover:scale-105 transition-transform">
                <Stethoscope className="h-4 w-4" />
              </div>
              <span className="text-lg font-black text-white tracking-tight">NurseQuiz</span>
            </Link>
            <h2 className="text-2xl font-bold text-white mt-3">Create Account</h2>
            <p className="text-gray-400 text-xs mt-1">Join our professional community</p>
          </div>

          {/* Messages */}
          {error && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-4">
              <p className="text-red-400 text-xs text-center">{error}</p>
            </motion.div>
          )}

          {success && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 mb-4">
              <p className="text-emerald-400 text-xs text-center">Account created! Redirecting...</p>
            </motion.div>
          )}

          {/* Form */}
          <form  onSubmit={handleSubmit} className="bg-white/[0.04] border border-white/10 p-5 rounded-2xl backdrop-blur-xl shadow-lg space-y-3">
            {/* Full Name */}
            <div>
              <label className="text-gray-300 text-[11px] font-semibold uppercase tracking-wider block mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-400" />
                <input
                  type="text"
                  name="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg focus:bg-white/15 focus:border-green-500/50 transition-all placeholder:text-gray-500 text-white outline-none focus:ring-1 focus:ring-green-500/50"
                />
              </div>
            </div>

            {/* Contact Number */}
            <div>
              <label className="text-gray-300 text-[11px] font-semibold uppercase tracking-wider block mb-1.5">
                Phone Number <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-400" />
                <input
                  type="tel"
                  name="contact"
                  placeholder="10-digit mobile number"
                  value={formData.contact}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 10) {
                      setFormData({ ...formData, contact: value });
                    }
                  }}
                  maxLength={10}
                  autoComplete="off"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg focus:bg-white/15 focus:border-green-500/50 transition-all placeholder:text-gray-500 text-white outline-none focus:ring-1 focus:ring-green-500/50"
                />
              </div>
            </div>

            {/* Email with OTP */}
            <div>
              <label className="text-gray-300 text-[11px] font-semibold uppercase tracking-wider block mb-1.5">
                Email Address <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-400" />
                  <input
                    type="email"
                    name="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isOtpVerified}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    className={`w-full pl-9 pr-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg focus:bg-white/15 focus:border-green-500/50 transition-all placeholder:text-gray-500 text-white outline-none focus:ring-1 focus:ring-green-500/50 ${isOtpVerified ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>

                {!isOtpVerified && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || resendCooldown > 0 || !formData.email}
                    className={`px-3 py-2 rounded-lg font-semibold text-xs transition-all duration-300 flex items-center gap-1 whitespace-nowrap ${isSendingOtp || resendCooldown > 0 || !formData.email
                      ? 'bg-gray-600 cursor-not-allowed opacity-50'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md'
                      }`}
                  >
                    <Send className="h-3 w-3" />
                    {isSendingOtp ? 'Sending' : resendCooldown > 0 ? `${resendCooldown}s` : 'Send'}
                  </button>
                )}
              </div>

              {/* OTP Section */}
              {otpSent && !isOtpVerified && (
                <div className="mt-2 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-400" />
                      <input
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        autoComplete="off"
                        className="w-full pl-9 pr-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg focus:bg-white/15 focus:border-green-500/50 transition-all placeholder:text-gray-500 text-white outline-none focus:ring-1 focus:ring-green-500/50"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isVerifyingOtp || otp.length !== 6}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all duration-300 ${isVerifyingOtp || otp.length !== 6
                        ? 'bg-gray-600 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-md'
                        }`}
                    >
                      {isVerifyingOtp ? 'Verify' : 'Verify'}
                    </button>
                  </div>
                </div>
              )}

              {/* OTP Messages */}
              {otpSuccess && (
                <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded mt-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span className="text-[11px]">{otpSuccess}</span>
                </div>
              )}

              {otpError && (
                <div className="flex items-center gap-1.5 text-red-400 bg-red-500/10 px-2 py-1 rounded mt-1">
                  <AlertCircle className="h-3 w-3" />
                  <span className="text-[11px]">{otpError}</span>
                </div>
              )}

              {isOtpVerified && (
                <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 mt-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span className="text-[11px] font-medium">✓ Email verified!</span>
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="text-gray-300 text-[11px] font-semibold uppercase tracking-wider block mb-1.5">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create password (min. 6 characters)"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  className="w-full pl-9 pr-8 py-2 text-sm bg-white/10 border border-white/20 rounded-lg focus:bg-white/15 focus:border-green-500/50 transition-all placeholder:text-gray-500 text-white outline-none focus:ring-1 focus:ring-green-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Password Strength */}
              {formData.password && (
                <div className="mt-1.5 space-y-0.5">
                  <div className="flex gap-0.5">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-0.5 flex-1 rounded-full transition-all ${i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-white/10"}`}
                      />
                    ))}
                  </div>
                  <p className="text-[9px] text-gray-400">
                    Strength: <span className="font-semibold text-green-400">{strengthLabels[passwordStrength]}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-gray-300 text-[11px] font-semibold uppercase tracking-wider block mb-1.5">
                Confirm Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  className="w-full pl-9 pr-8 py-2 text-sm bg-white/10 border border-white/20 rounded-lg focus:bg-white/15 focus:border-green-500/50 transition-all placeholder:text-gray-500 text-white outline-none focus:ring-1 focus:ring-green-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-[10px] text-red-400 mt-1">Passwords don't match!</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !isOtpVerified}
              className={`w-full py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.98] text-sm flex items-center justify-center gap-2 mt-2 ${(isSubmitting || !isOtpVerified) ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : !isOtpVerified ? (
                "Verify Email First"
              ) : (
                "Create Account"
              )}
            </button>

            {/* Login Link */}
            <div className="text-center pt-1">
              <p className="text-gray-500 text-[11px]">
                Already have an account?{" "}
                <Link to="/login" className="text-green-400 font-semibold hover:text-green-300 transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default SignupForm;
