// QuizManagementTab.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Upload, Plus, Trash2, Edit, Eye, Database, LayoutDashboard,
  Award, Trophy, Crown, Users, Calendar, Clock, TrendingUp,
  CheckCircle, XCircle, AlertCircle, Loader2, Download,
  FileJson, FileSpreadsheet, HelpCircle, Sparkles, Settings,
  Video, Camera, Shield, Monitor, UserPlus, BookOpen,
  BarChart3, Mail, Phone, Search, Filter, ChevronRight,
  Activity, Target, Zap, Star, TrendingDown, Percent,
  Briefcase, GraduationCap, FileText, Send, Gift, Heart, RefreshCw,
  X, AlertTriangle, Fingerprint, BookMarked, Link2
} from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "@/components/ui/command";

import { ChevronsUpDown } from "lucide-react";

import { BASE_URL1 } from "@/Service/api";
import { motion, AnimatePresence } from "framer-motion";

// Types
interface Question {
  id?: number;
  qb_id?: number;
  questionId?: number;
  text: string;
  options: string[];
  correctOption: number;
  explanation: string;
  marks: number;
  level: string;
  difficulty: "easy" | "medium" | "hard";
}

interface QuestionBank {
  id?: number;
  qbankId?: number;
  qbank_id?: number;
  bankName: string;
  description: string;
  level?: string;
  totalQuestions?: number;
  createdAt?: string;
}

interface Batch {
  id?: number;
  batch_id?: number;
  batchId?: number;
  batchCode?: string;
  batch_code?: string;
  level: string;
  duration: number;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  random_photo: boolean;
  random_video: boolean;
  ai_monitoring: boolean;
  tab_switch_detection: boolean;
  max_tab_switches: number;
  auto_submit_on_tab_switch: boolean;
  total_questions?: number;
  enrolled_students?: number;
  status: "upcoming" | "active" | "completed";
  created_at?: string;
  questionBankId?: number;
  question_bank_id?: number;
  qbankId?: number;
  qbank_id?: number;
  questionBank?: Partial<QuestionBank>;
  question_bank?: Partial<QuestionBank>;
}

interface Candidate {
  candidate_id?: number;
  userId?: number;
  user_id?: number;
  name: string;
  email: string;
  phone: string;
  enrollment_no: string;
  batchId: number;
  status: "enrolled" | "completed" | "pending";
  score?: number;
  joined_at?: string;
}

interface DashboardStats {
  totalBatches: number;
  activeBatches: number;
  totalCandidates: number;
  totalQuestions: number;
  totalQuestionBanks: number;
  avgScore: number;
  completionRate: number;
}

interface LevelSummary {
  batches: number;
  candidates: number;
}

interface ActiveUser {
  id: number;
  fullName: string;
  email: string;
  contact: string;
  enrollmentNumber: string;
}

const QUESTION_BANK_LEVEL_STORAGE_KEY = "questionBankLevelById";
const BATCH_QUESTION_BANK_STORAGE_KEY = "batchQuestionBankByKey";

