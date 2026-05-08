import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Stethoscope, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { label: "About", href: "#about" },
  { label: "Timeline", href: "#dates" },
  { label: "Leaderboard", to: "/leaderboard" },
  { label: "Announcements", to: "/announcements" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-slate-950">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Stethoscope className="h-5 w-5" />
          </span>
          <span className="font-heading text-xl font-black tracking-normal">NurseQuiz</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) =>
            link.to ? (
              <Link key={link.label} to={link.to} className="text-sm font-semibold text-slate-600 transition-colors hover:text-emerald-700">
                {link.label}
              </Link>
            ) : (
              <a key={link.label} href={link.href} className="text-sm font-semibold text-slate-600 transition-colors hover:text-emerald-700">
                {link.label}
              </a>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button asChild variant="ghost" className="rounded-lg font-bold text-slate-700 hover:text-emerald-700">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild className="rounded-lg bg-emerald-600 font-bold text-white hover:bg-emerald-700">
            <Link to="/Signup">Register</Link>
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 shadow-lg md:hidden">
          <div className="grid gap-1">
            {links.map((link) =>
              link.to ? (
                <Link key={link.label} to={link.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  {link.label}
                </Link>
              ) : (
                <a key={link.label} href={link.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  {link.label}
                </a>
              ),
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="rounded-lg">
              <Link to="/login" onClick={() => setOpen(false)}>Login</Link>
            </Button>
            <Button asChild className="rounded-lg bg-emerald-600 hover:bg-emerald-700">
              <Link to="/Signup" onClick={() => setOpen(false)}>Register</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
