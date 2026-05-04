import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stethoscope, ArrowRight, ShieldCheck, GraduationCap, Eye, EyeOff, Heart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import bg from "@/assets/e1.jpg";
import { BASE_URL } from "@/Service/api";
import {
  clearAuthSession,
  getPostLoginRoute,
  getStoredRoleId,
  hasAuthSession,
  markSessionActivity,
} from "@/lib/session";

// 🔥 STORAGE MANAGEMENT FUNCTIONS
const StorageManager = {
  saveUserData: (userData) => {
    localStorage.setItem("token", userData.token);
    localStorage.setItem("email", userData.email);
    localStorage.setItem("userId", userData.id);
    if (userData.candidateId) {
      localStorage.setItem("candidateId", userData.candidateId);
    } else {
      localStorage.removeItem("candidateId");
    }
    localStorage.setItem("userName", userData.fullName);
    localStorage.setItem("roleId", userData.roleId);
    localStorage.setItem("loginStatus", userData.loginStatus);
    localStorage.setItem("contact", userData.contact);
    localStorage.setItem("userData", JSON.stringify(userData));
    markSessionActivity();
    
    console.log("✅ Data saved to localStorage:", {
      token: userData.token?.substring(0, 20) + "...",
      userId: userData.id,
      candidateId: userData.candidateId,
      userName: userData.fullName,
      roleId: userData.roleId,
      loginStatus: userData.loginStatus
    });
  },
  
  getUserData: () => {
    return {
      token: localStorage.getItem("token"),
      email: localStorage.getItem("email"),
      userId: localStorage.getItem("userId"),
      candidateId: localStorage.getItem("candidateId"),
      userName: localStorage.getItem("userName"),
      roleId: localStorage.getItem("roleId"),
      loginStatus: localStorage.getItem("loginStatus"),
      contact: localStorage.getItem("contact")
    };
  },
  
  clearUserData: () => {
    clearAuthSession("manual");
  },
  
  isLoggedIn: () => {
    return hasAuthSession();
  },
  
  getUserRole: () => {
    return getStoredRoleId();
  }
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    clearAuthSession("manual");
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please enter email and password");
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password
        })
      });

      const result = await response.json();
      console.log("📦 Full Login Response:", result);

      if (response.ok && result.token) {
        const candidateId =
          result.candidateId ||
          result.candidate_id ||
          result.candidateID ||
          result.candidate?.id ||
          null;

        const userData = {
          token: result.token,
          id: result.id,
          candidateId,
          candidateIdSource: candidateId ? "backend" : null,
          fullName: result.fullName,
          email: result.email,
          contact: result.contact,
          loginStatus: result.loginStatus,
          roleId: result.roleId
        };
        
        StorageManager.saveUserData(userData);

        navigate(getPostLoginRoute(result.roleId, result.loginStatus), { replace: true });
        
      } else {
        setError(result.message || result.error || "Login failed. Please check your credentials.");
        setLoading(false);
      }
      
    } catch (error) {
      console.error(" Network Error:", error);
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    window.location.href = "/forgot-password";
  };

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
          <div className="rounded-3xl border border-white/20 mt-96 bg-white/[0.02] p-6 shadow-xl backdrop-blur-md transition-all hover:border-green-400/70">
            <div className="h-10 w-10 rounded-xl bg-green-500/20 border border-white/20 flex items-center justify-center mb-4">
              <Stethoscope className="h-5 w-5 text-green-300" />
            </div>

            <h1 className="text-3xl font-black text-white leading-tight mb-3 tracking-tight">
              Nurse<span className="text-green-400">Quiz</span>
            </h1>

            <p className="text-gray-300 text-sm leading-relaxed mb-6">
              Elevate your clinical expertise with the world's most advanced 
              <span className="text-green-300 font-semibold"> nursing challenge.</span>
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

      {/* RIGHT SIDE - LOGIN FORM */}
      <div className="relative flex min-h-svh flex-1 items-center justify-center overflow-y-auto bg-white/5 p-4 py-8 lg:bg-transparent">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(500px,80vw)] w-[min(500px,80vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-200/30 blur-[100px]" />

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px] relative z-10"
        >
          {/* Header */}
          <div className="text-center mb-5">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="p-1.5 rounded-lg bg-white text-green-600 shadow-sm group-hover:scale-105 transition-transform">
                <Stethoscope className="h-4 w-4" />
              </div>
              <span className="text-lg font-black text-white tracking-tight">NurseQuiz</span>
            </Link>
            <h2 className="text-2xl font-bold text-white mt-3">Welcome Back</h2>
            <p className="text-gray-400 text-xs mt-1">Please enter your details to sign in</p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-4"
            >
              <p className="text-red-400 text-xs text-center">{error}</p>
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="bg-white/[0.04] border border-white/10 p-5 rounded-2xl backdrop-blur-xl shadow-lg space-y-4">
            {/* Email Field */}
            <div>
              <Label className="text-gray-300 text-[11px] font-semibold uppercase tracking-wider block mb-1.5">
                Email Address
              </Label>
              <Input 
                type="email" 
                placeholder="nurse@hospital.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="off"
                className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg focus:bg-white/15 focus:border-green-500/50 transition-all placeholder:text-gray-500 text-white outline-none focus:ring-1 focus:ring-green-500/50"
                required
              />
            </div>
            
            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <Label className="text-gray-300 text-[11px] font-semibold uppercase tracking-wider">
                  Password
                </Label>
                <button 
                  type="button"
                  className="text-[10px] text-green-400 hover:text-green-300 font-semibold transition-colors"
                  onClick={handleForgotPassword}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Input  
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="off"
                  className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg focus:bg-white/15 focus:border-green-500/50 transition-all placeholder:text-gray-500 text-white outline-none focus:ring-1 focus:ring-green-500/50 pr-8"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.98] text-sm flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </form>

          {/* Sign Up Link */}
          <div className="text-center mt-4">
            <p className="text-gray-500 text-[11px]">
              Don't have an account?{" "}
              <Link to="/Signup" className="text-green-400 font-semibold hover:text-green-300 transition-colors">
                Create Account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
export { StorageManager };
