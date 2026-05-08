import { Heart, Mail, MapPin, Phone, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";

const quickLinks = [
  { label: "About", href: "#about" },
  { label: "Important Dates", href: "#dates" },
  { label: "Leaderboard", to: "/leaderboard" },
  { label: "Announcements", to: "/announcements" },
];

const competitionLinks = [
  { label: "Register", to: "/Signup" },
  { label: "Login", to: "/login" },
  { label: "Certificates", to: "/certificates" },
  { label: "Dashboard", to: "/dashboard" },
];

const Footer = () => (
  <footer className="bg-slate-950 py-12 text-slate-300 sm:py-16">
    <div className="container px-4 sm:px-6">
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
              <Stethoscope className="h-5 w-5" />
            </span>
            <span className="font-heading text-xl font-black">NurseQuiz</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
            A secure competition platform for nursing teams, healthcare institutions, and national-level clinical excellence programs.
          </p>
        </div>

        <div>
          <h4 className="mb-4 font-bold text-white">Quick Links</h4>
          <ul className="space-y-3 text-sm">
            {quickLinks.map((link) => (
              <li key={link.label}>
                {link.to ? (
                  <Link to={link.to} className="transition-colors hover:text-emerald-300">{link.label}</Link>
                ) : (
                  <a href={link.href} className="transition-colors hover:text-emerald-300">{link.label}</a>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-bold text-white">Competition</h4>
          <ul className="space-y-3 text-sm">
            {competitionLinks.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className="transition-colors hover:text-emerald-300">{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-bold text-white">Contact</h4>
          <ul className="space-y-3 text-sm text-slate-400">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-emerald-400" /> support@nursequiz.in</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-400" /> +91 1800-000-0000</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-400" /> New Delhi, India</li>
          </ul>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-center text-sm text-slate-500 md:flex-row md:text-left">
        <p>Copyright 2026 NurseQuiz. All rights reserved.</p>
        <p className="flex items-center gap-1">
          Made with <Heart className="h-3.5 w-3.5 text-emerald-400" /> for Indian healthcare professionals
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
