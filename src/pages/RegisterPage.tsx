import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  CheckCircle2,
  Building2,
  Users,
  CreditCard,
  PartyPopper,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Upload,
  X,
  AlertCircle,
  Eye,
  Loader2
} from "lucide-react";
import { BASE_URL } from "@/Service/api";
import {
  EMPLOYEE_ID_MAX_LENGTH,
  MAX_ADDRESS_WORDS,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_ORGANIZATION_NAME_LENGTH,
  MAX_REGISTERED_ID_LENGTH,
  MAX_ROLE_LENGTH,
  MOBILE_NUMBER_LENGTH,
  PINCODE_LENGTH,
  getAddressValidationMessage,
  getDuplicateFieldMessage,
  getEmailValidationMessage,
  getEmployeeIdValidationMessage,
  getMobileValidationMessage,
  getNameValidationMessage,
  getOrganizationNameValidationMessage,
  getRegisteredIdValidationMessage,
  normalizeEmail as normalizeValidatedEmail,
  sanitizeDigits,
  sanitizeEmailInput,
  sanitizeEmployeeId,
  sanitizePersonName,
} from "@/lib/formValidation";


interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayFailedResponse {
  error?: {
    description?: string;
  };
}

interface RazorpayInstance {
  on: (event: "payment.failed", handler: (response: RazorpayFailedResponse) => void) => void;
  open: () => void;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayPaymentResponse) => void;
  prefill: {
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
}

interface NormalizedRazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const steps = [
  { icon: Building2, label: "Organization" },
  { icon: Users, label: "Team" },
  { icon: CreditCard, label: "Payment" },
  { icon: PartyPopper, label: "Confirmation" },
];

interface RegisterFormData {
  organizationName: string;
  hospitalRegisteredId: string;
  spocName: string;
  hospitalCategory: string;
  pincode: string;
  state: string;
  district: string;
  address: string;
  orgEmail: string;
  orgPhone: string;
}

interface Member {
  id?: number;
  userId?: number;
  organizationId?: number;
  name: string;
  email: string;
  hospitalEmployeeId: string;
  role: string;
  customRole: string;
  evidence?: File | string | null;
}

const asPlainRecord = (value: unknown): Record<string, any> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};

const readFirstString = (record: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return "";
};

const readFirstNumber = (record: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return 0;
};

const parseApiResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const normalizeRazorpayOrder = (payload: unknown): NormalizedRazorpayOrder | null => {
  const root = asPlainRecord(payload);
  const candidates = [
    root.data,
    root.order,
    root.result,
    root.razorpayOrder,
    root.razorpay_order,
    root.paymentOrder,
    root.payment_order,
    root,
  ]
    .map(asPlainRecord)
    .filter((record) => Object.keys(record).length > 0);

  for (const record of candidates) {
    const id = readFirstString(record, [
      "id",
      "orderId",
      "order_id",
      "razorpayOrderId",
      "razorpay_order_id",
    ]);
    const amount = readFirstNumber(record, ["amount", "amountInPaise", "amount_in_paise"]);
    const currency = readFirstString(record, ["currency"]) || "INR";

    if (id && amount > 0) {
      return { id, amount, currency };
    }
  }

  return null;
};

type MemberTextField = "name" | "email" | "hospitalEmployeeId" | "role" | "customRole";

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  type: "info" | "error" | "success";
}

interface DocumentPreviewState {
  isOpen: boolean;
  url: string;
  title: string;
  shouldRevoke: boolean;
}

interface RoleOption {
  value: string;
  label: string;
}

type OrganizationField = keyof RegisterFormData | "hospitalRegistrationCertificate";
type MemberField = "name" | "email" | "hospitalEmployeeId" | "role" | "customRole" | "evidence";
type MemberFieldErrors = Partial<Record<MemberField, string>>;

const HOSPITAL_CATEGORIES = [
  "Large Hospitals (300+ beds)",
  "Mid-sized Hospitals (100-300 beds)",
  "Small Hospitals (<100 beds)",
];

const OTHER_ROLE_VALUE = "OTHER";

const DEFAULT_ROLE_OPTIONS: RoleOption[] = [
  { value: "OT", label: "OT" },
  { value: "ICU", label: "ICU" },
  { value: "CSSD", label: "CSSD" },
  { value: OTHER_ROLE_VALUE, label: "Other" },
];

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
const MEMBER_DOCUMENT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp";
const DOCUMENT_SELECTION_LOADER_MS = 600;

const createEmptyMember = (): Member => ({
  name: "",
  email: "",
  hospitalEmployeeId: "",
  role: "",
  customRole: "",
  evidence: null,
});

