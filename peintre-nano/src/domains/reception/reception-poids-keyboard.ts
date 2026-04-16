const AZERTY_TOP_ROW_DIGIT_BY_KEY: Record<string, string> = {
  '&': '1',
  'é': '2',
  '"': '3',
  "'": '4',
  '(': '5',
  '-': '6',
  'è': '7',
  '_': '8',
  'ç': '9',
  'à': '0',
};

export function normalizeReceptionPoidsInput(raw: string): string {
  const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  return `${cleaned.slice(0, firstDot + 1)}${cleaned.slice(firstDot + 1).replaceAll('.', '')}`;
}

export function parseReceptionPoidsInput(raw: string): number {
  const normalized = normalizeReceptionPoidsInput(raw);
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function decodeReceptionPoidsKeyboardKey(key: string, code: string): string | null {
  if (key >= '0' && key <= '9') return key;
  if (code.startsWith('Digit')) {
    const digit = code.slice('Digit'.length);
    if (digit >= '0' && digit <= '9') return digit;
  }
  if (code.startsWith('Numpad')) {
    const digit = code.slice('Numpad'.length);
    if (digit >= '0' && digit <= '9') return digit;
    if (digit === 'Decimal') return '.';
  }
  return AZERTY_TOP_ROW_DIGIT_BY_KEY[key] ?? null;
}

function isReceptionPoidsDecimalSeparatorKey(key: string, code: string): boolean {
  if (key === '.' || key === ',') return true;
  return code === 'NumpadDecimal' || code === 'Period' || code === 'Comma' || code === 'Semicolon';
}

export function applyReceptionPoidsKeyboardKey(current: string, key: string, code: string): string | null {
  const normalizedCurrent = normalizeReceptionPoidsInput(current);
  const decodedDigit = decodeReceptionPoidsKeyboardKey(key, code);
  if (decodedDigit && decodedDigit !== '.') {
    const base = normalizedCurrent === '0' ? '' : normalizedCurrent;
    return `${base}${decodedDigit}`;
  }
  if (decodedDigit === '.' || isReceptionPoidsDecimalSeparatorKey(key, code)) {
    if (normalizedCurrent.includes('.')) return normalizedCurrent;
    return normalizedCurrent.length > 0 ? `${normalizedCurrent}.` : '0.';
  }
  if (key === 'Backspace' || key === 'Delete') {
    return normalizedCurrent.slice(0, -1);
  }
  return null;
}
