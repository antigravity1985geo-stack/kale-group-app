// Prompt-injection heuristic guard (defense-in-depth — not a substitute for system-prompt hardening)

const PATTERNS: RegExp[] = [
  // English
  /\b(ignore|disregard|forget|override|bypass)\b[^.]{0,40}\b(previous|prior|above|earlier|system|instruction|prompt|rule)/i,
  /\b(you are now|act as|pretend to be|roleplay as)\b/i,
  /\bsystem\s*prompt\b/i,
  /\bnew\s+instructions?\b/i,
  // Georgian — "უგულვებელყავი", "დაივიწყე", "გამოტოვე", "არ გაითვალისწინო"
  /(უგულვებელ[ყკ]|დაივიწყე|გამოტოვე|არ\s+გაითვალისწინო|ახალი\s+ინსტრუქც)/,
  /(წინა\s+(ბრძანებ|ინსტრუქც|მითითებ))/,
  /(სისტემის\s+პრომპტ|სისტემურ(ი|მა)\s+ინსტრუქც)/,
  // Russian — "игнорируй", "забудь", "новые инструкции"
  /(игнорир|забудь|пропусти|новые\s+инструкц|ты\s+теперь|притворись)/i,
  /(системн(ый|ая|ые)\s+(промпт|инструкц))/i,
];

export function containsPromptInjection(text: string): boolean {
  if (!text) return false;
  const normalized = text.normalize('NFKC').replace(/\s+/g, ' ');
  return PATTERNS.some(p => p.test(normalized));
}

export function sanitizeUserText(text: string, maxLen = 2000): string {
  if (typeof text !== 'string') return '';
  return text.normalize('NFKC').slice(0, maxLen);
}
