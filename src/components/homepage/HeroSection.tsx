import { motion } from "framer-motion";
import { Sparkles, Users, ArrowRight, Award, CheckCircle2, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden bg-[#020617] py-6 sm:py-8 md:py-12">

      {/* --- Background: Healthcare Imagery --- */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80&w=2000"
          alt="Healthcare Excellence"
          className="w-full h-full object-cover opacity-20"
        />
        {/* Overlay with green and Green Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-green-950/80 to-emerald-950/40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent opacity-40" />
      </div>

      <div className="container relative z-10 w-full px-3 sm:px-4 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-stretch justify-center gap-4 sm:gap-6 lg:flex-row">

          {/* --- LEFT BOX: green Focused --- */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1 flex flex-col"
          >
            <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/5 bg-white/[0.01] p-5 shadow-2xl backdrop-blur-[12px] transition-all hover:border-emerald-500/20 sm:rounded-[2.5rem] sm:p-8 md:p-12">
              
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />

              {/* Top Content */}
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 sm:mb-6">
                  <Sparkles className="h-3 w-3 text-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-bold tracking-[0.2em] text-emerald-300 uppercase">
                    NNQ 2026
                  </span>
                </div>

                <h1 className="mb-4 text-3xl font-black leading-tight text-white sm:text-4xl md:text-5xl">
                  Empowering <span className="text-emerald-400">Nurses</span> <br />
                  <span className="text-xl font-extralight italic text-green-200/70 sm:text-2xl md:text-3xl">
                    Through Excellence
                  </span>
                </h1>

                <p className="max-w-xl text-sm leading-relaxed text-slate-300/70 md:text-base lg:max-w-sm">
                  Join the nation's largest clinical excellence challenge. Showcase your skills and rise to the top of healthcare innovation.
                </p>
              </div>
              <div className="pt-6 sm:pt-10" />
              
              {/* Buttons Section */}
              <div className="grid w-full grid-cols-1 gap-3 sm:w-fit sm:grid-cols-2 sm:gap-4">
                
                {/* Register Button - Green Theme */}
                <Button
                  asChild
                  className="h-12 rounded-xl border border-emerald-400/20 bg-emerald-600 px-4 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all hover:scale-[1.02] hover:bg-emerald-500 active:scale-95 sm:h-14 sm:px-6 sm:rounded-2xl md:h-16 md:px-8"
                >
                  <Link to="/Signup" className="flex items-center justify-center gap-2 text-sm font-bold sm:text-base md:text-lg">
                    <Users className="h-5 w-5" /> Register Now
                  </Link>
                </Button>

                {/* Login Button - green/Glass Theme */}
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-xl border-white/10 bg-white/5 px-4 text-white transition-all hover:bg-green-600 hover:text-white sm:h-14 sm:px-6 sm:rounded-2xl md:h-16 md:px-8"
                >
                  <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-bold sm:text-base md:text-lg">
                    Login <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>

              </div>
            </div>
          </motion.div>

          {/* --- RIGHT BOX: green-Green Action Portal --- */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="flex-1 flex flex-col"
          >
            <div className="group relative flex h-full flex-col justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-5 shadow-2xl backdrop-blur-[20px] sm:rounded-[2.5rem] sm:p-8 md:p-10">

              {/* Soft Ambient Glow */}
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-600/10 blur-[80px] sm:-right-20 sm:-top-20 sm:h-64 sm:w-64" />
              <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-green-600/10 blur-[80px] sm:-bottom-20 sm:-left-20 sm:h-64 sm:w-64" />

              <div className="relative z-10 space-y-6 sm:space-y-10">
                <div className="space-y-2">
                  <h3 className="flex items-center gap-3 text-xl font-bold text-white sm:text-2xl">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-emerald-500/30">
                      <GraduationCap className="h-6 w-6 text-emerald-400" />
                    </div>
                    Professional Portal
                  </h3>
                  <p className="text-slate-400/80 text-sm italic">
                    "Elevate your practice, lead the change."
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/5 pt-6 sm:mt-8 sm:gap-4 sm:pt-8">
                  {[
                    { v: "15k+", l: "Aspirants", color: "text-emerald-400" },
                    { v: "850+", l: "Hospitals", color: "text-green-400" },
                    { v: "Pan", l: "India", color: "text-emerald-400" }
                  ].map((s, i) => (
                    <div key={i} className="text-left">
                      <div className={`text-lg font-bold sm:text-xl ${s.color}`}>{s.v}</div>
                      <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Features Bar */}
                <div className="flex flex-wrap items-center justify-start gap-3 border-t border-white/5 pt-6 sm:justify-between sm:gap-4">
                  {['Live Assessments', 'National Ranking', 'Recognition'].map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
export default HeroSection;
