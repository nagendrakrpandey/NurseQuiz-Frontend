import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Mic, MapPin, Wifi, Loader2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import bg from "@/assets/bg1.png";
import { clearAuthSession } from "@/lib/session";
import {
  applyDashboardExamCompletionOverride,
  fetchDashboardData,
  getDashboardUserId,
  getStoredDashboardUser,
  isDashboardQuizCompleted,
} from "@/lib/userDashboard";

const ALREADY_SUBMITTED_MESSAGE =
  "You have already submitted your exam. Your exam is already submitted.";

type CheckStatus = "pending" | "success" | "failed" | "slow";

const getErrorName = (error: unknown) => (error instanceof Error ? error.name : "");

const getGeolocationErrorCode = (error: unknown) => {
  if (!error || typeof error !== "object" || !("code" in error)) return null;

  const code = Number((error as { code?: unknown }).code);
  return Number.isFinite(code) ? code : null;
};

const textDictionary = {
  title: "Pre-Exam Environment Check",
  description: "Completing system checks...",

  camera: {
    title: "Camera Check",
    desc: "Required for proctoring"
  },
  mic: {
    title: "Microphone Check",
    desc: "Required for sound validation"
  },
  location: {
    title: "Location Access",
    desc: "Required for exam monitoring"
  },
  internet: {
    title: "Internet Speed",
    desc: "Stable network required"
  },

  check: "Check",
  verified: "Verified ✓",
  failed: "Failed ✗",
  slow: "Slow ⚠",
  checking: "Checking...",
  retry: "Retry",

  continueButton: "Continue to Exam",
  continueToInstructions: "Continue to Instructions",

  examSubmitted: "Exam Already Submitted",
  sessionExpired: "Session expired. Please login again.",
  theorySubmitted: "Your Theory exam is already submitted.",
  practicalSubmitted: "Your Practical exam is already submitted.",
  unableToVerify: "Unable to verify exam status. Please login again.",
  redirectMessage: "You will be redirected to login page in",
  okButton: "OK",
  seconds: "seconds",

  autoChecking: "Automatically checking system requirements...",

  footerNote: "All checks passed! You can now proceed to the exam",

  permissionDenied: "Permission denied. Please allow access and try again.",
  retryMessage: "Click retry to request permission again",
  refreshPage: "Refresh Page"
};

