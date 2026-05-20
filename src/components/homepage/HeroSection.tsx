import { motion } from "framer-motion";
import { ArrowRight, Building2, CheckCircle2, ShieldCheck, Stethoscope, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const stats = [
  { value: "15k+", label: "Aspirants", icon: Users },
  { value: "850+", label: "Hospitals", icon: Building2 },
  { value: "3", label: "Competition Levels", icon: Trophy },
];

const trustPoints = ["Live proctored assessments", "District to national ranking", "Certificate-ready results"];

const HeroSection = () => (
  <section className="relative isolate flex min-h-[calc(100svh-64px)] items-center overflow-hidden bg-slate-950">
    <img
      src={heroBg}
      alt="Nursing professionals participating in a national excellence program"
      className="absolute inset-0 -z-20 h-full w-full object-cover"
    />
    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/95 via-emerald-950/82 to-slate-950/45" />
    <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-white to-transparent" />

    <div className="container px-4 py-14 sm:px-6 sm:py-16 lg:py-24">
      <div className="grid min-h-[620px] items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.75fr)]">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl text-white"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-emerald-200">
            <Stethoscope className="h-3.5 w-3.5" />
            NurseQuiz 2026
          </div>

          <h1 className="max-w-4xl text-4xl font-black leading-[1.04] tracking-normal text-white sm:text-5xl lg:text-6xl xl:text-7xl">
            Regional Nursing Excellence Quiz
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
            A professional competition platform for nursing teams to register, verify credentials, compete across levels, and earn recognition for clinical excellence.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 rounded-lg bg-emerald-600 px-6 text-base font-bold text-white shadow-lg shadow-emerald-950/25 hover:bg-emerald-500">
              <Link to="/Signup">
                Register Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-lg border-white/30 bg-white/10 px-6 text-base font-bold text-white hover:bg-white hover:text-slate-950">
              <Link to="/login">Login</Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-200">
            {trustPoints.map((point) => (
              <span key={point} className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                {point}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12 }}
          className="grid gap-3 rounded-lg border border-white/15 bg-slate-950/45 p-4 text-white shadow-2xl shadow-slate-950/30 backdrop-blur-md sm:grid-cols-3 lg:grid-cols-1"
        >
          <div className="flex items-start gap-3 border-b border-white/10 pb-4 sm:col-span-3 lg:col-span-1">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-200">Professional Portal</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">Registration, approvals, secure exams, evidence capture, and results in one workflow.</p>
            </div>
          </div>

          {stats.map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-lg bg-white/[0.08] p-4">
              <item.icon className="h-5 w-5 shrink-0 text-emerald-300" />
              <div>
                <p className="text-2xl font-black text-white">{item.value}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  </section>
);

export default HeroSection;
