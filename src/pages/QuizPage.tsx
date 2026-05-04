import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Clock, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const questions = [
  { q: "What is the normal range of systolic blood pressure in adults?", options: ["90-120 mmHg", "120-140 mmHg", "140-160 mmHg", "60-90 mmHg"], correct: 0 },
  { q: "Which medication is commonly used as an antipyretic?", options: ["Metformin", "Paracetamol", "Omeprazole", "Atorvastatin"], correct: 1 },
  { q: "The Glasgow Coma Scale (GCS) measures which of the following?", options: ["Pain level", "Level of consciousness", "Blood oxygen", "Heart rhythm"], correct: 1 },
  { q: "Which type of isolation is required for a patient with tuberculosis?", options: ["Contact isolation", "Droplet isolation", "Airborne isolation", "Protective isolation"], correct: 2 },
  { q: "What is the primary purpose of the Apgar score?", options: ["Measure pain in adults", "Assess newborn health", "Evaluate stroke risk", "Determine BMI"], correct: 1 },
  { q: "Which vein is most commonly used for IV cannulation?", options: ["Jugular vein", "Femoral vein", "Cephalic vein", "Subclavian vein"], correct: 2 },
  { q: "Normal body temperature in Celsius is approximately:", options: ["35.0°C", "36.1°C", "37.0°C", "38.5°C"], correct: 2 },
  { q: "Which of the following is a sign of dehydration?", options: ["Increased urine output", "Moist mucous membranes", "Poor skin turgor", "Weight gain"], correct: 2 },
  { q: "The MMR vaccine protects against:", options: ["Measles, Mumps, Rubella", "Malaria, Meningitis, Rabies", "Measles, Malaria, Rubella", "Mumps, Meningitis, Rubella"], correct: 0 },
  { q: "What position is recommended for a patient with dyspnea?", options: ["Supine", "Prone", "Fowler's position", "Trendelenburg"], correct: 2 },
];

const QuizPage = () => {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft] = useState("24:38");

  const handleAnswer = (value: string) => {
    setAnswers({ ...answers, [current]: value });
  };

  const score = submitted
    ? Object.entries(answers).filter(([idx, val]) => val === String(questions[Number(idx)].correct)).length
    : 0;

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md rounded-xl bg-card p-6 text-center card-shadow sm:p-10">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl font-heading font-bold text-primary">{score}/{questions.length}</span>
          </div>
          <h2 className="text-2xl font-heading font-bold text-card-foreground mb-2">Quiz Completed!</h2>
          <p className="text-muted-foreground mb-6">You scored {score} out of {questions.length} questions correctly.</p>
          <div className="grid gap-3 sm:flex sm:justify-center">
            <Button variant="outline" asChild><Link to="/dashboard">Back to Dashboard</Link></Button>
            <Button asChild><Link to="/leaderboard">View Leaderboard</Link></Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="container flex min-h-14 flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <span className="font-heading font-semibold text-foreground">District Level Quiz</span>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-4">
            <Progress value={((current + 1) / questions.length) * 100} className="h-2 w-24 sm:w-32" />
            <span className="text-sm text-muted-foreground">{current + 1}/{questions.length}</span>
            <div className="flex items-center gap-1.5 bg-destructive/10 text-destructive px-3 py-1.5 rounded-full text-sm font-medium">
              <Clock className="h-4 w-4" />
              {timeLeft}
            </div>
          </div>
        </div>
      </div>

      {/* Question area */}
      <div className="flex flex-1 items-center justify-center p-3 sm:p-4">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl rounded-xl bg-card p-4 card-shadow sm:p-8"
        >
          <div className="mb-6 flex items-start gap-3 sm:mb-8 sm:gap-4">
            <span className="bg-primary text-primary-foreground text-sm font-bold w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
              {current + 1}
            </span>
            <h2 className="text-lg font-heading font-semibold text-card-foreground leading-relaxed">
              {questions[current].q}
            </h2>
          </div>

          <RadioGroup value={answers[current] || ""} onValueChange={handleAnswer} className="space-y-3">
            {questions[current].options.map((opt, i) => (
              <Label
                key={i}
                htmlFor={`opt-${i}`}
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                  answers[current] === String(i)
                    ? "border-primary bg-accent"
                    : "border-border hover:border-primary/30 hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value={String(i)} id={`opt-${i}`} />
                <span className="text-card-foreground">{opt}</span>
              </Label>
            ))}
          </RadioGroup>
        </motion.div>
      </div>

      {/* Bottom nav */}
      <div className="border-t border-border bg-card">
        <div className="container flex flex-col items-stretch gap-3 px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <Button className="sm:w-auto" variant="ghost" onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <div className="flex max-w-full justify-start gap-1.5 overflow-x-auto py-1 sm:max-w-xs">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-8 h-8 rounded-md text-xs font-medium transition-colors shrink-0 ${
                  i === current
                    ? "bg-primary text-primary-foreground"
                    : answers[i] !== undefined
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {current === questions.length - 1 ? (
            <Button onClick={() => setSubmitted(true)} className="bg-success text-success-foreground hover:bg-success/90 sm:w-auto">
              <AlertTriangle className="h-4 w-4 mr-1" /> Submit Quiz
            </Button>
          ) : (
            <Button className="sm:w-auto" onClick={() => setCurrent(Math.min(questions.length - 1, current + 1))}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
