import { BASE_URL } from "@/Service/api";

export const PNG_MIME_TYPE = "image/png";
export const JPEG_MIME_TYPE = "image/jpeg";

const WEBM_MIME_TYPES = [
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

const VIDEO_MIME_TYPES_WITH_AUDIO = [
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9,opus",
  "video/webm",
];

export interface EvidenceUploadMeta {
  teamMemberId: number;
  teamMemberName: string;
  type: string;
  batchCode: string;
  uploadedAt?: string;
  uploadDate?: string;
  uploadTime?: string;
}

interface BuildEvidenceJsonPayloadOptions {
  dataUrl: string;
  fileName: string;
  mimeType: string;
  meta: EvidenceUploadMeta;
}

interface UploadEvidenceMediaOptions {
  endpoint: string;
  token: string;
  file: Blob;
  fileName: string;
  meta: EvidenceUploadMeta;
}

const STORED_FILE_PATTERN = /\.(pdf|png|jpe?g|webp|gif|mp4|webm|mov|avi|mkv|zip)(?:[?#].*)?$/i;
const PREVIEW_ENDPOINT_PATH = "/api/register/preview-file";

const isInlineBrowserUrl = (value: string) => /^(blob:|data:)/i.test(value);

const isStoredFileName = (value: string) =>
  STORED_FILE_PATTERN.test(value) && !value.includes("/") && !value.includes("\\");

export const normalizeBackendUploadPath = (value: unknown, fallbackFolder?: string) => {
  if (typeof value !== "string" || !value.trim()) return "";

  const normalizedValue = value.trim().replace(/\\/g, "/");
  if (!normalizedValue || isInlineBrowserUrl(normalizedValue)) return normalizedValue;

  if (/^https?:/i.test(normalizedValue)) {
    try {
      const parsed = new URL(normalizedValue);
      const uploadsIndex = parsed.pathname.indexOf("/uploads/");
      if (uploadsIndex >= 0) {
        return `uploads/${decodeURIComponent(parsed.pathname.slice(uploadsIndex + "/uploads/".length))}`;
      }

      return "";
    } catch {
      return "";
    }
  }

  const previewIndex = normalizedValue.indexOf(PREVIEW_ENDPOINT_PATH);
  if (previewIndex >= 0) return "";

  const uploadsIndex = normalizedValue.indexOf("uploads/");
  if (uploadsIndex >= 0) return normalizedValue.slice(uploadsIndex).replace(/^\/+/, "");

  if (normalizedValue.startsWith("/uploads/")) {
    return normalizedValue.replace(/^\/+/, "");
  }

  if (isStoredFileName(normalizedValue)) {
    const cleanFolder = typeof fallbackFolder === "string"
      ? fallbackFolder.trim().replace(/^\/+|\/+$/g, "")
      : "";
    return cleanFolder ? `uploads/${cleanFolder}/${normalizedValue}` : `uploads/${normalizedValue}`;
  }

  return normalizedValue.replace(/^\/+/, "");
};

export const buildBackendFilePreviewUrl = (value: unknown, fallbackFolder?: string) => {
  if (typeof value !== "string" || !value.trim()) return null;

  const normalizedValue = value.trim().replace(/\\/g, "/");
  if (isInlineBrowserUrl(normalizedValue)) return normalizedValue;

  if (/^https?:/i.test(normalizedValue)) {
    const uploadPath = normalizeBackendUploadPath(normalizedValue, fallbackFolder);
    return uploadPath
      ? `${BASE_URL}${PREVIEW_ENDPOINT_PATH}?path=${encodeURIComponent(uploadPath)}`
      : normalizedValue;
  }

  if (normalizedValue.startsWith(PREVIEW_ENDPOINT_PATH)) {
    return `${BASE_URL}${normalizedValue}`;
  }

  const uploadPath = normalizeBackendUploadPath(normalizedValue, fallbackFolder);
  return uploadPath
    ? `${BASE_URL}${PREVIEW_ENDPOINT_PATH}?path=${encodeURIComponent(uploadPath)}`
    : null;
};

const buildStorageFormat = (mimeType: string) => {
  return getFileExtensionFromMimeType(mimeType);
};

const parseResponseBody = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      return await response.json();
    }

    const text = await response.text();
    return text ? { message: text } : null;
  } catch {
    return null;
  }
};

const isSuccessfulResponse = (response: Response, result: unknown) => {
  if (!response.ok) return false;

  if (result && typeof result === "object" && "success" in result) {
    return result.success === true;
  }

  return true;
};

export const getFileExtensionFromMimeType = (mimeType: string) => {
  const normalizedMimeType = mimeType.toLowerCase();

  if (normalizedMimeType.includes("png")) return "png";
  if (normalizedMimeType.includes("jpeg") || normalizedMimeType.includes("jpg")) return "jpg";
  if (normalizedMimeType.includes("mp4")) return "mp4";
  if (normalizedMimeType.includes("webm")) return "webm";

  return "bin";
};

export const getPreferredVideoMimeType = (requireAudio = false) => {
  if (typeof MediaRecorder === "undefined") {
    return requireAudio ? VIDEO_MIME_TYPES_WITH_AUDIO[0] : WEBM_MIME_TYPES[WEBM_MIME_TYPES.length - 1];
  }

  const candidateMimeTypes = requireAudio
    ? VIDEO_MIME_TYPES_WITH_AUDIO
    : WEBM_MIME_TYPES;
  const supportedMimeType = candidateMimeTypes.find((mimeType) =>
    MediaRecorder.isTypeSupported(mimeType)
  );

  return supportedMimeType || "";
};

export const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Failed to read media blob"));
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to convert media blob to data URL"));
    };

    reader.readAsDataURL(blob);
  });

export const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

export const canvasToBlob = (
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error(`Failed to create ${mimeType} blob`));
    }, mimeType, quality);
  });

export const buildEvidenceJsonPayload = ({
  dataUrl,
  fileName,
  mimeType,
  meta,
}: BuildEvidenceJsonPayloadOptions) => ({
  ...meta,
  imageData: dataUrl,
  fileName,
  mimeType,
  fileExtension: getFileExtensionFromMimeType(mimeType),
  storageFormat: buildStorageFormat(mimeType),
});

export const uploadEvidenceMedia = async ({
  endpoint,
  token,
  file,
  fileName,
  meta,
}: UploadEvidenceMediaOptions) => {
  const mimeType = file.type || "application/octet-stream";
  const sharedFields = {
    ...meta,
    fileName,
    mimeType,
    fileExtension: getFileExtensionFromMimeType(mimeType),
    storageFormat: buildStorageFormat(mimeType),
  };

  const formData = new FormData();
  formData.append("file", file, fileName);

  Object.entries(sharedFields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  const multipartResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const multipartResult = await parseResponseBody(multipartResponse);
  return isSuccessfulResponse(multipartResponse, multipartResult);
};
