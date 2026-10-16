const MAX_LENGTH = 2048;
const CONTROL_ENCODING = /%0[ad]|%00/i;
const MAX_DECODE_PASSES = 3;

function hasUnsafeChars(value: string): boolean {
  return value.includes('\\') || value.includes(':') || CONTROL_ENCODING.test(value);
}

export function safeRedirectPath(value: string | null): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_LENGTH) {
    return null;
  }
  if (!value.startsWith('/') || value.startsWith('//')) {
    return null;
  }
  if (hasUnsafeChars(value)) {
    return null;
  }

  let decoded = value;
  for (let pass = 0; pass < MAX_DECODE_PASSES; pass++) {
    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      return null;
    }
    if (next === decoded) {
      break;
    }
    if (hasUnsafeChars(next) || next.includes('//')) {
      return null;
    }
    decoded = next;
  }

  if (decoded.includes('//')) {
    return null;
  }

  return value;
}
