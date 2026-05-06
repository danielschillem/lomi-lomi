export function normalizePhone(value: string) {
  return value.replace(/\s+/g, "").trim();
}

export function isValidPhone(value: string) {
  const normalized = normalizePhone(value).replace(/\+/g, "");
  return /^[0-9]{8,15}$/.test(normalized);
}

export function isValidOtp(value: string) {
  const raw = value.trim();
  return /^[0-9]{4,10}$/.test(raw);
}

export function isValidIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

export function isValid24hTime(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
}