const CustomDialog = ({
  isOpen,
  onClose,
  title,
  message,
  type = "info"
}: DialogState & { onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {type === "error" ? (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              ) : type === "success" ? (
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-blue-600" />
                </div>
              )}

              <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-gray-600 mt-2">{message}</p>

          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700">
              OK
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const RegisterPage = () => {
    console.log("BASE URL =", BASE_URL);
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [pageLoading, setPageLoading] = useState<boolean>(true);

  const [registrationId, setRegistrationId] = useState<string>("");
  const [enrollmentNumber, setEnrollmentNumber] = useState<string>("");

  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    title: "",
    message: "",
    type: "info"
  });
  const [documentPreview, setDocumentPreview] = useState<DocumentPreviewState>({
    isOpen: false,
    url: "",
    title: "",
    shouldRevoke: false
  });

  const [formData, setFormData] = useState<RegisterFormData>({
    organizationName: "",
    hospitalRegisteredId: "",
    spocName: "",
    hospitalCategory: "",
    address: "",
    pincode: "",
    state: "",
    district: "",
    orgEmail: "",
    orgPhone: ""
  });

  const [members, setMembers] = useState<Member[]>([createEmptyMember()]);
  const [hospitalRegistrationCertificate, setHospitalRegistrationCertificate] = useState<File | string | null>(null);
  const [hospitalDocumentLoading, setHospitalDocumentLoading] = useState(false);
  const [hospitalUploadProgress, setHospitalUploadProgress] = useState(0);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>(DEFAULT_ROLE_OPTIONS);
  const [memberDocumentLoading, setMemberDocumentLoading] = useState<Record<number, boolean>>({});
  const [teamUploadProgress, setTeamUploadProgress] = useState(0);
  const [organizationSubmitAttempted, setOrganizationSubmitAttempted] = useState(false);
  const [teamSubmitAttempted, setTeamSubmitAttempted] = useState(false);
  const [organizationTouchedFields, setOrganizationTouchedFields] = useState<
    Partial<Record<OrganizationField, boolean>>
  >({});
  const [memberTouchedFields, setMemberTouchedFields] = useState<
    Record<number, Partial<Record<MemberField, boolean>>>
  >({});
  const [registeredTeamMembers, setRegisteredTeamMembers] = useState<Member[]>([]);
  const [registeredTeamLoading, setRegisteredTeamLoading] = useState(false);

  const [paymentCompleted, setPaymentCompleted] = useState<boolean>(false);
  const [paymentProcessing, setPaymentProcessing] = useState<boolean>(false);

  const showDialog = (
    title: string,
    message: string,
    type: "info" | "error" | "success" = "info"
  ) => {
    setDialog({ isOpen: true, title, message, type });
  };

  const markOrganizationFieldTouched = (field: OrganizationField) => {
    setOrganizationTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  const markMemberFieldTouched = (index: number, field: MemberField) => {
    setMemberTouchedFields((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: true,
      },
    }));
  };

  const closeDialog = () => {
    setDialog({ isOpen: false, title: "", message: "", type: "info" });
  };

  const closeDocumentPreview = () => {
    setDocumentPreview({
      isOpen: false,
      url: "",
      title: "",
      shouldRevoke: false
    });
  };

  const normalizeEmail = normalizeValidatedEmail;

  const getDuplicateTeamEmail = () => {
    const emailCounts = new Map<string, number>();

    members.forEach((member) => {
      const email = normalizeEmail(member.email);
      if (email) emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
    });

    return Array.from(emailCounts.entries()).find(([, count]) => count > 1)?.[0] || "";
  };

  const getDuplicateTeamEmployeeId = () => {
    const employeeIdCounts = new Map<string, number>();

    members.forEach((member) => {
      const employeeId = sanitizeEmployeeId(member.hospitalEmployeeId);
      if (employeeId) employeeIdCounts.set(employeeId, (employeeIdCounts.get(employeeId) || 0) + 1);
    });

    return Array.from(employeeIdCounts.entries()).find(([, count]) => count > 1)?.[0] || "";
  };

  const getEvidenceKey = (file: File | string | null | undefined) => {
    if (!file) return "";
    if (file instanceof File) return `${file.name.trim().toLowerCase()}-${file.size}`;
    return "";
  };

  const getDuplicateTeamDocument = () => {
    const documentCounts = new Map<string, number>();

    members.forEach((member) => {
      const documentKey = getEvidenceKey(member.evidence);
      if (documentKey) documentCounts.set(documentKey, (documentCounts.get(documentKey) || 0) + 1);
    });

    return Array.from(documentCounts.entries()).find(([, count]) => count > 1)?.[0] || "";
  };

  const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

  const getHospitalRegistrationCertificatePath = (value: unknown): string =>
    String(
      readFieldByAliases(value, [
        "hospitalRegistrationCertificatePath",
        "hospitalRegistrationCertificate",
        "registrationCertPath",
        "registrationCertificatePath",
        "certificatePath",
      ]) || ""
    ).trim();

  const normalizeRoleOptions = (value: unknown): RoleOption[] => {
    const record = asRecord(value);
    const source = Array.isArray(record.data)
      ? record.data
      : Array.isArray(record.roles)
        ? record.roles
        : Array.isArray(value)
          ? value
          : [];

    const normalizedRoles = source
      .map((item: unknown) => {
        if (typeof item === "string") {
          const trimmed = item.trim();
          return trimmed ? { value: trimmed, label: trimmed } : null;
        }

        const itemRecord = asRecord(item);
        const value = String(itemRecord.value || itemRecord.code || itemRecord.name || itemRecord.label || "").trim();
        const label = String(itemRecord.label || itemRecord.name || itemRecord.value || itemRecord.code || "").trim();
        if (!value) return null;
        return (value.toLowerCase() === "other" || label.toLowerCase() === "other")
          ? { value: OTHER_ROLE_VALUE, label: "Other" }
          : { value, label: label || value };
      })
      .filter(Boolean) as RoleOption[];

    const hasOther = normalizedRoles.some((role) => role.value === OTHER_ROLE_VALUE || role.label.toLowerCase() === "other");
    return [...normalizedRoles, ...(hasOther ? [] : [{ value: OTHER_ROLE_VALUE, label: "Other" }])];
  };

  const getApiErrorMessage = (data: unknown, fallback: string) => {
    const record = asRecord(data);
    const message = String(record.message || record.error || fallback);
    const normalized = message.toLowerCase();
    const duplicateFieldMessage = getDuplicateFieldMessage(message);

    if (duplicateFieldMessage && duplicateFieldMessage !== message) return duplicateFieldMessage;

    if (
      (normalized.includes("email") || normalized.includes("mail")) &&
      (normalized.includes("already") || normalized.includes("exist") || normalized.includes("duplicate"))
    ) {
      return "Email already exists";
    }

    if (
      (normalized.includes("document") || normalized.includes("file")) &&
      (normalized.includes("already") || normalized.includes("exist") || normalized.includes("duplicate"))
    ) {
      return "Document already exists";
    }

    return message;
  };

  const readFieldByAliases = (value: unknown, aliases: string[]) => {
    const record = asRecord(value);
    if (!Object.keys(record).length) return undefined;
    const normalizedAliases = aliases.map((alias) => alias.replace(/[_\-\s]/g, "").toLowerCase());

    return Object.entries(record).find(([key]) =>
      normalizedAliases.includes(key.replace(/[_\-\s]/g, "").toLowerCase())
    )?.[1];
  };

  const normalizeRole = (value: unknown) => {
    const rawRole = String(
      readFieldByAliases(value, ["role", "department", "departmentName"]) ||
      ""
    ).trim();
    const rawRoleId = String(
      readFieldByAliases(value, ["roleId", "role_id", "departmentId", "department_id"]) ||
      ""
    ).trim();
    const roleKey = (rawRole || rawRoleId).toLowerCase();

    if (roleKey === "1" || roleKey === "lead" || roleKey === "ot" || roleKey.includes("operation")) return "OT";
    if (roleKey === "2" || roleKey === "member" || roleKey === "icu" || roleKey === "iccu" || roleKey.includes("intensive")) return "ICU";
    if (roleKey === "3" || roleKey === "admin" || roleKey === "cssd" || roleKey.includes("sterile")) return "CSSD";

    return rawRole;
  };

  const normalizeMemberRoleFields = (value: unknown) => {
    const normalizedRole = normalizeRole(value);
    const customRole = String(readFieldByAliases(value, ["customRole", "otherRole", "manualRole"]) || "").trim();
    const knownRole = DEFAULT_ROLE_OPTIONS.find((role) => role.value === normalizedRole && role.value !== OTHER_ROLE_VALUE);

    if (normalizedRole === OTHER_ROLE_VALUE) {
      return { role: OTHER_ROLE_VALUE, customRole };
    }

    return knownRole || !normalizedRole
      ? { role: normalizedRole, customRole: "" }
      : { role: OTHER_ROLE_VALUE, customRole: normalizedRole };
  };

  const getMemberEvidence = (value: unknown): File | string | null => {
    const record = asRecord(value);
    const evidence =
      record.evidence || record.evidencePath ||record.evidenceUrl ||
      record.document || record.documentPath ||record.documentUrl ||
      record.uploadDocument || record.uploadDocumentPath ||
      record.memberEvidence || record.memberEvidencePath ||
      record.memberDocument || record.memberDocumentPath ||
      record.employeeDocument || record.employeeDocumentPath ||
      record.hospitalEmployeeDocument || record.hospitalEmployeeDocumentPath ||
      record.hospitalEmployeeIdDocument ||
      record.hospitalEmployeeIdDocumentPath ||
      record.candidateEvidence ||
      record.candidateEvidencePath ||
      record.candidateDocument ||
      record.candidateDocumentPath ||
      record.filePath ||
      record.path ||
      record.idProofPath ||
      null;
    return evidence instanceof File || typeof evidence === "string" ? evidence : null;
  };

  const normalizeMember = (value: unknown, evidenceFallback: File | string | null = null): Member => {
    const roleFields = normalizeMemberRoleFields(value);

    return {
      id: Number(readFieldByAliases(value, ["id", "memberId", "member_id"]) || 0) || undefined,
      userId: Number(readFieldByAliases(value, ["userId", "user_id"]) || 0) || undefined,
      organizationId: Number(readFieldByAliases(value, ["organizationId", "organization_id", "registrationId", "registration_id"]) || 0) || undefined,
      name: String(readFieldByAliases(value, ["name", "fullName", "memberName"]) || ""),
      email: String(readFieldByAliases(value, ["email", "memberEmail", "userEmail"]) || ""),
      hospitalEmployeeId: String(
        readFieldByAliases(value, ["hospitalEmployeeId", "hospital_employee_id", "employeeId", "employee_id"]) || ""
      ),
      role: roleFields.role,
      customRole: roleFields.customRole,
      evidence: getMemberEvidence(value) || evidenceFallback
    };
  };

  const getFileName = (file: File | string | null | undefined) => {
    if (!file) return "";
    return typeof file === "string" ? file.split(/[\\/]/).pop() || file : file.name;
  };

  const setDocumentLoadingForIndexes = (indexes: number[], isLoading: boolean) => {
    setMemberDocumentLoading((prev) => {
      const next = { ...prev };

      indexes.forEach((index) => {
        if (isLoading) {
          next[index] = true;
        } else {
          delete next[index];
        }
      });

      return next;
    });
  };

  const waitForDocumentSelectionLoader = (startedAt: number) =>
    new Promise<void>((resolve) => {
      const elapsedMs = Date.now() - startedAt;
      window.setTimeout(resolve, Math.max(0, DOCUMENT_SELECTION_LOADER_MS - elapsedMs));
    });

  const getDocumentPreviewUrl = (file: File | string | null | undefined) => {
    if (!file) return { url: "", shouldRevoke: false };

    if (file instanceof File) {
      return { url: URL.createObjectURL(file), shouldRevoke: true };
    }

    const rawPath = file.trim();
    if (!rawPath) return { url: "", shouldRevoke: false };
    if (/^(https?:|blob:|data:)/i.test(rawPath)) return { url: rawPath, shouldRevoke: false };

    const normalizedPath = rawPath.replace(/\\/g, "/");
    if (normalizedPath.startsWith("/")) return { url: `${BASE_URL}${normalizedPath}`, shouldRevoke: false };
    if (normalizedPath.startsWith("uploads/")) return { url: `${BASE_URL}/${normalizedPath}`, shouldRevoke: false };

    const uploadsIndex = normalizedPath.indexOf("uploads/");
    if (uploadsIndex >= 0) {
      return { url: `${BASE_URL}/${normalizedPath.slice(uploadsIndex)}`, shouldRevoke: false };
    }

    return { url: `${BASE_URL}/uploads/${normalizedPath}`, shouldRevoke: false };
  };

  const handlePreviewDocument = (file: File | string | null | undefined) => {
    const { url, shouldRevoke } = getDocumentPreviewUrl(file);

    if (!url) {
      showDialog("Preview Unavailable", "No document is available to preview.", "error");
      return;
    }

    setDocumentPreview({
      isOpen: true,
      url,
      title: getFileName(file) || "Document Preview",
      shouldRevoke
    });
  };

  useEffect(() => {
    return () => {
      if (documentPreview.shouldRevoke && documentPreview.url) {
        URL.revokeObjectURL(documentPreview.url);
      }
    };
  }, [documentPreview.url, documentPreview.shouldRevoke]);

  const uploadFormDataWithProgress = (
    url: string,
    formDataPayload: FormData,
    token: string,
    onProgress: (progress: number) => void,
  ) =>
    new Promise<{ ok: boolean; data: any }>((resolve, reject) => {
      const request = new XMLHttpRequest();

      request.open("POST", url);
      request.setRequestHeader("Authorization", `Bearer ${token}`);

      request.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      };

      request.onload = () => {
        let data: any = null;
        try {
          data = request.responseText ? JSON.parse(request.responseText) : null;
        } catch {
          data = { message: request.responseText };
        }

        onProgress(100);
        resolve({ ok: request.status >= 200 && request.status < 300, data });
      };

      request.onerror = () => reject(new Error("Network error"));
      request.send(formDataPayload);
    });

  const collectDocumentPaths = (value: unknown, paths: string[] = []) => {
    if (Array.isArray(value)) {
      value.forEach((item) => collectDocumentPaths(item, paths));
      return paths;
    }

    if (!value || typeof value !== "object") return paths;

    Object.entries(value).forEach(([key, item]) => {
      const normalizedKey = key.replace(/[_\-\s]/g, "").toLowerCase();

      if (
        typeof item === "string" &&
        item.trim() &&
        (
          normalizedKey.includes("memberevidence") ||normalizedKey.includes("candidateevidence") ||normalizedKey.includes("memberdocument") ||
          normalizedKey.includes("candidatedocument") ||normalizedKey.includes("employeedocument") || normalizedKey.includes("hospitalemployeedocument") ||
          normalizedKey.includes("hospitalemployeeiddocument") || normalizedKey.includes("idproof") || normalizedKey.includes("teamleadid")
        )
      ) { paths.push(item); return;}

      if (item && typeof item === "object") collectDocumentPaths(item, paths);
    });

    return paths;
  };

  const normalizeTeamMembers = (teamRows: unknown[], evidenceFromDocuments: Array<File | string | null>) => {
    const membersByKey = new Map<string, Member>();

    teamRows.forEach((member, index) => {
      const normalizedMember = normalizeMember(member, evidenceFromDocuments[index] || null);
      const key = normalizeEmail(normalizedMember.email) || `${normalizedMember.name.trim().toLowerCase()}-${normalizedMember.role}`;

      if (!membersByKey.has(key)) membersByKey.set(key, normalizedMember);
    });

    return Array.from(membersByKey.values()).slice(0, 3);
  };

  const unwrapArray = (payload: unknown): unknown[] => {
    if (Array.isArray(payload)) return payload;
    const record = asRecord(payload);
    const matched = [record.data, record.result, record.items, record.rows, record.list, record.members, record.teamMembers, record.team]
      .find(Array.isArray);
    return Array.isArray(matched) ? matched : [];
  };

  const collectTeamMemberRows = (payload: unknown, rows: unknown[] = []) => {
    const sourceRows = unwrapArray(payload);

    sourceRows.forEach((item) => {
      const record = asRecord(item);
      const nestedRows = unwrapArray(record.teamMembers || record.members || record.team || record.teamMemberList);

      if (nestedRows.length) {
        nestedRows.forEach((nestedRow) => rows.push(nestedRow));
        return;
      }

      if (record.email || record.memberEmail || record.userEmail || record.hospitalEmployeeId || record.employeeId || record.employee_id) {
        rows.push(item);
      }
    });

    return rows;
  };

  const getCurrentUserId = () => {
    const storedUser = localStorage.getItem("userData");

    try {
      const parsedUser = storedUser ? JSON.parse(storedUser) : {};
      return Number(parsedUser.userId || parsedUser.user_id || parsedUser.id || localStorage.getItem("userId")) || 0;
    } catch {
      return Number(localStorage.getItem("userId")) || 0;
    }
  };

  const readRegistrationPayload = async (response: Response) => {
    const text = await response.text();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  };

  const fetchRegisteredTeamMembers = async (token: string) => {
    const currentUserId = getCurrentUserId();
    const endpoints = [
      `${BASE_URL}/api/register/get/all`,
    ];
    const rows: unknown[] = [];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) continue;
        collectTeamMemberRows(await readRegistrationPayload(response), rows);
      } catch (error) {
        console.warn("Unable to check existing team members:", error);
      }
    }

    return rows
      .map((row) => normalizeMember(row))
      .filter((member) => {
        if (!currentUserId) return true;
        return Number(member.userId || 0) !== currentUserId;
      });
  };

  const refreshRegisteredTeamMembers = async () => {
    const token = localStorage.getItem("token");
    if (!token) return [];

    setRegisteredTeamLoading(true);

    try {
      const existingMembers = await fetchRegisteredTeamMembers(token);
      setRegisteredTeamMembers(existingMembers);
      return existingMembers;
    } finally {
      setRegisteredTeamLoading(false);
    }
  };

  const validateExistingTeamDuplicates = async (token: string, latestMembers?: Member[]) => {
    const currentMemberIds = new Set(members.map((member) => member.id).filter(Boolean));
    const existingMembers = latestMembers
      ? latestMembers
      : registeredTeamMembers.length
        ? registeredTeamMembers
        : await fetchRegisteredTeamMembers(token);
    if (!existingMembers.length) return "";

    const externalMembers = existingMembers.filter((member) => !member.id || !currentMemberIds.has(member.id));
    const existingEmails = new Set(externalMembers.map((member) => normalizeEmail(member.email)).filter(Boolean));
    const existingEmployeeIds = new Set(externalMembers.map((member) => sanitizeEmployeeId(member.hospitalEmployeeId)).filter(Boolean));

    for (const member of members) {
      if (existingEmails.has(normalizeEmail(member.email))) return "Email already exists";
      if (existingEmployeeIds.has(sanitizeEmployeeId(member.hospitalEmployeeId))) return "Employee ID already exists";
    }

    return "";
  };

  useEffect(() => {
    const fetchExistingData = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setPageLoading(false);
        return;
      }

      try {
        const response = await fetch(`${BASE_URL}/api/register/get`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const text = await response.text();
        const data = text ? JSON.parse(text) : null;

        console.log("Fetched existing data:", data);

        if (response.ok && data && data.id) {
          setFormData({
            organizationName: data.organizationName || "",
            hospitalRegisteredId: data.hospitalRegisteredId || data.registrationNumber || "",
            spocName: data.spocName || data.spoc || data.contactPersonName || "",
            hospitalCategory: data.hospitalCategory || "",
            pincode: data.pincode || "",
            state: data.state || "",
            district: data.district || "",
            address: data.address || "",
            orgEmail: data.orgEmail || "",
            orgPhone: data.orgPhone || "",
          });

          if (data.registrationId) {
            setRegistrationId(data.registrationId);
          }

          if (data.enrollmentNumber) {
            setEnrollmentNumber(data.enrollmentNumber);
          }

          setHospitalRegistrationCertificate(getHospitalRegistrationCertificatePath(data) || null);
        } else {
          setFormData(prev => ({
            ...prev,
            orgEmail: ""
          }));
        }

        try {
          const docsResponse = await fetch(`${BASE_URL}/api/register/get/documents`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const docsData = await docsResponse.json();
          const certificatePath = docsResponse.ok && docsData?.data
            ? getHospitalRegistrationCertificatePath(docsData.data)
            : "";

          if (certificatePath) setHospitalRegistrationCertificate(certificatePath);
        } catch (err) {
          console.error("Error fetching registration certificate:", err);
        }
      } catch (err) {
        console.error("Error fetching existing data:", err);
      } finally {
        setPageLoading(false);
      }
    };

    fetchExistingData();
  }, []);

  useEffect(() => {
    const fetchRoles = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch(`${BASE_URL}/api/register/roles`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        const normalizedRoles = response.ok ? normalizeRoleOptions(data) : [];

        if (normalizedRoles.length > 1) setRoleOptions(normalizedRoles);
      } catch (err) {
        console.warn("Unable to load role config; using default roles.", err);
      }
    };

    fetchRoles();
  }, []);

  useEffect(() => {
    if (formData.pincode.length === PINCODE_LENGTH && new RegExp(`^\\d{${PINCODE_LENGTH}}$`).test(formData.pincode)) {
      const fetchLocation = async () => {
        try {
          const response = await fetch(
            `https://api.postalpincode.in/pincode/${formData.pincode}`
          );
          const data = await response.json();

          if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
            const postOffice = data[0].PostOffice[0];

            setFormData(prev => ({
              ...prev,
              state: postOffice.State || "",
              district: postOffice.District || ""
            }));
          } else {
            setFormData(prev => ({
              ...prev,
              state: "",
              district: ""
            }));
          }
        } catch (err) {
          console.error("Error fetching location:", err);
        }
      };

      fetchLocation();
    }
  }, [formData.pincode]);

  useEffect(() => {
    const fetchTeam = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${BASE_URL}/api/register/get/team`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await res.json();
        console.log("Fetched team:", data);

        if (res.ok && data.data && data.data.length > 0) {
          let evidenceFromDocuments: Array<File | string | null> = [];

          try {
            const docsRes = await fetch(`${BASE_URL}/api/register/get/documents`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            const docsData = await docsRes.json();

            if (docsRes.ok && docsData.data) {
              const certificatePath = getHospitalRegistrationCertificatePath(docsData.data);
              if (certificatePath) setHospitalRegistrationCertificate(certificatePath);

              const collectedPaths = collectDocumentPaths(docsData.data);
              evidenceFromDocuments = [
                docsData.data.candidateEvidence1Path || docsData.data.memberEvidence1Path || collectedPaths[0] || null,
                docsData.data.candidateEvidence2Path || docsData.data.memberEvidence2Path || collectedPaths[1] || null,
                docsData.data.candidateEvidence3Path || docsData.data.memberEvidence3Path || collectedPaths[2] || null
              ];
            }
          } catch (err) {
            console.error("Error fetching member evidence:", err);
          }

          const normalizedMembers = normalizeTeamMembers(data.data, evidenceFromDocuments);
          setMembers(normalizedMembers.length ? normalizedMembers : [createEmptyMember()]);
        } else {
          setMembers([createEmptyMember()]);
        }
      } catch (err) {
        console.error("Error fetching team:", err);
      }
    };

    if (step === 1) {
      fetchTeam();
      void refreshRegisteredTeamMembers();
    }
  }, [step]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let nextValue = value;

    if (name === "organizationName") nextValue = value.slice(0, MAX_ORGANIZATION_NAME_LENGTH);
    if (name === "hospitalRegisteredId") nextValue = value.replace(/[^A-Za-z0-9/-]/g, "").slice(0, MAX_REGISTERED_ID_LENGTH);
    if (name === "spocName") nextValue = sanitizePersonName(value);
    if (name === "orgEmail") nextValue = sanitizeEmailInput(value);
    if (name === "orgPhone") nextValue = sanitizeDigits(value, MOBILE_NUMBER_LENGTH);
    if (name === "pincode") nextValue = sanitizeDigits(value, PINCODE_LENGTH);
    if (name === "address") nextValue = value.replace(/[^A-Za-z0-9\s,./#()'-]/g, "");

    setFormData(prev => ({
      ...prev,
      [name]: nextValue
    }));
  };

  const handleMemberChange = (
    index: number,
    field: MemberTextField,
    value: string
  ) => {
    let nextValue = value;
    if (field === "name") nextValue = sanitizePersonName(value);
    if (field === "email") nextValue = sanitizeEmailInput(value);
    if (field === "hospitalEmployeeId") nextValue = sanitizeEmployeeId(value);
    if (field === "customRole") nextValue = value.replace(/[^A-Za-z0-9\s&/().-]/g, "").slice(0, MAX_ROLE_LENGTH);

    const updatedMembers = [...members];
    updatedMembers[index][field] = nextValue;
    setMembers(updatedMembers);
  };

  const addMember = () => {
    if (members.length >= 3) return;
    setMembers([...members, createEmptyMember()]);
  };

  const removeMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, idx) => idx !== index));
    }
  };

  const validateMemberDocumentFile = (file: File): boolean => {
    if (!file) return false;

    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const isValidExt = ["pdf", "png", "jpg", "jpeg", "webp"].includes(fileExt || "");
    const isValidMime =
      !file.type ||
      file.type === "application/pdf" ||
      file.type === "image/png" ||
      file.type === "image/jpeg" ||
      file.type === "image/webp";
    const isValidSize = file.size <= MAX_PDF_SIZE_BYTES;

    if (!isValidExt || !isValidMime) {
      showDialog("Invalid File Type", "Only PDF or image files are allowed for document upload.", "error");
      return false;
    }

    if (!isValidSize) {
      showDialog("File Too Large", "Document size must be less than 10MB.", "error");
      return false;
    }

    return true;
  };

  const handleHospitalRegistrationCertificateUpload = async (file: File | null) => {
    if (!file) return;

    const loaderStartedAt = Date.now();
    setHospitalDocumentLoading(true);

    try {
      if (!validateMemberDocumentFile(file)) return;

      await file.arrayBuffer();
      setHospitalRegistrationCertificate(file);
    } catch (err) {
      console.error("Error reading hospital document:", err);
      showDialog("Upload Error", "Unable to read this document. Please choose the file again.", "error");
    } finally {
      await waitForDocumentSelectionLoader(loaderStartedAt);
      setHospitalDocumentLoading(false);
    }
  };

  const handleMemberDocumentUpload = async (index: number, file: File | null) => {
    if (!file) return;

    const loaderStartedAt = Date.now();
    setDocumentLoadingForIndexes([index], true);

    try {
      if (!validateMemberDocumentFile(file)) return;

      await file.arrayBuffer();

      setMembers(prev =>
        prev.map((member, memberIndex) =>
          memberIndex === index ? { ...member, evidence: file } : member
        )
      );
    } catch (err) {
      console.error("Error reading member document:", err);
      showDialog("Upload Error", "Unable to read this document. Please choose the file again.", "error");
    } finally {
      await waitForDocumentSelectionLoader(loaderStartedAt);
      setDocumentLoadingForIndexes([index], false);
    }
  };

  const handleSaveOrganization = async () => {
    setOrganizationSubmitAttempted(true);

    const organizationFields: OrganizationField[] = [
      "organizationName",
      "hospitalRegisteredId",
      "spocName",
      "hospitalCategory",
      "orgEmail",
      "orgPhone",
      "pincode",
      "state",
      "district",
      "address",
      "hospitalRegistrationCertificate",
    ];
    const firstOrganizationError = organizationFields
      .map((field) => getOrganizationFieldError(field))
      .find(Boolean);

    if (firstOrganizationError) {
      showDialog("Warning Error", firstOrganizationError, "error");
      return;
    }

    if (!formData.organizationName || formData.organizationName.trim() === "") {
      showDialog("Warning Error", "Please enter organization name", "error");
      return;
    }

    if (formData.organizationName.trim().length > MAX_ORGANIZATION_NAME_LENGTH) {
      showDialog("Warning Error", `Organization name must be ${MAX_ORGANIZATION_NAME_LENGTH} characters or less`, "error");
      return;
    }

    if (!formData.hospitalRegisteredId || formData.hospitalRegisteredId.trim() === "") {
      showDialog("Warning Error", "Please enter hospital registered ID", "error");
      return;
    }

    if (formData.hospitalRegisteredId.trim().length > MAX_REGISTERED_ID_LENGTH) {
      showDialog("Warning Error", `Hospital registered ID must be ${MAX_REGISTERED_ID_LENGTH} characters or less`, "error");
      return;
    }

    const spocNameValidationMessage = getNameValidationMessage(formData.spocName, "SPOC name");
    if (spocNameValidationMessage) {
      showDialog("Warning Error", spocNameValidationMessage, "error");
      return;
    }

    if (!formData.hospitalCategory) {
      showDialog("Warning Error", "Please select hospital category", "error");
      return;
    }

    if (!formData.address || formData.address.trim() === "") {
      showDialog("Warning Error", "Please enter address", "error");
      return;
    }

    const wordCount = formData.address.trim().split(/\s+/).length;
    if (wordCount > MAX_ADDRESS_WORDS) {
      showDialog("Warning Error", `Address must be ${MAX_ADDRESS_WORDS} words or less`, "error");
      return;
    }

    if (!formData.pincode || !new RegExp(`^\\d{${PINCODE_LENGTH}}$`).test(formData.pincode)) {
      showDialog("Warning Error", "Please enter valid 6-digit pincode", "error");
      return;
    }

    if (!formData.state.trim()) {
      showDialog("Warning Error", "Please enter a valid pincode so state can be filled", "error");
      return;
    }

    if (!formData.district.trim()) {
      showDialog("Warning Error", "Please enter a valid pincode so district can be filled", "error");
      return;
    }

    const orgEmailValidationMessage = getEmailValidationMessage(formData.orgEmail, "Contact email");
    if (orgEmailValidationMessage) {
      showDialog("Warning Error", orgEmailValidationMessage, "error");
      return;
    }

    const orgPhoneValidationMessage = getMobileValidationMessage(formData.orgPhone, "Contact number");
    if (orgPhoneValidationMessage) {
      showDialog("Warning Error", orgPhoneValidationMessage, "error");
      return;
    }

    if (!hospitalRegistrationCertificate) {
      showDialog("Warning Error", "Please upload Hospital / Organization ID document (PDF or image)", "error");
      return;
    }

    setLoading(true);
    setHospitalUploadProgress(0);

    const token = localStorage.getItem("token");

    if (!token) {
      showDialog("Authentication Error", "Please login again", "error");
      setLoading(false);
      return;
    }

    try {
      const organizationPayload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        const normalizedValue = key === "orgEmail" ? normalizeEmail(String(value || "")) : String(value || "").trim();
        organizationPayload.append(key, normalizedValue);
      });

      if (hospitalRegistrationCertificate instanceof File) {
        organizationPayload.append("hospitalRegistrationCertificate", hospitalRegistrationCertificate);
      } else if (hospitalRegistrationCertificate) {
        organizationPayload.append("hospitalRegistrationCertificatePath", hospitalRegistrationCertificate);
      }

      const { ok, data } = await uploadFormDataWithProgress(
        `${BASE_URL}/api/register/save`,
        organizationPayload,
        token,
        setHospitalUploadProgress,
      );

      if (ok) {
        showDialog("Success", "Organization details saved successfully!", "success");
        setStep(prev => prev + 1);
      } else {
        showDialog("Error", data.message || "Failed to save organization details", "error");
      }
    } catch (err) {
      console.error("Error saving organization:", err);
      showDialog("Network Error", "Please check your connection and try again.", "error");
    } finally {
      setLoading(false);
      setTimeout(() => setHospitalUploadProgress(0), 700);
    }
  };

  const handleSaveTeam = async () => {
    setTeamSubmitAttempted(true);

    if (members.length !== 3) {
      showDialog("Warning Error", "Please add exactly 3 team members", "error");
      return;
    }

    const firstMemberError = members
      .flatMap((member, index) => Object.values(getMemberFieldErrors(member, index)))
      .find(Boolean);

    if (firstMemberError) {
      showDialog("Warning Error", firstMemberError, "error");
      return;
    }

    for (let i = 0; i < members.length; i++) {
      const nameValidationMessage = getNameValidationMessage(members[i].name, `Member ${i + 1} name`);
      if (nameValidationMessage) {
        showDialog("Warning Error", nameValidationMessage, "error");
        return;
      }

      const emailValidationMessage = getEmailValidationMessage(members[i].email, `Member ${i + 1} email`);
      if (emailValidationMessage) {
        showDialog("Warning Error", emailValidationMessage, "error");
        return;
      }

      const employeeIdValidationMessage = getEmployeeIdValidationMessage(
        sanitizeEmployeeId(members[i].hospitalEmployeeId),
        `Member ${i + 1} employee ID`,
      );
      if (employeeIdValidationMessage) {
        showDialog("Warning Error", employeeIdValidationMessage, "error");
        return;
      }

      if (!members[i].role) {
        showDialog("Warning Error", `Please select role for member ${i + 1}`, "error");
        return;
      }

      if (members[i].role === OTHER_ROLE_VALUE && !members[i].customRole.trim()) {
        showDialog("Warning Error", `Please enter role for member ${i + 1}`, "error");
        return;
      }

      if (members[i].role === OTHER_ROLE_VALUE && members[i].customRole.trim().length > MAX_ROLE_LENGTH) {
        showDialog("Warning Error", `Role for member ${i + 1} must be ${MAX_ROLE_LENGTH} characters or less`, "error");
        return;
      }

      if (!members[i].evidence) {
      showDialog("Warning Error", `Please upload PDF or image document for member ${i + 1}`, "error");
        return;
      }
    }

    const duplicateEmail = getDuplicateTeamEmail();
    if (duplicateEmail) {
      showDialog("Email Already Exists", "Email already exists", "error");
      return;
    }

    const duplicateEmployeeId = getDuplicateTeamEmployeeId();
    if (duplicateEmployeeId) {
      showDialog("Employee ID Already Exists", "Employee ID already exists", "error");
      return;
    }

    const duplicateDocument = getDuplicateTeamDocument();
    if (duplicateDocument) {
      showDialog("Document Already Exists", "Document already exists", "error");
      return;
    }

    const uploadingMemberIndexes = members
      .map((member, index) => member.evidence instanceof File ? index : -1)
      .filter((index) => index >= 0);

    setLoading(true);
    setTeamUploadProgress(0);
    setDocumentLoadingForIndexes(uploadingMemberIndexes, true);

    const token = localStorage.getItem("token");

    if (!token) {
      showDialog("Authentication Error", "Please login again", "error");
      setLoading(false);
      setDocumentLoadingForIndexes(uploadingMemberIndexes, false);
      return;
    }

    try {
      const latestRegisteredMembers = await refreshRegisteredTeamMembers();
      const existingDuplicateMessage = await validateExistingTeamDuplicates(token, latestRegisteredMembers);
      if (existingDuplicateMessage) {
        showDialog("Already Exists", existingDuplicateMessage, "error");
        return;
      }

      const teamPayload = members.map((member, index) => ({
        name: member.name.trim(),
        email: normalizeEmail(member.email),
        hospitalEmployeeId: sanitizeEmployeeId(member.hospitalEmployeeId),
        role: member.role === OTHER_ROLE_VALUE ? member.customRole.trim() : member.role,
        roleType: member.role,
        customRole: member.role === OTHER_ROLE_VALUE ? member.customRole.trim() : "",
        evidencePath: typeof member.evidence === "string" ? member.evidence : undefined,
        evidenceFileName: getFileName(member.evidence),
        evidenceField: `employeeDocument${index + 1}`
      }));

      const teamFormData = new FormData();
      teamFormData.append("members", JSON.stringify(teamPayload));
      teamFormData.append("teamMembers", JSON.stringify(teamPayload));
      members.forEach((member, index) => {
        if (member.evidence instanceof File) {
          teamFormData.append(`employeeDocument${index + 1}`, member.evidence);
        }
      });

      const { ok, data } = await uploadFormDataWithProgress(
        `${BASE_URL}/api/register/team`,
        teamFormData,
        token,
        setTeamUploadProgress,
      );

      if (ok) {
        showDialog("Success", "Team members saved successfully!", "success");
        setStep(prev => prev + 1);
      } else {
        showDialog("Error", getApiErrorMessage(data, "Failed to save team members"), "error");
      }
    } catch (err) {
      console.error("Error saving team:", err);
      showDialog("Network Error", "Please check your connection and try again.", "error");
    } finally {
      setLoading(false);
      setDocumentLoadingForIndexes(uploadingMemberIndexes, false);
      setTimeout(() => setTeamUploadProgress(0), 700);
    }
  };

  const handlePayment = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      showDialog("Authentication Error", "Please login again", "error");
      return;
    }

    try {
      setPaymentProcessing(true);

      const orderRes = await fetch(`${BASE_URL}/api/payment/create-order`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const orderData = await parseApiResponse(orderRes);
      console.log("Order:", orderData);

      if (!orderRes.ok) {
        showDialog(
          "Error",
          getApiErrorMessage(orderData, "Unable to create payment order"),
          "error"
        );
        setPaymentProcessing(false);
        return;
      }

      const order = normalizeRazorpayOrder(orderData);

      if (!order) {
        showDialog("Error", "Invalid order response", "error");
        setPaymentProcessing(false);
        return;
      }

      if (!window.Razorpay) {
        showDialog("Error", "Razorpay SDK not loaded", "error");
        setPaymentProcessing(false);
        return;
      }

      const options = {
        key: "rzp_test_9OwkUMPPNDnk7f",
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: "Nurse Quiz",
        description: "Registration Payment",

        handler: async function (response: RazorpayPaymentResponse) {
          console.log("Razorpay Response:", response);

          try {
            const verifyRes = await fetch(`${BASE_URL}/api/payment/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                amount: order.amount / 100,
                organizationId: formData.hospitalRegisteredId
              })
            });

            const verifyData = await verifyRes.json();
            console.log("Verify Response:", verifyData);

            if (verifyRes.ok && verifyData.success) {
              setPaymentCompleted(true);

              setRegistrationId(
                verifyData.registrationId ||
                verifyData.data?.registrationId ||
                `NQ-2026-${Math.floor(Math.random() * 10000)}`
              );


              const enrollmentFromMessage =
                typeof verifyData.message === "string"
                  ? verifyData.message.match(/ENR_\d+/)?.[0] || ""
                  : "";

              const finalEnrollmentNumber =
                verifyData.enrollmentNumber ||
                verifyData.data?.enrollmentNumber ||
                verifyData.enrollmentNo ||
                verifyData.enrollment_number ||
                enrollmentFromMessage ||
                "";

              console.log("Final Enrollment Number:", finalEnrollmentNumber);

              setEnrollmentNumber(finalEnrollmentNumber);

              showDialog(
                "Payment Successful",
                "Payment completed successfully!",
                "success"
              );

              setStep(prev => prev + 1);
            } else {
              showDialog(
                "Verification Failed",
                verifyData.message || "Payment verification failed",
                "error"
              );
            }
          } catch (err) {
            console.error("Error in payment verification:", err);

            showDialog(
              "Error",
              "Something went wrong during payment verification!",
              "error"
            );
          } finally {
            setPaymentProcessing(false);
          }
        },

        prefill: {
          email: formData.orgEmail,
          contact: formData.orgPhone
        },

        theme: {
          color: "#059669"
        },

        modal: {
          ondismiss: function () {
            setPaymentProcessing(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (response: RazorpayFailedResponse) {
        console.error("Payment Failed:", response);

        showDialog(
          "Payment Failed",
          response.error?.description || "Payment failed. Please try again.",
          "error"
        );

        setPaymentProcessing(false);
      });

      rzp.open();
    } catch (err) {
      console.error("Payment Error:", err);

      showDialog(
        "Error",
        "Something went wrong! Please try again.",
        "error"
      );

      setPaymentProcessing(false);
    }
  };

  const handleNext = () => {
    if (step === 0) {
      handleSaveOrganization();
    } else if (step === 1) {
      handleSaveTeam();
    } else if (step === 2) {
      handlePayment();
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(0, prev - 1));
  };

  const getAvailableRoles = (currentIndex: number): RoleOption[] => {
    const selectedRoles = members
      .map((m, i) => (i !== currentIndex ? m.role : null))
      .filter(Boolean);

    return roleOptions.filter(role => role.value === OTHER_ROLE_VALUE || !selectedRoles.includes(role.value));
  };

  const duplicateTeamEmail = getDuplicateTeamEmail();
  const duplicateTeamEmployeeId = getDuplicateTeamEmployeeId();
  const duplicateTeamDocument = getDuplicateTeamDocument();
  const isAnyMemberDocumentLoading = Object.values(memberDocumentLoading).some(Boolean);
  const isAnyDocumentLoading = hospitalDocumentLoading || isAnyMemberDocumentLoading;

  const fieldErrorClass = (message?: string) =>
    message ? "border-red-400 focus-visible:ring-red-400" : "";

  const getOrganizationFieldError = (field: OrganizationField) => {
    switch (field) {
      case "organizationName":
        return getOrganizationNameValidationMessage(formData.organizationName);
      case "hospitalRegisteredId":
        return getRegisteredIdValidationMessage(formData.hospitalRegisteredId);
      case "spocName":
        return getNameValidationMessage(formData.spocName, "SPOC name");
      case "hospitalCategory":
        return formData.hospitalCategory ? "" : "Hospital category is required";
      case "orgEmail":
        return getEmailValidationMessage(formData.orgEmail, "Contact email");
      case "orgPhone":
        return getMobileValidationMessage(formData.orgPhone, "Contact number");
      case "pincode":
        return new RegExp(`^\\d{${PINCODE_LENGTH}}$`).test(formData.pincode)
          ? ""
          : "Please enter valid 6-digit pincode";
      case "state":
        return formData.state.trim() ? "" : "Please enter a valid pincode so state can be filled";
      case "district":
        return formData.district.trim() ? "" : "Please enter a valid pincode so district can be filled";
      case "address":
        return getAddressValidationMessage(formData.address);
      case "hospitalRegistrationCertificate":
        return hospitalRegistrationCertificate ? "" : "Hospital / Organization ID document is required";
      default:
        return "";
    }
  };

  const shouldShowOrganizationError = (field: OrganizationField) => {
    if (organizationSubmitAttempted) return true;
    if (field === "hospitalRegistrationCertificate") return false;
    if (field === "state" || field === "district") {
      return Boolean(organizationTouchedFields.pincode);
    }
    return Boolean(organizationTouchedFields[field]);
  };

  const getVisibleOrganizationError = (field: OrganizationField) => {
    const message = getOrganizationFieldError(field);
    return shouldShowOrganizationError(field) ? message : "";
  };

  const getDatabaseDuplicateEmailError = (member: Member) => {
    const email = normalizeEmail(member.email);
    if (!email) return "";

    const currentMemberIds = new Set(members.map((currentMember) => currentMember.id).filter(Boolean));
    const exists = registeredTeamMembers.some((registeredMember) => {
      if (registeredMember.id && currentMemberIds.has(registeredMember.id)) return false;
      return normalizeEmail(registeredMember.email) === email;
    });

    return exists ? "Email already exists" : "";
  };

  const getDatabaseDuplicateEmployeeIdError = (member: Member) => {
    const employeeId = sanitizeEmployeeId(member.hospitalEmployeeId);
    if (!employeeId) return "";

    const currentMemberIds = new Set(members.map((currentMember) => currentMember.id).filter(Boolean));
    const exists = registeredTeamMembers.some((registeredMember) => {
      if (registeredMember.id && currentMemberIds.has(registeredMember.id)) return false;
      return sanitizeEmployeeId(registeredMember.hospitalEmployeeId) === employeeId;
    });

    return exists ? "Employee ID already exists" : "";
  };

  const getMemberFieldErrors = (member: Member, index: number): MemberFieldErrors => ({
    name: getNameValidationMessage(member.name, `Member ${index + 1} name`),
    email:
      getEmailValidationMessage(member.email, `Member ${index + 1} email`) ||
      (duplicateTeamEmail && normalizeEmail(member.email) === duplicateTeamEmail ? "Email already exists" : "") ||
      getDatabaseDuplicateEmailError(member),
    hospitalEmployeeId:
      getEmployeeIdValidationMessage(sanitizeEmployeeId(member.hospitalEmployeeId), `Member ${index + 1} employee ID`) ||
      (duplicateTeamEmployeeId && sanitizeEmployeeId(member.hospitalEmployeeId) === duplicateTeamEmployeeId
        ? "Employee ID already exists"
        : "") ||
      getDatabaseDuplicateEmployeeIdError(member),
    role: member.role ? "" : `Please select role for member ${index + 1}`,
    customRole:
      member.role === OTHER_ROLE_VALUE
        ? !member.customRole.trim()
          ? `Please enter role for member ${index + 1}`
          : member.customRole.trim().length > MAX_ROLE_LENGTH
            ? `Role for member ${index + 1} must be ${MAX_ROLE_LENGTH} characters or less`
            : ""
        : "",
    evidence: !member.evidence
      ? `Please upload PDF or image document for member ${index + 1}`
      : duplicateTeamDocument && getEvidenceKey(member.evidence) === duplicateTeamDocument
        ? "Document already exists"
        : "",
  });

  const shouldShowMemberError = (member: Member, index: number, field: MemberField) => {
    if (teamSubmitAttempted) return true;
    if (field === "evidence") return Boolean(member.evidence);
    if (field === "role") return false;
    return Boolean(memberTouchedFields[index]?.[field]);
  };

  const getVisibleMemberError = (member: Member, index: number, field: MemberField) => {
    const message = getMemberFieldErrors(member, index)[field] || "";
    return shouldShowMemberError(member, index, field) ? message : "";
  };

  const FieldError = ({ message }: { message?: string }) =>
    message ? <p className="mt-1 text-xs font-medium text-red-600">{message}</p> : null;

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading registration data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <CustomDialog
        isOpen={dialog.isOpen}
        onClose={closeDialog}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
      />

      {documentPreview.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900 sm:text-base">
                  {documentPreview.title}
                </p>
                <p className="text-xs text-gray-500">Document preview</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeDocumentPreview}
                className="shrink-0 rounded-full"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <iframe
              src={documentPreview.url}
              title={documentPreview.title}
              className="min-h-0 flex-1 bg-gray-100"
            />
          </motion.div>
        </div>
      )}

      <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex-1 py-6 sm:py-12">
          <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 lg:px-6">
            <div className="mb-8 sm:mb-10">
              <div className="grid grid-cols-4">
                {steps.map((s, i) => {
                  const isDone = i < step;
                  const isCurrent = i === step;
                  const isReached = i <= step;

                  return (
                    <div key={s.label} className="relative flex min-w-0 flex-col items-center">
                      {i < steps.length - 1 && (
                        <div
                          className={`absolute left-[calc(50%+24px)] right-[calc(-50%+24px)] top-[22px] h-0.5 rounded-full transition-colors ${
                            i < step ? "bg-emerald-500" : "bg-slate-200"
                          }`}
                        />
                      )}

                      <div
                        className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold shadow-sm ring-4 ring-slate-50 transition-colors ${
                          isReached
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-200 bg-white text-slate-400"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <s.icon className="h-5 w-5" />
                        )}
                      </div>

                      <span
                        className={`mt-2 truncate text-xs font-medium sm:text-sm ${
                          isCurrent ? "text-emerald-700" : isReached ? "text-slate-800" : "text-slate-500"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="rounded-xl bg-white p-4 shadow-xl sm:p-6 lg:p-8"
              >
                {step === 0 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Organization Details
                    </h2>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-gray-700">Organization Name *</Label>
                        <Input
                          name="organizationName"
                          value={formData.organizationName}
                          onChange={handleChange}
                          onBlur={() => markOrganizationFieldTouched("organizationName")}
                          maxLength={MAX_ORGANIZATION_NAME_LENGTH}
                          placeholder="e.g. City Hospital"
                          className={`mt-1 ${fieldErrorClass(getVisibleOrganizationError("organizationName"))}`}
                        />
                        <FieldError message={getVisibleOrganizationError("organizationName")} />
                      </div>

                      <div>
                        <Label className="text-gray-700">Hospital Registered ID *</Label>
                        <Input
                          name="hospitalRegisteredId"
                          value={formData.hospitalRegisteredId}
                          onChange={handleChange}
                          onBlur={() => markOrganizationFieldTouched("hospitalRegisteredId")}
                          maxLength={MAX_REGISTERED_ID_LENGTH}
                          placeholder="Enter hospital registered ID"
                          className={`mt-1 ${fieldErrorClass(getVisibleOrganizationError("hospitalRegisteredId"))}`}
                        />
                        <FieldError message={getVisibleOrganizationError("hospitalRegisteredId")} />
                      </div>

                      <div>
                        <Label className="text-gray-700">SPOC Name *</Label>
                        <Input
                          name="spocName"
                          value={formData.spocName}
                          onChange={handleChange}
                          onBlur={() => markOrganizationFieldTouched("spocName")}
                          maxLength={MAX_NAME_LENGTH}
                          placeholder="Single point of contact"
                          className={`mt-1 ${fieldErrorClass(getVisibleOrganizationError("spocName"))}`}
                        />
                        <FieldError message={getVisibleOrganizationError("spocName")} />
                      </div>

                      <div>
                        <Label className="text-gray-700">Hospital Category *</Label>
                        <Select
                          value={formData.hospitalCategory}
                          onValueChange={(value) => {
                            setFormData(prev => ({ ...prev, hospitalCategory: value }));
                            markOrganizationFieldTouched("hospitalCategory");
                          }}
                        >
                          <SelectTrigger className={`mt-1 ${fieldErrorClass(getVisibleOrganizationError("hospitalCategory"))}`}>
                            <SelectValue placeholder="Select hospital category" />
                          </SelectTrigger>
                          <SelectContent>
                            {HOSPITAL_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError message={getVisibleOrganizationError("hospitalCategory")} />
                      </div>

                      <div>
                        <Label className="text-gray-700">Contact Email *</Label>
                        <Input
                          type="email"
                          name="orgEmail"
                          value={formData.orgEmail}
                          onChange={handleChange}
                          onBlur={() => markOrganizationFieldTouched("orgEmail")}
                          maxLength={MAX_EMAIL_LENGTH}
                          placeholder="Enter your email address"
                          className={`mt-1 ${fieldErrorClass(getVisibleOrganizationError("orgEmail"))}`}
                        />
                        <FieldError message={getVisibleOrganizationError("orgEmail")} />
                      </div>

                      <div>
                        <Label className="text-gray-700">Contact Number *</Label>
                        <Input
                          name="orgPhone"
                          value={formData.orgPhone}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");

                            if (val.length <= MOBILE_NUMBER_LENGTH) {
                              handleChange({
                                target: { name: "orgPhone", value: val }
                              } as React.ChangeEvent<HTMLInputElement>);
                            }
                          }}
                          onBlur={() => markOrganizationFieldTouched("orgPhone")}
                          maxLength={MOBILE_NUMBER_LENGTH}
                          placeholder="10 digit number"
                          className={`mt-1 ${fieldErrorClass(getVisibleOrganizationError("orgPhone"))}`}
                        />
                        <FieldError message={getVisibleOrganizationError("orgPhone")} />
                      </div>

                      <div>
                        <Label className="text-gray-700">Pincode *</Label>
                        <Input
                          name="pincode"
                          value={formData.pincode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");

                            if (val.length <= PINCODE_LENGTH) {
                              handleChange({
                                target: { name: "pincode", value: val }
                              } as React.ChangeEvent<HTMLInputElement>);
                            }
                          }}
                          onBlur={() => markOrganizationFieldTouched("pincode")}
                          placeholder="Enter Pincode"
                          maxLength={PINCODE_LENGTH}
                          className={`mt-1 ${fieldErrorClass(getVisibleOrganizationError("pincode"))}`}
                        />
                        <FieldError message={getVisibleOrganizationError("pincode")} />
                      </div>

                      <div>
                        <Label className="text-gray-700">State *</Label>
                        <Input
                          value={formData.state}
                          readOnly
                          placeholder="Auto-filled from pincode"
                          className={`mt-1 bg-gray-50 ${fieldErrorClass(getVisibleOrganizationError("state"))}`}
                        />
                        <FieldError message={getVisibleOrganizationError("state")} />
                      </div>

                      <div>
                        <Label className="text-gray-700">District *</Label>
                        <Input
                          value={formData.district}
                          readOnly
                          placeholder="Auto-filled from pincode"
                          className={`mt-1 bg-gray-50 ${fieldErrorClass(getVisibleOrganizationError("district"))}`}
                        />
                        <FieldError message={getVisibleOrganizationError("district")} />
                      </div>

                      <div>
                        <Label className="text-gray-700">Address *</Label>
                        <Input
                          name="address"
                          value={formData.address}
                          onChange={(e) => {
                            const value = e.target.value;
                            const words = value.trim() ? value.trim().split(/\s+/) : [];

                            if (words.length <= MAX_ADDRESS_WORDS) {
                              handleChange(e);
                            }
                          }}
                          onBlur={() => markOrganizationFieldTouched("address")}
                          placeholder={`Enter full address (max ${MAX_ADDRESS_WORDS} words)`}
                          className={`mt-1 ${fieldErrorClass(getVisibleOrganizationError("address"))}`}
                        />
                        <FieldError message={getVisibleOrganizationError("address")} />
                      </div>

                      <div className="md:col-span-2">
                        <Label className="text-gray-700">Hospital / Organization ID *</Label>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Upload hospital/organization ID, registration certificate, or authorization document as a PDF or image.
                        </p>
                        <input
                          type="file"
                          id="hospitalRegistrationCertificate"
                          className="hidden"
                          accept={MEMBER_DOCUMENT_ACCEPT}
                          disabled={hospitalDocumentLoading || loading}
                          onChange={(e) => {
                            const file = e.currentTarget.files?.[0] || null;
                            void handleHospitalRegistrationCertificateUpload(file);
                            e.currentTarget.value = "";
                          }}
                        />
                        <label
                          htmlFor="hospitalRegistrationCertificate"
                          className={`mt-1 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 text-sm transition-colors ${
                            hospitalDocumentLoading || loading
                              ? "pointer-events-none border-gray-200 bg-gray-50 text-gray-400"
                              : getVisibleOrganizationError("hospitalRegistrationCertificate")
                                ? "border-red-400 text-red-600 hover:border-red-500"
                              : "border-gray-300 text-gray-600 hover:border-emerald-500 hover:text-emerald-700"
                          }`}
                        >
                          {hospitalDocumentLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          <span className="truncate">
                            {hospitalDocumentLoading
                              ? "Uploading..."
                              : hospitalRegistrationCertificate
                                ? getFileName(hospitalRegistrationCertificate)
                                : "Upload PDF/Image"}
                          </span>
                        </label>
                        <FieldError message={getVisibleOrganizationError("hospitalRegistrationCertificate")} />
                        {(hospitalRegistrationCertificate || hospitalDocumentLoading) && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1 text-xs ${
                              hospitalDocumentLoading ? "text-gray-500" : "text-emerald-600"
                            }`}>
                              {hospitalDocumentLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              {hospitalDocumentLoading ? "Uploading document..." : "PDF selected"}
                            </span>
                            {hospitalRegistrationCertificate && !hospitalDocumentLoading && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handlePreviewDocument(hospitalRegistrationCertificate)}
                                className="h-8 gap-1.5 px-2 text-xs text-emerald-700 hover:text-emerald-800"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Preview
                              </Button>
                            )}
                          </div>
                        )}
                        {loading && hospitalUploadProgress > 0 && step === 0 && (
                          <div className="mt-2">
                            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${hospitalUploadProgress}%` }} />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">{hospitalUploadProgress}% uploaded</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="text-2xl font-bold text-gray-900">
                        Team Members
                      </h2>

                      {members.length < 3 && (
                        <Button variant="outline" size="sm" onClick={addMember} className="w-full sm:w-auto">
                          <Plus className="h-4 w-4 mr-1" /> Add Member
                        </Button>
                      )}
                    </div>

                    <p className="text-sm text-gray-600">
                      Add your team members who will have access to the system.
                    </p>
                    {loading && teamUploadProgress > 0 && (
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                        <div className="h-2 overflow-hidden rounded-full bg-white">
                          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${teamUploadProgress}%` }} />
                        </div>
                        <p className="mt-2 text-xs font-medium text-emerald-700">{teamUploadProgress}% team documents uploaded</p>
                      </div>
                    )}

                    {members.map((member, i) => (
                      <div
                        key={i}
                        className="space-y-4 rounded-lg border border-gray-200 p-4 sm:p-5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Member {i + 1}
                          </span>

                          {members.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMember(i)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
                          <div className="min-w-0 xl:col-span-3">
                            <Label className="text-gray-700">Full Name *</Label>
                            <Input
                              placeholder="Enter name"
                              value={member.name}
                              onChange={(e) =>
                                handleMemberChange(i, "name", e.target.value)
                              }
                              onBlur={() => markMemberFieldTouched(i, "name")}
                              maxLength={MAX_NAME_LENGTH}
                              className={`mt-1 ${fieldErrorClass(getVisibleMemberError(member, i, "name"))}`}
                            />
                            <FieldError message={getVisibleMemberError(member, i, "name")} />
                          </div>

                          <div className="min-w-0 xl:col-span-3">
                            <Label className="text-gray-700">Email *</Label>
                            <Input
                              type="email"
                              placeholder="Enter email"
                              value={member.email}
                              onChange={(e) =>
                                handleMemberChange(i, "email", e.target.value)
                              }
                              onBlur={() => markMemberFieldTouched(i, "email")}
                              maxLength={MAX_EMAIL_LENGTH}
                              className={`mt-1 ${fieldErrorClass(getVisibleMemberError(member, i, "email"))}`}
                            />
                            <FieldError message={getVisibleMemberError(member, i, "email")} />
                            {registeredTeamLoading &&
                              memberTouchedFields[i]?.email &&
                              member.email &&
                              !getVisibleMemberError(member, i, "email") && (
                              <p className="mt-1 text-xs font-medium text-slate-500">Checking email...</p>
                            )}
                          </div>

                          <div className="min-w-0 xl:col-span-2">
                            <Label className="text-gray-700">Employee ID *</Label>
                            <Input
                              placeholder="Enter employee ID"
                              value={member.hospitalEmployeeId}
                              onChange={(e) =>
                                handleMemberChange(i, "hospitalEmployeeId", e.target.value)
                              }
                              onBlur={() => markMemberFieldTouched(i, "hospitalEmployeeId")}
                              inputMode="numeric"
                              maxLength={EMPLOYEE_ID_MAX_LENGTH}
                              className={`mt-1 ${fieldErrorClass(getVisibleMemberError(member, i, "hospitalEmployeeId"))}`}
                            />
                            <FieldError message={getVisibleMemberError(member, i, "hospitalEmployeeId")} />
                            {registeredTeamLoading &&
                              memberTouchedFields[i]?.hospitalEmployeeId &&
                              member.hospitalEmployeeId &&
                              !getVisibleMemberError(member, i, "hospitalEmployeeId") && (
                              <p className="mt-1 text-xs font-medium text-slate-500">Checking employee ID...</p>
                            )}
                          </div>

                          <div className="min-w-0 xl:col-span-2">
                            <Label className="text-gray-700">Role *</Label>
                            <Select
                              value={member.role}
                              onValueChange={(value) => {
                                handleMemberChange(i, "role", value);
                                markMemberFieldTouched(i, "role");
                              }}
                            >
                              <SelectTrigger className={`mt-1 ${fieldErrorClass(getVisibleMemberError(member, i, "role"))}`}>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>

                              <SelectContent>
                                {getAvailableRoles(i).map(role => (
                                  <SelectItem key={role.value} value={role.value}>
                                    {role.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FieldError message={getVisibleMemberError(member, i, "role")} />
                          </div>

                          {member.role === OTHER_ROLE_VALUE && (
                            <div className="min-w-0 xl:col-span-2">
                              <Label className="text-gray-700">Enter Role *</Label>
                              <Input
                                placeholder="Enter role"
                                value={member.customRole}
                                onChange={(e) =>
                                  handleMemberChange(i, "customRole", e.target.value)
                                }
                                onBlur={() => markMemberFieldTouched(i, "customRole")}
                                maxLength={MAX_ROLE_LENGTH}
                                className={`mt-1 ${fieldErrorClass(getVisibleMemberError(member, i, "customRole"))}`}
                              />
                              <FieldError message={getVisibleMemberError(member, i, "customRole")} />
                            </div>
                          )}

                          <div className="min-w-0 xl:col-span-2">
                            {(() => {
                              const isDuplicateDocument =
                                duplicateTeamDocument &&
                                getEvidenceKey(member.evidence) === duplicateTeamDocument;
                              const isDocumentLoading = Boolean(memberDocumentLoading[i]);

                              return (
                                <>
                                  <div className="flex items-center justify-between gap-2">
                                    <Label className="text-gray-700">Document *</Label>
                                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                      PDF/IMG
                                    </span>
                                  </div>
                                  <input
                                    type="file"
                                    id={`memberEvidence-${i}`}
                                    className="hidden"
                                    accept={MEMBER_DOCUMENT_ACCEPT}
                                    disabled={isDocumentLoading || loading}
                                    onChange={(e) => {
                                      const file = e.currentTarget.files?.[0] || null;
                                      void handleMemberDocumentUpload(i, file);
                                      e.currentTarget.value = "";
                                    }}
                                  />
                                  <label
                                    htmlFor={`memberEvidence-${i}`}
                                    className={`mt-1 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 text-sm transition-colors ${
                                      isDocumentLoading || loading
                                        ? "pointer-events-none border-gray-200 bg-gray-50 text-gray-400"
                                        : getVisibleMemberError(member, i, "evidence") || isDuplicateDocument
                                          ? "border-red-400 text-red-600 hover:border-red-500"
                                          : "border-gray-300 text-gray-600 hover:border-emerald-500 hover:text-emerald-700"
                                    }`}
                                  >
                                    {isDocumentLoading ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Upload className="h-4 w-4" />
                                    )}
                                    <span className="min-w-0 truncate">
                                      {isDocumentLoading
                                        ? "Uploading..."
                                        : member.evidence
                                          ? getFileName(member.evidence)
                                          : "Upload file"}
                                    </span>
                                  </label>
                                  {(member.evidence || isDocumentLoading) && (
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <span className={`inline-flex items-center gap-1 text-xs ${
                                        isDocumentLoading ? "text-gray-500" : "text-emerald-600"
                                      }`}>
                                        {isDocumentLoading ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                        )}
                                        {isDocumentLoading ? "Uploading document..." : "Document uploaded"}
                                      </span>
                                      {member.evidence && !isDocumentLoading && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handlePreviewDocument(member.evidence)}
                                          className="h-8 gap-1.5 px-2 text-xs text-emerald-700 hover:text-emerald-800"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                          Preview
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                  <FieldError message={getVisibleMemberError(member, i, "evidence")} />
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Payment</h2>

                    <div className="bg-emerald-50 rounded-lg p-6 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Registration Fee</span>
                        <span className="font-semibold text-gray-900">₹2,500</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">GST (18%)</span>
                        <span className="font-semibold text-gray-900">₹450</span>
                      </div>

                      <div className="border-t border-emerald-200 pt-3 flex justify-between">
                        <span className="font-semibold text-gray-900">Total</span>
                        <span className="text-lg font-bold text-emerald-600">
                          ₹2,950
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Registration Complete!
                    </h2>

                    <p className="text-gray-600 mb-6">
                      Your organization has been registered successfully.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                      <div className="inline-block w-full rounded-lg bg-emerald-50 p-4 sm:min-w-[220px] sm:w-auto">
                        <p className="text-sm text-gray-600">Registration ID:</p>
                        <p className="font-mono font-semibold text-emerald-700 text-lg">
                          {registrationId || "N/A"}
                        </p>
                      </div>

                      <div className="inline-block w-full rounded-lg bg-emerald-50 p-4 sm:min-w-[220px] sm:w-auto">
                        <p className="text-sm text-gray-600">Enrollment Number:</p>
                        <p className="font-mono font-semibold text-emerald-700 text-lg">
                          {enrollmentNumber || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-8">
                      <Button
                        onClick={() => {
                          window.location.href = "/dashboard";
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        Go to Dashboard
                      </Button>
                    </div>
                  </div>
                )}

                {step < 3 && (
                  <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      disabled={step === 0 || loading || paymentProcessing || isAnyDocumentLoading}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>

                    <Button
                      onClick={handleNext}
                      disabled={loading || paymentProcessing || isAnyDocumentLoading}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {loading || paymentProcessing || isAnyDocumentLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {paymentProcessing ? "Processing..." : isAnyDocumentLoading && !loading ? "Uploading..." : "Saving..."}
                        </>
                      ) : (
                        <>
                          {step === 2 ? "Complete Registration" : "Next"}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;