export default function PreExamCheck() {
  const [cameraStatus, setCameraStatus] = useState<"pending" | "success" | "failed">("pending");
  const [micStatus, setMicStatus] = useState<"pending" | "success" | "failed">("pending");
  const [locationStatus, setLocationStatus] = useState<"pending" | "success" | "failed">("pending");
  const [internetStatus, setInternetStatus] = useState<"pending" | "success" | "slow" | "failed">("pending");
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(5);
  const [isChecking, setIsChecking] = useState(false);
  const [checkingItem, setCheckingItem] = useState<string | null>(null);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [started, setStarted] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<Record<string, number>>({
    camera: 0,
    mic: 0,
    location: 0
  });
  
  const navigate = useNavigate();
  const abortControllerRef = useRef<AbortController | null>(null);
  const checkInProgressRef = useRef<boolean>(false);

  const redirectToLogin = useCallback(() => {
    clearAuthSession("manual");
    navigate("/login", { replace: true });
  }, [navigate]);

  const handleStart = async () => {
    setStarted(true);
    setIsChecking(true);

    await checkCamera();
    await checkMicrophone();
    await checkLocation();
    await checkInternetSpeed();

    setIsChecking(false);
    setInitialCheckDone(true);
  };

  // Get current language texts
  const t = textDictionary;

  const textMap = {
    pending: t.check,
    success: t.verified,
    failed: t.failed,
    slow: t.slow,
  };

  /* ================= COUNTDOWN REDIRECT ================= */
  useEffect(() => {
    let isActive = true;

    const verifyAlreadySubmittedExam = async () => {
      const storedUser = getStoredDashboardUser();
      const userId = getDashboardUserId(storedUser);
      if (!userId) return;

      try {
        const dashboardData = applyDashboardExamCompletionOverride(
          await fetchDashboardData(userId),
          userId,
        );

        if (!isActive || !isDashboardQuizCompleted(dashboardData)) return;

        setCountdown(5);
        setBlockMessage(ALREADY_SUBMITTED_MESSAGE);
      } catch (error) {
        console.warn("Unable to verify submitted exam status:", error);
      }
    };

    void verifyAlreadySubmittedExam();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!blockMessage) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          redirectToLogin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [blockMessage, redirectToLogin]);

  /* ================= PERMISSION CHECK FUNCTIONS ================= */
  
  const checkCamera = useCallback(async (isRetry = false) => {
    if (checkInProgressRef.current && !isRetry) return false;
    
    setCheckingItem('camera');
    setPermissionError(null);
    checkInProgressRef.current = true;
    
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported on this device");
      }

      // For mobile devices, we need to be more specific with constraints
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const constraints: MediaStreamConstraints = {
        video: isMobile ? {
          facingMode: { ideal: "user" },
          width: { ideal: 320 },
          height: { ideal: 240 }
        } : {
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Stop all tracks immediately
      stream.getTracks().forEach(track => {
        track.stop();
      });
      
      setCameraStatus("success");
      // Reset retry count on success
      setRetryCount(prev => ({ ...prev, camera: 0 }));
      checkInProgressRef.current = false;
      setCheckingItem(null);
      return true;
    } catch (error: unknown) {
      console.error("Camera error:", error);
      const errorName = getErrorName(error);
      
      // Handle different types of errors
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        setCameraStatus("failed");
        setPermissionError("camera_denied");
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        setCameraStatus("failed");
        setPermissionError("camera_not_found");
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        setCameraStatus("failed");
        setPermissionError("camera_busy");
      } else {
        setCameraStatus("failed");
        setPermissionError("camera_error");
      }
      
      checkInProgressRef.current = false;
      setCheckingItem(null);
      return false;
    }
  }, []);

  const checkMicrophone = useCallback(async (isRetry = false) => {
    if (checkInProgressRef.current && !isRetry) return false;
    
    setCheckingItem('mic');
    setPermissionError(null);
    checkInProgressRef.current = true;
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone not supported on this device");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      stream.getTracks().forEach(track => track.stop());
      
      setMicStatus("success");
      setRetryCount(prev => ({ ...prev, mic: 0 }));
      checkInProgressRef.current = false;
      setCheckingItem(null);
      return true;
    } catch (error: unknown) {
      console.error("Microphone error:", error);
      const errorName = getErrorName(error);
      
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        setMicStatus("failed");
        setPermissionError("mic_denied");
      } else if (errorName === 'NotFoundError') {
        setMicStatus("failed");
        setPermissionError("mic_not_found");
      } else {
        setMicStatus("failed");
        setPermissionError("mic_error");
      }
      
      checkInProgressRef.current = false;
      setCheckingItem(null);
      return false;
    }
  }, []);

  const checkLocation = useCallback(async (isRetry = false) => {
    if (checkInProgressRef.current && !isRetry) return false;
    
    setCheckingItem('location');
    setPermissionError(null);
    checkInProgressRef.current = true;
    
    if (!navigator.geolocation) {
      setLocationStatus("failed");
      setPermissionError("location_not_supported");
      checkInProgressRef.current = false;
      setCheckingItem(null);
      return false;
    }

    try {
      // For mobile devices, we need to handle location differently
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000, // Increased timeout for mobile
            maximumAge: 0
          }
        );
      });
      
      if (position.coords) {
        setLocationStatus("success");
        setRetryCount(prev => ({ ...prev, location: 0 }));
        checkInProgressRef.current = false;
        setCheckingItem(null);
        return true;
      } else {
        throw new Error("Invalid position data");
      }
    } catch (error: unknown) {
      console.error("Location error:", error);
      const errorCode = getGeolocationErrorCode(error);
      
      if (errorCode === 1) { // PERMISSION_DENIED
        setLocationStatus("failed");
        setPermissionError("location_denied");
      } else if (errorCode === 2) { // POSITION_UNAVAILABLE
        setLocationStatus("failed");
        setPermissionError("location_unavailable");
      } else if (errorCode === 3) { // TIMEOUT
        setLocationStatus("failed");
        setPermissionError("location_timeout");
      } else {
        setLocationStatus("failed");
        setPermissionError("location_error");
      }
      
      checkInProgressRef.current = false;
      setCheckingItem(null);
      return false;
    }
  }, []);

  const checkInternetSpeed = useCallback(async () => {
    setCheckingItem('internet');
    setPermissionError(null);
    
    // Cancel any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      const start = performance.now();
      
      // Use a more reliable endpoint for mobile
      const response = await fetch(
        `https://www.google.com/favicon.ico?t=${Date.now()}`, 
        { 
          mode: 'no-cors',
          signal: abortControllerRef.current.signal,
          cache: 'no-store'
        }
      );
      
      const time = performance.now() - start;
      
      // Adjust thresholds for mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (time < (isMobile ? 800 : 500)) setInternetStatus("success");
      else if (time < (isMobile ? 3000 : 2000)) setInternetStatus("slow");
      else setInternetStatus("failed");
      
      setCheckingItem(null);
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return false;
      }
      setInternetStatus("failed");
      setCheckingItem(null);
      return false;
    }
  }, []);


  useEffect(() => {
  const checkDevice = () => {
    setIsMobile(window.innerWidth < 1024);
  };
  checkDevice();
  window.addEventListener("resize", checkDevice);
  return () => window.removeEventListener("resize", checkDevice);
}, []);

