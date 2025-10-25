const TURKISH_NAME_REGEX = /^[A-Za-zÇÖŞÜĞİıçöşüğİı\s'.-]{2,}$/;
const PHONE_CHARSET_REGEX = /^\+?[0-9\s()+-]+$/;

export function isNameValid(value) {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length < 2) return false;
  return TURKISH_NAME_REGEX.test(trimmed);
}

export function isPhoneValid(value) {
  if (!value) return false;
  const trimmed = value.trim();
  if (!PHONE_CHARSET_REGEX.test(trimmed)) return false;
  const digitCount = trimmed.replace(/\D/g, "").length;
  return digitCount >= 10 && digitCount <= 15;
}

export const PHONE_INPUT_PATTERN = "[0-9()+\\s-]{10,20}";
