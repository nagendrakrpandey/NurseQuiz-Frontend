
export const BASE_URL = "http://localhost:9091";
export const BASE_URL1 = "http://localhost:9091/api";
export const BASE_URL3 = "http://localhost:9091/api";
export const BASE_Img = "http://localhost:9091/api";
export const FACE_API_BASE_URL = "https://tora-pantaletted-summarily.ngrok-free.dev/api/face";


// export const BASE_URL = "https://amino-viability-clobber.ngrok-free.dev";
// export const BASE_URL1 = "https://amino-viability-clobber.ngrok-free.dev/api";
// export const BASE_URL3 = "https://amino-viability-clobber.ngrok-free.dev/api";


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
  
  // Enrollment APIsn
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
  duration: number; 
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

// const headers = {
//   "Content-Type": "application/json"
// };

const headers = {
  "Content-Type": "application/json", "ngrok-skip-browser-warning": "true"
};

export const FACE_API = {
  REGISTER: `${FACE_API_BASE_URL}/register`,
  VERIFY: `${FACE_API_BASE_URL}/verify`,
};
                     
export const FACE_API_INACTIVE_MESSAGE = "Face API is not active. Please try again later.";

export type FaceRegisterStatus =
  | "ok"
  | "error"
  | "no_face"
  | "multiple_faces"
  | "too_far"
  | "blurry";

export interface FaceRegisterPayload {
  user_id: string;
  team_member_id: string;
  imageBase64: string;
}

export interface FaceRegisterResponse {
  status: FaceRegisterStatus | string;
  user_id?: string;
  team_member_id?: string;
  reason?: string;
}

export interface FaceVerifyPayload {
  user_id: string;
  imageBase64: string;
}

export interface FaceVerifyTeamMember {
  team_member_id: string;
  status: "ok" | "not_visible" | string;
  alert: boolean;
  score?: number;
}

export interface FaceVerifyAlertFace {
  face_index: number;
  bbox?: number[];
  status?: string;
}

export interface FaceVerifyAlert {
  type: string;
  message?: string;
  faces?: FaceVerifyAlertFace[];
}

export interface FaceVerifyResponse {
  status: "ok" | "alert" | "no_reference" | "error" | string;
  user_id?: string;
  team_members?: FaceVerifyTeamMember[];
  alerts?: FaceVerifyAlert[];
  detected_faces_count?: number;
  reason?: string;
}

export interface FaceWarningRequest {
  userId?: number;
  candidateId?: number;
  batchId: number;
  warningType: string;
  memberName?: string;
  duration?: number;
  timestamp?: string;
  details?: string;
}

export interface FaceWarningResponse {
  id?: number;
  userId?: number;
  user_id?: number;
  candidateId: number;
  candidate_id?: number;
  batchId: number;
  batch_id?: number;
  warningType: string;
  warning_type?: string;
  warningCount?: number;
  warning_count?: number;
  memberId?: string;
  member_id?: string;
  memberName?: string;
  member_name?: string;
  duration?: number;
  durationSeconds?: number;
  duration_seconds?: number;
  timestamp?: string;
  details?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const FACE_WARNING_API = {
  SAVE: `${BASE_URL1}/proctor/face-warning`,
  GET_CANDIDATE: `${BASE_URL1}/proctor/face-warning/user`,
  GET_BATCH: `${BASE_URL1}/proctor/face-warning/batch`,
};

const ACCESS_TOKEN_KEY = "token";
const LEGACY_ACCESS_TOKEN_KEY = "authToken";
const REFRESH_TOKEN_KEY = "refreshToken";
let autoRefreshInstalled = false;
let refreshRequest: Promise<string | null> | null = null;

const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

const cleanBearerToken = (value: string | null | undefined) =>
  String(value || "").replace(/^Bearer\s+/i, "").trim();

export const getStoredAccessToken = () => {
  if (!isBrowser()) return "";
  return cleanBearerToken(localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY));
};

export const getStoredRefreshToken = () => {
  if (!isBrowser()) return "";

  const directToken = cleanBearerToken(localStorage.getItem(REFRESH_TOKEN_KEY));
  if (directToken) return directToken;

  try {
    const storedUser = JSON.parse(localStorage.getItem("userData") || localStorage.getItem("adminData") || "{}");
    return cleanBearerToken(storedUser?.refreshToken || storedUser?.refresh_token);
  } catch {
    return "";
  }
};

