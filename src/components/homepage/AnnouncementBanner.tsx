import { X, ArrowRight, Sparkles, Bell } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const AnnouncementBanner = () => {
  const [visible, setVisible] = useState(true);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-[100] w-full"
        >
          {/* Main Container with Glassmorphism */}
          <div className="relative overflow-hidden border-b border-white/10 bg-[#020617]/90 backdrop-blur-md">
            
            {/* Professional Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-1/4 w-1/2 h-full bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent skew-x-[45deg]" />
              <div className="absolute -top-[100%] left-0 w-full h-[200%] bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_70%)]" />
            </div>

            <div className="container mx-auto px-3 sm:px-4 md:px-6">
              <div className="flex flex-col items-stretch justify-between gap-3 py-3 md:flex-row md:items-center md:py-2.5">
                
                {/* Left Content: Announcement Info */}
                <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-xl rotate-12 group-hover:rotate-0 transition-transform duration-300" />
                    <Bell className="h-4 w-4 text-emerald-400 relative z-10" />
                  </div>

                  <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center md:gap-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="bg-emerald-500 text-[#020617] text-[10px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-sm">
                        Live
                      </span>
                      <h4 className="truncate text-sm font-bold tracking-tight text-white">
                        NNQ 2026 Registration
                      </h4>
                    </div>
                    <div className="hidden md:block w-px h-4 bg-white/10" />
                    <p className="text-[13px] font-medium leading-snug text-slate-300">
                      Join the national clinical excellence challenge. 
                      <span className="ml-1 font-semibold text-emerald-400/90">Ends April 15th.</span>
                    </p>
                  </div>
                </div>

                {/* Right Content: Actions */}
                <div className="flex items-center justify-between gap-3 md:justify-end md:gap-4">
                  <motion.a
                    href="/register"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative flex min-w-0 items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-4 py-1.5 transition-all sm:px-5"
                  >
                    {/* Hover Bg Effect */}
                    <div className="absolute inset-0 bg-emerald-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    
                    <span className="relative z-10 text-[12px] font-bold text-slate-950 group-hover:text-white transition-colors duration-300">
                      Get Certified Now
                    </span>
                    <ArrowRight className="relative z-10 h-3.5 w-3.5 text-slate-950 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                  </motion.a>

                  <button
                    onClick={() => setVisible(false)}
                    className="group p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <X className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
                  </button>
                </div>

              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementBanner;
