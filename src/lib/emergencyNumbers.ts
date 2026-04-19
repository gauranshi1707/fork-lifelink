/**
 * Country-specific emergency numbers.
 * Falls back to a sensible international set when the country is unknown.
 */

export interface EmergencyNumbers {
  country: string;
  countryCode?: string;
  general?: string;
  police?: string;
  ambulance?: string;
  fire?: string;
}

const TABLE: Record<string, EmergencyNumbers> = {
  US: { country: "United States", countryCode: "US", general: "911" },
  CA: { country: "Canada", countryCode: "CA", general: "911" },
  GB: { country: "United Kingdom", countryCode: "GB", general: "999", police: "101 (non-urgent)" },
  IE: { country: "Ireland", countryCode: "IE", general: "112", ambulance: "999" },
  AU: { country: "Australia", countryCode: "AU", general: "000" },
  NZ: { country: "New Zealand", countryCode: "NZ", general: "111" },
  IN: { country: "India", countryCode: "IN", general: "112", police: "100", ambulance: "108", fire: "101" },
  PK: { country: "Pakistan", countryCode: "PK", police: "15", ambulance: "115", fire: "16" },
  BD: { country: "Bangladesh", countryCode: "BD", general: "999" },
  LK: { country: "Sri Lanka", countryCode: "LK", general: "119", ambulance: "1990" },
  NP: { country: "Nepal", countryCode: "NP", police: "100", ambulance: "102", fire: "101" },
  // EU + most of Europe
  FR: { country: "France", countryCode: "FR", general: "112", police: "17", ambulance: "15", fire: "18" },
  DE: { country: "Germany", countryCode: "DE", general: "112", police: "110" },
  ES: { country: "Spain", countryCode: "ES", general: "112" },
  IT: { country: "Italy", countryCode: "IT", general: "112" },
  NL: { country: "Netherlands", countryCode: "NL", general: "112" },
  BE: { country: "Belgium", countryCode: "BE", general: "112" },
  PT: { country: "Portugal", countryCode: "PT", general: "112" },
  SE: { country: "Sweden", countryCode: "SE", general: "112" },
  NO: { country: "Norway", countryCode: "NO", police: "112", ambulance: "113", fire: "110" },
  DK: { country: "Denmark", countryCode: "DK", general: "112" },
  FI: { country: "Finland", countryCode: "FI", general: "112" },
  PL: { country: "Poland", countryCode: "PL", general: "112" },
  CH: { country: "Switzerland", countryCode: "CH", general: "112", police: "117", ambulance: "144", fire: "118" },
  AT: { country: "Austria", countryCode: "AT", general: "112", police: "133", ambulance: "144", fire: "122" },
  // Rest of world
  JP: { country: "Japan", countryCode: "JP", police: "110", ambulance: "119", fire: "119" },
  CN: { country: "China", countryCode: "CN", police: "110", ambulance: "120", fire: "119" },
  KR: { country: "South Korea", countryCode: "KR", police: "112", ambulance: "119", fire: "119" },
  SG: { country: "Singapore", countryCode: "SG", police: "999", ambulance: "995" },
  MY: { country: "Malaysia", countryCode: "MY", general: "999", ambulance: "991" },
  ID: { country: "Indonesia", countryCode: "ID", general: "112" },
  TH: { country: "Thailand", countryCode: "TH", general: "191", ambulance: "1669" },
  VN: { country: "Vietnam", countryCode: "VN", police: "113", ambulance: "115", fire: "114" },
  PH: { country: "Philippines", countryCode: "PH", general: "911" },
  AE: { country: "United Arab Emirates", countryCode: "AE", police: "999", ambulance: "998", fire: "997" },
  SA: { country: "Saudi Arabia", countryCode: "SA", general: "911", police: "999", ambulance: "997" },
  IL: { country: "Israel", countryCode: "IL", police: "100", ambulance: "101", fire: "102" },
  TR: { country: "Turkey", countryCode: "TR", general: "112" },
  EG: { country: "Egypt", countryCode: "EG", police: "122", ambulance: "123", fire: "180" },
  ZA: { country: "South Africa", countryCode: "ZA", police: "10111", ambulance: "10177" },
  NG: { country: "Nigeria", countryCode: "NG", general: "112" },
  KE: { country: "Kenya", countryCode: "KE", general: "999" },
  BR: { country: "Brazil", countryCode: "BR", police: "190", ambulance: "192", fire: "193" },
  MX: { country: "Mexico", countryCode: "MX", general: "911" },
  AR: { country: "Argentina", countryCode: "AR", police: "911", ambulance: "107", fire: "100" },
  CL: { country: "Chile", countryCode: "CL", police: "133", ambulance: "131", fire: "132" },
  CO: { country: "Colombia", countryCode: "CO", general: "123" },
  RU: { country: "Russia", countryCode: "RU", general: "112" },
};

export function getEmergencyNumbers(countryCode?: string): EmergencyNumbers {
  if (countryCode && TABLE[countryCode]) return TABLE[countryCode];
  return {
    country: "International",
    general: "112",
  };
}
