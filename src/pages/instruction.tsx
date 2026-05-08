// App.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { Camera, AlertCircle, CheckCircle, User, FileText, X, Loader } from 'lucide-react';
import { BASE_URL, BASE_URL1 } from "@/Service/api";
import { EXAM_INSTRUCTION_DONE_KEY } from "@/lib/session";
import {
  PNG_MIME_TYPE,
  buildEvidenceJsonPayload,
  canvasToBlob,
  dataUrlToBlob,
  uploadEvidenceMedia
} from "@/lib/evidenceMedia";

// Types
type CaptureType = 'selfie' | 'document';
type ValidationStatus = 'pending' | 'valid' | 'invalid';

interface TeamMember {
  id: number;
  name: string;
  email?: string;
  role?: string;
  batchCode?: string;
  batch_code?: string;
  level?: string;
}

interface CaptureItem {
  id: number;
  type: CaptureType;
  imageData: string | null;
  status: ValidationStatus;
  errorMessage?: string;
  teamMemberId?: number;
  teamMemberName?: string;
  uploadStatus?: 'idle' | 'uploading' | 'uploaded' | 'failed';
  uploadedAt?: string;
  uploadDate?: string;
  uploadTime?: string;
  fileName?: string;
  mimeType?: string;
}

interface ImageFeatures {
  avgBrightness: number;
  skinRatio: number;
  faceEdgeIntensity: number;
  edgeDensity: number;
  whiteRatio: number;
  darkTextRatio: number;
  contrast: number;
  faceLike: boolean;
  documentLike: boolean;
}

