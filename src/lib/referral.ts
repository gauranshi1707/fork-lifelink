const REF_KEY = "lifelink:ref:v1";

export const captureReferralFromUrl = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref");
    if (code && /^[A-Z0-9]{4,12}$/i.test(code)) {
      localStorage.setItem(REF_KEY, code.toUpperCase());
    }
  } catch {
    /* noop */
  }
};

export const getStoredReferralCode = () => {
  try {
    return localStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
};

export const clearStoredReferralCode = () => {
  try {
    localStorage.removeItem(REF_KEY);
  } catch {
    /* noop */
  }
};

export const buildReferralLink = (code: string) =>
  `${window.location.origin}/auth?mode=signup&ref=${encodeURIComponent(code)}`;
