// ExamManagementTab.tsx
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Calendar as CalendarIcon, Clock, Award, Trophy, Crown,
  Plus, Trash2, Edit, Eye, Download, Upload, FileSpreadsheet,
  CheckCircle, XCircle, AlertCircle, Loader2, Search, Filter,
  Mail, Phone, MapPin, GraduationCap, Briefcase, UserPlus,
  BookOpen, ClipboardList, BarChart, Settings, Timer, Shield,
  TrendingUp, Star, Heart, Zap, Sparkles, Gem, Globe, Target,
  ChevronRight, ChevronLeft, Menu, X, Bell, Sun, Moon
} from "lucide-react";

import { EXAM_API, Candidate, ExamSchedule, Enrollment } from "@/Service/api";

const ExamManagementTab = () => {
  const [activeTab, setActiveTab] = useState("candidates");
  const [selectedLevel, setSelectedLevel] = useState<"district" | "state" | "national">("district");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Candidates State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showCandidateDialog, setShowCandidateDialog] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [candidateForm, setCandidateForm] = useState<Partial<Candidate>>({});
  
  // Exams State
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [showExamDialog, setShowExamDialog] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamSchedule | null>(null);
  const [examForm, setExamForm] = useState<Partial<ExamSchedule>>({});
  
  // Enrollment State
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [selectedExamForEnrollment, setSelectedExamForEnrollment] = useState<number | null>(null);
  const [selectedCandidateForEnrollment, setSelectedCandidateForEnrollment] = useState<number | null>(null);
  
  // Loading and Error States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [bulkUploading, setBulkUploading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalExams: 0,
    totalEnrollments: 0,
    passRate: 0,
  });

  useEffect(() => {
    fetchCandidates();
    fetchExams();
    fetchEnrollments();
  }, [selectedLevel]);

  useEffect(() => {
    calculateStats();
  }, [candidates, exams, enrollments]);

  const calculateStats = () => {
    const completedEnrollments = enrollments.filter(e => e.status === 'completed');
    const passedEnrollments = completedEnrollments.filter(e => e.result === 'pass');
    setStats({
      totalCandidates: candidates.length,
      totalExams: exams.length,
      totalEnrollments: enrollments.length,
      passRate: completedEnrollments.length > 0 
        ? (passedEnrollments.length / completedEnrollments.length) * 100 
        : 0,
    });
  };

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${EXAM_API.GET_CANDIDATES}?level=${selectedLevel}`);
      const result = await response.json();
      if (result.success) setCandidates(result.data);
    } catch (err) {
      setError("Failed to fetch candidates");
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const response = await fetch(`${EXAM_API.GET_EXAMS}?level=${selectedLevel}`);
      const result = await response.json();
      if (result.success) setExams(result.data);
    } catch (err) {
      setError("Failed to fetch exams");
    }
  };

  const fetchEnrollments = async () => {
    try {
      const response = await fetch(EXAM_API.GET_ENROLLMENTS);
      const result = await response.json();
      if (result.success) setEnrollments(result.data);
    } catch (err) {
      setError("Failed to fetch enrollments");
    }
  };

  // Candidate CRUD Operations
  const handleAddCandidate = async () => {
    if (!candidateForm.name || !candidateForm.email || !candidateForm.phone) {
      alert("Please fill all required fields");
      return;
    }
    
    const response = await fetch(EXAM_API.ADD_CANDIDATE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...candidateForm, level: selectedLevel }),
    });
    const result = await response.json();
    if (result.success) {
      fetchCandidates();
      setShowCandidateDialog(false);
      resetCandidateForm();
      alert("Candidate added successfully!");
    } else {
      alert("Failed to add candidate");
    }
  };

  const handleUpdateCandidate = async () => {
    if (!editingCandidate?.id) return;
    
    const response = await fetch(`${EXAM_API.UPDATE_CANDIDATE}/${editingCandidate.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(candidateForm),
    });
    const result = await response.json();
    if (result.success) {
      fetchCandidates();
      setShowCandidateDialog(false);
      resetCandidateForm();
      alert("Candidate updated successfully!");
    } else {
      alert("Failed to update candidate");
    }
  };

  const handleDeleteCandidate = async (id: number) => {
    if (confirm("Are you sure you want to delete this candidate?")) {
      const response = await fetch(`${EXAM_API.DELETE_CANDIDATE}/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        fetchCandidates();
        alert("Candidate deleted successfully!");
      } else {
        alert("Failed to delete candidate");
      }
    }
  };

  const handleBulkUploadCandidates = async (file: File) => {
    if (!file) return;
    
    setBulkUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const response = await fetch(`${EXAM_API.BULK_UPLOAD_CANDIDATES}?level=${selectedLevel}`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        fetchCandidates();
        alert(`${result.data?.length || 0} candidates uploaded successfully!`);
      } else {
        alert("Failed to upload candidates");
      }
    } catch (error) {
      alert("Error uploading file");
    } finally {
      setBulkUploading(false);
    }
  };

  // Exam CRUD Operations
  const handleCreateExam = async () => {
    if (!examForm.title || !examForm.date || !examForm.startTime) {
      alert("Please fill all required fields");
      return;
    }
    
    const examData = { ...examForm, level: selectedLevel };
    const response = await fetch(EXAM_API.CREATE_EXAM, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(examData),
    });
    const result = await response.json();
    if (result.success) {
      fetchExams();
      setShowExamDialog(false);
      resetExamForm();
      alert("Exam scheduled successfully!");
    } else {
      alert("Failed to schedule exam");
    }
  };

  const handleUpdateExam = async () => {
    if (!editingExam?.id) return;
    
    const response = await fetch(`${EXAM_API.UPDATE_EXAM}/${editingExam.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(examForm),
    });
    const result = await response.json();
    if (result.success) {
      fetchExams();
      setShowExamDialog(false);
      resetExamForm();
      alert("Exam updated successfully!");
    } else {
      alert("Failed to update exam");
    }
  };

  const handleDeleteExam = async (id: number) => {
    if (confirm("Are you sure you want to delete this exam?")) {
      const response = await fetch(`${EXAM_API.DELETE_EXAM}/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        fetchExams();
        alert("Exam deleted successfully!");
      } else {
        alert("Failed to delete exam");
      }
    }
  };

  // Enrollment Operations
  const handleEnrollCandidate = async () => {
    if (!selectedCandidateForEnrollment || !selectedExamForEnrollment) {
      alert("Please select both candidate and exam");
      return;
    }
    
    const enrollmentData = {
      candidateId: selectedCandidateForEnrollment,
      examId: selectedExamForEnrollment,
    };
    const response = await fetch(EXAM_API.ENROLL_CANDIDATE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enrollmentData),
    });
    const result = await response.json();
    if (result.success) {
      fetchEnrollments();
      setShowEnrollDialog(false);
      setSelectedCandidateForEnrollment(null);
      setSelectedExamForEnrollment(null);
      alert("Candidate enrolled successfully!");
    } else {
      alert("Failed to enroll candidate");
    }
  };

  const handleBulkEnroll = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("examId", selectedExamForEnrollment?.toString() || "");
      
      const response = await fetch(`${EXAM_API.ENROLL_CANDIDATE}/bulk`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        fetchEnrollments();
        alert(`${result.data?.length || 0} candidates enrolled successfully!`);
      } else {
        alert("Failed to bulk enroll");
      }
    };
    input.click();
  };

  const resetCandidateForm = () => {
    setCandidateForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      qualification: "",
      experience: 0,
      status: "active",
    });
    setEditingCandidate(null);
  };

  const resetExamForm = () => {
    setExamForm({
      title: "",
      description: "",
      date: "",
      startTime: "",
      endTime: "",
      duration: 60,
      totalMarks: 100,
      passingMarks: 40,
      status: "upcoming",
    });
    setEditingExam(null);
  };

  const getLevelConfig = (level: string) => {
    const configs = {
      district: {
        icon: Award,
        name: "District Level",
        color: "blue",
        gradient: "from-blue-500 to-cyan-500",
        bgGradient: "from-blue-50 to-cyan-50",
        borderColor: "border-blue-200",
        textColor: "text-blue-600",
      },
      state: {
        icon: Trophy,
        name: "State Level",
        color: "purple",
        gradient: "from-purple-500 to-pink-500",
        bgGradient: "from-purple-50 to-pink-50",
        borderColor: "border-purple-200",
        textColor: "text-purple-600",
      },
      national: {
        icon: Crown,
        name: "National Level",
        color: "amber",
        gradient: "from-amber-500 to-orange-500",
        bgGradient: "from-amber-50 to-orange-50",
        borderColor: "border-amber-200",
        textColor: "text-amber-600",
      },
    };
    return configs[level as keyof typeof configs] || configs.district;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-gradient-to-r from-green-400 to-emerald-500 text-white",
      inactive: "bg-gradient-to-r from-gray-400 to-gray-500 text-white",
      upcoming: "bg-gradient-to-r from-blue-400 to-indigo-500 text-white",
      ongoing: "bg-gradient-to-r from-yellow-400 to-orange-500 text-white",
      completed: "bg-gradient-to-r from-green-400 to-teal-500 text-white",
      cancelled: "bg-gradient-to-r from-red-400 to-pink-500 text-white",
      enrolled: "bg-gradient-to-r from-emerald-400 to-green-500 text-white",
      pass: "bg-gradient-to-r from-green-400 to-emerald-500 text-white",
      fail: "bg-gradient-to-r from-red-400 to-rose-500 text-white",
    };
    return styles[status] || "bg-gradient-to-r from-gray-400 to-gray-500 text-white";
  };

  const StatCard = ({ title, value, icon: Icon, gradient, trend }: any) => (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      className={`bg-gradient-to-r ${gradient} rounded-2xl p-6 text-white shadow-lg`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm opacity-90">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {trend && (
            <p className="text-xs mt-2 opacity-80 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{trend} from last month
            </p>
          )}
        </div>
        <Icon className="h-10 w-10 opacity-80" />
      </div>
    </motion.div>
  );

  const levelConfig = getLevelConfig(selectedLevel);
  const LevelIcon = levelConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-3 py-5 sm:px-4 md:py-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="rounded-2xl border border-white/20 bg-white/80 p-4 shadow-xl backdrop-blur-xl sm:p-6 md:p-8 lg:rounded-3xl lg:shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`shrink-0 rounded-2xl bg-gradient-to-r p-2.5 sm:p-3 ${levelConfig.gradient}`}>
                    <LevelIcon className="h-6 w-6 text-white sm:h-8 sm:w-8" />
                  </div>
                  <h1 className="text-2xl font-bold leading-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent md:text-4xl">
                    Exam Management System
                  </h1>
                </div>
                <p className="text-sm text-gray-600 sm:ml-16 sm:text-base">
                  Manage candidates, schedule exams, and track performance
                </p>
              </div>
              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:w-auto">
                <Button
                  onClick={() => {
                    resetCandidateForm();
                    setShowCandidateDialog(true);
                  }}
                  className={`w-full bg-gradient-to-r transition-all duration-300 hover:shadow-lg ${levelConfig.gradient}`}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Candidate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetExamForm();
                    setShowExamDialog(true);
                  }}
                  className="w-full border-2 transition-all duration-300 hover:shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Exam
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mb-8 lg:grid-cols-4 lg:gap-6"
        >
          <StatCard
            title="Total Candidates"
            value={stats.totalCandidates}
            icon={Users}
            gradient="from-blue-500 to-cyan-500"
            trend="12"
          />
          <StatCard
            title="Total Exams"
            value={stats.totalExams}
            icon={CalendarIcon}
            gradient="from-purple-500 to-pink-500"
            trend="5"
          />
          <StatCard
            title="Total Enrollments"
            value={stats.totalEnrollments}
            icon={ClipboardList}
            gradient="from-orange-500 to-red-500"
            trend="28"
          />
          <StatCard
            title="Pass Rate"
            value={`${stats.passRate.toFixed(1)}%`}
            icon={TrendingUp}
            gradient="from-green-500 to-emerald-500"
            trend="8"
          />
        </motion.div>

        {/* Level Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 lg:mb-8 lg:gap-6"
        >
          {[
            { id: "district", name: "District Level", icon: Award, color: "blue", description: "Foundation & Basic Knowledge", examCount: 12 },
            { id: "state", name: "State Level", icon: Trophy, color: "purple", description: "Advanced & Professional Skills", examCount: 8 },
            { id: "national", name: "National Level", icon: Crown, color: "amber", description: "Expert & Leadership Excellence", examCount: 5 },
          ].map((level) => (
            <motion.button
              key={level.id}
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedLevel(level.id as any)}
              className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${
                selectedLevel === level.id
                  ? `ring-4 ring-${level.color}-500 shadow-2xl`
                  : "hover:shadow-xl"
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br from-${level.color}-500 to-${level.color}-600 opacity-90`} />
              <div className="relative p-6 text-white">
                <div className="flex justify-between items-start mb-4">
                  <level.icon className="h-12 w-12" />
                  {selectedLevel === level.id && (
                    <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" />
                  )}
                </div>
                <h3 className="text-2xl font-bold mb-2">{level.name}</h3>
                <p className="text-sm opacity-90 mb-3">{level.description}</p>
                <div className="flex justify-between items-center">
                  <Badge className="bg-white/20 text-white border-0">
                    {level.examCount} Exams Available
                  </Badge>
                  {selectedLevel === level.id && (
                    <ChevronRight className="h-5 w-5 animate-pulse" />
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* Main Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="overflow-hidden rounded-2xl border border-white/20 bg-white/80 shadow-xl backdrop-blur-xl lg:rounded-3xl">
            <CardHeader className="border-b border-gray-100">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="w-full overflow-x-auto md:w-auto">
                    <TabsList className="min-w-[460px] rounded-xl bg-gray-100/50 p-1 md:min-w-0">
                    <TabsTrigger value="candidates" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md">
                      <Users className="h-4 w-4 mr-2" />
                      Candidates
                    </TabsTrigger>
                    <TabsTrigger value="exams" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Exams
                    </TabsTrigger>
                    <TabsTrigger value="enrollments" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md">
                      <ClipboardList className="h-4 w-4 mr-2" />
                      Enrollments
                    </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  {activeTab === "candidates" && (
                    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] md:w-auto">
                      <div className="relative md:w-64">
                        <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                        <Input
                          placeholder="Search candidates..."
                          className="pl-10"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Button variant="outline" onClick={() => document.getElementById("bulkUpload")?.click()} disabled={bulkUploading}>
                        {bulkUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        Bulk Upload
                      </Button>
                      <input
                        id="bulkUpload"
                        type="file"
                        className="hidden"
                        accept=".csv,.xlsx"
                        onChange={(e) => e.target.files && handleBulkUploadCandidates(e.target.files[0])}
                      />
                    </div>
                  )}
                </div>

                {/* Candidates Tab */}
                <TabsContent value="candidates" className="mt-6">
                  {loading ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-12 w-12 animate-spin mx-auto text-emerald-600" />
                      <p className="mt-4 text-gray-600">Loading candidates...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <AnimatePresence>
                        {candidates
                          .filter(c => 
                            c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.phone?.includes(searchTerm)
                          )
                          .map((candidate, index) => (
                            <motion.div
                              key={candidate.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ y: -5 }}
                              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden"
                            >
                              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${levelConfig.gradient} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500`} />
                              <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-16 w-16 ring-4 ring-white shadow-lg">
                                      <AvatarFallback className={`bg-gradient-to-r ${levelConfig.gradient} text-white text-xl`}>
                                        {candidate.name?.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <h3 className="font-bold text-lg text-gray-900">{candidate.name}</h3>
                                      <p className="text-sm text-gray-500">{candidate.email}</p>
                                    </div>
                                  </div>
                                  <Badge className={getStatusBadge(candidate.status)}>
                                    {candidate.status}
                                  </Badge>
                                </div>
                                
                                <div className="space-y-2 mb-4">
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone className="h-4 w-4" />
                                    <span>{candidate.phone}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <MapPin className="h-4 w-4" />
                                    <span>{candidate.city}, {candidate.state}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <GraduationCap className="h-4 w-4" />
                                    <span>{candidate.qualification}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Briefcase className="h-4 w-4" />
                                    <span>{candidate.experience} years experience</span>
                                  </div>
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-gray-100">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="flex-1 hover:bg-blue-50"
                                    onClick={() => {
                                      setEditingCandidate(candidate);
                                      setCandidateForm(candidate);
                                      setShowCandidateDialog(true);
                                    }}
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="flex-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                    onClick={() => handleDeleteCandidate(candidate.id!)}
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                      </AnimatePresence>
                    </div>
                  )}
                </TabsContent>

                {/* Exams Tab */}
                <TabsContent value="exams" className="mt-6">
                  <div className="space-y-4">
                    <AnimatePresence>
                      {exams.map((exam, index) => {
                        const examLevelConfig = getLevelConfig(exam.level);
                        const ExamIcon = examLevelConfig.icon;
                        return (
                          <motion.div
                            key={exam.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.1 }}
                            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden"
                          >
                            <div className={`bg-gradient-to-r ${examLevelConfig.gradient} p-4`}>
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="p-2 bg-white/20 rounded-xl">
                                    <ExamIcon className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="min-w-0">
                                    <h3 className="truncate text-lg font-bold text-white">{exam.title}</h3>
                                    <p className="line-clamp-2 text-sm text-white/80">{exam.description}</p>
                                  </div>
                                </div>
                                <Badge className={`${getStatusBadge(exam.status)} w-fit`}>
                                  {exam.status?.toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                            <div className="p-4 sm:p-5">
                              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
                                <div className="flex min-w-0 items-center gap-2 text-sm">
                                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                                  <span className="truncate">{format(new Date(exam.date), "PPP")}</span>
                                </div>
                                <div className="flex min-w-0 items-center gap-2 text-sm">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span className="truncate">{exam.startTime} - {exam.endTime}</span>
                                </div>
                                <div className="flex min-w-0 items-center gap-2 text-sm">
                                  <Timer className="h-4 w-4 text-gray-400" />
                                  <span className="truncate">{exam.duration} minutes</span>
                                </div>
                                <div className="flex min-w-0 items-center gap-2 text-sm">
                                  <Target className="h-4 w-4 text-gray-400" />
                                  <span className="truncate">Pass: {exam.passingMarks}/{exam.totalMarks}</span>
                                </div>
                              </div>
                              <div className="grid gap-2 sm:flex sm:flex-wrap sm:gap-3">
                                <Button 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedExamForEnrollment(exam.id!);
                                    setShowEnrollDialog(true);
                                  }}
                                  className={`bg-gradient-to-r ${examLevelConfig.gradient} hover:shadow-lg`}
                                >
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  Enroll Candidates
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-3 w-3 mr-1" />
                                  View Details
                                </Button>
                                <Button size="sm" variant="outline">
                                  <BarChart className="h-3 w-3 mr-1" />
                                  Results
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </TabsContent>

                {/* Enrollments Tab */}
                <TabsContent value="enrollments" className="mt-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">Candidate</TableHead>
                          <TableHead className="font-semibold">Exam</TableHead>
                          <TableHead className="font-semibold">Level</TableHead>
                          <TableHead className="font-semibold">Enrollment Date</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Score</TableHead>
                          <TableHead className="font-semibold">Result</TableHead>
                          <TableHead className="font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrollments.map((enrollment) => {
                          const candidate = candidates.find(c => c.id === enrollment.candidateId);
                          const exam = exams.find(e => e.id === enrollment.examId);
                          const examLevelConfig = getLevelConfig(exam?.level || "district");
                          return (
                            <TableRow key={enrollment.id} className="hover:bg-gray-50 transition-colors">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className={`bg-gradient-to-r ${examLevelConfig.gradient} text-white text-xs`}>
                                      {candidate?.name?.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  {candidate?.name}
                                </div>
                              </TableCell>
                              <TableCell>{exam?.title}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <examLevelConfig.icon className={`h-4 w-4 ${examLevelConfig.textColor}`} />
                                  <span className="capitalize">{exam?.level}</span>
                                </div>
                              </TableCell>
                              <TableCell>{format(new Date(enrollment.enrollmentDate), "PPP")}</TableCell>
                              <TableCell>
                                <Badge className={getStatusBadge(enrollment.status)}>
                                  {enrollment.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-semibold">{enrollment.score || "-"}</TableCell>
                              <TableCell>
                                {enrollment.result && (
                                  <Badge className={getStatusBadge(enrollment.result)}>
                                    {enrollment.result.toUpperCase()}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost">
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>
        </motion.div>
      </div>

      {/* Candidate Dialog */}
      <Dialog open={showCandidateDialog} onOpenChange={setShowCandidateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              {editingCandidate ? "Edit Candidate" : "Add New Candidate"}
            </DialogTitle>
            <DialogDescription>
              Enter candidate details for {selectedLevel} level examination
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Full Name *</Label>
              <Input value={candidateForm.name || ""} onChange={(e) => setCandidateForm({...candidateForm, name: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={candidateForm.email || ""} onChange={(e) => setCandidateForm({...candidateForm, email: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input value={candidateForm.phone || ""} onChange={(e) => setCandidateForm({...candidateForm, phone: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>Qualification *</Label>
              <Input value={candidateForm.qualification || ""} onChange={(e) => setCandidateForm({...candidateForm, qualification: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>Experience (Years)</Label>
              <Input type="number" value={candidateForm.experience || 0} onChange={(e) => setCandidateForm({...candidateForm, experience: parseInt(e.target.value)})} className="mt-1" />
            </div>
            <div>
              <Label>City</Label>
              <Input value={candidateForm.city || ""} onChange={(e) => setCandidateForm({...candidateForm, city: e.target.value})} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Textarea value={candidateForm.address || ""} onChange={(e) => setCandidateForm({...candidateForm, address: e.target.value})} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCandidateDialog(false)}>Cancel</Button>
            <Button onClick={editingCandidate ? handleUpdateCandidate : handleAddCandidate} className={`bg-gradient-to-r ${levelConfig.gradient}`}>
              {editingCandidate ? "Update Candidate" : "Save Candidate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exam Dialog */}
      <Dialog open={showExamDialog} onOpenChange={setShowExamDialog}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              {editingExam ? "Edit Exam" : "Schedule New Exam"}
            </DialogTitle>
            <DialogDescription>Configure exam details for {selectedLevel} level</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Exam Title *</Label>
              <Input value={examForm.title || ""} onChange={(e) => setExamForm({...examForm, title: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={examForm.description || ""} onChange={(e) => setExamForm({...examForm, description: e.target.value})} className="mt-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Exam Date *</Label>
                <Input type="date" value={examForm.date || ""} onChange={(e) => setExamForm({...examForm, date: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label>Start Time *</Label>
                <Input type="time" value={examForm.startTime || ""} onChange={(e) => setExamForm({...examForm, startTime: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label>End Time *</Label>
                <Input type="time" value={examForm.endTime || ""} onChange={(e) => setExamForm({...examForm, endTime: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label>Duration (minutes) *</Label>
                <Input type="number" value={examForm.duration || 60} onChange={(e) => setExamForm({...examForm, duration: parseInt(e.target.value)})} className="mt-1" />
              </div>
              <div>
                <Label>Total Marks *</Label>
                <Input type="number" value={examForm.totalMarks || 100} onChange={(e) => setExamForm({...examForm, totalMarks: parseInt(e.target.value)})} className="mt-1" />
              </div>
              <div>
                <Label>Passing Marks *</Label>
                <Input type="number" value={examForm.passingMarks || 40} onChange={(e) => setExamForm({...examForm, passingMarks: parseInt(e.target.value)})} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExamDialog(false)}>Cancel</Button>
            <Button onClick={editingExam ? handleUpdateExam : handleCreateExam} className={`bg-gradient-to-r ${levelConfig.gradient}`}>
              {editingExam ? "Update Exam" : "Schedule Exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enrollment Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Enroll Candidates
            </DialogTitle>
            <DialogDescription>Select candidates for the exam</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Candidate</Label>
              <Select onValueChange={(value) => setSelectedCandidateForEnrollment(parseInt(value))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a candidate" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map(candidate => (
                    <SelectItem key={candidate.id} value={candidate.id!.toString()}>
                      {candidate.name} - {candidate.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleEnrollCandidate} className={`w-full bg-gradient-to-r ${levelConfig.gradient}`}>
              Enroll Candidate
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or bulk enroll</span>
              </div>
            </div>
            <Button variant="outline" onClick={handleBulkEnroll} className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Bulk Enroll (CSV)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  .animate-blob {
    animation: blob 7s infinite;
  }
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  .animation-delay-4000 {
    animation-delay: 4s;
  }
`;
document.head.appendChild(style);

export default ExamManagementTab;
