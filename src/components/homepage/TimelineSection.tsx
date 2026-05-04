import { motion } from "framer-motion";
import { Calendar, CheckCircle2, Clock } from "lucide-react";

const dates = [
  { date: "Apr 1 – Apr 30", title: "Registration Open", status: "active", description: "Organizations register and submit team details" },
  { date: "May 5 – May 10", title: "Verification & Approval", status: "upcoming", description: "Document verification and team approval" },
  { date: "May 15 – May 20", title: "District Level Quiz", status: "upcoming", description: "Online quiz for all registered teams" },
  { date: "Jun 1 – Jun 5", title: "State Level Quiz", status: "upcoming", description: "Top performers compete at state level" },
  { date: "Jun 20", title: "National Finals", status: "upcoming", description: "Grand finale with top teams from all states" },
  { date: "Jun 25", title: "Awards & Certificates", status: "upcoming", description: "Winner announcements and certificate distribution" },
];

const TimelineSection = () => (
  <section className="py-20 bg-muted/50" id="dates">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-2xl mx-auto mb-16"
      >
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">Important Dates</h2>
        <p className="text-muted-foreground text-lg">Stay updated with the competition timeline</p>
      </motion.div>
      <div className="max-w-3xl mx-auto">
        {dates.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex gap-4 mb-6 last:mb-0"
          >
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.status === "active" ? "bg-primary" : "bg-muted"}`}>
                {item.status === "active" ? (
                  <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              {i < dates.length - 1 && <div className="w-0.5 flex-1 bg-border mt-2" />}
            </div>
            <div className="bg-card rounded-lg p-4 card-shadow flex-1 mb-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3 w-3" />
                {item.date}
              </div>
              <h3 className="font-heading font-semibold text-card-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TimelineSection;