interface BatchRecord {
  batch_id?: number;
  batchId?: number;
  id?: number;
  batchCode: string;
  batch_code?: string;
  level: string;
  status?: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

interface CandidateRecord {
  id?: number;
  candidate_id?: number;
  candidateId?: number;
  candidateID?: number;
  email?: string;
  enrollment_no?: string;
  enrollmentNo?: string;
  batchCode?: string;
  batch_code?: string;
  joined_at?: string;
  joinedAt?: string;
  enrolled_at?: string;
  enrolledAt?: string;
  created_at?: string;
  createdAt?: string;
}

const padNumber = (value: number) => String(value).padStart(2, '0');

const createUploadAudit = (date = new Date()) => ({
  uploadedAt: date.toISOString(),
  uploadDate: `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`,
  uploadTime: `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`
});

const getBatchCodeFromMembers = (members: TeamMember[]) =>
  members.find((member) => member.batchCode || member.batch_code)?.batchCode ||
  members.find((member) => member.batchCode || member.batch_code)?.batch_code ||
  '';

const sanitizeFileNamePart = (value: string) => value.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();

const getBatchId = (batch: BatchRecord) => Number(batch.batch_id ?? batch.batchId ?? batch.id) || null;

const getCandidateId = (candidate: CandidateRecord) =>
  Number(candidate.candidate_id ?? candidate.candidateId ?? candidate.candidateID ?? candidate.id) || null;

const getStoredCandidateId = () => {
  const storedUser = localStorage.getItem('userData');
  let parsedUser: Record<string, unknown> = {};

  try {
    parsedUser = storedUser ? JSON.parse(storedUser) : {};
  } catch {
    parsedUser = {};
  }

  return Number(localStorage.getItem('candidateId') || parsedUser.candidateId || parsedUser.candidate_id) || null;
};

const getBatchCode = (batch: BatchRecord) => batch.batchCode || batch.batch_code || '';

const getLatestEnrollmentTime = (batch: BatchRecord, candidate: CandidateRecord) => {
  const values = [
    batch.start_date,
    batch.startDate,
    batch.end_date,
    batch.endDate,
    batch.created_at,
    batch.createdAt,
    batch.updated_at,
    batch.updatedAt,
    candidate.joined_at,
    candidate.joinedAt,
    candidate.enrolled_at,
    candidate.enrolledAt,
    candidate.created_at,
    candidate.createdAt,
  ];

  return Math.max(
    0,
    ...values.map((value) => {
      const timestamp = new Date(String(value || '')).getTime();
      return Number.isFinite(timestamp) ? timestamp : 0;
    }),
  );
};

// Custom Dialog Component
const CustomDialog = ({ isOpen, onClose, title, message, type }: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  message: string; 
  type: 'success' | 'error' | 'info' 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {type === 'error' ? (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              ) : type === 'success' ? (
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-blue-600" />
                </div>
              )}
              <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-600 mt-2">{message}</p>
          <div className="mt-6 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CaptureItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [batchCode, setBatchCode] = useState<string>('');
  
  // Dialog state
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info'
  });

  const showDialog = (title: string, message: string, type: 'success' | 'error' | 'info') => {
    setDialog({ isOpen: true, title, message, type });
  };

  const closeDialog = () => {
    setDialog({ isOpen: false, title: '', message: '', type: 'info' });
  };

  const createCaptureFileName = useCallback((item: CaptureItem, capturedAt = new Date()) => {
    const datePart = `${capturedAt.getFullYear()}${padNumber(capturedAt.getMonth() + 1)}${padNumber(capturedAt.getDate())}`;
    const timePart = `${padNumber(capturedAt.getHours())}${padNumber(capturedAt.getMinutes())}${padNumber(capturedAt.getSeconds())}`;
    const memberName = sanitizeFileNamePart(item.teamMemberName || 'candidate');
    const memberId = item.teamMemberId || 'candidate';

    return `${item.type}_${memberId}_${memberName}_${datePart}_${timePart}.png`;
  }, []);
  
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const normalizeToken = (value: string | null) => value?.replace(/^Bearer\s+/i, '').trim() || '';

  const readStoredUser = () => {
    const userData = localStorage.getItem('userData');
    try {
      return userData ? JSON.parse(userData) : {};
    } catch {
      return {};
    }
  };

  const getToken = () => normalizeToken(localStorage.getItem('token'));

  const resolveBatchCode = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const storedUser = readStoredUser();
    const directBatchCode =
  params.get('batchCode') ||
  storedUser.batchCode ||
  storedUser.batch_code ||
  '';

    if (directBatchCode) {
      localStorage.setItem('batchCode', directBatchCode);
      setBatchCode(directBatchCode);
      return directBatchCode;
    }

    const email = (localStorage.getItem('email') || storedUser.email || '').toLowerCase();
    const enrollmentNo =
      localStorage.getItem('enrollment_no') ||
      localStorage.getItem('enrollmentNo') ||
      storedUser.enrollment_no ||
      storedUser.enrollmentNo ||
      '';
    const storedCandidateId = getStoredCandidateId();

    if (!email && !enrollmentNo && !storedCandidateId) {
      return '';
    }

    const levelHint =
      params.get('level') ||
      localStorage.getItem('level') ||
      storedUser.level ||
      'district';

    const levels = Array.from(new Set([levelHint, 'district', 'state', 'national']));
    const matchedEnrollments: Array<{
      batch: BatchRecord;
      candidate: CandidateRecord;
      candidateIdMatched: boolean;
    }> = [];
    const token = getToken();
    const requestOptions = token
      ? { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      : undefined;

    for (const level of levels) {
      try {
        const batchResponse = await fetch(`${BASE_URL1}/batches?level=${encodeURIComponent(level)}`, requestOptions);
        const batchResult = await batchResponse.json();
        const batches: BatchRecord[] =
          batchResult.success && Array.isArray(batchResult.data) ? batchResult.data : [];

        for (const batch of batches) {
          try {
            const batchId = getBatchId(batch);
            if (!batchId) continue;

            const candidateResponse = await fetch(
              `${BASE_URL1}/candidates?batchId=${batchId}`,
              requestOptions
            );
           const text = await candidateResponse.text();

if (!text) {
  console.warn(`Empty candidate response for batch ${getBatchCode(batch)}`);
  continue;
}

const candidateResult = JSON.parse(text);
            const candidates: CandidateRecord[] =
              candidateResult.success && Array.isArray(candidateResult.data) ? candidateResult.data : [];

            const batchMatches = candidates.filter((candidate) => {
              const candidateId = getCandidateId(candidate);
              const candidateEmail = candidate.email?.toLowerCase();
              const candidateEnrollment = candidate.enrollment_no || candidate.enrollmentNo || '';

              return (
                (storedCandidateId && candidateId === storedCandidateId) ||
                (email && candidateEmail === email) ||
                (enrollmentNo && candidateEnrollment === enrollmentNo)
              );
            });

            batchMatches.forEach((candidate) =>
              matchedEnrollments.push({
                batch,
                candidate,
                candidateIdMatched: Boolean(storedCandidateId && getCandidateId(candidate) === storedCandidateId),
              }),
            );
          } catch (error) {
            console.error(`Failed to load candidates for batch ${getBatchCode(batch)}:`, error);
          }
        }
      } catch (error) {
        console.error(`Failed to load batches for level ${level}:`, error);
      }
    }

    if (matchedEnrollments.length > 0) {
      const bestMatch = [...matchedEnrollments].sort((a, b) => {
        const getRank = (item: typeof matchedEnrollments[number]) => {
          const status = String(item.batch.status || '').toLowerCase();
          return (
            (item.candidateIdMatched ? 100_000_000 : 0) +
            (status.includes('active') || status.includes('live') ? 10_000_000 : 0) +
            (status.includes('upcoming') ? 5_000_000 : 0) +
            (status.includes('completed') ? -5_000_000 : 0) +
            Math.floor(getLatestEnrollmentTime(item.batch, item.candidate) / 100_000) +
            (getBatchId(item.batch) || 0)
          );
        };

        return getRank(b) - getRank(a);
      })[0];
      const nextBatchCode = getBatchCode(bestMatch.batch);
      const nextBatchId = getBatchId(bestMatch.batch);

      if (nextBatchCode) {
        localStorage.setItem('batchCode', nextBatchCode);
        setBatchCode(nextBatchCode);
      }

      if (nextBatchId) {
        localStorage.setItem('batchId', String(nextBatchId));
      }

      localStorage.setItem('level', bestMatch.batch.level);
      return nextBatchCode;
    }

    return '';
  }, []);

  // Fetch team members from API
  useEffect(() => {
    const fetchTeamMembers = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const bc = await resolveBatchCode();
        
        if (!token) {
          setError('No authentication token found. Please login again.');
          setLoading(false);
          return;
        }

        if (!bc) {
          console.warn('No batch code found, but continuing...');
        }

        const response = await fetch(`${BASE_URL}/api/register/get/team`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        let members: TeamMember[] = [];
        if (result.data && Array.isArray(result.data)) {
          members = result.data;
        } else if (Array.isArray(result)) {
          members = result;
        } else if (result.teamMembers && Array.isArray(result.teamMembers)) {
          members = result.teamMembers;
        } else {
          console.warn('Unexpected API response structure:', result);
          members = [];
        }

        setTeamMembers(members);
        
        const newItems: CaptureItem[] = [];
        
        members.forEach((member, index) => {
          newItems.push({
            id: index + 1,
            type: 'selfie',
            imageData: null,
            status: 'pending',
            uploadStatus: 'idle',
            teamMemberId: member.id,
            teamMemberName: member.name
          });
        });
        
        members.forEach((member, index) => {
          newItems.push({
            id: members.length + index + 1,
            type: 'document',
            imageData: null,
            status: 'pending',
            uploadStatus: 'idle',
            teamMemberId: member.id,
            teamMemberName: member.name
          });
        });
        
        setItems(newItems);
      } catch (err) {
        console.error('Error fetching team members:', err);
        setError('Failed to load team members. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, [resolveBatchCode]);

  const allItemsValid = items.length > 0 && items.every(item => item.status === 'valid' && item.uploadStatus === 'uploaded');
  
  const selfies = items.filter(item => item.type === 'selfie');
  const documents = items.filter(item => item.type === 'document');

  const startCamera = useCallback(async (itemId: number) => {
    setActiveItemId(itemId);
    setIsCameraOpen(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      showDialog('Camera Error', 'Unable to access camera. Please check permissions.', 'error');
      closeCamera();
    }
  }, []);

  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setActiveItemId(null);
  }, []);

  const uploadToBackend = useCallback(async (item: CaptureItem): Promise<boolean> => {
    if (!item.imageData || !item.teamMemberId) {
      console.error('Missing image data or team member ID');
      return false;
    }

    setItems(prevItems => 
      prevItems.map(i => 
        i.id === item.id 
          ? { ...i, uploadStatus: 'uploading' }
          : i
      )
    );

    try {
      const token = getToken();
      const currentBatchCode = batchCode || await resolveBatchCode();

      if (!token) {
        throw new Error('No authentication token');
      }
      if (!currentBatchCode) {
        throw new Error('No batch code found');
      }
      const fileName = item.fileName || createCaptureFileName(item);
      const mimeType = item.mimeType || PNG_MIME_TYPE;
      const uploadInfo = createUploadAudit();
      const imageBlob = await dataUrlToBlob(item.imageData);
      const uploadSuccess = await uploadEvidenceMedia({
        endpoint: `${BASE_URL}/api/evidence/upload`,
        token,
        file: imageBlob.slice(0, imageBlob.size, mimeType),
        fileName,
        meta: {
          teamMemberId: Number(item.teamMemberId),
          teamMemberName: item.teamMemberName || 'Candidate',
          type: item.type,
          batchCode: currentBatchCode,
          uploadedAt: uploadInfo.uploadedAt,
          uploadDate: uploadInfo.uploadDate,
          uploadTime: uploadInfo.uploadTime
        }
      });

      if (uploadSuccess) {
        setItems(prevItems => 
          prevItems.map(i => 
            i.id === item.id 
              ? { 
                  ...i, 
                  uploadStatus: 'uploaded',
                  fileName,
                  mimeType,
                  uploadedAt: uploadInfo.uploadedAt,
                  uploadDate: uploadInfo.uploadDate,
                  uploadTime: uploadInfo.uploadTime
                }
              : i
          )
        );
        return true;
      }

      throw new Error('Upload failed');
    } catch (err) {
      console.error('Upload error:', err);
      setItems(prevItems => 
        prevItems.map(i => 
          i.id === item.id 
            ? { ...i, uploadStatus: 'failed', errorMessage: err instanceof Error ? err.message : 'Upload failed' }
            : i
        )
      );
      return false;
    }
  }, [resolveBatchCode, batchCode, createCaptureFileName]);

  const analyzeImageFeatures = useCallback((data: Uint8ClampedArray, width: number, height: number): ImageFeatures => {
    let faceBrightness = 0;
    let skinPixelCount = 0;
    let faceEdgeIntensity = 0;
    let totalPixels = 0;
    let totalBrightness = 0;
    let whitePixelCount = 0;
    let darkTextPixelCount = 0;
    let edgePixelCount = 0;
    
    const centerX = width / 2;
    const centerY = height / 3;
    const radius = Math.min(width, height) / 4;
    
    let facePixels = 0;
    
    for (let y = Math.max(0, centerY - radius); y < Math.min(height, centerY + radius); y++) {
      for (let x = Math.max(0, centerX - radius); x < Math.min(width, centerX + radius); x++) {
        const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        faceBrightness += (r + g + b) / 3;
        facePixels++;
        
        if (r > 70 && g > 40 && b > 20 && r > g && g > b * 0.7 && (r - g) > 15) {
          skinPixelCount++;
        }
        
        if (x > 0 && y > 0) {
          const prevIdx = ((Math.floor(y) - 1) * width + (Math.floor(x) - 1)) * 4;
          const diff = Math.abs(r - data[prevIdx]) + Math.abs(g - data[prevIdx + 1]) + Math.abs(b - data[prevIdx + 2]);
          faceEdgeIntensity += diff;
        }
      }
    }

    for (let y = 1; y < height; y += 2) {
      for (let x = 1; x < width; x += 2) {
        const idx = (y * width + x) * 4;
        const leftIdx = (y * width + x - 1) * 4;
        const topIdx = ((y - 1) * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const brightness = (r + g + b) / 3;
        const edgeDiff =
          Math.abs(r - data[leftIdx]) +
          Math.abs(g - data[leftIdx + 1]) +
          Math.abs(b - data[leftIdx + 2]) +
          Math.abs(r - data[topIdx]) +
          Math.abs(g - data[topIdx + 1]) +
          Math.abs(b - data[topIdx + 2]);

        totalPixels++;
        totalBrightness += brightness;
        if (r > 185 && g > 185 && b > 185 && Math.abs(r - g) < 35 && Math.abs(g - b) < 35) {
          whitePixelCount++;
        }
        if (brightness < 115 && edgeDiff > 70) {
          darkTextPixelCount++;
        }
        if (edgeDiff > 90) {
          edgePixelCount++;
        }
      }
    }
    
    const avgBrightness = faceBrightness / Math.max(facePixels, 1);
    const wholeImageBrightness = totalBrightness / Math.max(totalPixels, 1);
    const skinRatio = skinPixelCount / Math.max(facePixels, 1);
    const avgFaceEdgeIntensity = faceEdgeIntensity / Math.max(facePixels, 1);
    const edgeDensity = edgePixelCount / Math.max(totalPixels, 1);
    const whiteRatio = whitePixelCount / Math.max(totalPixels, 1);
    const darkTextRatio = darkTextPixelCount / Math.max(totalPixels, 1);
    const contrast = Math.abs(avgBrightness - wholeImageBrightness) + avgFaceEdgeIntensity;
    
    const hasGoodBrightness = avgBrightness > 60 && avgBrightness < 220;
    const hasSkinTones = skinRatio > 0.08;
    const hasFaceEdges = avgFaceEdgeIntensity > 8;
    const faceLike = hasGoodBrightness && hasSkinTones && hasFaceEdges;
    const documentLike =
      !faceLike &&
      edgeDensity > 0.035 &&
      (whiteRatio > 0.18 || darkTextRatio > 0.025) &&
      contrast > 10;

    return {
      avgBrightness,
      skinRatio,
      faceEdgeIntensity: avgFaceEdgeIntensity,
      edgeDensity,
      whiteRatio,
      darkTextRatio,
      contrast,
      faceLike,
      documentLike
    };
  }, []);

  const validateSelfie = useCallback((features: ImageFeatures): { valid: boolean; message?: string } => {
    const hasGoodBrightness = features.avgBrightness > 60 && features.avgBrightness < 220;
    const hasSkinTones = features.skinRatio > 0.08;
    const hasEdges = features.faceEdgeIntensity > 8;
    
    if (features.faceLike) {
      return { valid: true };
    } else if (!hasSkinTones) {
      return { valid: false, message: 'Face not detected. Selfie slot accepts only face photo.' };
    } else if (!hasGoodBrightness) {
      return { valid: false, message: 'Image too dark or too bright. Please ensure good lighting.' };
    } else {
      return { valid: false, message: 'Face not clearly visible. Please look straight into the camera.' };
    }
  }, []);

  const validateDocument = useCallback((features: ImageFeatures): { valid: boolean; message?: string } => {
    if (features.faceLike) {
      return { valid: false, message: 'Face photo detected. Document slot accepts only document image.' };
    }

    if (!features.documentLike) {
      return { valid: false, message: 'Document not detected clearly. Please capture an ID/card/paper document.' };
    }

    return { valid: true };
  }, []);

  const validateImage = useCallback((imageData: string, type: CaptureType): Promise<{ valid: boolean; message?: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ valid: false, message: 'Analysis failed' });
          return;
        }
        ctx.drawImage(img, 0, 0);
        
        const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const features = analyzeImageFeatures(imageDataObj.data, canvas.width, canvas.height);
        resolve(type === 'selfie' ? validateSelfie(features) : validateDocument(features));
      };
      
      img.onerror = () => {
        resolve({ valid: false, message: 'Failed to load image' });
      };
      
      img.src = imageData;
    });
  }, [analyzeImageFeatures, validateSelfie, validateDocument]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || activeItemId === null) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageBlob = await canvasToBlob(canvas, PNG_MIME_TYPE);
    const imageData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => reject(new Error('Failed to prepare PNG image'));
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }

        reject(new Error('Failed to prepare PNG image'));
      };

      reader.readAsDataURL(imageBlob);
    });
    const item = items.find(i => i.id === activeItemId);
    if (!item) return;
    const fileName = createCaptureFileName(item);
    
    const validation = await validateImage(imageData, item.type);
    
    if (validation.valid) {
      setItems(prevItems => 
        prevItems.map(i => 
          i.id === activeItemId 
            ? { 
                ...i, 
                imageData, 
                fileName,
                mimeType: PNG_MIME_TYPE,
                status: 'valid',
                errorMessage: undefined
              }
            : i
        )
      );
      
      const updatedItem = {
        ...item,
        imageData,
        fileName,
        mimeType: PNG_MIME_TYPE,
        status: 'valid' as ValidationStatus
      };
      const uploadSuccess = await uploadToBackend(updatedItem);
      
      if (!uploadSuccess) {
        showDialog('Upload Warning', 'Image captured but failed to save to server. Please try again.', 'error');
        setItems(prevItems => 
          prevItems.map(i => 
            i.id === activeItemId 
              ? { ...i, status: 'pending', imageData: null, fileName: undefined, mimeType: undefined }
              : i
          )
        );
      }
    } else {
      setItems(prevItems => 
        prevItems.map(i => 
          i.id === activeItemId 
            ? { ...i, imageData, fileName, mimeType: PNG_MIME_TYPE, status: 'invalid', errorMessage: validation.message }
            : i
        )
      );
      // Auto close camera after showing error for selfie only
      setTimeout(() => {
        closeCamera();
      }, 2000);
    }
    
    closeCamera();
  }, [activeItemId, items, validateImage, closeCamera, uploadToBackend, createCaptureFileName]);

  const retryCapture = useCallback((itemId: number) => {
    setItems(prevItems => 
      prevItems.map(i => 
        i.id === itemId 
          ? { ...i, imageData: null, status: 'pending', errorMessage: undefined, uploadStatus: 'idle', fileName: undefined, mimeType: undefined }
          : i
      )
    );
    startCamera(itemId);
  }, [startCamera]);

  const resetAll = useCallback(() => {
    setItems(prevItems => 
      prevItems.map(item => ({ 
        ...item, 
        imageData: null, 
        status: 'pending', 
        errorMessage: undefined,
        uploadStatus: 'idle',
        fileName: undefined,
        mimeType: undefined
      }))
    );
    closeCamera();
  }, [closeCamera]);


