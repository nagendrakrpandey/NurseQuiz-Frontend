import { motion } from "framer-motion";
import { BookOpen, Trophy, Globe, Shield } from "lucide-react";

const features = [
  { icon: BookOpen, title: "Knowledge Assessment", description: "Comprehensive questions covering clinical nursing, pharmacology, community health, and more." },
  { icon: Trophy, title: "Multi-Level Competition", description: "Compete at District, State, and National levels with increasing challenges." },
  { icon: Globe, title: "Pan-India Reach", description: "Open to nursing institutions and professionals across all 28 states and 8 UTs." },
  { icon: Shield, title: "Certified Recognition", description: "Earn certificates and awards recognized by leading healthcare bodies." },
];

const AboutSection = () => (
  <section className="bg-background py-12 sm:py-16 lg:py-20" id="about">
    <div className="container px-3 sm:px-4 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mx-auto mb-10 max-w-2xl text-center sm:mb-16"
      >
        <h2 className="mb-4 font-heading text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">About the Competition</h2>
        <p className="text-base text-muted-foreground sm:text-lg">
          A national initiative to promote excellence in nursing education through competitive learning and peer collaboration.
        </p>
      </motion.div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="rounded-lg bg-card p-5 card-shadow transition-shadow duration-300 hover:card-shadow-hover sm:p-6"
          >
            <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-4">
              <f.icon className="h-6 w-6 text-accent-foreground" />
            </div>
            <h3 className="font-heading font-semibold text-card-foreground mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default AboutSection;
