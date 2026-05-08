import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bell, X } from "lucide-react";
import { Link } from "react-router-dom";

const AnnouncementBanner = () => {
  const [visible, setVisible] = useState(true);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.25 }}
          className="relative z-[60] border-b border-emerald-900/20 bg-slate-950 text-white"
        >
          <div className="container flex flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-3 md:items-center">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-slate-950">
                <Bell className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold">NNQ 2026 registrations are open</p>
                <p className="text-xs leading-5 text-slate-300">Complete organization registration and team upload before the registration window closes.</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 md:justify-end">
              <Link to="/Signup" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-100">
                Register
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setVisible(false)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close announcement"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementBanner;
