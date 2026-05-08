import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, ClipboardList, Flag, Medal, Timer, Trophy } from "lucide-react";

const dates = [
  { date: "Apr 1 - Apr 30", title: "Registration", description: "Hospitals submit organization and team details.", icon: ClipboardList, status: "active" },
  { date: "May 5 - May 10", title: "Verification", description: "Admin review, document checks, and approvals.", icon: CheckCircle2, status: "active" },
  { date: "May 15 - May 20", title: "District Quiz", description: "First online assessment round for approved teams.", icon: Timer, status: "upcoming" },
  { date: "Jun 1 - Jun 5", title: "State Quiz", description: "Top qualifying teams compete at state level.", icon: Trophy, status: "upcoming" },
  { date: "Jun 20", title: "National Final", description: "Final round for the leading state performers.", icon: Flag, status: "upcoming" },
  { date: "Jun 25", title: "Awards", description: "Certificates, rankings, and recognition published.", icon: Medal, status: "upcoming" },
];

const TimelineSection = () => (
  <section className="bg-slate-50 py-16 sm:py-20 lg:py-24" id="dates">
    <div className="container px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mx-auto max-w-2xl text-center"
      >
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Competition Timeline</p>
        <h2 className="mt-3 text-3xl font-black tracking-normal text-slate-950 sm:text-4xl">Important Dates</h2>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Keep every team aligned from registration through the national finals.
        </p>
      </motion.div>

      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dates.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white">
                <item.icon className="h-5 w-5" />
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {item.status === "active" ? "Open" : "Upcoming"}
              </span>
            </div>
            <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              {item.date}
            </div>
            <h3 className="mt-2 text-lg font-bold text-slate-950">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TimelineSection;
