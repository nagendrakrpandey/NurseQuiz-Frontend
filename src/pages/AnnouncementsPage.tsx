import { motion } from "framer-motion";
import { Megaphone, Calendar, ImageIcon, Video, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/homepage/Navbar";
import Footer from "@/components/homepage/Footer";

const shortlisted = [
  { rank: 1, team: "Apollo Nursing College", state: "Tamil Nadu" },
  { rank: 2, team: "AIIMS Delhi Nurses", state: "Delhi" },
  { rank: 3, team: "CMC Vellore Team", state: "Tamil Nadu" },
  { rank: 4, team: "KEM Hospital Mumbai", state: "Maharashtra" },
  { rank: 5, team: "PGIMER Chandigarh", state: "Chandigarh" },
  { rank: 6, team: "NIMHANS Bengaluru", state: "Karnataka" },
];

const AnnouncementsPage = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <div className="flex-1 bg-muted/30 py-8 sm:py-12">
      <div className="container max-w-4xl space-y-8 px-3 sm:px-4 sm:space-y-10">
        {/* Event Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="hero-gradient rounded-xl p-5 text-primary-foreground sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="h-5 w-5" />
            <Badge className="bg-primary-foreground/20 text-primary-foreground border-0">Regional Finals</Badge>
          </div>
          <h1 className="mb-2 font-heading text-2xl font-bold sm:text-3xl">Regional Level Grand Finale</h1>
          <p className="text-primary-foreground/80 mb-6">The top 20 teams compete for the regional championship.</p>
          <div className="flex flex-wrap gap-4 text-sm sm:gap-6">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> June 20, 2026</div>
            <div className="flex min-w-0 items-center gap-2"><ExternalLink className="h-4 w-4 shrink-0" /> <span>AIIMS Auditorium, New Delhi</span></div>
          </div>
        </motion.div>

        {/* Shortlisted */}
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground mb-6">Shortlisted Teams</h2>
          <div className="overflow-hidden rounded-xl bg-card card-shadow">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Rank</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Team</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">State</th>
                </tr>
              </thead>
              <tbody>
                {shortlisted.map((t, i) => (
                  <motion.tr key={t.rank} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="border-b border-border last:border-0">
                    <td className="p-4 text-sm font-bold text-primary">#{t.rank}</td>
                    <td className="p-4 text-sm font-semibold text-card-foreground">{t.team}</td>
                    <td className="p-4 text-sm text-muted-foreground">{t.state}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {/* Media Gallery */}
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground mb-6">Media Gallery</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-video bg-muted rounded-lg flex items-center justify-center card-shadow hover:card-shadow-hover transition-shadow cursor-pointer">
                {i < 4 ? (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <Video className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default AnnouncementsPage;
