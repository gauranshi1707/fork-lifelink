/**
 * Medical emergency symptom detection.
 * Runs entirely on the client — fast, private, no network calls.
 *
 * Detects symptoms that may indicate a medical emergency requiring
 * immediate professional care.
 */

const EMERGENCY_PATTERNS: RegExp[] = [
  // Cardiac symptoms
  /\bchest\s+pain\b/i,
  /\bheart\s+(attack|palpitations?)\b/i,
  /\btightness\s+in\s+(my\s+)?chest\b/i,
  /\bpain\s+(radiating|spreading)\s+to\s+(my\s+)?(arm|jaw|neck)\b/i,
  
  // Respiratory distress
  /\b(can'?t|cannot|unable\s+to)\s+breathe\b/i,
  /\bdifficulty\s+breathing\b/i,
  /\bshortness\s+of\s+breath\b/i,
  /\bchoking\b/i,
  /\bsevere\s+asthma\b/i,
  
  // Neurological emergencies
  /\bstroke\b/i,
  /\bseizure\b/i,
  /\bconvulsions?\b/i,
  /\bunconscious(ness)?\b/i,
  /\bfainted?\b/i,
  /\bpassed\s+out\b/i,
  /\bcan'?t\s+(move|feel)\s+(my\s+)?(arm|leg|face|side)\b/i,
  /\bslurred\s+speech\b/i,
  /\bsudden\s+(severe\s+)?headache\b/i,
  /\bblurred\s+vision\b/i,
  
  // Severe bleeding/trauma
  /\bsevere\s+bleeding\b/i,
  /\bwon'?t\s+stop\s+bleeding\b/i,
  /\bhead\s+injury\b/i,
  /\bserious\s+(injury|accident)\b/i,
  
  // Allergic reactions
  /\banaphyla(xis|ctic)\b/i,
  /\bsevere\s+allergic\b/i,
  /\bthroat\s+(swelling|closing)\b/i,
  /\bcan'?t\s+swallow\b/i,
  
  // Other emergencies
  /\boverdose\b/i,
  /\bpoisoning\b/i,
  /\bsevere\s+abdominal\s+pain\b/i,
  /\bcoughing\s+(up\s+)?blood\b/i,
  /\bvomiting\s+blood\b/i,
  /\bhigh\s+fever\b/i,
];

const URGENT_CONTEXT = /\b(emergency|urgent|severe|extreme|intense|unbearable|worst)\b/i;

export function detectCrisis(text: string): boolean {
  if (!text) return false;
  if (EMERGENCY_PATTERNS.some((re) => re.test(text))) return true;
  // Generic urgent words with pain context
  if (URGENT_CONTEXT.test(text) && /\bpain\b/i.test(text)) return true;
  return false;
}
