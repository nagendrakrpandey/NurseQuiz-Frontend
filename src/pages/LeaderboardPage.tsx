import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/homepage/Navbar";
import Footer from "@/components/homepage/Footer";

const topPerformers = [
  { rank: 1, organizationName: "Apollo Nursing College", state: "Tamil Nadu", score: 98, icon: Trophy },
  { rank: 2, organizationName: "AIIMS Delhi Nurses", state: "Delhi", score: 95, icon: Medal },
  { rank: 3, organizationName: "CMC Vellore Team", state: "Tamil Nadu", score: 93, icon: Award },
];

const leaderboard = [
  { rank: 4, organizationName: "KEM Hospital Mumbai", state: "Maharashtra", score: 91 },
  { rank: 5, organizationName: "PGIMER Chandigarh", state: "Chandigarh", score: 89 },
  { rank: 6, organizationName: "NIMHANS Bengaluru", state: "Karnataka", score: 88 },
  { rank: 7, organizationName: "JIPMER Puducherry", state: "Puducherry", score: 86 },
  { rank: 8, organizationName: "Safdarjung Hospital", state: "Delhi", score: 85 },
  { rank: 9, organizationName: "Ruby Hall Clinic", state: "Maharashtra", score: 84 },
  { rank: 10, organizationName: "Manipal Hospital", state: "Karnataka", score: 83 },
];

const podiumColors = ["bg-warning", "bg-muted", "bg-warning/60"];

const LeaderboardPage = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <div className="flex-1 bg-muted/30 py-8 sm:py-12">
      <div className="container max-w-4xl px-3 sm:px-4">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">Leaderboard</h1>
            <p className="text-muted-foreground mt-1">District Level Rankings</p>
          </div>
          <Select defaultValue="district">
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="district">District</SelectItem>
              <SelectItem value="state">State</SelectItem>
              <SelectItem value="regional">Regional</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Top 3 */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {topPerformers.map((p, i) => (
            <motion.div
              key={p.rank}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className={`rounded-xl bg-card p-5 text-center card-shadow sm:p-6 ${i === 0 ? "md:-mt-4 ring-2 ring-warning/50" : ""}`}>
              <div className={`w-14 h-14 rounded-full ${podiumColors[i]} flex items-center justify-center mx-auto mb-4`}>
                <p.icon className={`h-7 w-7 ${i === 0 ? "text-warning-foreground" : "text-muted-foreground"}`} />
              </div>
              <h3 className="font-heading font-bold text-card-foreground">{p.organizationName}</h3>
              <p className="text-sm text-muted-foreground mt-1">{p.state}</p>
              <div className="text-2xl font-heading font-bold text-primary mt-3">{p.score}%</div>
              <Badge variant="secondary" className="mt-2">Rank #{p.rank}</Badge>
            </motion.div>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl bg-card card-shadow">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Rank</th>
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Organization Name</th>
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground hidden sm:table-cell">State</th>
                <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, i) => (
                <motion.tr
                  key={entry.rank}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm font-medium text-card-foreground">#{entry.rank}</td>
                  <td className="p-4 text-sm font-semibold text-card-foreground">{entry.organizationName}</td>
                  <td className="p-4 text-sm text-muted-foreground hidden sm:table-cell">{entry.state}</td>
                  <td className="p-4 text-sm font-bold text-primary text-right">{entry.score}%</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default LeaderboardPage;
