export const PNG_MIME_TYPE = "image/png";
export const JPEG_MIME_TYPE = "image/jpeg";

const MP4_MIME_TYPES = [
  "video/mp4;codecs=h264,aac",
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4",
];

const WEBM_MIME_TYPES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
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

export const getPreferredVideoMimeType = () => {
  if (typeof MediaRecorder === "undefined") {
    return MP4_MIME_TYPES[MP4_MIME_TYPES.length - 1];
  }

  const supportedMimeType = [...MP4_MIME_TYPES, ...WEBM_MIME_TYPES].find((mimeType) =>
    MediaRecorder.isTypeSupported(mimeType)
  );

  return supportedMimeType || MP4_MIME_TYPES[MP4_MIME_TYPES.length - 1];
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