// Alert Dialog Component
const CustomAlertDialog = ({ open, onOpenChange, title, description, onConfirm, onCancel }: any) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          {title}
        </DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex gap-2 sm:justify-end">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {onConfirm && (
          <Button onClick={onConfirm}>OK</Button>
        )}
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// Success Dialog Component
const SuccessDialog = ({ open, onOpenChange, title, description }: any) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-emerald-600">
          <CheckCircle className="h-5 w-5" />
          {title}
        </DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button onClick={() => onOpenChange(false)}>Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const QuizManagementTab = () => {
  const [activeLevel, setActiveLevel] = useState<string>("district");
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedQuestionBank, setSelectedQuestionBank] = useState<QuestionBank | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [levelSummaries, setLevelSummaries] = useState<Record<string, LevelSummary>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalBatches: 0,
    activeBatches: 0,
    totalCandidates: 0,
    totalQuestions: 0,
    totalQuestionBanks: 0,
    avgScore: 0,
    completionRate: 0
  });

  // Dialog states
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showQuestionBankDialog, setShowQuestionBankDialog] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [showBulkQuestionDialog, setShowBulkQuestionDialog] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showCandidateDialog, setShowCandidateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showCandidatesListDialog, setShowCandidatesListDialog] = useState(false);
  const [showBatchDetailsDialog, setShowBatchDetailsDialog] = useState(false);
  const [showLinkBankDialog, setShowLinkBankDialog] = useState(false);
  const [openQuestionBankSearch, setOpenQuestionBankSearch] = useState(false);

  // Alert Dialog states
  const [alertDialog, setAlertDialog] = useState({ open: false, title: "", description: "", onConfirm: null as (() => void) | null });
  const [successDialog, setSuccessDialog] = useState({ open: false, title: "", description: "" });

  // Edit states
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editingQuestionBank, setEditingQuestionBank] = useState<QuestionBank | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  // Upload states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkFileType, setBulkFileType] = useState<"csv" | "json">("csv");

  // Form data states
  const [batchFormData, setBatchFormData] = useState<Partial<Batch>>({
    batchCode: "",
    level: "district",
    duration: 0,
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    random_photo: true,
    random_video: true,
    ai_monitoring: true,
    tab_switch_detection: true,
    max_tab_switches: 3,
    auto_submit_on_tab_switch: true,
    status: "upcoming",
    questionBankId: undefined
  });

  const [questionBankFormData, setQuestionBankFormData] = useState<Partial<QuestionBank>>({
    bankName: "",
    description: "",
    level: "district"
  });

  const [questionFormData, setQuestionFormData] = useState<Question>({
    text: "",
    options: ["", "", "", ""],
    correctOption: 0,
    explanation: "",
    marks: 1,
    level: "district",
    difficulty: "medium"
  });

  const [candidateFormData, setCandidateFormData] = useState({
    userId: "",
    name: "",
    email: "",
    phone: "",
    enrollment_no: ""
  });

  const [bulkCandidateFile, setBulkCandidateFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatchDetails, setSelectedBatchDetails] = useState<Batch | null>(null);

  // Quiz Levels Configuration
  const quizLevels = [
    {
      qb_id: "district",
      name: "District Level",
      icon: Award,
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "#667eea",
      description: "Foundation & Core Competencies",
    },
    {
      qb_id: "state",
      name: "State Level",
      icon: Trophy,
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      color: "#f5576c",
      description: "Advanced Professional Skills",
    },
    {
      qb_id: "national",
      name: "Regional Level",
      icon: Crown,
      gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      color: "#fa709a",
      description: "Expert Leadership Track",
    }
  ];

  // Helper function to show alert dialog
  const showAlert = (title: string, description: string, onConfirm?: () => void) => {
    setAlertDialog({ open: true, title, description, onConfirm: onConfirm || null });
  };

  const showSuccess = (title: string, description: string) => {
    setSuccessDialog({ open: true, title, description });
  };

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem("token")?.replace(/^Bearer\s+/i, "").trim();

    return token
      ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      : { "Content-Type": "application/json" };
  };

  const readFieldByAliases = (value: Record<string, any>, aliases: string[]) => {
    const normalizedAliases = aliases.map((alias) => alias.replace(/[_\-\s]/g, "").toLowerCase());
    const entry = Object.entries(value).find(([key]) =>
      normalizedAliases.includes(key.replace(/[_\-\s]/g, "").toLowerCase())
    );

    return entry?.[1];
  };

  const readNumberByAliases = (value: Record<string, any>, aliases: string[]) => {
    const parsed = Number(readFieldByAliases(value, aliases));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  };

  const unwrapApiData = (payload: any) => {
    if (!payload || typeof payload !== "object") return payload;
    return payload.data ?? payload.result ?? payload.users ?? payload.items ?? payload.content ?? payload;
  };

  const parseJsonResponse = async (response: Response) => {
    const text = await response.text();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return { success: response.ok, message: text };
    }
  };

  const fetchApiJson = async (url: string) => {
    const response = await fetch(url, { headers: getAuthHeaders() });
    const result = await parseJsonResponse(response);

    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || `Request failed with status ${response.status}`);
    }

    return result;
  };

  const normalizeActiveUser = (value: Record<string, any>): ActiveUser | null => {
    const nestedSources = ["user", "authUser", "organizationUser", "registrationUser", "candidate", "teamMember"]
      .map((key) => (value[key] && typeof value[key] === "object" ? value[key] as Record<string, any> : null))
      .filter(Boolean) as Record<string, any>[];

    const nestedUser = nestedSources[0] || {};
    const id =
      readNumberByAliases(nestedUser, ["id", "userId", "user_id"]) ||
      readNumberByAliases(value, [
        "userId",
        "user_id",
        "orgUserId",
        "organizationUserId",
        "registrationUserId",
        "id",
      ]);

    const email = String(
      readFieldByAliases(nestedUser, ["email", "userEmail"]) ||
      readFieldByAliases(value, ["email", "userEmail", "orgEmail", "organizationEmail", "contactEmail"]) ||
      ""
    ).trim();

    if (!id || !email) return null;

    return {
      id,
      fullName: String(
        readFieldByAliases(nestedUser, ["fullName", "name"]) ||
        readFieldByAliases(value, ["fullName", "name", "organizationName"]) ||
        email
      ).trim(),
      email,
      contact: String(
        readFieldByAliases(nestedUser, ["contact", "phone", "mobile"]) ||
        readFieldByAliases(value, ["contact", "phone", "mobile", "orgPhone"]) ||
        ""
      ).trim(),
      enrollmentNumber: String(
        readFieldByAliases(value, ["enrollmentNumber", "enrollment_no", "enrollmentNo"]) ||
        readFieldByAliases(nestedUser, ["enrollmentNumber", "enrollment_no", "enrollmentNo"]) ||
        ""
      ).trim(),
    };
  };

  const collectActiveUsers = (value: unknown, usersByKey: Map<string, ActiveUser>) => {
    if (Array.isArray(value)) {
      value.forEach((item) => collectActiveUsers(item, usersByKey));
      return;
    }

    if (!value || typeof value !== "object") return;

    const record = value as Record<string, any>;
    const user = normalizeActiveUser(record);

    if (user) {
      const key = user.id ? `id:${user.id}` : `email:${user.email.toLowerCase()}`;
      if (!usersByKey.has(key)) usersByKey.set(key, user);
    }

    Object.values(record).forEach((item) => {
      if (item && typeof item === "object") collectActiveUsers(item, usersByKey);
    });
  };

  const extractActiveUsers = (payload: unknown) => {
    const usersByKey = new Map<string, ActiveUser>();
    collectActiveUsers(unwrapApiData(payload), usersByKey);

    return Array.from(usersByKey.values()).sort((a, b) =>
      (a.fullName || a.email).localeCompare(b.fullName || b.email)
    );
  };

  const normalizeLevelValue = (value?: string | null) => {
    const normalized = String(value || "").trim().toLowerCase();

    if (normalized.includes("district")) return "district";
    if (normalized.includes("state")) return "state";
    if (normalized.includes("regional") || normalized.includes("region")) return "national";
    if (normalized.includes("national")) return "national";

    return "";
  };

  const readQuestionBankLevelMap = (): Record<string, string> => {
    try {
      const raw = localStorage.getItem(QUESTION_BANK_LEVEL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const rememberQuestionBankLevel = (bankId: number | null | undefined, level: string) => {
    if (!bankId) return;

    const normalizedLevel = normalizeLevelValue(level);
    if (!normalizedLevel) return;

    const levelMap = readQuestionBankLevelMap();
    localStorage.setItem(
      QUESTION_BANK_LEVEL_STORAGE_KEY,
      JSON.stringify({ ...levelMap, [String(bankId)]: normalizedLevel })
    );
  };

  const getQuestionBankLevel = (bank?: Partial<QuestionBank> | null) =>
    normalizeLevelValue(bank?.level);

  const isQuestionBankInActiveLevel = (bank: QuestionBank) =>
    getQuestionBankLevel(bank) === activeLevel;

  const getActiveQuestionBankStats = (banks: QuestionBank[]) => {
    const levelBanks = banks.filter((bank) => getQuestionBankLevel(bank) === activeLevel);

    return {
      totalQuestionBanks: levelBanks.length,
      totalQuestions: levelBanks.reduce(
        (sum: number, bank: QuestionBank) => sum + (bank.totalQuestions || 0),
        0
      ),
    };
  };


  const getQuestionBankId = (bank?: QuestionBank | null): number | null => {
    if (!bank) return null;
    return readNumberByAliases(bank as Record<string, any>, ["qbankId", "qbank_id", "questionBankId", "id"]) || null;
  };

  const getQuestionId = (question?: Question | null): number | null => {
    if (!question) return null;
    return readNumberByAliases(question as Record<string, any>, ["questionId", "question_id", "id", "qb_id"]) || null;
  };

  const getBatchCode = (batch?: Batch | null): string => {
    if (!batch) return "";
    return batch.batchCode || batch.batch_code || `BATCH_${batch.batch_id || ""}`;
  };

  const getBatchId = (batch?: Batch | null): number | null => {
    if (!batch) return null;
    return readNumberByAliases(batch as Record<string, any>, ["batch_id", "batchId", "id"]) || null;
  };

  const readBatchQuestionBankMap = (): Record<string, number> => {
    try {
      const raw = localStorage.getItem(BATCH_QUESTION_BANK_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const getBatchStorageKeys = (batch?: Partial<Batch> | null) => {
    if (!batch) return [];
    const batchRecord = batch as Record<string, any>;
    const batchId = readNumberByAliases(batchRecord, ["batch_id", "batchId", "id"]);
    const batchCode = String(batchRecord.batchCode || batchRecord.batch_code || batchRecord.code || "").trim();

    return [
      batchId ? `id:${batchId}` : "",
      batchCode ? `code:${batchCode.toLowerCase()}` : "",
    ].filter(Boolean);
  };

  const rememberBatchQuestionBank = (batch: Partial<Batch>, qbankId?: number | null) => {
    if (!qbankId) return;
    const keys = getBatchStorageKeys(batch);
    if (keys.length === 0) return;

    const currentMap = readBatchQuestionBankMap();
    const nextMap = keys.reduce(
      (map, key) => ({ ...map, [key]: qbankId }),
      currentMap
    );
    localStorage.setItem(BATCH_QUESTION_BANK_STORAGE_KEY, JSON.stringify(nextMap));
  };

  const getRememberedBatchQuestionBankId = (batch?: Partial<Batch> | null) => {
    const levelMap = readBatchQuestionBankMap();
    const matchedKey = getBatchStorageKeys(batch).find((key) => levelMap[key]);
    return matchedKey ? Number(levelMap[matchedKey]) || null : null;
  };

  const getBatchQuestionBankId = (batch?: Partial<Batch> | null): number | null => {
    if (!batch) return null;
    const batchRecord = batch as Record<string, any>;
    const nestedQuestionBank =
      (batchRecord.questionBank && typeof batchRecord.questionBank === "object" ? batchRecord.questionBank as Record<string, any> : null) ||
      (batchRecord.question_bank && typeof batchRecord.question_bank === "object" ? batchRecord.question_bank as Record<string, any> : null);

    const bankId =
      readNumberByAliases(batchRecord, [
        "questionBankId",
        "question_bank_id",
        "questionbankid",
        "qbankId",
        "qbank_id",
        "qbid",
      ]) ||
      (nestedQuestionBank
        ? readNumberByAliases(nestedQuestionBank, ["qbankId", "qbank_id", "questionBankId", "id"])
        : undefined);

    return bankId || getRememberedBatchQuestionBankId(batch) || null;
  };

  const getQuestionBankLinkFields = (qbankId?: number | null) =>
    qbankId
      ? {
          questionBankId: qbankId,
          question_bank_id: qbankId,
          qbankId,
          qbank_id: qbankId,
        }
      : {};

  const getBatchForCandidatePayload = (batchId: number) =>
    batches.find((batch) => Number(getBatchId(batch)) === Number(batchId)) ||
    (selectedBatchDetails && Number(getBatchId(selectedBatchDetails)) === Number(batchId)
      ? selectedBatchDetails
      : null) ||
    (selectedBatch && Number(getBatchId(selectedBatch)) === Number(batchId)
      ? selectedBatch
      : null);

  const normalizeQuestion = (q: any): Question => ({
    id: readNumberByAliases(q, ["id", "questionId", "question_id", "qb_id"]),
    qb_id: q.qb_id,
    questionId: readNumberByAliases(q, ["questionId", "question_id", "id", "qb_id"]),
    text: q.text || q.question || q.questionText || "",
    options: Array.isArray(q.options)
      ? q.options
      : [
        q.optionA || "",
        q.optionB || "",
        q.optionC || "",
        q.optionD || ""
      ],
    correctOption: Number(q.correctOption ?? q.correct_option ?? q.correctAnswer ?? q.correct_answer) || 0,
    explanation: q.explanation || "",
    marks: Number(q.marks) || 1,
    level: q.level || activeLevel,
    difficulty: ["easy", "medium", "hard"].includes(q.difficulty)
      ? q.difficulty
      : "medium"
  });

  const getTimeFromDateTime = (dateTime?: string | null) => {
    if (!dateTime) return "";
    const parsed = new Date(dateTime);
    if (!Number.isNaN(parsed.getTime())) return parsed.toTimeString().slice(0, 5);

    const match = String(dateTime).match(/T(\d{2}:\d{2})|[ ](\d{2}:\d{2})/);
    return match?.[1] || match?.[2] || "";
  };

  const normalizeBatch = (b: any): Batch => {
    const batchId = Number(b.batch_id ?? b.batchId ?? b.id) || undefined;
    const bankId = getBatchQuestionBankId(b) || undefined;
    const startDate = b.start_date || b.startDate || "";
    const endDate = b.end_date || b.endDate || "";

    return {
      ...b,
      id: Number(b.id ?? batchId) || undefined,
      batch_id: batchId,
      batchId: batchId,
      batchCode: b.batchCode || b.batch_code || b.code || `BATCH_${batchId || ""}`,
      batch_code: b.batch_code || b.batchCode || b.code || `BATCH_${batchId || ""}`,
      level: normalizeLevelValue(b.level) || activeLevel,
      start_date: startDate,
      start_time: b.start_time || b.startTime || getTimeFromDateTime(startDate),
      end_date: endDate,
      end_time: b.end_time || b.endTime || getTimeFromDateTime(endDate),
      total_questions: Number(b.total_questions ?? b.totalQuestions ?? b.questionCount ?? b.questionsCount) || 0,
      enrolled_students: Number(b.enrolled_students ?? b.enrolledStudents ?? b.candidateCount ?? b.candidatesCount) || 0,
      status: b.status || "upcoming",
      questionBankId: bankId,
      question_bank_id: bankId,
      qbankId: bankId,
      qbank_id: bankId,
      auto_submit_on_tab_switch: b.auto_submit_on_tab_switch ?? b.autoSubmitOnTabSwitch ?? false
    };
  };



  // ==================== API CALLS ====================

  // Question Bank APIs
  const fetchQuestionBanks = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL1}/questionBank/get-all`, { headers: getAuthHeaders() });
      const result = await parseJsonResponse(response);
      console.log("Question Banks API Response:", result);

      if (!response.ok) {
        throw new Error(result?.message || `HTTP error! status: ${response.status}`);
      }

      if (result?.success !== false) {
        const banks = Array.isArray(unwrapApiData(result)) ? unwrapApiData(result) : [];
        const levelMap = readQuestionBankLevelMap();

        const normalizedBanks: QuestionBank[] = banks.map((bank: any) => {
          const bankId = Number(bank.qbankId ?? bank.qbank_id ?? bank.id ?? bank.questionBankId);
          const previousBank = questionBanks.find((item) => getQuestionBankId(item) === Number(bankId));
          const bankName = bank.bankName || bank.name || "";
          const resolvedLevel =
            normalizeLevelValue(
              bank.level ||
              bank.qbLevel ||
              bank.qb_level ||
              bank.qbankLevel ||
              bank.qbank_level ||
              bank.questionBankLevel ||
              bank.question_bank_level ||
              bank.levelName ||
              bank.level_name ||
              bank.examLevel ||
              bank.exam_level
            ) ||
            normalizeLevelValue(previousBank?.level) ||
            normalizeLevelValue(levelMap[String(bankId)]) ||
            normalizeLevelValue(bankName) ||
            activeLevel;

          rememberQuestionBankLevel(bankId, resolvedLevel);

          return {
            qbankId: bankId,
            qbank_id: bankId,
            id: bankId,
            bankName,
            description: bank.description || "",
            level: resolvedLevel,
            totalQuestions: bank.totalQuestions || bank.total_questions || bank.questionCount || bank.questionsCount || 0,
            createdAt: bank.createdAt || bank.created_at || ""
          };
        });

        const banksWithQuestionCounts = await Promise.all(
          normalizedBanks.map(async (bank) => {
            const bankId = getQuestionBankId(bank);
            if (!bankId) return bank;

            try {
              const questionsResponse = await fetch(`${BASE_URL1}/questions/bank/${bankId}`, { headers: getAuthHeaders() });
              const questionsResult = await parseJsonResponse(questionsResponse);

              if (!questionsResponse.ok || questionsResult?.success === false) return bank;

              const questionCount = Number.isFinite(Number(questionsResult.count))
                ? Number(questionsResult.count)
                : Array.isArray(unwrapApiData(questionsResult))
                  ? unwrapApiData(questionsResult).length
                  : bank.totalQuestions || 0;

              return {
                ...bank,
                totalQuestions: questionCount,
              };
            } catch (countError) {
              console.warn(`Failed to load question count for bank ${bankId}:`, countError);
              return bank;
            }
          })
        );

        setQuestionBanks(banksWithQuestionCounts);
        setSelectedQuestionBank((currentBank) => {
          const currentBankId = getQuestionBankId(currentBank);
          if (!currentBankId) return currentBank;

          const refreshedBank = banksWithQuestionCounts.find((bank) => getQuestionBankId(bank) === currentBankId);
          return refreshedBank && isQuestionBankInActiveLevel(refreshedBank) ? refreshedBank : null;
        });

        const activeBankStats = getActiveQuestionBankStats(banksWithQuestionCounts);

        setStats(prev => ({
          ...prev,
          ...activeBankStats,
        }));
      } else {
        throw new Error(result?.message || "Failed to fetch question banks");
      }
    } catch (err: any) {
      console.error("Error fetching question banks:", err);
      setError(err.message || "Failed to fetch question banks");
      setQuestionBanks([]);
    } finally {
      setLoading(false);
    }
  };
  const createQuestionBank = async (bank: Partial<QuestionBank>) => {
    try {
      const response = await fetch(`${BASE_URL1}/questionBank/create`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(bank),
      });
      const result = await parseJsonResponse(response);
      if (!response.ok || result?.success === false) throw new Error(result?.message || `HTTP error! status: ${response.status}`);
      if (result?.success !== false) {
        const savedBank = unwrapApiData(result) || {};
        const savedBankId = savedBank.qbankId ?? savedBank.qbank_id ?? savedBank.id;
        rememberQuestionBankLevel(Number(savedBankId), bank.level || activeLevel);
        await fetchQuestionBanks();
        return savedBank;
      }
      return null;
    } catch (err) {
      console.error("Error creating question bank:", err);
      setError("Failed to create question bank");
      return null;
    }
  };

  const updateQuestionBank = async (id: number, bank: Partial<QuestionBank>) => {
    try {
      const response = await fetch(`${BASE_URL1}/questionBank/update/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(bank),
      });
      const result = await parseJsonResponse(response);
      if (!response.ok || result?.success === false) throw new Error(result?.message || `HTTP error! status: ${response.status}`);
      if (result?.success !== false) {
        rememberQuestionBankLevel(id, bank.level || activeLevel);
        await fetchQuestionBanks();
        return unwrapApiData(result);
      }
      return null;
    } catch (err) {
      console.error("Error updating question bank:", err);
      setError("Failed to update question bank");
      return null;
    }
  };

  const deleteQuestionBank = async (id: number) => {
    try {
      const response = await fetch(`${BASE_URL1}/questionBank/delete/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const result = await parseJsonResponse(response);
      if (!response.ok || result?.success === false) throw new Error(result?.message || `HTTP error! status: ${response.status}`);
      if (result?.success !== false) {
        await fetchQuestionBanks();
        if (getQuestionBankId(selectedQuestionBank) === id) {
          setSelectedQuestionBank(null);
          setQuestions([]);
        }
        showSuccess("Success", "Question bank deleted successfully!");
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error deleting question bank:", err);
      setError("Failed to delete question bank");
      return false;
    }
  };

  // Questions APIs (using the correct endpoints)
  const fetchQuestionsByBank = async (qbankId: number) => {
    if (!qbankId) {
      setQuestions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${BASE_URL1}/questions/bank/${qbankId}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      const result = await parseJsonResponse(response);

      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || `HTTP error! status: ${response.status}`);
      }

      if (result?.success !== false) {
        const data = unwrapApiData(result);
        setQuestions((Array.isArray(data) ? data : []).map(normalizeQuestion));
      } else {
        throw new Error(result?.message || "API returned success = false");
      }

    } catch (err: any) {
      console.error("Error fetching questions:", err.message);
      setError(err.message || "Failed to fetch questions");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionsByBankAndBatch = async (qbankId: number, batchId: number) => {
    if (!qbankId || !batchId) {
      setQuestions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${BASE_URL1}/questions/bank/${qbankId}/batch/${batchId}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      const result = await parseJsonResponse(response).catch(() => null);

      if (response.ok && result?.success !== false) {
        const batchData = unwrapApiData(result);
        const batchQuestions = Array.isArray(batchData)
          ? batchData.map(normalizeQuestion)
          : [];

        if (batchQuestions.length > 0) {
          setQuestions(batchQuestions);
          return;
        }

        const bankOnlyResponse = await fetch(`${BASE_URL1}/questions/bank/${qbankId}`, { headers: getAuthHeaders() });
        const bankOnlyResult = await parseJsonResponse(bankOnlyResponse);

        if (!bankOnlyResponse.ok || bankOnlyResult?.success === false) {
          throw new Error(bankOnlyResult?.message || "Failed to fetch question bank questions");
        }

        const bankOnlyData = unwrapApiData(bankOnlyResult);
        setQuestions(Array.isArray(bankOnlyData) ? bankOnlyData.map(normalizeQuestion) : []);
      } else {
        const bankOnlyResponse = await fetch(`${BASE_URL1}/questions/bank/${qbankId}`, { headers: getAuthHeaders() });
        const bankOnlyResult = await parseJsonResponse(bankOnlyResponse);

        if (!bankOnlyResponse.ok || bankOnlyResult?.success === false) {
          throw new Error(bankOnlyResult?.message || result?.message || "Failed to fetch questions");
        }

        const bankOnlyData = unwrapApiData(bankOnlyResult);
        setQuestions(Array.isArray(bankOnlyData) ? bankOnlyData.map(normalizeQuestion) : []);
      }

    } catch (err: any) {
      console.error("Error fetching questions:", err.message);
      setError(err.message || "Failed to fetch questions");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveUsers = async () => {
    const userEndpoints = [
      `${BASE_URL1}/auth/active-users`,
      `${BASE_URL1}/auth/users`,
      `${BASE_URL1}/register/get/all`,
    ];
    let lastError = "No users found";

    try {
      for (const url of userEndpoints) {
        try {
          const result = await fetchApiJson(url);
          const users = extractActiveUsers(result);

          if (users.length > 0) {
            setActiveUsers(users);
            setError(null);
            return;
          }

          lastError = "No active users returned from API";
        } catch (endpointError: any) {
          lastError = endpointError?.message || lastError;
        }
      }

      setActiveUsers([]);
      setError(lastError);
    } catch (err: any) {
      console.error("Error fetching active users:", err);
      setError(err.message || "Failed to fetch active users");
      setActiveUsers([]);
    }
  };

  const fetchBatches = async (level: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL1}/batches?level=${encodeURIComponent(level)}`, { headers: getAuthHeaders() });
      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.message || `HTTP error! status: ${response.status}`);
      }

      if (result?.success !== false) {
        const data = unwrapApiData(result);
        const normalizedBatches: Batch[] = (Array.isArray(data) ? data : []).map(normalizeBatch);

        setBatches(normalizedBatches);
        updateStats(normalizedBatches);
      } else {
        throw new Error(result?.message || "Failed to fetch batches");
      }
    } catch (err: any) {
      console.error("Error fetching batches:", err);
      setError(err.message || "Failed to fetch batches");
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLevelSummaries = async () => {
    try {
      const summaries = await Promise.all(
        quizLevels.map(async (level) => {
          try {
            const response = await fetch(`${BASE_URL1}/batches?level=${encodeURIComponent(level.qb_id)}`, { headers: getAuthHeaders() });
            const result = await parseJsonResponse(response);

            if (!response.ok || result?.success === false) {
              return [level.qb_id, { batches: 0, candidates: 0 }] as const;
            }

            const data = unwrapApiData(result);
            const levelBatches: Batch[] = (Array.isArray(data) ? data : []).map(normalizeBatch);

            return [
              level.qb_id,
              {
                batches: levelBatches.length,
                candidates: levelBatches.reduce(
                  (sum: number, batch: Batch) => sum + (batch.enrolled_students || 0),
                  0
                ),
              },
            ] as const;
          } catch (summaryError) {
            console.warn(`Failed to load ${level.qb_id} summary:`, summaryError);
            return [level.qb_id, { batches: 0, candidates: 0 }] as const;
          }
        })
      );

      setLevelSummaries(Object.fromEntries(summaries));
    } catch (summaryError) {
      console.warn("Failed to load level summaries:", summaryError);
    }
  };

  const fetchCandidates = async (batchId: number) => {
    if (!batchId) return;

    try {
      const response = await fetch(`${BASE_URL1}/candidates?batchId=${encodeURIComponent(batchId)}`, { headers: getAuthHeaders() });
      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.message || `HTTP error! status: ${response.status}`);
      }

      if (result?.success !== false) {
        const data = unwrapApiData(result);
        setCandidates(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      console.error("Error fetching candidates:", err);
      setError(err.message || "Failed to fetch candidates");
      setCandidates([]);
    }
  };

  const checkCandidateExists = async (
    email: string,
    enrollment_no: string,
    batchId: number
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL1}/candidates?batchId=${encodeURIComponent(batchId)}`, { headers: getAuthHeaders() });

      if (!response.ok) return false;

      const result = await parseJsonResponse(response);

      const data = unwrapApiData(result);
      if (result?.success !== false && Array.isArray(data)) {
        return data.some(
          (c: Candidate) =>
            c.email?.toLowerCase() === email?.toLowerCase() ||
            (c.enrollment_no && c.enrollment_no === enrollment_no)
        );
      }

      return false;
    } catch (err) {
      console.error("Error checking candidate existence:", err);
      return false;
    }
  };

  const buildBatchPayload = (batch: Partial<Batch>) => {
    const qbankId = getBatchQuestionBankId(batch);
    const payload: any = {
      ...batch,
      level: normalizeLevelValue(batch.level) || activeLevel,
      batchCode: batch.batchCode || batch.batch_code,
      batch_code: batch.batch_code || batch.batchCode,
    };

    if (qbankId) {
      payload.questionBankId = qbankId;
      payload.question_bank_id = qbankId;
      payload.qbankId = qbankId;
      payload.qbank_id = qbankId;
    }

    return payload;
  };

  const saveBatchQuestionBankLink = async (
    batchId: number,
    qbankId: number,
    batchOverride?: Partial<Batch>
  ) => {
    const currentBatch =
      batchOverride ||
      batches.find((batch) => Number(getBatchId(batch)) === Number(batchId)) ||
      selectedBatch ||
      {};

    const payload = buildBatchPayload({
      ...currentBatch,
      questionBankId: qbankId,
      question_bank_id: qbankId,
      qbankId,
      qbank_id: qbankId,
    });

    const response = await fetch(`${BASE_URL1}/batches/${batchId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const result = await parseJsonResponse(response);

    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || `HTTP error! status: ${response.status}`);
    }

    rememberBatchQuestionBank(payload, qbankId);
    return true;
  };

  const createBatch = async (batch: Partial<Batch>) => {
    try {
      const payload = buildBatchPayload(batch);
      const response = await fetch(`${BASE_URL1}/batches`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const result = await parseJsonResponse(response);
      if (!response.ok || result?.success === false) throw new Error(result?.message || `HTTP error! status: ${response.status}`);
      if (result?.success !== false) {
        const savedBatchData = unwrapApiData(result);
        const savedBatch = normalizeBatch(Array.isArray(savedBatchData) ? savedBatchData[0] || {} : savedBatchData || {});
        const savedBatchId = getBatchId(savedBatch);
        const selectedBankId = getBatchQuestionBankId(payload);

        if (selectedBankId) {
          rememberBatchQuestionBank(savedBatchId ? { ...payload, batch_id: savedBatchId } : payload, selectedBankId);
        }

        if (savedBatchId && selectedBankId) {
          rememberBatchQuestionBank({ ...payload, batch_id: savedBatchId }, selectedBankId);
          try {
            await saveBatchQuestionBankLink(savedBatchId, selectedBankId, {
              ...payload,
              batch_id: savedBatchId,
            });
          } catch (linkError) {
            console.warn("Batch created, but question bank link refresh failed:", linkError);
            setError("Batch created, but question bank link could not be confirmed.");
          }
        }

        await fetchBatches(activeLevel);
        await fetchLevelSummaries();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error creating batch:", err);
      setError("Failed to create batch");
      return false;
    }
  };

  const updateBatch = async (batchId: number, batch: Partial<Batch>) => {
    try {
      const payload = buildBatchPayload(batch);
      const response = await fetch(`${BASE_URL1}/batches/${batchId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const result = await parseJsonResponse(response);
      if (!response.ok || result?.success === false) throw new Error(result?.message || `HTTP error! status: ${response.status}`);
      if (result?.success !== false) {
        const qbankId = getBatchQuestionBankId(payload);
        if (qbankId) {
          rememberBatchQuestionBank({ ...payload, batch_id: batchId, batchId }, qbankId);
        }
        await fetchBatches(activeLevel);
        await fetchLevelSummaries();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error updating batch:", err);
      setError("Failed to update batch");
      return false;
    }
  };

  const deleteBatch = async (batchId: number) => {
    try {
      const response = await fetch(`${BASE_URL1}/batches/${batchId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const result = await parseJsonResponse(response);
      if (!response.ok || result?.success === false) throw new Error(result?.message || `HTTP error! status: ${response.status}`);
      if (result?.success !== false) {
        await fetchBatches(activeLevel);
        await fetchLevelSummaries();
        if (getBatchId(selectedBatch) === batchId) {
          setSelectedBatch(null);
          setQuestions([]);
        }
        showSuccess("Success", "Batch deleted successfully!");
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error deleting batch:", err);
      setError("Failed to delete batch");
      return false;
    }
  };

  const addQuestion = async (qbankId: number, question: Question) => {
    try {
      const response = await fetch(`${BASE_URL1}/questions/add/bank/${qbankId}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(question),
      });
      const result = await parseJsonResponse(response);
      if (!response.ok || result?.success === false) throw new Error(result?.message || `HTTP error! status: ${response.status}`);
      if (result?.success !== false) {
        if (selectedQuestionBank) {
          const selectedBankId = getQuestionBankId(selectedQuestionBank);
          setSelectedBatch(null);
          if (selectedBankId) {
            await fetchQuestionsByBank(selectedBankId);
          }
        }
        // Update question bank count
        await fetchQuestionBanks();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error adding question:", err);
      setError("Failed to add question");
      return false;
    }
  };

  const updateQuestion = async (questionId: number, qbankId: number, batchId: number | null, question: Question) => {
    try {
      const updateUrls = [
        batchId ? `${BASE_URL1}/questions/${questionId}/bank/${qbankId}/batch/${batchId}` : null,
        `${BASE_URL1}/questions/${questionId}/bank/${qbankId}`,
        `${BASE_URL1}/questions/${questionId}`,
      ].filter(Boolean) as string[];

      let updated = false;
      let lastError = "Failed to update question";

      for (const url of updateUrls) {
        const response = await fetch(url, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(question),
        });
        const result = await parseJsonResponse(response);

        if (response.ok && result?.success !== false) {
          updated = true;
          break;
        }

        lastError = result?.message || `HTTP error! status: ${response.status}`;
      }

      if (updated) {
        const currentBatchId = getBatchId(selectedBatch);
        if (selectedQuestionBank && currentBatchId) {
          const selectedBankId = getQuestionBankId(selectedQuestionBank);
          if (selectedBankId) {
            await fetchQuestionsByBankAndBatch(selectedBankId, currentBatchId);
          }
        } else if (selectedQuestionBank) {
          const selectedBankId = getQuestionBankId(selectedQuestionBank);
          if (selectedBankId) {
            await fetchQuestionsByBank(selectedBankId);
          }
        }
        return true;
      }

      throw new Error(lastError);
    } catch (err) {
      console.error("Error updating question:", err);
      setError("Failed to update question");
      return false;
    }
  };

  const deleteQuestion = async (questionId: number) => {
    try {
      const response = await fetch(`${BASE_URL1}/questions/${questionId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const result = await parseJsonResponse(response);
      if (!response.ok || result?.success === false) throw new Error(result?.message || `HTTP error! status: ${response.status}`);
      if (result?.success !== false) {
        const currentBatchId = getBatchId(selectedBatch);
        if (selectedQuestionBank && currentBatchId) {
          const selectedBankId = getQuestionBankId(selectedQuestionBank);
          if (selectedBankId) {
            await fetchQuestionsByBankAndBatch(selectedBankId, currentBatchId);
          }
        } else if (selectedQuestionBank) {
          const selectedBankId = getQuestionBankId(selectedQuestionBank);
          if (selectedBankId) {
            await fetchQuestionsByBank(selectedBankId);
          }
        }
        await fetchQuestionBanks(); // Update bank counts
        showSuccess("Success", "Question deleted successfully!");
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error deleting question:", err);
      setError("Failed to delete question");
      return false;
    }
  };

  const bulkUploadQuestions = async (questions: Question[], qbankId: number) => {
    try {
      const response = await fetch(`${BASE_URL1}/questions/bulk/bank/${qbankId}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(questions),
      });
      const result = await parseJsonResponse(response);
      if (!response.ok || result?.success === false) throw new Error(result?.message || `HTTP error! status: ${response.status}`);
      if (result?.success !== false) {
        if (selectedQuestionBank) {
          const selectedBankId = getQuestionBankId(selectedQuestionBank);
          setSelectedBatch(null);
          if (selectedBankId) {
            await fetchQuestionsByBank(selectedBankId);
          }
        }
        await fetchQuestionBanks(); // Update bank counts
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error bulk uploading questions:", err);
      setError("Failed to bulk upload questions");
      return false;
    }
  };

  const enrollCandidate = async (candidate: any, batchId: number) => {
    if (!batchId) {
      showAlert("Validation Error", "Please select a batch first");
      return false;
    }

    const exists = await checkCandidateExists(
      candidate.email,
      candidate.enrollment_no,
      batchId
    );

    if (exists) {
      showAlert(
        "Duplicate Candidate",
        "Candidate with this email or enrollment number already exists in this batch!"
      );
      return false;
    }

    try {
      const linkedBatch = getBatchForCandidatePayload(batchId);
      const linkedQuestionBankId = getBatchQuestionBankId(linkedBatch);
      const questionBankFields = getQuestionBankLinkFields(linkedQuestionBankId);

      if (linkedBatch && linkedQuestionBankId) {
        rememberBatchQuestionBank(linkedBatch, linkedQuestionBankId);
      }

      const response = await fetch(`${BASE_URL1}/candidates`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...(Number(candidate.userId) ? { userId: Number(candidate.userId) } : {}),
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          enrollment_no: candidate.enrollment_no,
          batchId: batchId,
          ...questionBankFields
        })
      });

      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.message || `HTTP error! status: ${response.status}`);
      }

      if (result?.success !== false) {
        await fetchCandidates(batchId);
        await fetchBatches(activeLevel);
        await fetchLevelSummaries();
        return true;
      }

      showAlert("Error", result?.message || "Failed to enroll candidate");
      return false;
    } catch (err: any) {
      console.error("Error enrolling candidate:", err);
      setError(err.message || "Failed to enroll candidate");
      return false;
    }
  };

  const bulkEnrollCandidates = async (candidates: any[], batchId: number) => {
    if (!batchId) {
      showAlert("Validation Error", "Please select a batch first");
      return false;
    }

    const uniqueCandidates: any[] = [];
    const emailSet = new Set();
    const enrollmentSet = new Set();
    let duplicateCount = 0;

    for (const candidate of candidates) {
      if (
        emailSet.has(candidate.email?.toLowerCase()) ||
        (candidate.enrollment_no && enrollmentSet.has(candidate.enrollment_no))
      ) {
        duplicateCount++;
        continue;
      }

      emailSet.add(candidate.email?.toLowerCase());

      if (candidate.enrollment_no) {
        enrollmentSet.add(candidate.enrollment_no);
      }

      uniqueCandidates.push(candidate);
    }

    if (duplicateCount > 0) {
      showAlert(
        "Duplicate Found",
        `${duplicateCount} duplicate entries found within the file and were skipped.`
      );
    }

    if (uniqueCandidates.length === 0) {
      showAlert("No Candidates", "No unique candidates to enroll");
      return false;
    }

    try {
      const linkedBatch = getBatchForCandidatePayload(batchId);
      const linkedQuestionBankId = getBatchQuestionBankId(linkedBatch);
      const questionBankFields = getQuestionBankLinkFields(linkedQuestionBankId);

      if (linkedBatch && linkedQuestionBankId) {
        rememberBatchQuestionBank(linkedBatch, linkedQuestionBankId);
      }

      const response = await fetch(`${BASE_URL1}/candidates/bulk`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          batchId: batchId,
          ...questionBankFields,
          candidates: uniqueCandidates.map((candidate) => ({
            ...candidate,
            ...questionBankFields,
          }))
        })
      });

      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result?.message || `HTTP error! status: ${response.status}`);
      }

      if (result?.success !== false) {
        await fetchCandidates(batchId);
        await fetchBatches(activeLevel);
        await fetchLevelSummaries();
        showSuccess("Success", `${uniqueCandidates.length} candidates enrolled successfully!`);
        return true;
      }

      showAlert("Error", result?.message || "Failed to bulk enroll candidates");
      return false;
    } catch (err: any) {
      console.error("Error bulk enrolling candidates:", err);
      setError(err.message || "Failed to bulk enroll candidates");
      return false;
    }
  };

  const updateStats = (batchData: Batch[]) => {
    const totalCandidates = batchData.reduce((sum, b) => sum + (b.enrolled_students || 0), 0);
    const activeBatches = batchData.filter(b => b.status === "active").length;
    setStats(prev => ({
      ...prev,
      totalBatches: batchData.length,
      activeBatches: activeBatches,
      totalCandidates: totalCandidates,
    }));
  };

  const linkBatchToQuestionBank = async (batchId: number, qbankId: number) => {
    try {
      const saved = await saveBatchQuestionBankLink(batchId, qbankId);
      if (saved) {
        setBatches((prev) =>
          prev.map((batch) =>
            Number(getBatchId(batch)) === Number(batchId)
              ? { ...batch, questionBankId: qbankId, question_bank_id: qbankId, qbankId, qbank_id: qbankId }
              : batch
          )
        );
        setSelectedBatch((prev) =>
          prev && Number(getBatchId(prev)) === Number(batchId)
            ? { ...prev, questionBankId: qbankId, question_bank_id: qbankId, qbankId, qbank_id: qbankId }
            : prev
        );
        setSelectedBatchDetails((prev) =>
          prev && Number(getBatchId(prev)) === Number(batchId)
            ? { ...prev, questionBankId: qbankId, question_bank_id: qbankId, qbankId, qbank_id: qbankId }
            : prev
        );
        await fetchBatches(activeLevel);
        await fetchLevelSummaries();
        showSuccess("Success", "Batch linked to question bank successfully!");
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error linking batch to question bank:", err);
      setError("Failed to link batch to question bank");
      return false;
    }
  };

  useEffect(() => {
    fetchBatches(activeLevel);
    fetchQuestionBanks();
    fetchLevelSummaries();
  }, [activeLevel]);

  useEffect(() => {
    const selectedBankId = getQuestionBankId(selectedQuestionBank);
    const selectedBatchId = getBatchId(selectedBatch);

    if (selectedBankId && selectedBatchId) {
      fetchQuestionsByBankAndBatch(selectedBankId, selectedBatchId);
    } else if (selectedBankId) {
      fetchQuestionsByBank(selectedBankId);
    } else {
      setQuestions([]);
    }
  }, [selectedQuestionBank, selectedBatch]);

  useEffect(() => {
    const selectedBatchId = getBatchId(selectedBatch);
    if (selectedBatchId) {
      fetchCandidates(selectedBatchId);
    } else {
      setCandidates([]);
    }
  }, [selectedBatch]);

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Form handlers
  const handleQuestionBankSubmit = async () => {
    if (!questionBankFormData.bankName?.trim()) {
      showAlert("Validation Error", "Bank Name is required");
      return;
    }

    const payload = {
      ...questionBankFormData,
      level: activeLevel
    };

    try {
      let success;
      if (editingQuestionBank) {
        const editingBankId = getQuestionBankId(editingQuestionBank);
        if (!editingBankId) {
          showAlert("Validation Error", "Question bank ID is missing");
          return;
        }

        success = await updateQuestionBank(editingBankId, payload);
      } else {
        success = await createQuestionBank(payload);
      }

      if (success) {
        showSuccess("Success", editingQuestionBank ? "Question bank updated successfully!" : "Question bank created successfully!");
        setShowQuestionBankDialog(false);
        resetQuestionBankForm();
      } else {
        showAlert("Error", "Failed to save question bank");
      }

    } catch (err) {
      console.error(err);
      showAlert("Error", "Something went wrong");
    }
  };

  const handleBatchSubmit = async () => {
    if (!batchFormData.batchCode?.trim()) {
      showAlert("Validation Error", "Batch Code is required");
      return;
    }

    if (!batchFormData.duration || batchFormData.duration <= 0) {
      showAlert("Validation Error", "Valid Exam Duration is required");
      return;
    }

    if (!batchFormData.start_date) {
      showAlert("Validation Error", "Start Date is required");
      return;
    }

    if (!batchFormData.start_time) {
      showAlert("Validation Error", "Start Time is required");
      return;
    }

    if (!batchFormData.end_date) {
      showAlert("Validation Error", "End Date is required");
      return;
    }

    if (!batchFormData.end_time) {
      showAlert("Validation Error", "End Time is required");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateObj = new Date(batchFormData.start_date);
    startDateObj.setHours(0, 0, 0, 0);

    if (startDateObj < today) {
      showAlert("Validation Error", "Start date cannot be in the past. Please select today or a future date.");
      return;
    }

    const startDateTime = new Date(`${batchFormData.start_date}T${batchFormData.start_time}`);
    const endDateTime = new Date(`${batchFormData.end_date}T${batchFormData.end_time}`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      showAlert("Validation Error", "Invalid date/time format");
      return;
    }

    if (startDateTime >= endDateTime) {
      showAlert("Validation Error", "End date/time must be greater than start date/time");
      return;
    }

    const totalMinutes = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60);

    if (batchFormData.duration > totalMinutes) {
      showAlert("Validation Error", `Duration (${batchFormData.duration} min) cannot exceed total exam time (${Math.floor(totalMinutes)} min)`);
      return;
    }

    const payload = {
      ...batchFormData,
      level: activeLevel,
      start_date: `${batchFormData.start_date}T${batchFormData.start_time}`,
      end_date: `${batchFormData.end_date}T${batchFormData.end_time}`
    };

    try {
      const editingBatchId = getBatchId(editingBatch);
      if (editingBatch && !editingBatchId) {
        showAlert("Validation Error", "Batch ID is missing");
        return;
      }

      const success = editingBatch
        ? await updateBatch(editingBatchId, payload)
        : await createBatch(payload);

      if (success) {
        showSuccess("Success", editingBatch ? "Batch updated successfully!" : "Batch created successfully!");
        setShowBatchDialog(false);
        resetBatchForm();
      } else {
        showAlert("Error", "Failed to save batch");
      }

    } catch (err) {
      console.error(err);
      showAlert("Error", "Something went wrong");
    }
  };

  const handleAddQuestion = async () => {
    if (!questionFormData.text.trim()) {
      showAlert("Validation Error", "Please enter question text");
      return;
    }
    if (questionFormData.options.some(opt => !opt.trim())) {
      showAlert("Validation Error", "Please fill all options");
      return;
    }

    if (!selectedQuestionBank) {
      showAlert("Validation Error", "Please select a question bank first");
      return;
    }

    const selectedBankId = getQuestionBankId(selectedQuestionBank);
    if (!selectedBankId) {
      showAlert("Validation Error", "Selected question bank ID is missing");
      return;
    }

    const newQuestion = {
      ...questionFormData,
      level: activeLevel
    };

    const success = await addQuestion(
      selectedBankId,
      newQuestion
    );

    if (success) {
      setShowQuestionDialog(false);
      resetQuestionForm();
      showSuccess("Success", "Question added successfully!");
    } else {
      showAlert("Error", "Failed to add question. Please try again.");
    }
  };

  const handleEditQuestion = async () => {
    const selectedBankId = getQuestionBankId(selectedQuestionBank);
    const questionId = getQuestionId(editingQuestion);

    if (editingQuestion && questionId && selectedBankId) {
      const success = await updateQuestion(
        questionId,
        selectedBankId,
        getBatchId(selectedBatch),
        questionFormData
      );
      if (success) {
        setShowQuestionDialog(false);
        setEditingQuestion(null);
        resetQuestionForm();
        showSuccess("Success", "Question updated successfully!");
      } else {
        showAlert("Error", "Failed to update question. Please try again.");
      }
    } else {
      showAlert("Validation Error", "Question bank or question ID is missing.");
    }
  };

  const handleEnrollCandidates = async () => {
    if (!candidateFormData.name || !candidateFormData.email) {
      showAlert("Validation Error", "Please fill candidate details");
      return;
    }

    if (!candidateFormData.email.includes("@")) {
      showAlert("Validation Error", "Please enter a valid email address");
      return;
    }

    const selectedBatchId = getBatchId(selectedBatch);
    if (!selectedBatchId) {
      showAlert("Validation Error", "Please select a batch first");
      return;
    }

    const success = await enrollCandidate(candidateFormData, selectedBatchId);

    if (success) {
      setShowEnrollDialog(false);
      resetCandidateForm();
      showSuccess("Success", "Candidate enrolled successfully!");
    }
  };

  const handleBulkEnroll = async () => {
    if (!bulkCandidateFile) {
      showAlert("Validation Error", "Please select a file");
      return;
    }

    const selectedBatchId = getBatchId(selectedBatch);
    if (!selectedBatchId) {
      showAlert("Validation Error", "Please select a batch first");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n");
      const candidatesData = [];

      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(",");
          candidatesData.push({
            name: values[0]?.trim(),
            email: values[1]?.trim(),
            phone: values[2]?.trim(),
            enrollment_no: values[3]?.trim()
          });
        }
      }

      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const success = await bulkEnrollCandidates(candidatesData, selectedBatchId);
      if (success) {
        setShowCandidateDialog(false);
        setUploadProgress(0);
        setBulkCandidateFile(null);
      }
    };
    reader.readAsText(bulkCandidateFile);
  };

  const handleBulkQuestionsUpload = async () => {
    if (!bulkFile) {
      showAlert("Validation Error", "Please select a file");
      return;
    }

    if (!selectedQuestionBank) {
      showAlert("No Question Bank", "Please select a question bank first");
      setActiveTab("questionBanks");
      setShowBulkQuestionDialog(false);
      return;
    }

    const selectedBankId = getQuestionBankId(selectedQuestionBank);
    if (!selectedBankId) {
      showAlert("No Question Bank", "Selected question bank ID is missing");
      return;
    }

    if (bulkFileType === "csv") {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split("\n").filter(l => l.trim() !== "");
          const questionsData: Question[] = [];

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i]
              .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
              .map(v => v.replace(/^"|"$/g, "").trim());

            if (!values[0] || values.length < 6) {
              console.warn("Skipping invalid row:", values);
              continue;
            }

            const options = [values[1], values[2], values[3], values[4]];

            if (options.some(opt => !opt)) {
              console.warn("Skipping row (invalid options):", values);
              continue;
            }

            const correctOption = parseInt(values[5]);

            if (isNaN(correctOption) || correctOption < 0 || correctOption > 3) {
              console.warn("Skipping row (invalid correctOption):", values);
              continue;
            }

            questionsData.push({
              text: values[0],
              options,
              correctOption,
              explanation: values[6] || "",
              marks: parseInt(values[7]) || 1,
              level: activeLevel,
              difficulty: ["easy", "medium", "hard"].includes(values[8])
                ? (values[8] as "easy" | "medium" | "hard")
                : "medium"
            });
          }

          if (questionsData.length === 0) {
            showAlert("Error", "No valid questions found in file ❌");
            return;
          }

          for (let i = 0; i <= 100; i += 10) {
            setUploadProgress(i);
            await new Promise(resolve => setTimeout(resolve, 40));
          }

          const success = await bulkUploadQuestions(
            questionsData,
            selectedBankId
          );

          if (success) {
            setShowBulkQuestionDialog(false);
            setUploadProgress(0);
            setBulkFile(null);
            showSuccess("Success", `✅ ${questionsData.length} questions uploaded successfully`);
          } else {
            showAlert("Error", "❌ Failed to upload questions");
          }

        } catch (err) {
          console.error("CSV Upload Error:", err);
          showAlert("Error", "❌ CSV parsing error");
        }
      };

      reader.readAsText(bulkFile);
    } else if (bulkFileType === "json") {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const rawData = JSON.parse(text);

          const questionsData: Question[] = rawData
            .filter((q: any) =>
              q.text &&
              Array.isArray(q.options) &&
              q.options.length === 4
            )
            .map((q: any) => ({
              text: q.text,
              options: q.options,
              correctOption: Number(q.correctOption) || 0,
              explanation: q.explanation || "",
              marks: Number(q.marks) || 1,
              level: activeLevel,
              difficulty: ["easy", "medium", "hard"].includes(q.difficulty)
                ? q.difficulty
                : "medium"
            }));

          if (questionsData.length === 0) {
            showAlert("Error", "No valid questions found in JSON ❌");
            return;
          }

          for (let i = 0; i <= 100; i += 10) {
            setUploadProgress(i);
            await new Promise(resolve => setTimeout(resolve, 40));
          }

          const success = await bulkUploadQuestions(
            questionsData,
            selectedBankId
          );

          if (success) {
            setShowBulkQuestionDialog(false);
            setUploadProgress(0);
            setBulkFile(null);
            showSuccess("Success", `✅ ${questionsData.length} questions uploaded successfully`);
          } else {
            showAlert("Error", "❌ Failed to upload questions");
          }

        } catch (err) {
          console.error("JSON Upload Error:", err);
          showAlert("Error", "❌ Invalid JSON file");
        }
      };

      reader.readAsText(bulkFile);
    }
  };

  const handleDeleteBatch = (batchId: number) => {
    showAlert("Confirm Delete", "Are you sure you want to delete this batch?", () => {
      deleteBatch(batchId);
      setAlertDialog({ ...alertDialog, open: false });
    });
  };

  const handleDeleteQuestionBank = (qbankId: number) => {
    showAlert("Confirm Delete", "Are you sure you want to delete this question bank? All questions in this bank will also be deleted.", () => {
      deleteQuestionBank(qbankId);
      setAlertDialog({ ...alertDialog, open: false });
    });
  };

  const handleDeleteQuestion = (questionId: number) => {
    showAlert("Confirm Delete", "Are you sure you want to delete this question?", () => {
      deleteQuestion(questionId);
      setAlertDialog({ ...alertDialog, open: false });
    });
  };

  const downloadBatchTemplate = () => {
    const template = `Name,Email,Phone,Enrollment Number
John Doe,john@example.com,1234567890,ENR001
Jane Smith,jane@example.com,9876543210,ENR002`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "candidate_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadQuestionTemplate = () => {
    const template = `Question Text,Option A,Option B,Option C,Option D,Correct Option (0-3),Explanation,Marks,Difficulty
"What is normal blood pressure?","90/60 mmHg","120/80 mmHg","140/90 mmHg","160/100 mmHg",1,"Normal adult blood pressure is typically around 120/80 mmHg",1,easy`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "question_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetBatchForm = () => {
    setBatchFormData({
      batchCode: "",
      level: activeLevel,
      duration: 0,
      start_date: "",
      start_time: "",
      end_date: "",
      end_time: "",
      random_photo: true,
      random_video: true,
      ai_monitoring: true,
      tab_switch_detection: true,
      max_tab_switches: 3,
      auto_submit_on_tab_switch: true,
      status: "upcoming",
      questionBankId: undefined
    });
    setEditingBatch(null);
  };

  const resetQuestionBankForm = () => {
    setQuestionBankFormData({
      bankName: "",
      description: "",
      level: activeLevel
    });
    setEditingQuestionBank(null);
  };

  const resetQuestionForm = () => {
    setQuestionFormData({
      text: "",
      options: ["", "", "", ""],
      correctOption: 0,
      explanation: "",
      marks: 1,
      level: activeLevel,
      difficulty: "medium"
    });
  };

  const resetCandidateForm = () => {
    setCandidateFormData({
      userId: "",
      name: "",
      email: "",
      phone: "",
      enrollment_no: "",
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "medium": return "bg-amber-100 text-amber-800 border-amber-200";
      case "hard": return "bg-rose-100 text-rose-800 border-rose-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming": return "bg-sky-100 text-sky-800 border-sky-200";
      case "active": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "completed": return "bg-gray-100 text-gray-800 border-gray-200";
      case "enrolled": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-amber-100 text-amber-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
    <motion.div variants={itemVariants}>
      <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
              <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
              {trend && (
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600">{trend} from last month</span>
                </div>
              )}
            </div>
            <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const LevelCard = ({ level, isActive, onClick }: any) => {
    const summary = levelSummaries[level.qb_id] || { batches: 0, candidates: 0 };

    return (
      <motion.div
        variants={itemVariants}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 ${isActive ? 'ring-2 ring-offset-2 ring-emerald-500 shadow-2xl' : 'shadow-lg hover:shadow-xl'
          }`}
        onClick={onClick}
      >
        <div className="relative p-6 text-white" style={{ background: level.gradient }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
          <level.icon className="h-10 w-10 mb-3 relative z-10" />
          <h3 className="text-xl font-bold mb-1 relative z-10">{level.name}</h3>
          <p className="text-sm opacity-90 relative z-10">{level.description}</p>
          <div className="flex gap-3 mt-4 relative z-10">
            <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
              {summary.batches} Batches
            </div>
            <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
              {summary.candidates} Students
            </div>
          </div>
        </div>
        {isActive && (
          <div className="absolute top-3 right-3">
            <div className="bg-emerald-500 rounded-full p-1 shadow-lg">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const getLinkedQuestionBank = (batch?: Batch | null) => {
    const bankId = getBatchQuestionBankId(batch);
    if (!bankId) return null;

    return questionBanks.find((bank) => getQuestionBankId(bank) === bankId) || null;
  };

  const getBatchQuestionCount = (batch?: Batch | null) =>
    batch?.total_questions ||
    getLinkedQuestionBank(batch)?.totalQuestions ||
    0;

  const BatchCard = ({ batch, onEdit, onDelete, onManageQuestions, onViewCandidates, onViewDetails, onLinkBank }: any) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={getStatusColor(batch.status)}>
                {batch.status.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {getBatchQuestionCount(batch)} Questions
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                {batch.enrolled_students || 0} Enrolled
              </Badge>
              {getBatchQuestionBankId(batch) && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  <BookMarked className="h-3 w-3 mr-1" />
                  Linked to Bank
                </Badge>
              )}
            </div>
            <h3 className="font-bold text-gray-900 text-lg">{getBatchCode(batch)}</h3>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onViewDetails(batch)} className="hover:bg-gray-100">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onViewCandidates(batch)} className="hover:bg-gray-100">
              <Users className="h-4 w-4" />
            </Button>
            {!getBatchQuestionBankId(batch) && (
              <Button variant="ghost" size="sm" onClick={() => onLinkBank(batch)} className="hover:bg-emerald-50">
                <Link2 className="h-4 w-4 text-emerald-500" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onManageQuestions(batch)} className="hover:bg-gray-100">
              <BookOpen className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(batch)} className="hover:bg-gray-100">
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const batchId = getBatchId(batch);
                if (batchId) onDelete(batchId);
              }}
              className="hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="flex min-w-0 items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="truncate">{batch.start_date ? new Date(batch.start_date).toLocaleDateString() : 'Not set'}</span>
          </div>
          <div className="flex min-w-0 items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="truncate">{batch.start_time || '--'} - {batch.end_time || '--'}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
          {batch.random_photo && (
            <Badge variant="secondary" className="gap-1 bg-gray-100">
              <Camera className="h-3 w-3" /> Photo
            </Badge>
          )}
          {batch.random_video && (
            <Badge variant="secondary" className="gap-1 bg-gray-100">
              <Video className="h-3 w-3" /> Video
            </Badge>
          )}
          {batch.ai_monitoring && (
            <Badge variant="secondary" className="gap-1 bg-gray-100">
              <Shield className="h-3 w-3" /> AI Proctor
            </Badge>
          )}
          {batch.tab_switch_detection && (
            <Badge variant="secondary" className="gap-1 bg-gray-100">
              <Monitor className="h-3 w-3" /> Tab Guard ({batch.max_tab_switches} max)
            </Badge>
          )}
          {batch.auto_submit_on_tab_switch && (
            <Badge variant="secondary" className="gap-1 bg-red-50 text-red-700">
              <AlertTriangle className="h-3 w-3" /> Auto-submit
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );

  const QuestionBankCard = ({
    bank,
    onEdit,
    onDelete,
    onViewQuestions,
    onSelect,
    onBulkUpload,
    onAddQuestion,
    isSelected,
  }: any) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4 }}
      className={`bg-white rounded-xl border shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer ${
        isSelected ? "border-emerald-400 ring-2 ring-emerald-100" : "border-gray-100"
      }`}
      onClick={() => onSelect(bank)}
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <BookMarked className="h-5 w-5 text-emerald-500" />
              <h3 className="font-bold text-gray-900 text-lg">{bank.bankName}</h3>
            </div>
            <p className="text-gray-500 text-sm line-clamp-2">{bank.description || "No description"}</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onViewQuestions(bank); }} className="hover:bg-gray-100">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(bank); }} className="hover:bg-gray-100">
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                const bankId = getQuestionBankId(bank);
                if (bankId) onDelete(bankId);
              }}
              className="hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>

        <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Database className="h-4 w-4 text-gray-400" />
            <span>{bank.totalQuestions || 0} Questions</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>{bank.createdAt ? new Date(bank.createdAt).toLocaleDateString() : 'New'}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onBulkUpload(bank);
            }}
            className="w-full gap-2"
          >
            <Upload className="h-4 w-4" />
            Bulk Upload
          </Button>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddQuestion(bank);
            }}
            className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-600"
          >
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>
    </motion.div>
  );

  const TrendingChart = () => (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Performance Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[
            { label: "Average Score", value: stats.avgScore, color: "bg-emerald-500" },
            { label: "Completion Rate", value: stats.completionRate, color: "bg-blue-500" },
            { label: "Pass Rate", value: 72, color: "bg-purple-500" }
          ].map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{item.label}</span>
                <span className="font-semibold text-gray-900">{item.value}%</span>
              </div>
              <Progress value={item.value} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const activeQuestionBanks = questionBanks.filter(isQuestionBankInActiveLevel);
  const selectedQuestionBankId = getQuestionBankId(selectedQuestionBank);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
        {/* Custom Alert and Success Dialogs */}
        <CustomAlertDialog
          open={alertDialog.open}
          onOpenChange={(open: boolean) => setAlertDialog({ ...alertDialog, open })}
          title={alertDialog.title}
          description={alertDialog.description}
          onConfirm={alertDialog.onConfirm}
          onCancel={() => setAlertDialog({ ...alertDialog, open: false })}
        />
        <SuccessDialog
          open={successDialog.open}
          onOpenChange={(open: boolean) => setSuccessDialog({ ...successDialog, open })}
          title={successDialog.title}
          description={successDialog.description}
        />

        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 lg:mb-8"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 sm:text-base">Manage question banks, batches, and candidates efficiently</p>
            <div className="flex w-full gap-3 sm:w-auto">
              <Button
                variant="outline"
                onClick={async () => {
                  await fetchBatches(activeLevel);
                  await fetchQuestionBanks();
                  const selectedBatchId = getBatchId(selectedBatch);
                  if (selectedBatchId) {
                    fetchCandidates(selectedBatchId);
                  }
                  if (selectedQuestionBank && selectedBatchId) {
                    const selectedBankId = getQuestionBankId(selectedQuestionBank);
                    if (selectedBankId) {
                      await fetchQuestionsByBankAndBatch(selectedBankId, selectedBatchId);
                    }
                  } else if (selectedQuestionBank) {
                    const selectedBankId = getQuestionBankId(selectedQuestionBank);
                    if (selectedBankId) {
                      await fetchQuestionsByBank(selectedBankId);
                    }
                  }
                }}
                className="w-full gap-2 sm:w-auto"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Level Selection */}
        <motion.div
          variants={containerVariants}
          initial={false}
          animate="visible"
          className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 lg:mb-8 lg:gap-6"
        >
          {quizLevels.map((level) => (
            <LevelCard
              key={level.qb_id}
              level={level}
              isActive={activeLevel === level.qb_id}
              onClick={() => {
                setActiveLevel(level.qb_id);
                setActiveTab("dashboard");
                setSelectedBatch(null);
                setSelectedQuestionBank(null);
              }}
            />
          ))}
        </motion.div>

        <Card className="overflow-hidden border-none bg-white/80 shadow-xl backdrop-blur-sm lg:shadow-2xl">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="overflow-x-auto border-b border-gray-200 px-3 pt-3 sm:px-6 sm:pt-6">
                <TabsList className="inline-grid min-w-[480px] grid-cols-3 gap-2 bg-transparent sm:w-full sm:min-w-0 sm:gap-4">
                  <TabsTrigger
                    value="dashboard"
                    className="whitespace-nowrap px-3 text-xs transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white sm:text-sm"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger
                    value="questionBanks"
                    className="whitespace-nowrap px-3 text-xs transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white sm:text-sm"
                  >
                    <BookMarked className="h-4 w-4 mr-2" />
                    Question Banks
                  </TabsTrigger>
                  <TabsTrigger
                    value="batches"
                    className="whitespace-nowrap px-3 text-xs transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white sm:text-sm"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Batches
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="space-y-6 p-4 sm:p-6 lg:space-y-8 lg:p-8">
                <motion.div
                  variants={containerVariants}
                  initial={false}
                  animate="visible"
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6"
                >

                  <StatCard
                    title="Total Batches"
                    value={stats.totalBatches}
                    icon={Briefcase}
                    trend="+12%"
                    color="from-blue-500 to-blue-600"
                  />

                  <StatCard
                    title="Total Candidates"
                    value={stats.totalCandidates}
                    icon={Users}
                    trend="+23%"
                    color="from-purple-500 to-purple-600"
                  />

                  <StatCard
                    title="Active Batches"
                    value={stats.activeBatches}
                    icon={Activity}
                    trend="+5%"
                    color="from-emerald-500 to-emerald-600"
                  />
                  <StatCard
                    title="Question Banks"
                    value={stats.totalQuestionBanks}
                    icon={BookMarked}
                    trend="+12%"
                    color="from-indigo-500 to-indigo-600"
                  />

                </motion.div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                  <TrendingChart />

                  <Card className="border-none shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {batches.slice(0, 3).map((batch, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{batch.batchCode}</p>
                              <p className="text-sm text-gray-500">
                                {batch.enrolled_students || 0} candidates enrolled
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          </div>
                        ))}
                        {batches.length === 0 && (
                          <p className="text-gray-500 text-center py-4">No batches created yet</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Question Banks Tab */}
              <TabsContent value="questionBanks" className="space-y-5 p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {quizLevels.find(l => l.qb_id === activeLevel)?.name} Question Banks
                    </h3>
                    <p className="text-gray-500 mt-1">Create and manage question banks for your examination</p>
                  </div>
                  <Button
                    onClick={() => {
                      resetQuestionBankForm();
                      setEditingQuestionBank(null);
                      setShowQuestionBankDialog(true);
                    }}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg transition-all duration-300 hover:from-emerald-600 hover:to-teal-700 hover:shadow-xl sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Question Bank
                  </Button>
                </div>

                {loading && (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                  </div>
                )}

                {!loading && activeQuestionBanks.length === 0 && (
                  <div className="text-center py-12">
                    <BookMarked className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Question Banks Created</h3>
                    <p className="text-gray-500 mb-4">Get started by creating your first question bank</p>
                    <Button onClick={() => setShowQuestionBankDialog(true)}>Create Question Bank</Button>
                  </div>
                )}

                <motion.div
                  variants={containerVariants}
                  initial={false}
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {activeQuestionBanks.map((bank) => (
                    <QuestionBankCard
                      key={getQuestionBankId(bank)}
                      bank={bank}
                      onEdit={(b: QuestionBank) => {
                        setEditingQuestionBank(b);
                        setQuestionBankFormData({
                          bankName: b.bankName,
                          description: b.description,
                          level: b.level
                        });
                        setShowQuestionBankDialog(true);
                      }}
                      onDelete={handleDeleteQuestionBank}
                      onViewQuestions={(b: QuestionBank) => {
                        setSelectedQuestionBank(b);
                        setSelectedBatch(null);
                      }}
                      onSelect={(b: QuestionBank) => {
                        if (getQuestionBankId(selectedQuestionBank) === getQuestionBankId(b)) {
                          setSelectedQuestionBank(null);
                          setQuestions([]);
                        } else {
                          setSelectedQuestionBank(b);
                          setSelectedBatch(null);
                        }
                      }}
                      onBulkUpload={(b: QuestionBank) => {
                        setSelectedQuestionBank(b);
                        setSelectedBatch(null);
                        setShowBulkQuestionDialog(true);
                      }}
                      onAddQuestion={(b: QuestionBank) => {
                        setSelectedQuestionBank(b);
                        setSelectedBatch(null);
                        resetQuestionForm();
                        setEditingQuestion(null);
                        setShowQuestionDialog(true);
                      }}
                      isSelected={Boolean(selectedQuestionBankId) && selectedQuestionBankId === getQuestionBankId(bank)}
                    />
                  ))}
                </motion.div>

                <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Questions in Question Bank</h4>
                      <p className="text-sm text-gray-500">
                        {selectedQuestionBank
                          ? `Managing questions for ${selectedQuestionBank.bankName}`
                          : "Select a question bank to view, add, or bulk upload questions"}
                      </p>
                    </div>

                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-auto">
                      <Select
                        value={selectedQuestionBankId?.toString() || ""}
                        onValueChange={(val) => {
                          const bank = activeQuestionBanks.find(
                            b => getQuestionBankId(b)?.toString() === val
                          );

                          setSelectedQuestionBank(bank || null);
                          setSelectedBatch(null);
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-[260px]">
                          <SelectValue placeholder="Select Question Bank" />
                        </SelectTrigger>

                        <SelectContent>
                          {activeQuestionBanks
                            .filter(bank => getQuestionBankId(bank) !== null)
                            .map((bank) => {
                              const bankId = getQuestionBankId(bank);

                              return (
                                <SelectItem key={bankId} value={bankId!.toString()}>
                                  {bank.bankName} ({bank.totalQuestions || 0} Qs)
                                </SelectItem>
                              );
                            })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4 grid w-full grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto">
                    <Button variant="outline" onClick={downloadQuestionTemplate} className="w-full gap-2">
                      <Download className="h-4 w-4" />
                      Template
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!selectedQuestionBank) {
                          showAlert("Select Question Bank", "Please select a question bank first");
                          return;
                        }

                        setShowBulkQuestionDialog(true);
                      }}
                      className="w-full gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Bulk Upload
                    </Button>

                    <Button
                      onClick={() => {
                        if (!selectedQuestionBank) {
                          showAlert("Select Question Bank", "Please select a question bank first");
                          return;
                        }

                        resetQuestionForm();
                        setEditingQuestion(null);
                        setShowQuestionDialog(true);
                      }}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Question
                    </Button>
                  </div>

                  <div className="mt-4 space-y-4">
                    {!selectedQuestionBank && (
                      <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Please select a question bank above to view or add questions.
                        </AlertDescription>
                      </Alert>
                    )}

                    {selectedQuestionBank && !selectedBatch && (
                      <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                        <BookOpen className="h-4 w-4" />
                        <AlertDescription>
                          Questions will be saved directly in <strong>{selectedQuestionBank.bankName}</strong>. Batch selection is not required.
                        </AlertDescription>
                      </Alert>
                    )}

                    {selectedQuestionBank && selectedBatch && (
                      <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800">
                        <BookOpen className="h-4 w-4" />
                        <AlertDescription>
                          Viewing questions for batch <strong>{selectedBatch.batchCode}</strong>. New uploads still save to <strong>{selectedQuestionBank.bankName}</strong>.
                        </AlertDescription>
                      </Alert>
                    )}

                    {loading && (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                      </div>
                    )}

                    {!loading && selectedQuestionBank && questions.length === 0 && (
                      <div className="text-center py-12">
                        <Database className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions Found</h3>
                        <p className="text-gray-500 mb-4">
                          No questions in this question bank yet. Add questions manually or upload in bulk.
                        </p>
                        <div className="flex gap-3 justify-center flex-wrap">
                          <Button variant="outline" onClick={downloadQuestionTemplate}>Download Template</Button>
                          <Button
                            onClick={() => {
                              resetQuestionForm();
                              setEditingQuestion(null);
                              setShowQuestionDialog(true);
                            }}
                          >
                            Add Question
                          </Button>
                        </div>
                      </div>
                    )}

                    <motion.div
                      variants={containerVariants}
                      initial={false}
                      animate="visible"
                      className="space-y-4"
                    >
                      {questions.map((question) => (
                        <QuestionCard
                          key={getQuestionId(question) || question.text}
                          question={question}
                          onDelete={handleDeleteQuestion}
                          onEdit={(q) => {
                            setEditingQuestion(q);
                            setQuestionFormData(q);
                            setShowQuestionDialog(true);
                          }}
                          onPreview={(q) => {
                            setPreviewQuestion(q);
                            setShowPreviewDialog(true);
                          }}
                        />
                      ))}
                    </motion.div>
                  </div>
                </div>
              </TabsContent>

              {/* Batches Tab */}
              <TabsContent value="batches" className="space-y-5 p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {quizLevels.find(l => l.qb_id === activeLevel)?.name} Batches
                    </h3>
                    <p className="text-gray-500 mt-1">Manage and monitor all examination batches</p>
                  </div>
                  <Button
                    onClick={() => {
                      resetBatchForm();
                      setEditingBatch(null);
                      setShowBatchDialog(true);
                    }}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg transition-all duration-300 hover:from-emerald-600 hover:to-teal-700 hover:shadow-xl sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Batch
                  </Button>
                </div>

                {loading && (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                  </div>
                )}

                {!loading && batches.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Batches Created</h3>
                    <p className="text-gray-500 mb-4">Get started by creating your first examination batch</p>
                    <Button onClick={() => setShowBatchDialog(true)}>Create Batch</Button>
                  </div>
                )}

                <motion.div
                  variants={containerVariants}
                  initial={false}
                  animate="visible"
                  className="grid grid-cols-1 gap-4"
                >
                  {batches.map((batch) => (
                    <BatchCard
                      key={getBatchId(batch) || getBatchCode(batch)}
                      batch={batch}
                      onEdit={(b: Batch) => {
                        const startDateTime = b.start_date ? new Date(b.start_date) : null;
                        const endDateTime = b.end_date ? new Date(b.end_date) : null;

                        setEditingBatch(b);
                        setBatchFormData({
                          ...b,
                          start_date: startDateTime ? startDateTime.toISOString().split('T')[0] : "",
                          start_time: startDateTime ? startDateTime.toTimeString().slice(0, 5) : "",
                          end_date: endDateTime ? endDateTime.toISOString().split('T')[0] : "",
                          end_time: endDateTime ? endDateTime.toTimeString().slice(0, 5) : "",
                        });
                        setShowBatchDialog(true);
                      }}
                      onDelete={handleDeleteBatch}
                      onManageQuestions={(b: Batch) => {
                        const linkedBankId = getBatchQuestionBankId(b);
                        if (!linkedBankId) {
                          showAlert("Link Required", "Please link a question bank to this batch first");
                          setShowLinkBankDialog(true);
                          setSelectedBatch(b);
                          return;
                        }
                        const linkedBank = questionBanks.find(bank => getQuestionBankId(bank) === linkedBankId);
                        setSelectedQuestionBank(
                          linkedBank || {
                            id: linkedBankId,
                            qbankId: linkedBankId,
                            qbank_id: linkedBankId,
                            bankName: `Question Bank #${linkedBankId}`,
                            description: "",
                            level: activeLevel,
                            totalQuestions: getBatchQuestionCount(b),
                          }
                        );
                        setSelectedBatch(b);
                        setActiveTab("questionBanks");
                      }}
                      onViewCandidates={(b: Batch) => {
                        setSelectedBatch(b);
                        const batchId = getBatchId(b);
                        if (batchId) fetchCandidates(batchId);
                        setShowCandidatesListDialog(true);
                      }}
                      onViewDetails={(b: Batch) => {
                        setSelectedBatchDetails(b);
                        setShowBatchDetailsDialog(true);
                      }}
                      onLinkBank={(b: Batch) => {
                        setSelectedBatch(b);
                        setShowLinkBankDialog(true);
                      }}
                    />
                  ))}
                </motion.div>
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Question Bank Dialog */}
      <Dialog open={showQuestionBankDialog} onOpenChange={setShowQuestionBankDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingQuestionBank ? "Edit Question Bank" : "Create Question Bank"}
            </DialogTitle>
            <DialogDescription>
              {editingQuestionBank ? "Update question bank details" : `Create a new question bank for ${activeLevel} level`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Bank Name *</Label>
              <Input
                placeholder="e.g., Fundamental Nursing Concepts"
                value={questionBankFormData.bankName || ""}
                onChange={(e) =>
                  setQuestionBankFormData({ ...questionBankFormData, bankName: e.target.value })
                }
              />
            </div>


            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the purpose and scope of this question bank"
                value={questionBankFormData.description || ""}
                onChange={(e) =>
                  setQuestionBankFormData({ ...questionBankFormData, description: e.target.value })
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowQuestionBankDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleQuestionBankSubmit}>
              {editingQuestionBank ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Bank to Batch Dialog */}
      <Dialog open={showLinkBankDialog} onOpenChange={setShowLinkBankDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Link Question Bank to Batch</DialogTitle>
            <DialogDescription>
              Select a question bank to link with {getBatchCode(selectedBatch)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Select Question Bank *</Label>
              <Select onValueChange={(val) => {
                const bankId = parseInt(val);
                const selectedBatchId = getBatchId(selectedBatch);
                if (selectedBatchId && bankId) {
                  linkBatchToQuestionBank(selectedBatchId, bankId);
                  setShowLinkBankDialog(false);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a question bank" />
                </SelectTrigger>
                <SelectContent>
                  {activeQuestionBanks.map((bank) => {
                    const bankId = getQuestionBankId(bank);
                    if (!bankId) return null;

                    return (
                    <SelectItem key={bankId} value={bankId.toString()}>
                      {bank.bankName} ({bank.totalQuestions || 0} questions)
                    </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {activeQuestionBanks.length === 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  No question banks available. Please create one first.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkBankDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBatch ? "Edit Batch" : "Create New Batch"}
            </DialogTitle>
            <DialogDescription>
              {editingBatch ? "Update batch details" : `Create a new batch for ${activeLevel} level examination`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Batch Code *</Label>
              <Input
                placeholder="e.g., DISTRICT_BATCH_001"
                value={batchFormData.batchCode || ""}
                onChange={(e) =>
                  setBatchFormData({ ...batchFormData, batchCode: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Exam Duration (Minutes) *</Label>
              <Input
                type="number"
                placeholder="e.g., 60"
                min="1"
                value={batchFormData.duration || ""}
                onChange={(e) =>
                  setBatchFormData({
                    ...batchFormData,
                    duration: parseInt(e.target.value) || 0
                  })
                }
              />

              <div>
                <Label>Link Question Bank</Label>

                <Popover open={openQuestionBankSearch} onOpenChange={setOpenQuestionBankSearch}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {batchFormData.questionBankId
                        ? activeQuestionBanks.find(
                          (bank) => getQuestionBankId(bank) === batchFormData.questionBankId
                        )?.bankName || "Select question bank"
                        : "Select question bank"}

                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search question bank..." />
                      <CommandList>
                        <CommandEmpty>No question bank found.</CommandEmpty>

                        <CommandGroup>
                          {activeQuestionBanks
                            .map((bank) => {
                              const bankId = getQuestionBankId(bank);
                              if (!bankId) return null;

                              return (
                              <CommandItem
                                key={bankId}
                                value={bank.bankName}
                                onSelect={() => {
                                  setBatchFormData({
                                    ...batchFormData,
                                    questionBankId: bankId,
                                  });
                                  setOpenQuestionBankSearch(false);
                                }}
                              >
                                <CheckCircle
                                  className={`mr-2 h-4 w-4 ${batchFormData.questionBankId === bankId
                                      ? "opacity-100"
                                      : "opacity-0"
                                    }`}
                                />

                                <div>
                                  <p className="font-medium">{bank.bankName}</p>
                                  <p className="text-xs text-gray-500">
                                    {bank.totalQuestions || 0} questions
                                  </p>
                                </div>
                              </CommandItem>
                              );
                            })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <p className="text-xs text-gray-500 mt-1">
                  Select a question bank while creating this batch.
                </p>
              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  min={getTodayDate()}
                  value={batchFormData.start_date || ""}
                  onChange={(e) =>
                    setBatchFormData({ ...batchFormData, start_date: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">Cannot be in the past</p>
              </div>
              <div>
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={batchFormData.start_time || ""}
                  onChange={(e) =>
                    setBatchFormData({ ...batchFormData, start_time: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input
                  type="date"
                  min={batchFormData.start_date || getTodayDate()}
                  value={batchFormData.end_date || ""}
                  onChange={(e) =>
                    setBatchFormData({ ...batchFormData, end_date: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">Must be on or after start date</p>
              </div>
              <div>
                <Label>End Time *</Label>
                <Input
                  type="time"
                  value={batchFormData.end_time || ""}
                  onChange={(e) =>
                    setBatchFormData({ ...batchFormData, end_time: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Security & Monitoring Settings</h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>AI Monitoring</Label>
                    <p className="text-xs text-gray-500">AI-based proctoring for candidate monitoring</p>
                  </div>
                  <Switch
                    checked={batchFormData.ai_monitoring}
                    onCheckedChange={(val) =>
                      setBatchFormData({ ...batchFormData, ai_monitoring: val })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tab Switch Detection</Label>
                    <p className="text-xs text-gray-500">Detect when candidates switch tabs</p>
                  </div>
                  <Switch
                    checked={batchFormData.tab_switch_detection}
                    onCheckedChange={(val) =>
                      setBatchFormData({ ...batchFormData, tab_switch_detection: val })
                    }
                  />
                </div>

                {batchFormData.tab_switch_detection && (
                  <>
                    <div>
                      <Label>Max Tab Switches Allowed</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={batchFormData.max_tab_switches || 3}
                        onChange={(e) =>
                          setBatchFormData({ ...batchFormData, max_tab_switches: parseInt(e.target.value) || 3 })
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1">Number of tab switches allowed before action is taken</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-submit on Violation</Label>
                        <p className="text-xs text-gray-500">Automatically submit exam when max tab switches exceeded</p>
                      </div>
                      <Switch
                        checked={batchFormData.auto_submit_on_tab_switch}
                        onCheckedChange={(val) =>
                          setBatchFormData({ ...batchFormData, auto_submit_on_tab_switch: val })
                        }
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Random Photo Capture</Label>
                    <p className="text-xs text-gray-500">Capture random photos during exam</p>
                  </div>
                  <Switch
                    checked={batchFormData.random_photo}
                    onCheckedChange={(val) =>
                      setBatchFormData({ ...batchFormData, random_photo: val })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Random Video Capture</Label>
                    <p className="text-xs text-gray-500">Capture random video clips during exam</p>
                  </div>
                  <Switch
                    checked={batchFormData.random_video}
                    onCheckedChange={(val) =>
                      setBatchFormData({ ...batchFormData, random_video: val })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBatchSubmit}>
              {editingBatch ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "Edit Question" : "Add New Question"}
            </DialogTitle>
            <DialogDescription>
              {selectedQuestionBank
                ? `Adding to question bank: ${selectedQuestionBank.bankName}`
                : "Create a new question"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Question Text *</Label>
              <Textarea
                placeholder="Enter your question here..."
                value={questionFormData.text}
                onChange={(e) =>
                  setQuestionFormData({ ...questionFormData, text: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx}>
                  <Label>Option {String.fromCharCode(65 + idx)} *</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      value={questionFormData.options[idx]}
                      onChange={(e) => {
                        const newOptions = [...questionFormData.options];
                        newOptions[idx] = e.target.value;
                        setQuestionFormData({ ...questionFormData, options: newOptions });
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant={questionFormData.correctOption === idx ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setQuestionFormData({ ...questionFormData, correctOption: idx })
                      }
                      className="shrink-0"
                    >
                      {questionFormData.correctOption === idx ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        "Correct"
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <Label>Explanation</Label>
              <Textarea
                placeholder="Explain why this answer is correct..."
                value={questionFormData.explanation}
                onChange={(e) =>
                  setQuestionFormData({ ...questionFormData, explanation: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Marks</Label>
                <Input
                  type="number"
                  min="1"
                  value={questionFormData.marks}
                  onChange={(e) =>
                    setQuestionFormData({ ...questionFormData, marks: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select
                  value={questionFormData.difficulty}
                  onValueChange={(val: any) =>
                    setQuestionFormData({ ...questionFormData, difficulty: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={editingQuestion ? handleEditQuestion : handleAddQuestion}>
              {editingQuestion ? "Update" : "Add"} Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Question Preview</DialogTitle>
          </DialogHeader>
          {previewQuestion && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{previewQuestion.text}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {previewQuestion.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg ${idx === previewQuestion.correctOption
                      ? "bg-emerald-50 border border-emerald-200"
                      : "bg-gray-50"
                      }`}
                  >
                    <span className="font-medium">{String.fromCharCode(65 + idx)}.</span> {opt}
                    {idx === previewQuestion.correctOption && (
                      <CheckCircle className="h-4 w-4 text-emerald-600 inline ml-2" />
                    )}
                  </div>
                ))}
              </div>
              {previewQuestion.explanation && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Explanation:</strong> {previewQuestion.explanation}
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{previewQuestion.marks} Mark(s)</Badge>
                <Badge className={getDifficultyColor(previewQuestion.difficulty)}>
                  {previewQuestion.difficulty.toUpperCase()}
                </Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowPreviewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Details Dialog */}
      <Dialog open={showBatchDetailsDialog} onOpenChange={setShowBatchDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Batch Details</DialogTitle>
          </DialogHeader>

          {selectedBatchDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-gray-500">Batch Code</Label>
                  <p className="font-medium">{getBatchCode(selectedBatchDetails)}</p>
                </div>

                <div>
                  <Label className="text-gray-500">Level</Label>
                  <p className="font-medium capitalize">{selectedBatchDetails.level}</p>
                </div>

                <div>
                  <Label className="text-gray-500">Linked Question Bank</Label>
                  <p className="font-medium">
                    {getBatchQuestionBankId(selectedBatchDetails)
                      ? questionBanks.find(b => getQuestionBankId(b) === getBatchQuestionBankId(selectedBatchDetails))?.bankName || `Question Bank #${getBatchQuestionBankId(selectedBatchDetails)}`
                      : "Not linked"}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-500">Exam Duration</Label>
                  <p className="font-medium">
                    {selectedBatchDetails.duration
                      ? `${selectedBatchDetails.duration} minutes`
                      : '-'}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-500">Start Date</Label>
                  <p>
                    {selectedBatchDetails.start_date
                      ? new Date(selectedBatchDetails.start_date).toLocaleDateString()
                      : '-'}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-500">End Date</Label>
                  <p>
                    {selectedBatchDetails.end_date
                      ? new Date(selectedBatchDetails.end_date).toLocaleDateString()
                      : '-'}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-500">Start Time</Label>
                  <p>{selectedBatchDetails.start_time || '-'}</p>
                </div>

                <div>
                  <Label className="text-gray-500">End Time</Label>
                  <p>{selectedBatchDetails.end_time || '-'}</p>
                </div>

                <div>
                  <Label className="text-gray-500">Status</Label>
                  <Badge className={getStatusColor(selectedBatchDetails.status)}>
                    {selectedBatchDetails.status}
                  </Badge>
                </div>

                <div>
                  <Label className="text-gray-500">Total Questions</Label>
                  <p>{getBatchQuestionCount(selectedBatchDetails)}</p>
                </div>
              </div>

              <div className="border-t pt-3">
                <Label className="text-gray-500">Security Features</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedBatchDetails.ai_monitoring && <Badge>AI Monitoring</Badge>}
                  {selectedBatchDetails.tab_switch_detection && (
                    <Badge>
                      Tab Detection ({selectedBatchDetails.max_tab_switches} max)
                    </Badge>
                  )}
                  {selectedBatchDetails.auto_submit_on_tab_switch && (
                    <Badge variant="destructive">
                      Auto-submit on violation
                    </Badge>
                  )}
                  {selectedBatchDetails.random_photo && <Badge>Random Photo</Badge>}
                  {selectedBatchDetails.random_video && <Badge>Random Video</Badge>}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowBatchDetailsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Candidates List Dialog */}
      <Dialog open={showCandidatesListDialog} onOpenChange={setShowCandidatesListDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Candidates - {getBatchCode(selectedBatch)}
            </DialogTitle>
            <DialogDescription>
              Manage candidates enrolled in this batch
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search candidates..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadBatchTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
              <Button variant="outline" onClick={() => setShowCandidateDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
              <Button onClick={() => { fetchActiveUsers(); setShowEnrollDialog(true); }}>
                <UserPlus className="h-4 w-4 mr-2" />
                Enroll
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Enrollment No</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.filter(c =>
                  c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  c.enrollment_no?.includes(searchTerm)
                ).map((candidate) => (
                  <TableRow key={candidate.candidate_id}>
                    <TableCell className="font-medium">{candidate.name}</TableCell>
                    <TableCell>{candidate.email}</TableCell>
                    <TableCell>{candidate.enrollment_no}</TableCell>
                    <TableCell>{candidate.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(candidate.status)}>
                        {candidate.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{candidate.score || '-'}</TableCell>
                  </TableRow>
                ))}
                {candidates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No candidates enrolled yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCandidatesListDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll Candidate Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll Candidate</DialogTitle>
            <DialogDescription>
              Add a candidate to {getBatchCode(selectedBatch)}
            </DialogDescription>
          </DialogHeader>


          <div>
            <Label>Select Candidate *</Label>

            <Select
              value={candidateFormData.userId}
              onValueChange={(value) => {
                const selectedUser = activeUsers.find(
                  (user) => String(user.id) === value
                );

                setCandidateFormData({
                  ...candidateFormData,
                  userId: value,
                  name: selectedUser?.fullName || "",
                  email: selectedUser?.email || "",
                  phone: selectedUser?.contact || "",
                  enrollment_no: selectedUser?.enrollmentNumber || "",
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select candidate" />
              </SelectTrigger>

              <SelectContent>
                {activeUsers.length === 0 ? (
                  <SelectItem value="no-users" disabled>
                    No users found
                  </SelectItem>
                ) : (
                  activeUsers.map((user) => (
                    <SelectItem key={`${user.id}-${user.email}`} value={String(user.id)}>
                      {user.fullName ? `${user.fullName} - ${user.email}` : user.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={candidateFormData.name}
                onChange={(e) => setCandidateFormData({ ...candidateFormData, name: e.target.value })}
                placeholder="Full name"
              />
            </div>

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={candidateFormData.email}
                onChange={(e) => setCandidateFormData({ ...candidateFormData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={candidateFormData.phone}
                onChange={(e) => setCandidateFormData({ ...candidateFormData, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div>
              <Label>Enrollment Number</Label>
              <Input
                value={candidateFormData.enrollment_no}
                onChange={(e) => setCandidateFormData({ ...candidateFormData, enrollment_no: e.target.value })}
                placeholder="Unique enrollment ID"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowEnrollDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEnrollCandidates}>
              Enroll Candidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Candidate Dialog */}
      <Dialog open={showCandidateDialog} onOpenChange={setShowCandidateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Enroll Candidates</DialogTitle>
            <DialogDescription>
              Upload CSV file with candidate details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>CSV File (Name,Email,Phone,Enrollment Number)</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setBulkCandidateFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: Name, Email, Phone, Enrollment Number
              </p>
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={downloadBatchTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowCandidateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkEnroll}>
              Upload & Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Question Dialog */}
      <Dialog open={showBulkQuestionDialog} onOpenChange={setShowBulkQuestionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Upload Questions</DialogTitle>
            <DialogDescription>
              Upload multiple questions at once using CSV or JSON format
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>File Format</Label>
              <div className="flex gap-4 mt-2">
                <Button
                  type="button"
                  variant={bulkFileType === "csv" ? "default" : "outline"}
                  onClick={() => setBulkFileType("csv")}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button
                  type="button"
                  variant={bulkFileType === "json" ? "default" : "outline"}
                  onClick={() => setBulkFileType("json")}
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  JSON
                </Button>
              </div>
            </div>

            <div>
              <Label>Select File</Label>
              <Input
                type="file"
                accept={bulkFileType === "csv" ? ".csv" : ".json"}
                onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
              />
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={downloadQuestionTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowBulkQuestionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkQuestionsUpload}>
              Upload Questions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// QuestionCard component
const QuestionCard = ({ question, onDelete, onEdit, onPreview }: {
  question: Question;
  onDelete: (questionId: number) => void;
  onEdit: (q: Question) => void;
  onPreview: (q: Question) => void;
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "medium": return "bg-amber-100 text-amber-800 border-amber-200";
      case "hard": return "bg-rose-100 text-rose-800 border-rose-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl border border-gray-100 shadow-lg p-5 hover:shadow-xl transition-all duration-300"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge className={getDifficultyColor(question.difficulty)}>
              {question.difficulty.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
              {question.marks} Mark{question.marks > 1 ? 's' : ''}
            </Badge>
          </div>
          <p className="font-semibold text-gray-900 text-lg">{question.text}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onPreview(question)} className="hover:bg-gray-100">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(question)} className="hover:bg-gray-100">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(question.questionId!)} className="hover:bg-red-50">
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
        {question.options.map((opt: string, idx: number) => (
          <div key={idx} className={`p-2 rounded-lg text-sm ${idx === question.correctOption ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'}`}>
            <span className="font-medium">{String.fromCharCode(65 + idx)}.</span> {opt}
            {idx === question.correctOption && (
              <CheckCircle className="h-3 w-3 text-emerald-600 inline ml-2" />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default QuizManagementTab;