const handleContinue = useCallback(async () => {
  if (!allItemsValid) return;

  showDialog('Success', 'All captures have been saved successfully!', 'success');
  localStorage.removeItem(EXAM_INSTRUCTION_DONE_KEY);
  sessionStorage.setItem(EXAM_INSTRUCTION_DONE_KEY, "true");

  setTimeout(() => {
    navigate(`/Exam${window.location.search || ''}`, { replace: true });
  }, 1500);
}, [allItemsValid, navigate]);

  const renderCaptureCard = (item: CaptureItem) => {
    const isSelfie = item.type === 'selfie';
    const Icon = isSelfie ? User : FileText;
    const displayName = item.teamMemberName || (isSelfie ? 'Selfie' : 'Document');
    
    return (
      <div key={item.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 transition-all hover:shadow-xl">
        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${isSelfie ? 'bg-blue-100' : 'bg-purple-100'}`}>
                <Icon className={`w-5 h-5 ${isSelfie ? 'text-blue-600' : 'text-purple-600'}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">{displayName}</h3>
                <p className="text-xs text-gray-500">{isSelfie ? 'Selfie Capture' : 'Document Capture'}</p>
              </div>
            </div>
            {item.status === 'valid' && item.uploadStatus === 'uploaded' && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            {item.status === 'valid' && item.uploadStatus === 'uploading' && (
              <Loader className="w-5 h-5 text-blue-500 animate-spin" />
            )}
            {item.status === 'valid' && item.uploadStatus === 'failed' && (
              <AlertCircle className="w-5 h-5 text-orange-500" />
            )}
            {item.status === 'invalid' && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
        </div>
        
        <div className="p-4">
          {item.imageData ? (
            <div className="space-y-3">
              <div className="relative group">
                <img 
                  src={item.imageData} 
                  alt={`${displayName} capture`}
                  className="h-56 w-full rounded-lg bg-gray-50 object-contain shadow-md sm:h-64"
                />
                <button
                  onClick={() => retryCapture(item.id)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                  disabled={item.uploadStatus === 'uploading'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {item.status === 'invalid' && item.errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {item.errorMessage}
                  </p>
                </div>
              )}
              {item.status === 'valid' && item.uploadStatus === 'uploaded' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Valid {isSelfie ? 'selfie' : 'document'} saved!
                  </p>
                </div>
              )}
              {item.status === 'valid' && item.uploadStatus === 'failed' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                  <p className="text-xs text-orange-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Failed to save. Click retry.
                  </p>
                  <button
                    onClick={() => uploadToBackend(item)}
                    className="mt-2 text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600"
                  >
                    Retry Upload
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => startCamera(item.id)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-all group"
            >
              <Camera className="w-8 h-8 text-gray-400 group-hover:text-blue-500" />
              <span className="text-sm text-gray-500 group-hover:text-blue-600">
                Capture {isSelfie ? 'Selfie' : 'Document'} for {item.teamMemberName}
              </span>
              <span className="text-xs text-gray-400">
                {isSelfie ? '(Face only)' : '(Document only)'}
              </span>
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading team members...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No Team Members Found</h2>
          <p className="text-gray-600 mb-4">Please add team members first before capturing images.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <CustomDialog
        isOpen={dialog.isOpen}
        onClose={closeDialog}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
      />

      {isCameraOpen && activeItemId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4">
          <div className="max-h-[calc(100svh-1.5rem)] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Capture {items.find(i => i.id === activeItemId)?.type === 'selfie' ? 'Selfie' : 'Document'} for{' '}
                {items.find(i => i.id === activeItemId)?.teamMemberName}
              </h3>
              <button
                onClick={closeCamera}
                className="p-1 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: '60vh' }}
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="mt-4 grid gap-3 sm:flex sm:justify-center">
                <button
                  onClick={closeCamera}
                  className="rounded-lg bg-gray-200 px-6 py-2 text-gray-700 transition hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-700"
                >
                  <Camera className="w-4 h-4" />
                  Capture
                </button>
              </div>
              <p className="text-xs text-center text-gray-500 mt-4">
                {items.find(i => i.id === activeItemId)?.type === 'selfie' 
                  ? 'Make sure only your face is visible in the frame' 
                  : 'Capture a clear document only. Face photos will be rejected.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto max-w-6xl px-3 py-6 sm:px-4 md:py-12">
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Camera className="w-4 h-4" />
            Capture Instructions
          </div>
          <h1 className="mb-3 text-2xl font-bold text-gray-800 sm:text-3xl md:text-4xl">
            Complete Your Captures
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Please capture a selfie for each team member (face validation applied).
            Document captures accept only document images. Face photos are not allowed in document slots.
          </p>
        </div>

        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-medium text-blue-600">
              {items.filter(i => i.status === 'valid' && i.uploadStatus === 'uploaded').length}/{items.length} Completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(items.filter(i => i.status === 'valid' && i.uploadStatus === 'uploaded').length / items.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
          <div>
            <h2 className="mb-4 flex flex-wrap items-center gap-2 text-lg font-semibold text-gray-800 sm:text-xl">
              <User className="w-5 h-5 text-blue-600" />
              Selfie Captures (With Face Validation)
              <span className="text-sm font-normal text-gray-500 ml-2">
                {selfies.filter(s => s.status === 'valid' && s.uploadStatus === 'uploaded').length}/{selfies.length}
              </span>
            </h2>
            <div className="space-y-4">
              {selfies.map(selfie => renderCaptureCard(selfie))}
            </div>
          </div>

          <div>
            <h2 className="mb-4 flex flex-wrap items-center gap-2 text-lg font-semibold text-gray-800 sm:text-xl">
              <FileText className="w-5 h-5 text-purple-600" />
              Document Captures (Document Only)
              <span className="text-sm font-normal text-gray-500 ml-2">
                {documents.filter(d => d.status === 'valid' && d.uploadStatus === 'uploaded').length}/{documents.length}
              </span>
            </h2>
            <div className="space-y-4">
              {documents.map(doc => renderCaptureCard(doc))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6 border-t border-gray-200">
          <button
            onClick={resetAll}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 sm:w-auto sm:px-8"
          >
            Reset All
          </button>
          <button
            onClick={handleContinue}
            disabled={!allItemsValid || saving}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-medium transition sm:w-auto sm:px-8 ${
              allItemsValid && !saving
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue Registration
                {!allItemsValid && (
                  <span className="text-xs ml-2">
                    ({items.length - items.filter(i => i.status === 'valid' && i.uploadStatus === 'uploaded').length} remaining)
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        <div className="mt-8 bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-100">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Validation Rules
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-blue-600 text-[10px]">✓</span>
              </div>
              <span>Selfie must contain only a face - face detection applied</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-purple-600 text-[10px]">✓</span>
              </div>
              <span>Document must be an ID/card/paper image - face photos are rejected</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-blue-600 text-[10px]">✓</span>
              </div>
              <span>Each team member requires both a selfie and document capture</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-purple-600 text-[10px]">✓</span>
              </div>
              <span>Continue button enables only after all captures are saved on server</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
