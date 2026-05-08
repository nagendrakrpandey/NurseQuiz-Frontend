
//export const BASE_URL = "http://localhost:9090";
export const BASE_URL = "  https://nursequiz-bacckend-3.onrender.com";
//export const BASE_URL1 = "http://localhost:9090/api";
 export const BASE_URL1 = "  https://nursequiz-bacckend-3.onrender.com/api";

//export const BASE_URL3="http://localhost:9090/api";
 export const BASE_URL3 = "  https://nursequiz-bacckend-3.onrender.com";


// Exam Management APIs
export const EXAM_API = {
  // Candidate APIs
  GET_CANDIDATES: `${BASE_URL3}/candidates`,
  ADD_CANDIDATE: `${BASE_URL3}/candidates`,
  UPDATE_CANDIDATE: `${BASE_URL3}/candidates`,
  DELETE_CANDIDATE: `${BASE_URL3}/candidates`,
  BULK_UPLOAD_CANDIDATES: `${BASE_URL3}/candidates/bulk`,
  
  // Exam APIs
  GET_EXAMS: `${BASE_URL3}/exams`,
  CREATE_EXAM: `${BASE_URL3}/exams`,
  UPDATE_EXAM: `${BASE_URL3}/exams`,
  DELETE_EXAM: `${BASE_URL3}/exams`,
  
  // Enrollment APIs
  ENROLL_CANDIDATE: `${BASE_URL3}/enrollments`,
  GET_ENROLLMENTS: `${BASE_URL3}/enrollments`,
  
  // Exam Taking APIs
  START_EXAM: `${BASE_URL3}/exam/start`,
  SUBMIT_ANSWER: `${BASE_URL3}/exam/submit`,
  COMPLETE_EXAM: `${BASE_URL3}/exam/complete`,
  GET_RESULTS: `${BASE_URL3}/exam/results`,
};

export interface Candidate {
  id?: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  qualification: string;
  experience: number;
  enrolledDate?: string;
  status: 'active' | 'inactive';
}

export interface ExamSchedule {
  id?: number;
  level: 'district' | 'state' | 'national';
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  totalMarks: number;
  passingMarks: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  enrolledCandidates?: number;
}

export interface Enrollment {
  id?: number;
  candidateId: number;
  examId: number;
  enrollmentDate: string;
  status: 'enrolled' | 'completed' | 'cancelled';
  score?: number;
  result?: 'pass' | 'fail' | 'pending';
}

const headers = {
  "Content-Type": "application/json"
};

