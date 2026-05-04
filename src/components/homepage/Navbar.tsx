import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Menu, X, Stethoscope } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-heading font-bold text-xl text-foreground">
          <Stethoscope className="h-6 w-6 text-primary" />
          NurseQuiz
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</a>
          <a href="#dates" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Timeline</a>
          <Link to="/leaderboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Leaderboard</Link>
          <Link to="/announcements" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Announcements</Link>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" asChild><Link to="/login">Login</Link></Button>
          <Button asChild><Link to="/signup">Register</Link></Button>
        </div>
        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-card px-4 py-4 space-y-3">
          <a href="#about" className="block text-sm text-muted-foreground">About</a>
          <a href="#dates" className="block text-sm text-muted-foreground">Timeline</a>
          <Link to="/leaderboard" className="block text-sm text-muted-foreground">Leaderboard</Link>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" asChild className="flex-1"><Link to="/login">Login</Link></Button>
            <Button asChild className="flex-1"><Link to="/register">Register</Link></Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