export const saveAuthTokens = (token?: string | null, refreshToken?: string | null) => {
  if (!isBrowser()) return;

  const accessToken = cleanBearerToken(token);
  const nextRefreshToken = cleanBearerToken(refreshToken);

  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(LEGACY_ACCESS_TOKEN_KEY, accessToken);
  }

  if (nextRefreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);
  }

  ["userData", "adminData"].forEach((key) => {
    const storedValue = localStorage.getItem(key);
    if (!storedValue) return;

    try {
      const parsedValue = JSON.parse(storedValue);
      if (accessToken) parsedValue.token = accessToken;
      if (nextRefreshToken) parsedValue.refreshToken = nextRefreshToken;
      localStorage.setItem(key, JSON.stringify(parsedValue));
    } catch {
      // Ignore stale non-JSON storage values.
    }
  });
};

const parseResponseBody = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const postFaceJson = async <TResponse>(url: string, payload: unknown): Promise<TResponse> => {
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        ...headers,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(FACE_API_INACTIVE_MESSAGE);
  }

  const responseBody = await parseResponseBody(response);
  const hasFaceStatus =
    responseBody &&
    typeof responseBody === "object" &&
    "status" in (responseBody as Record<string, unknown>);

  if (!response.ok && hasFaceStatus) {
    return responseBody as TResponse;
  }

  if (!response.ok || !hasFaceStatus) {
    throw new Error(FACE_API_INACTIVE_MESSAGE);
  }

  return responseBody as TResponse;
};

export const registerFaceReference = (payload: FaceRegisterPayload) =>
  postFaceJson<FaceRegisterResponse>(FACE_API.REGISTER, payload);

export const verifyFaceFrame = (payload: FaceVerifyPayload) =>
  postFaceJson<FaceVerifyResponse>(FACE_API.VERIFY, payload);

export const saveFaceWarning = async (payload: FaceWarningRequest) => {
  const response = await fetch(FACE_WARNING_API.SAVE, {
    method: "POST",
    headers: {
      ...headers,
      Authorization: `Bearer ${getStoredAccessToken()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to save face warning: ${response.statusText}`);
  }

  return (await response.json()) as FaceWarningResponse;
};

const parseJsonOrText = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const buildFaceWarningCandidateUrl = (candidateId: number, batchId: number) =>
  `${FACE_WARNING_API.GET_CANDIDATE}/${candidateId}/batch/${batchId}`;

const buildFaceWarningCandidateAltUrl = (candidateId: number, batchId: number) =>
  `${BASE_URL1}/proctor/face-warning/candidate/${candidateId}/batch/${batchId}`;

const normalizeFaceWarningsPayload = (payload: unknown): FaceWarningResponse[] => {
  if (Array.isArray(payload)) return payload as FaceWarningResponse[];

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const candidateRows = [
      record.data,
      record.warnings,
      record.faceWarnings,
      record.face_warnings,
      record.rows,
      record.content,
    ];

    const rows = candidateRows.find(Array.isArray);
    if (Array.isArray(rows)) return rows as FaceWarningResponse[];
  }

  return [];
};

const mergeFaceWarnings = (warningGroups: FaceWarningResponse[][]) => {
  const seen = new Set<string>();
  const merged: FaceWarningResponse[] = [];

  warningGroups.flat().forEach((warning) => {
    const key = warning.id
      ? `id:${warning.id}`
      : [
          warning.candidateId,
          warning.batchId,
          warning.warningType,
          warning.memberId || warning.member_id || "",
          warning.memberName || "",
          warning.timestamp || warning.createdAt || "",
          warning.details || "",
        ].join("|");

    if (seen.has(key)) return;
    seen.add(key);
    merged.push(warning);
  });

  return merged;
};

