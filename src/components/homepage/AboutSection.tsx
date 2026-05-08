import { motion } from "framer-motion";
import { Award, BookOpen, ClipboardCheck, Globe2, ShieldCheck, Trophy } from "lucide-react";
import careImage from "@/assets/e1.jpg";

const features = [
  {
    icon: ClipboardCheck,
    title: "Verified Registration",
    description: "Hospitals submit organization, team, and evidence details through a structured approval flow.",
  },
  {
    icon: BookOpen,
    title: "Clinical Knowledge",
    description: "Question banks cover nursing practice, patient safety, infection control, pharmacology, and emergency care.",
  },
  {
    icon: Trophy,
    title: "Level-Based Competition",
    description: "Teams progress through district, state, and national rounds with transparent scoring.",
  },
  {
    icon: Award,
    title: "Recognition",
    description: "Eligible participants receive certificates and ranking visibility after results are published.",
  },
];

const qualityPoints = ["Secure login and role-based access", "Evidence capture for candidate verification", "Responsive dashboards for admins and participants"];

const AboutSection = () => (
  <section className="bg-white py-16 sm:py-20 lg:py-24" id="about">
    <div className="container px-4 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
        >
          <img src={careImage} alt="Nursing care in a clinical environment" className="h-[320px] w-full object-cover sm:h-[420px]" />
        </motion.div>

        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">About NurseQuiz</p>
            <h2 className="mt-3 text-3xl font-black tracking-normal text-slate-950 sm:text-4xl lg:text-5xl">
              Built for serious nursing teams and smooth administration.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-600">
              NurseQuiz helps institutions register teams, verify documents, conduct proctored assessments, monitor submissions, and publish outcomes with a clear operational workflow.
            </p>
          </motion.div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-950">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-3">
            {qualityPoints.map((point) => (
              <div key={point} className="flex gap-2 text-sm font-medium text-slate-700">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{point}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 font-semibold">
              <Globe2 className="h-4 w-4 text-emerald-700" />
              Pan-India participation
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 font-semibold">
              <Award className="h-4 w-4 text-emerald-700" />
              Professional recognition
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default AboutSection;
