import { Heart, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => (
  <footer className="bg-foreground py-10 text-background/80 sm:py-16">
    <div className="container px-3 sm:px-4 md:px-6">
      <div className="mb-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:mb-12">
        <div>
          <h3 className="font-heading font-bold text-background text-lg mb-4">NurseQuiz</h3>
          <p className="text-sm leading-relaxed text-background/60">
            India's premier online quiz competition platform for nursing professionals.
          </p>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-background mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#about" className="hover:text-background transition-colors">About</a></li>
            <li><a href="#dates" className="hover:text-background transition-colors">Important Dates</a></li>
            <li><a href="#" className="hover:text-background transition-colors">Eligibility</a></li>
            <li><a href="#" className="hover:text-background transition-colors">FAQs</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-background mb-4">Competition</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-background transition-colors">Guidelines</a></li>
            <li><a href="#" className="hover:text-background transition-colors">Leaderboard</a></li>
            <li><a href="#" className="hover:text-background transition-colors">Certificates</a></li>
            <li><a href="#" className="hover:text-background transition-colors">Results</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-background mb-4">Contact</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> support@nursequiz.in</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> +91 1800-XXX-XXXX</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> New Delhi, India</li>
          </ul>
        </div>
      </div>
      <div className="flex flex-col items-center justify-between gap-4 border-t border-background/10 pt-6 text-center text-sm text-background/50 md:flex-row md:text-left">
        <p>© 2026 NurseQuiz. All rights reserved.</p>
        <p className="flex flex-wrap items-center justify-center gap-1 md:justify-end">Made with <Heart className="h-3 w-3 text-destructive" /> for Indian Healthcare</p>
      </div>
    </div>
  </footer>
);

export default Footer;
