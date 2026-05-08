import { BASE_URL } from "@/Service/api";

export interface ProfileUser {
  fullName: string;
  email: string;
  contact: string;
  id: number | string | null;
  roleId: number | string | null;
}

export interface ProfileOrganization {
  id: number | null;
  userId: number | null;
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
  status: number | null;
  user?: {
    id?: number;
    fullName?: string;
    email?: string;
    loginStatus?: number;
  };
}

export interface ProfileTeamMember {
  id: number | null;
  name: string;
  email: string;
  hospitalEmployeeId: string;
  role: string;
  organizationId: number | null;
  userId: number | null;
}

export interface OrganizationWithTeam {
  organization: ProfileOrganization;
  teamMembers: ProfileTeamMember[];
  teamError?: string;
}

const safeJsonParse = <T>(value: string | null): T | null => {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const readString = (value: unknown) => (value === null || value === undefined ? "" : String(value).trim());

const readNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const unwrapRecord = (payload: unknown) => {
  const record = getRecord(payload);
  const nested = record.data || record.result || record.organization || record.registration;
  return Object.keys(getRecord(nested)).length ? getRecord(nested) : record;
};

const unwrapArray = (payload: unknown) => {
  if (Array.isArray(payload)) return payload;

  const record = getRecord(payload);
  const nestedValues = [record.data, record.result, record.items, record.teamMembers, record.organizations];
  const matchedArray = nestedValues.find(Array.isArray);
  return Array.isArray(matchedArray) ? matchedArray : [];
};

const normalizeStoredUser = (value: Record<string, unknown> | null): ProfileUser => ({
  fullName: readString(value?.fullName || localStorage.getItem("userName")) || "User",
  email: readString(value?.email || localStorage.getItem("email")),
  contact: readString(value?.contact || localStorage.getItem("contact")),
  id: readString(value?.id || localStorage.getItem("userId")) || null,
  roleId: readString(value?.roleId || localStorage.getItem("roleId")) || null,
});

export const getStoredProfileUser = () => {
  const storedUser = safeJsonParse<Record<string, unknown>>(localStorage.getItem("userData"));
  const storedAdmin = safeJsonParse<Record<string, unknown>>(localStorage.getItem("adminData"));
  return normalizeStoredUser(storedUser || storedAdmin);
};

export const getCleanAuthToken = () =>
  readString(localStorage.getItem("token") || localStorage.getItem("authToken")).replace(/^Bearer\s+/i, "");

const requestProfileJson = async (url: string, signal?: AbortSignal) => {
  const token = getCleanAuthToken();

  if (!token) {
    throw new Error("Authentication token missing. Please login again.");
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    signal,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const record = getRecord(payload);
    throw new Error(readString(record.message || record.error) || `Request failed with status ${response.status}`);
  }

  return payload;
};

export const normalizeOrganization = (value: unknown): ProfileOrganization => {
  const record = getRecord(value);
  const user = getRecord(record.user);

  return {
    id: readNumber(record.id),
    userId: readNumber(record.userId) ?? readNumber(user.id),
    organizationName: readString(record.organizationName || record.orgName || record.institutionName),
    hospitalRegisteredId: readString(
      record.hospitalRegisteredId || record.hospital_registered_id || record.registrationNumber || record.registration_no
    ),
    spocName: readString(record.spocName || record.spoc_name || record.spoc || record.contactPersonName),
    hospitalCategory: readString(record.hospitalCategory || record.hospital_category),
    pincode: readString(record.pincode || record.pinCode),
    state: readString(record.state),
    district: readString(record.district),
    address: readString(record.address),
    orgEmail: readString(record.orgEmail || record.email || record.organizationEmail),
    orgPhone: readString(record.orgPhone || record.phone || record.contact),
    status: readNumber(record.status),
    user: Object.keys(user).length
      ? {
          id: readNumber(user.id) ?? undefined,
          fullName: readString(user.fullName || user.name),
          email: readString(user.email),
          loginStatus: readNumber(user.loginStatus) ?? undefined,
        }
      : undefined,
  };
};

export const normalizeTeamMember = (value: unknown): ProfileTeamMember => {
  const record = getRecord(value);

  return {
    id: readNumber(record.id),
    name: readString(record.name || record.fullName || record.memberName),
    email: readString(record.email || record.memberEmail),
    hospitalEmployeeId: readString(record.hospitalEmployeeId || record.hospital_employee_id || record.employeeId || record.employee_id),
    role: readString(record.role || record.department || record.departmentName) || "member",
    organizationId: readNumber(record.organizationId),
    userId: readNumber(record.userId),
  };
};

export const hasOrganizationDetails = (organization: ProfileOrganization | null) =>
  Boolean(
    organization &&
      (organization.id ||
        organization.organizationName ||
        organization.hospitalRegisteredId ||
        organization.orgEmail ||
        organization.orgPhone),
  );

export const getOrganizationUserId = (organization: ProfileOrganization) =>
  organization.userId || organization.user?.id || null;

export const fetchOwnOrganization = async (signal?: AbortSignal) => {
  const payload = await requestProfileJson(`${BASE_URL}/api/register/get`, signal);
  const organization = normalizeOrganization(unwrapRecord(payload));
  return hasOrganizationDetails(organization) ? organization : null;
};

export const fetchOwnTeamMembers = async (signal?: AbortSignal) => {
  const payload = await requestProfileJson(`${BASE_URL}/api/register/get/team`, signal);
  return unwrapArray(payload).map(normalizeTeamMember);
};

export const fetchAllOrganizations = async (signal?: AbortSignal) => {
  const payload = await requestProfileJson(`${BASE_URL}/api/register/get/all`, signal);
  return unwrapArray(payload).map(normalizeOrganization);
};

export const fetchTeamMembersByUserId = async (userId: number | string, signal?: AbortSignal) => {
  const encodedUserId = encodeURIComponent(String(userId));
  const storedUserId = String(getStoredProfileUser().id || "");
  const requests = [
    { url: `${BASE_URL}/api/register/get/team/public/${encodedUserId}`, auth: false },
    { url: `${BASE_URL}/api/register/get/team/${encodedUserId}`, auth: true },
    { url: `${BASE_URL}/api/register/get/team?userId=${encodedUserId}`, auth: true },
    ...(String(userId) === storedUserId ? [{ url: `${BASE_URL}/api/register/get/team`, auth: true }] : []),
  ];

  for (const request of requests) {
    try {
      const payload = request.auth
        ? await requestProfileJson(request.url, signal)
        : await fetch(request.url, { method: "GET", signal }).then(async (response) => {
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error("Unable to fetch team members");
            return data;
          });
      const members = unwrapArray(payload).map(normalizeTeamMember);
      if (members.length) return members;
    } catch {
      // Try the next supported backend shape.
    }
  }

  return [];
};

export const formatTeamRole = (role: string) => {
  const roleMap: Record<string, string> = {
    lead: "Operation Theatre (OT)",
    member: "Intensive Care Unit (ICCU)",
    admin: "Central Sterile Supply Dept (CSSD)",
  };
  const normalizedRole = role.trim().toLowerCase();
  return roleMap[normalizedRole] || role || "Member";
};

export const formatRegistrationStatus = (status: number | null) => {
  if (status === 2) return "Approved";
  if (status === 3) return "Rejected";
  if (status === 1) return "Pending";
  return "Not Available";
};