export const getCandidateFaceWarnings = async (userId: number, batchId: number, candidateId?: number) => {
  const authorizationHeader = {
    ...headers,
    Authorization: `Bearer ${getStoredAccessToken()}`,
  };

  const fetchWarnings = async (url: string) => {
    const response = await fetch(url, {
      method: "GET",
      headers: authorizationHeader,
    });

    const body = await parseJsonOrText(response);
    if (response.ok) {
      return normalizeFaceWarningsPayload(body);
    }

    return Promise.reject({
      status: response.status,
      statusText: response.statusText,
      body,
      url,
    });
  };

  const primaryUrl = buildFaceWarningCandidateUrl(userId, batchId);
  const fallbackUrl = buildFaceWarningCandidateAltUrl(userId, batchId);
  const candidateUrl = candidateId && candidateId !== userId
    ? buildFaceWarningCandidateAltUrl(candidateId, batchId)
    : null;

  try {
    const primaryWarnings = await fetchWarnings(primaryUrl);
    if (!candidateUrl) return primaryWarnings;

    try {
      const candidateWarnings = await fetchWarnings(candidateUrl);
      return mergeFaceWarnings([primaryWarnings, candidateWarnings]);
    } catch {
      return primaryWarnings;
    }
  } catch (primaryError) {
    if (
      primaryError &&
      typeof primaryError === "object" &&
      (primaryError as Record<string, unknown>).status === 404
    ) {
      try {
        const fallbackWarnings = await fetchWarnings(fallbackUrl);
        if (!candidateUrl) return fallbackWarnings;

        try {
          const candidateWarnings = await fetchWarnings(candidateUrl);
          return mergeFaceWarnings([fallbackWarnings, candidateWarnings]);
        } catch {
          return fallbackWarnings;
        }
      } catch (fallbackError) {
        const errorDetail = fallbackError as Record<string, unknown>;
        throw new Error(
          `Failed to fetch candidate face warnings from fallback endpoint: ${errorDetail.status || "unknown"} ${
            errorDetail.statusText || ""
          } ${typeof errorDetail.body === "string" ? errorDetail.body : JSON.stringify(errorDetail.body)}`.trim()
        );
      }
    }

    const errorDetail = primaryError as Record<string, unknown>;
    throw new Error(
      `Failed to fetch candidate face warnings: ${errorDetail.status || "unknown"} ${
        errorDetail.statusText || ""
      } ${typeof errorDetail.body === "string" ? errorDetail.body : JSON.stringify(errorDetail.body)}`.trim()
    );
  }
};

export const getBatchFaceWarnings = async (batchId: number) => {
  const response = await fetch(`${FACE_WARNING_API.GET_BATCH}/${batchId}`, {
    method: "GET",
    headers: {
      ...headers,
      Authorization: `Bearer ${getStoredAccessToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch batch face warnings: ${response.statusText}`);
  }

  return (await response.json()) as FaceWarningResponse[];
};

const refreshAccessToken = async (fetchImpl: typeof fetch) => {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  const response = await fetchImpl(`${BASE_URL}/api/auth/refresh-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) return null;

  const payload = await parseResponseBody(response);
  const record = payload && typeof payload === "object" ? payload as Record<string, any> : {};
  const token = cleanBearerToken(record.token || record.accessToken || record.access_token || record.data?.token);
  const nextRefreshToken = cleanBearerToken(record.refreshToken || record.refresh_token || record.data?.refreshToken) || refreshToken;

  if (!token) return null;

  saveAuthTokens(token, nextRefreshToken);
  return token;
};

const getRequestUrl = (input: RequestInfo | URL) => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

const shouldSkipRefresh = (input: RequestInfo | URL) => {
  const url = getRequestUrl(input);
  return (
    url.includes("/api/auth/login") ||
    url.includes("/api/auth/refresh-token") ||
    url.startsWith(FACE_API_BASE_URL)
  );
};

const withAuthorizationHeader = (input: RequestInfo | URL, init: RequestInit | undefined, token: string): RequestInit => {
  const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
  headers.set("Authorization", `Bearer ${token}`);

  return {
    ...init,
    headers,
  };
};

export const installAutoTokenRefresh = () => {
  if (!isBrowser() || autoRefreshInstalled) return;

  autoRefreshInstalled = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);

    if (response.status !== 401 || shouldSkipRefresh(input) || !getStoredRefreshToken()) {
      return response;
    }

    refreshRequest ||= refreshAccessToken(originalFetch).finally(() => {
      refreshRequest = null;
    });

    const newToken = await refreshRequest;
    if (!newToken) return response;

    return originalFetch(input, withAuthorizationHeader(input, init, newToken));
  };
};

installAutoTokenRefresh();
