import React, { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import axios from "axios";

const Register: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [examId, setExamId] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [registeredList, setRegisteredList] = useState<string[]>([]);
  const [msg, setMsg] = useState({ text: "💡 Ready | Capture face and register or verify", type: "info" });
  const [isLoading, setIsLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const API_BASE = "http://localhost:9090/api/proctor";

  const showMessage = (text: string, type: "info" | "success" | "error" | "warning" = "info") => {
    setMsg({ text, type });
    setTimeout(() => {
      setMsg(prev => prev.text === text ? { ...prev, type: "info" } : prev);
    }, 5000);
  };

  const getScreenshotBlob = useCallback(async () => {
    if (!webcamRef.current) {
      showMessage("❌ Camera not initialized yet", "error");
      return null;
    }
    const screenshot = webcamRef.current.getScreenshot();
    if (!screenshot) {
      showMessage("📷 Could not capture image. Check camera permissions.", "error");
      return null;
    }
    try {
      const blob = await fetch(screenshot).then(res => res.blob());
      return blob;
    } catch (err) {
      showMessage("Failed to capture frame", "error");
      return null;
    }
  }, []);

  const handleRegister = async () => {
    const exam = examId.trim();
    const name = candidateName.trim();

    if (!exam) {
      showMessage("⚠️ Exam ID is required", "warning");
      return;
    }
    if (!name) {
      showMessage("⚠️ Candidate name is required", "warning");
      return;
    }
    if (registeredList.length >= 3) {
      showMessage("❌ Only 3 candidates allowed per exam! Cannot register more.", "error");
      return;
    }

    setIsLoading(true);
    const blob = await getScreenshotBlob();
    if (!blob) {
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("examId", exam);
    formData.append("name", name);
    formData.append("file", blob, "face_capture.jpg");

    try {
      const response = await axios.post(`${API_BASE}/register-face`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const data = response.data;
      if (data.status === "SUCCESS") {
        if (!registeredList.includes(name)) {
          const updated = [...registeredList, name];
          setRegisteredList(updated);
        }
        showMessage(`✅ ${data.message || "Registration successful!"}`, "success");
        setCandidateName("");
      } else if (data.status === "WARNING") {
        showMessage(`⚠️ ${data.message}`, "warning");
      } else {
        showMessage(`❌ ${data.message || "Registration failed"}`, "error");
      }
    } catch (err) {
      console.error(err);
      const errMsg = (err as any).response?.data?.message || "Server error during registration";
      showMessage(`❌ Registration failed: ${errMsg}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    const exam = examId.trim();
    if (!exam) {
      showMessage("⚠️ Please enter Exam ID before verification", "warning");
      return;
    }

    setIsLoading(true);
    const blob = await getScreenshotBlob();
    if (!blob) {
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("examId", exam);
    formData.append("file", blob, "verification_frame.jpg");

    try {
      const response = await axios.post(`${API_BASE}/check`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const data = response.data;
      if (data.status === "SUCCESS") {
        showMessage(`🎉 ${data.message}`, "success");
      } else if (data.status === "WARNING") {
        let warningText = data.message;
        if (data.missing && data.missing.length) {
          warningText += ` | Missing: ${data.missing.join(", ")}`;
        }
        if (data.notMatched && data.notMatched.length) {
          warningText += ` | Not matched: ${data.notMatched.join(", ")}`;
        }
        showMessage(`⚠️ ${warningText}`, "warning");
      } else {
        showMessage(`❌ ${data.message || "Verification failed"}`, "error");
      }
    } catch (err) {
      console.error(err);
      const errorMsg = (err as any).response?.data?.message || "Verification server error";
      showMessage(`❌ Verification error: ${errorMsg}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newExam = e.target.value;
    setExamId(newExam);
    setRegisteredList([]);
    showMessage(`🔄 Exam ID changed. Registered list reset for new exam.`, "info");
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (webcamRef.current && webcamRef.current.video?.readyState === 4) {
        setCameraReady(true);
      } else if (webcamRef.current) {
        setCameraReady(true);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={styles.appContainer}>
      <div style={styles.glassCard}>
        <h1 style={styles.title}>
          🎓 AI Proctoring
          <span style={styles.bolt}>⚡</span>
        </h1>
        <div style={styles.sub}>Face Registration + Real-time Verification</div>

        <div style={styles.formGroup}>
          <label style={styles.label}>📋 Exam ID *</label>
          <input
            type="text"
            style={styles.input}
            value={examId}
            onChange={handleExamChange}
            placeholder="e.g., FINAL-2025-MED101"
            autoComplete="off"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>👤 Candidate Name *</label>
          <input
            type="text"
            style={styles.input}
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            placeholder="Full name as per records"
            autoComplete="off"
          />
        </div>

        <div style={styles.cameraContainer}>
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode: "user",
              width: { ideal: 640 },
              height: { ideal: 480 }
            }}
            style={styles.webcam}
          />
        </div>

        <div style={styles.buttonGroup}>
          <button
            style={{ ...styles.btn, ...styles.btnPrimary }}
            onClick={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? "⏳ PROCESSING..." : "📸 REGISTER FACE"}
          </button>
          <button
            style={{ ...styles.btn, ...styles.btnSecondary }}
            onClick={handleVerify}
            disabled={isLoading}
          >
            {isLoading ? "⏳ VERIFYING..." : "✅ VERIFY IDENTITY"}
          </button>
        </div>

        <div style={styles.infoPanel}>
          <div style={styles.registeredTitle}>
            <span>👥 REGISTERED CANDIDATES</span>
            <span style={styles.maxBadge}>(max 3 per exam)</span>
          </div>
          <div style={styles.badgeList}>
            {registeredList.length === 0 ? (
              <span style={styles.emptyText}>— no candidates yet —</span>
            ) : (
              registeredList.map((name, idx) => (
                <span key={idx} style={styles.badge}>{name}</span>
              ))
            )}
          </div>
          <div style={styles.counterInfo}>{registeredList.length}/3 registered</div>
        </div>

        <div style={{
          ...styles.msgArea,
          ...(msg.type === "success" ? styles.successMsg : {}),
          ...(msg.type === "error" ? styles.errorMsg : {}),
          ...(msg.type === "warning" ? styles.warningMsg : {})
        }}>
          {msg.text}
        </div>

        {!cameraReady && (
          <div style={styles.cameraStatus}>
            ⏳ Waiting for camera... Please allow camera access
          </div>
        )}
      </div>
    </div>
  );
};

// Styles as JavaScript objects
const styles: { [key: string]: React.CSSProperties } = {
  appContainer: {
    maxWidth: "800px",
    margin: "0 auto",
  },
  glassCard: {
    background: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(12px)",
    borderRadius: "2rem",
    padding: "2rem",
    boxShadow: "0 25px 45px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.15)",
    transition: "all 0.3s ease",
  },
  title: {
    textAlign: "center",
    color: "white",
    fontWeight: 700,
    fontSize: "1.9rem",
    letterSpacing: "-0.3px",
    marginBottom: "0.25rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
  },
  bolt: {
    fontSize: "1.2rem",
  },
  sub: {
    textAlign: "center",
    color: "#b0e0ff",
    fontSize: "0.9rem",
    marginBottom: "2rem",
    borderBottom: "1px dashed rgba(255, 255, 255, 0.2)",
    display: "inline-block",
    width: "auto",
    marginLeft: "auto",
    marginRight: "auto",
    paddingBottom: "8px",
  },
  formGroup: {
    marginBottom: "1.4rem",
  },
  label: {
    display: "block",
    color: "#f0f9ff",
    fontWeight: 500,
    marginBottom: "6px",
    fontSize: "0.85rem",
    letterSpacing: "0.3px",
  },
  input: {
    width: "100%",
    padding: "14px 18px",
    borderRadius: "60px",
    border: "none",
    background: "rgba(255, 255, 255, 0.2)",
    backdropFilter: "blur(4px)",
    color: "white",
    fontSize: "1rem",
    outline: "none",
    transition: "0.2s",
    fontWeight: 500,
  },
  cameraContainer: {
    background: "#00000055",
    borderRadius: "28px",
    padding: "12px",
    margin: "20px 0",
    display: "flex",
    justifyContent: "center",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
  },
  webcam: {
    borderRadius: "20px",
    width: "100%",
    maxWidth: "400px",
    height: "auto",
    transform: "scaleX(-1)",
    background: "#1e2a32",
  },
  buttonGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "15px",
    justifyContent: "center",
    margin: "25px 0 20px",
  },
  btn: {
    border: "none",
    padding: "12px 28px",
    borderRadius: "60px",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },
  btnPrimary: {
    background: "linear-gradient(95deg, #3b82f6, #2563eb)",
    color: "white",
  },
  btnSecondary: {
    background: "rgba(255, 255, 255, 0.2)",
    backdropFilter: "blur(4px)",
    color: "white",
    border: "1px solid rgba(255, 255, 255, 0.4)",
  },
  infoPanel: {
    background: "rgba(0, 0, 0, 0.55)",
    borderRadius: "1.5rem",
    padding: "1rem 1.5rem",
    marginTop: "1.5rem",
  },
  registeredTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#a5f3c3",
    fontWeight: 600,
    marginBottom: "12px",
    fontSize: "1rem",
    flexWrap: "wrap",
  },
  maxBadge: {
    fontSize: "0.75rem",
    color: "#cbd5e1",
  },
  badgeList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  badge: {
    background: "#0f212e",
    padding: "6px 16px",
    borderRadius: "40px",
    color: "#bbf0ff",
    fontWeight: 500,
    fontSize: "0.85rem",
    borderLeft: "3px solid #3b82f6",
  },
  emptyText: {
    color: "#aaa",
    fontSize: "0.8rem",
  },
  counterInfo: {
    fontSize: "0.8rem",
    color: "#cbd5e1",
    marginTop: "5px",
    textAlign: "right",
  },
  msgArea: {
    background: "#00000066",
    borderRadius: "40px",
    padding: "12px 20px",
    marginTop: "18px",
    textAlign: "center",
    fontWeight: 500,
    color: "#facc15",
    transition: "0.2s",
    fontSize: "0.9rem",
    wordBreak: "break-word",
  },
  successMsg: {
    color: "#86efac",
    background: "#064e3b55",
    borderLeft: "4px solid #22c55e",
  },
  errorMsg: {
    color: "#fca5a5",
    background: "#7f1d1d55",
    borderLeft: "4px solid #ef4444",
  },
  warningMsg: {
    color: "#fed7aa",
    background: "#78350f55",
    borderLeft: "4px solid #f97316",
  },
  cameraStatus: {
    marginTop: "12px",
    textAlign: "center",
    fontSize: "0.8rem",
    color: "#facc15",
    background: "#00000055",
    padding: "8px",
    borderRadius: "40px",
  },
};

export default Register;