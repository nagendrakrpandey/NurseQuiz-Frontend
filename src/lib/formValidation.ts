export const MAX_NAME_LENGTH = 50;
export const MIN_NAME_LENGTH = 2;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_EMAIL_LOCAL_LENGTH = 64;
export const MOBILE_NUMBER_LENGTH = 10;
export const PINCODE_LENGTH = 6;
export const EMPLOYEE_ID_MIN_LENGTH = 3;
export const EMPLOYEE_ID_MAX_LENGTH = 12;
export const MAX_ORGANIZATION_NAME_LENGTH = 100;
export const MAX_REGISTERED_ID_LENGTH = 30;
export const MAX_ADDRESS_WORDS = 200;
export const MAX_ROLE_LENGTH = 50;
export const MAX_PASSWORD_LENGTH = 72;

const BLOCKED_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "example.com",
  "fake.com",
  "mailinator.com",
  "tempmail.com",
  "test.com",
]);

export const sanitizeDigits = (value: string, maxLength: number) =>
  value.replace(/\D/g, "").slice(0, maxLength);

export const sanitizePersonName = (value: string) =>
  value.replace(/[^A-Za-z\s.'-]/g, "").replace(/\s{2,}/g, " ").slice(0, MAX_NAME_LENGTH);

export const sanitizeEmailInput = (value: string) =>
  value.trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH);

export const sanitizeEmployeeId = (value: string) =>
  value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, EMPLOYEE_ID_MAX_LENGTH);

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const isRepeatedCharacterText = (value: string) => {
  const compactValue = value.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  return compactValue.length >= 6 && /^([a-z0-9])\1+$/.test(compactValue);
};

export const isValidEmail = (value: string) => {
  const email = normalizeEmail(value);
  const [localPart, domain] = email.split("@");

  return Boolean(
    email.length <= MAX_EMAIL_LENGTH &&
      localPart &&
      localPart.length <= MAX_EMAIL_LOCAL_LENGTH &&
      domain &&
      !BLOCKED_EMAIL_DOMAINS.has(domain) &&
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email),
  );
};

export const getEmailValidationMessage = (value: string, label = "Email") => {
  const email = normalizeEmail(value);
  const [localPart, domain] = email.split("@");

  if (!email) return `${label} is required`;
  if (email.length > MAX_EMAIL_LENGTH) return `${label} must be ${MAX_EMAIL_LENGTH} characters or less`;
  if (localPart && localPart.length > MAX_EMAIL_LOCAL_LENGTH) {
    return `${label} username must be ${MAX_EMAIL_LOCAL_LENGTH} characters or less`;
  }
  if (domain && BLOCKED_EMAIL_DOMAINS.has(domain)) return "Please use a real email address";
  if (!isValidEmail(email)) return `Please enter a valid ${label.toLowerCase()}`;
  return "";
};

export const getNameValidationMessage = (value: string, label = "Name") => {
  const name = value.trim();

  if (!name) return `${label} is required`;
  if (name.length < MIN_NAME_LENGTH) return `${label} must be at least ${MIN_NAME_LENGTH} characters`;
  if (name.length > MAX_NAME_LENGTH) return `${label} must be ${MAX_NAME_LENGTH} characters or less`;
  if (isRepeatedCharacterText(name)) return `${label} is not valid`;
  if (!/^[A-Za-z][A-Za-z\s.'-]*$/.test(name)) {
    return `${label} can contain only letters, spaces, apostrophes, dots, and hyphens`;
  }
  return "";
};

export const getOrganizationNameValidationMessage = (value: string) => {
  const name = value.trim();

  if (!name) return "Organization name is required";
  if (name.length < 2) return "Organization name must be at least 2 characters";
  if (name.length > MAX_ORGANIZATION_NAME_LENGTH) {
    return `Organization name must be ${MAX_ORGANIZATION_NAME_LENGTH} characters or less`;
  }
  if (isRepeatedCharacterText(name)) return "Organization name is not valid";
  if (!/^[A-Za-z0-9][A-Za-z0-9\s&.,'()/+-]*$/.test(name)) {
    return "Organization name contains invalid characters";
  }
  return "";
};

export const getRegisteredIdValidationMessage = (value: string) => {
  const id = value.trim();

  if (!id) return "Hospital registered ID is required";
  if (id.length > MAX_REGISTERED_ID_LENGTH) {
    return `Hospital registered ID must be ${MAX_REGISTERED_ID_LENGTH} characters or less`;
  }
  if (isRepeatedCharacterText(id)) return "Hospital registered ID is not valid";
  if (!/^[A-Za-z0-9/-]+$/.test(id)) return "Hospital registered ID can contain only letters, numbers, / and -";
  return "";
};

export const getAddressValidationMessage = (value: string) => {
  const address = value.trim();
  const wordCount = address ? address.split(/\s+/).length : 0;

  if (!address) return "Address is required";
  if (address.length < 10) return "Address must be at least 10 characters";
  if (wordCount > MAX_ADDRESS_WORDS) return `Address must be ${MAX_ADDRESS_WORDS} words or less`;
  if (isRepeatedCharacterText(address)) return "Address is not valid";
  if (!/[A-Za-z]/.test(address)) return "Address must include letters";
  if (wordCount < 2 && !/\d/.test(address)) return "Please enter a complete address";
  if (!/^[A-Za-z0-9\s,./#()'-]+$/.test(address)) return "Address contains invalid characters";
  return "";
};

export const getMobileValidationMessage = (value: string, label = "Contact number") => {
  if (!value) return `${label} is required`;
  if (!new RegExp(`^\\d{${MOBILE_NUMBER_LENGTH}}$`).test(value)) {
    return `${label} must be exactly ${MOBILE_NUMBER_LENGTH} digits`;
  }
  return "";
};

export const getEmployeeIdValidationMessage = (value: string, label = "Employee ID") => {
  if (!value) return `${label} is required`;
  if (!/^[A-Za-z0-9]+$/.test(value)) return `${label} can contain only letters and numbers`;
  if (value.length < EMPLOYEE_ID_MIN_LENGTH || value.length > EMPLOYEE_ID_MAX_LENGTH) {
    return `${label} must be ${EMPLOYEE_ID_MIN_LENGTH}-${EMPLOYEE_ID_MAX_LENGTH} characters`;
  }
  return "";
};

export const getPasswordValidationMessage = (password: string, confirmPassword?: string) => {
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  if (password.length > MAX_PASSWORD_LENGTH) return `Password must be ${MAX_PASSWORD_LENGTH} characters or less`;
  if (confirmPassword !== undefined && password !== confirmPassword) return "Passwords do not match";
  return "";
};

export const getDuplicateFieldMessage = (message?: string) => {
  const normalized = String(message || "").toLowerCase();
  const isDuplicate =
    normalized.includes("already") ||
    normalized.includes("duplicate") ||
    normalized.includes("exist");

  if (!isDuplicate) return message || "";
  if (normalized.includes("email") || normalized.includes("mail")) return "Email already exists";
  if (normalized.includes("mobile") || normalized.includes("phone") || normalized.includes("contact")) {
    return "Mobile number already exists";
  }
  if (normalized.includes("employee") || normalized.includes("emp")) return "Employee ID already exists";
  if (normalized.includes("document") || normalized.includes("file")) return "Document already exists";
  return message || "Already exists";
};

export const normalizeTemperatureText = (value: string) =>
  value
    .replace(/\uFFFD\s*([CF])/gi, "deg$1")
    .replace(/\?\s*([CF])\b/g, "deg$1")
    .replace(/\s*deg([CF])\b/gi, "\u00B0$1");
