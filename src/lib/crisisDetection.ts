/**
 * Crisis keyword & intent detection.
 * Runs entirely on the client — fast, private, no network calls.
 *
 * Regex uses word boundaries to avoid false positives like "killing it"
 * but still catches "kill myself", "i wanna die", "end it all", etc.
 */

const PATTERNS: RegExp[] = [
  /\bsuicid(e|al)\b/i,
  /\bkill\s+(myself|me)\b/i,
  /\bend\s+(my|it)\s+(life|all)\b/i,
  /\b(don'?t|dont)\s+want\s+to\s+(live|be\s+alive|exist)\b/i,
  /\bi\s+(wanna|want\s+to|want\s+a)\s+die\b/i,
  /\b(take|taking)\s+my\s+own\s+life\b/i,
  /\bhurt(ing)?\s+myself\b/i,
  /\bself[-\s]?harm\b/i,
  /\bcut(ting)?\s+myself\b/i,
  /\boverdose\b/i,
  /\bjump(ing)?\s+off\b/i,
  /\bno\s+(point|reason)\s+(in\s+)?(living|to\s+live)\b/i,
  /\bi\s+can'?t\s+(go\s+on|do\s+this\s+anymore|take\s+it\s+anymore)\b/i,
  /\b(better\s+off|world\s+would\s+be\s+better)\s+(without\s+me|dead)\b/i,
  /\bi\s+want\s+to\s+(disappear|vanish)\s+(forever|for\s+good)\b/i,
];

const URGENT_HELP = /\b(help|emergency|in\s+danger|being\s+(hurt|attacked|abused))\b/i;

export function detectCrisis(text: string): boolean {
  if (!text) return false;
  if (PATTERNS.some((re) => re.test(text))) return true;
  // "help me" alone is too noisy; require a strong context
  if (URGENT_HELP.test(text) && /\b(now|please|now!|right\s+now)\b/i.test(text)) return true;
  return false;
}