useEffect(() => {
  if (!isMobile && !started) {
    handleStart(); // auto run on laptop
  }
}, [isMobile]);

  const handleSingleCheck = async (type: string) => {
    if (isChecking) return;
    
    setIsChecking(true);
    setPermissionError(null);
    
    // Increment retry count
    setRetryCount(prev => ({ 
      ...prev, 
      [type]: (prev[type as keyof typeof prev] || 0) + 1 
    }));
    
    switch(type) {
      case 'camera':
        await checkCamera(true);
        break;
      case 'mic':
        await checkMicrophone(true);
        break;
      case 'location':
        await checkLocation(true);
        break;
      case 'internet':
        await checkInternetSpeed();
        break;
    }
    
    setIsChecking(false);
  };

  const handleRefreshPage = () => {
    window.location.reload();
  };

  const allPassed = 
    cameraStatus === "success" &&
    micStatus === "success" &&
    locationStatus === "success" &&
    (internetStatus === "success" || internetStatus === "slow");

  const anyFailed = 
    cameraStatus === "failed" ||
    micStatus === "failed" ||
    locationStatus === "failed";

  /* ================= BLOCKED SCREEN ONLY ================= */
  if (blockMessage) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
           <img
    src={bg}
    alt="background"
    className="w-full h-full object-cover"
    onError={(e) => {
      console.error("Image failed to load:", bg);
      e.currentTarget.src = "https://via.placeholder.com/1920x1080"; // fallback image
    }}
  />
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
        </div>
        
        <div className="relative z-10 bg-white/90 backdrop-blur-md shadow-2xl rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 sm:space-y-6 border border-red-200 animate-fadeIn">
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-red-600">
              {t.examSubmitted}
            </h2>
            <p className="text-gray-700 text-base sm:text-lg font-medium px-2">
              {blockMessage}
            </p>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm sm:text-base text-gray-600">
              {t.redirectMessage}{" "}
              <span className="font-bold text-red-600 text-lg sm:text-xl">{countdown}</span>{" "}
              {t.seconds}
            </p>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 sm:py-4 text-base sm:text-lg font-semibold transition-all duration-200 transform hover:scale-[1.02]"
            onClick={redirectToLogin}
          >
            {t.okButton}
          </Button>
        </div>
      </div>
    );
  }

  /*================= NORMAL PRE-EXAM UI ================= */
  return (
  <>
{!started && isMobile && (
  <div
    onClick={handleStart}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
  >
    <div className="w-full max-w-sm rounded-xl bg-white p-5 text-center shadow-2xl sm:p-6">
      <p className="text-lg font-semibold">
        Tap to allow Camera, Mic & Location
      </p>
    </div>
  </div>
)}

    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden p-3 sm:p-4">
      <div className="absolute inset-0 z-0">
        <img 
          src={bg}
          alt="Custom background"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            console.error("Background image not found at /assets/bg1.png");
          }}
        />
        <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px]"></div>
      </div>
      <div className="absolute top-0 left-0 w-64 h-64 bg-blue-200/20 rounded-full filter blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-purple-200/20 blur-3xl delay-1000 animate-pulse sm:h-96 sm:w-96"></div>
      <div className="absolute left-1/2 top-1/2 h-[min(800px,120vw)] w-[min(800px,120vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-100/10 to-indigo-100/10 blur-3xl"></div>
      <div className="relative z-10 w-full max-w-2xl bg-white/90 backdrop-blur-sm shadow-[0_25px_80px_rgba(0,0,0,0.35)] rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4 space-y-4 sm:space-y-6 animate-fadeIn border border-white/30">
        <div className="text-center pt-6 sm:pt-8">
          <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold text-gray-800`}>
            {t.title}
          </h1>
          <p className="text-center text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 px-2">
            {!initialCheckDone ? t.autoChecking : t.description}
          </p>
        </div>
        
        {isChecking && !initialCheckDone && (
          <div className="flex items-center justify-center gap-3 py-2 bg-blue-50/70 backdrop-blur-sm rounded-lg mx-2">
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-blue-600" />
            <span className="text-sm sm:text-base text-gray-600 font-medium">
              {t.autoChecking}
            </span>
          </div>
        )}

        {/* Permission Error Message */}
        {permissionError && anyFailed && (
          <div className="mx-2 p-3 bg-yellow-50/90 backdrop-blur-sm border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 text-center">
              {t.permissionDenied}
            </p>
            <p className="text-xs text-yellow-600 text-center mt-1">
              {t.retryMessage}
            </p>
          </div>
        )}

        {/* System Checks Grid */}
        <div className="space-y-3 sm:space-y-4">
          <CheckRow
            icon={<Camera className="w-5 h-5 sm:w-6 sm:h-6" />}
            title={t.camera.title}
            desc={t.camera.desc}
            status={cameraStatus}
            onClick={() => handleSingleCheck('camera')}
            textMap={textMap}
            isChecking={isChecking}
            checkingItem={checkingItem}
            itemName="camera"
            retryCount={retryCount.camera}
            t={t}
          />

          <CheckRow
            icon={<Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
            title={t.mic.title}
            desc={t.mic.desc}
            status={micStatus}
            onClick={() => handleSingleCheck('mic')}
            textMap={textMap}
            isChecking={isChecking}
            checkingItem={checkingItem}
            itemName="mic"
            retryCount={retryCount.mic}
            t={t}
          />

          <CheckRow
            icon={<MapPin className="w-5 h-5 sm:w-6 sm:h-6" />}
            title={t.location.title}
            desc={t.location.desc}
            status={locationStatus}
            onClick={() => handleSingleCheck('location')}
            textMap={textMap}
            isChecking={isChecking}
            checkingItem={checkingItem}
            itemName="location"
            retryCount={retryCount.location}
            t={t}
          />

          <CheckRow
            icon={<Wifi className="w-5 h-5 sm:w-6 sm:h-6" />}
            title={t.internet.title}
            desc={t.internet.desc}
            status={internetStatus}
            onClick={() => handleSingleCheck('internet')}
            textMap={textMap}
            isChecking={isChecking}
            checkingItem={checkingItem}
            itemName="internet"
            retryCount={0}
            t={t}
          />
        </div>

        {/* Refresh Button for when permissions are stuck */}
        {anyFailed && retryCount.camera > 2 && retryCount.mic > 2 && retryCount.location > 2 && (
          <div className="text-center">
            <Button
              onClick={handleRefreshPage}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t.refreshPage}
            </Button>
          </div>
        )}

        {/* Continue Button */}
        <div className="pt-2 sm:pt-4 text-center">
          <Button
            disabled={!allPassed || isChecking}
            className={`w-full sm:w-auto min-w-[200px] h-11 sm:h-11 text-base sm:text-lg font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] ${
              allPassed && !isChecking
                ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl"
                : "bg-gray-300 cursor-not-allowed text-gray-500"
            }`}
            onClick={() => {
              localStorage.setItem("preExamDone", "true");
              navigate(`/instruction${window.location.search || ""}`);
            }}
          >
            {isChecking ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-5 animate-spin" />
                {t.checking}
              </span>
            ) : (
              allPassed ? t.continueButton : t.continueButton
            )}
          </Button>
        </div>

        {/* Footer Note */}
        {allPassed && !isChecking && (
          <div className="text-center text-xs sm:text-sm text-green-600 font-medium pt-1 sm:pt-2">
            <p className="bg-green-50/70 backdrop-blur-sm inline-block py-1 px-3 rounded-full">
              {t.footerNote}
            </p>
          </div>
        )}
      </div>
    </div>
  </>
  );
}

/* ================= REUSABLE ROW COMPONENT ================= */

interface CheckRowProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  status: CheckStatus;
  onClick: () => void;
  textMap: Record<CheckStatus, string>;
  isChecking: boolean;
  checkingItem: string | null;
  itemName: string;
  retryCount: number;
  t: typeof textDictionary;
}

function CheckRow({ icon, title, desc, status, onClick, textMap, isChecking, checkingItem, itemName, retryCount, t 
}: CheckRowProps) {
  const statusColors = {
    pending: "bg-gray-100/80 backdrop-blur-sm text-gray-800 border-gray-200",
    success: "bg-green-50/80 backdrop-blur-sm text-green-800 border-green-200",
    failed: "bg-red-50/80 backdrop-blur-sm text-red-800 border-red-200",
    slow: "bg-yellow-50/80 backdrop-blur-sm text-yellow-800 border-yellow-200"
  };

  const iconColors = {
    pending: "text-gray-600",
    success: "text-green-600",
    failed: "text-red-600",
    slow: "text-yellow-600"
  };
  
  const isLoading = checkingItem === itemName;
  const showRetry = status === "failed" && retryCount < 3;
  
  // Button color mapping
  const getButtonColor = () => {
    if (status === "pending") return "bg-blue-600 hover:bg-blue-700 text-white";
    if (status === "success") return "bg-green-600 hover:bg-green-700 text-white cursor-default";
    if (status === "failed") return "bg-red-600 hover:bg-red-700 text-white";
    return "bg-blue-600 hover:bg-blue-700 text-white";
  };
  
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-2 rounded-xl transition-all duration-200 hover:shadow-lg backdrop-blur-sm ${
      statusColors[status]
    }`}>
      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-0">
        <div className={`p-1.5 sm:p-2 rounded-lg transition-colors duration-200 ${iconColors[status]}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-gray-800 text-sm sm:text-base truncate`}>
            {title}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {desc}
          </p>
          {status === "failed" && retryCount > 0 && (
            <p className="text-xs text-red-500 mt-1">
              {t.retry} {retryCount}/3
            </p>
          )}
        </div>
      </div>
      
      <Button
        onClick={onClick}
        disabled={isChecking || status === "success"}
        className={`w-full sm:w-auto min-w-[100px] sm:min-w-[120px] h-9 sm:h-10 text-sm sm:text-base font-medium transition-all duration-200 ${getButtonColor()}`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="hidden sm:inline">{t.checking}</span>
          </div>
        ) : (
          showRetry ? t.retry : textMap[status]
        )}
      </Button>
    </div>
  );
}

