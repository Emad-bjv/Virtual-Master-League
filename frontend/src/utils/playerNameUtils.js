/**
 * Utilities for formatting player kit / shirt names on FUT Pitch Cards
 * Follows EA FC / FUT and eFootball authenticity standards.
 */

// Common prefixes in European and Latin football surnames
const PREFIXES = new Set(['de', 'van', 'von', 'di', 'da', 'del', 'della', 'dos', 'das', 'du', 'le', 'la']);

// Common surnames in football where an initial (e.g. B. FERNANDES, C. RONALDO) is authentic & distinguishing
const AMBIGUOUS_SURNAMES = new Set([
  'fernandes', 'silva', 'ronaldo', 'james', 'martinez', 'santos', 
  'hernandez', 'diaz', 'jesus', 'gomez', 'torres', 'alvarez', 
  'traore', 'mendy', 'williams', 'davies', 'dembele', 'sanchez'
]);

/**
 * Derives the authentic kit name (in ALL-CAPS) from a player's full name.
 * Examples:
 *   "Federico Dimarco"      -> "DIMARCO"
 *   "Matthijs de Ligt"      -> "DE LIGT"
 *   "Virgil van Dijk"       -> "VAN DIJK"
 *   "Kevin De Bruyne"       -> "DE BRUYNE"
 *   "Bruno Fernandes"       -> "B. FERNANDES"
 *   "Cristiano Ronaldo"     -> "C. RONALDO"
 *   "Trent Alexander-Arnold"-> "A.-ARNOLD"
 *   "Vinicius Junior"       -> "VINICIUS JR."
 *   "Vinicius Jr"           -> "VINICIUS JR."
 *   "Koke"                  -> "KOKE"
 *   "Cody Gakpo"            -> "GAKPO"
 *   "Cole Palmer"           -> "PALMER"
 */
export function getCardKitName(fullName) {
  if (!fullName || typeof fullName !== 'string') return 'PLAYER';
  const cleanName = fullName.trim();
  if (!cleanName) return 'PLAYER';

  // Suffix handling: "Junior" or "Jr"
  const isJr = /\b(junior|jr\.?)\b/i.test(cleanName);
  const withoutJr = cleanName.replace(/\b(junior|jr\.?)\b/gi, '').trim();

  // Split into whitespace parts
  const rawParts = withoutJr.split(/\s+/).filter(Boolean);

  if (rawParts.length === 0) {
    return isJr ? 'JR.' : 'PLAYER';
  }

  if (rawParts.length === 1) {
    const single = rawParts[0].toUpperCase();
    return isJr ? `${single} JR.` : single;
  }

  // Check for Dutch/German/Spanish prefixes (e.g., "de Ligt", "van Dijk", "De Bruyne")
  for (let i = 1; i < rawParts.length; i++) {
    const wordLower = rawParts[i].toLowerCase();
    if (PREFIXES.has(wordLower)) {
      const surnameWithPrefix = rawParts.slice(i).join(' ').toUpperCase();
      return isJr ? `${surnameWithPrefix} JR.` : surnameWithPrefix;
    }
  }

  const firstName = rawParts[0];
  const lastName = rawParts[rawParts.length - 1];

  // Specific compound hyphenated names like "Alexander-Arnold" -> "A.-ARNOLD" if too long
  if (lastName.includes('-')) {
    const hypParts = lastName.split('-');
    if (lastName.length > 13 && hypParts.length === 2) {
      const shortHyp = `${hypParts[0].charAt(0)}.-${hypParts[1]}`.toUpperCase();
      return isJr ? `${shortHyp} JR.` : shortHyp;
    }
    return isJr ? `${lastName.toUpperCase()} JR.` : lastName.toUpperCase();
  }

  // Ambiguous surnames (e.g. "Bruno Fernandes" -> "B. FERNANDES", "Reece James" -> "R. JAMES")
  const lastNameLower = lastName.toLowerCase();
  if (AMBIGUOUS_SURNAMES.has(lastNameLower) && firstName) {
    const initial = firstName.charAt(0).toUpperCase();
    const formatted = `${initial}. ${lastName.toUpperCase()}`;
    return isJr ? `${formatted} JR.` : formatted;
  }

  // Standard two-word name (e.g. "Federico Dimarco" -> "DIMARCO", "Cody Gakpo" -> "GAKPO")
  const finalSurname = lastName.toUpperCase();
  return isJr ? `${finalSurname} JR.` : finalSurname;
}

/**
 * Returns dynamic font sizing and letter-spacing classes based on kit name length.
 * Ensures long names gracefully shrink without truncating or overflowing.
 */
export function getCardNameTypography(kitName) {
  const len = (kitName || '').length;

  if (len <= 7) {
    return 'text-[7.5px] xs:text-[8.5px] sm:text-[10px] md:text-[11.5px] tracking-normal font-black';
  }
  if (len <= 10) {
    return 'text-[7px] xs:text-[8px] sm:text-[9.5px] md:text-[10.5px] tracking-tight font-black';
  }
  if (len <= 13) {
    return 'text-[6.5px] xs:text-[7.2px] sm:text-[8.5px] md:text-[9.5px] tracking-tighter font-extrabold';
  }
  return 'text-[5.8px] xs:text-[6.5px] sm:text-[7.8px] md:text-[8.8px] tracking-tighter font-extrabold';
}
