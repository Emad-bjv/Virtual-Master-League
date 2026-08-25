/**
 * teamLogos.js
 * Centralized registry and helper for high-resolution, optimized 512x512 team logos.
 */

export const TEAM_LOGOS = {
  // AC Milan
  'AC Milan': '/logos/ac-milan.webp',
  'Milan': '/logos/ac-milan.webp',
  'A.C. Milan': '/logos/ac-milan.webp',
  'ac-milan': '/logos/ac-milan.webp',
  'ac_milan': '/logos/ac-milan.webp',

  // Arsenal
  'Arsenal': '/logos/arsenal.webp',
  'Arsenal FC': '/logos/arsenal.webp',
  'arsenal': '/logos/arsenal.webp',

  // Atlético Madrid
  'Atlético Madrid': '/logos/atletico-madrid.webp',
  'Atletico Madrid': '/logos/atletico-madrid.webp',
  'Atlético': '/logos/atletico-madrid.webp',
  'Atletico': '/logos/atletico-madrid.webp',
  'atletico-madrid': '/logos/atletico-madrid.webp',

  // Borussia Dortmund
  'BVB Borussia Dortmund': '/logos/borussia-dortmund.webp',
  'Borussia Dortmund': '/logos/borussia-dortmund.webp',
  'Dortmund': '/logos/borussia-dortmund.webp',
  'BVB': '/logos/borussia-dortmund.webp',
  'borussia-dortmund': '/logos/borussia-dortmund.webp',

  // Chelsea
  'Chelsea': '/logos/chelsea.webp',
  'Chelsea FC': '/logos/chelsea.webp',
  'chelsea': '/logos/chelsea.webp',

  // Barcelona
  'FC Barcelona': '/logos/barcelona.webp',
  'Barcelona': '/logos/barcelona.webp',
  'Barca': '/logos/barcelona.webp',
  'barcelona': '/logos/barcelona.webp',

  // Bayern Munich
  'FC Bayern München': '/logos/bayern-munchen.webp',
  'FC Bayern Munchen': '/logos/bayern-munchen.webp',
  'Bayern Munich': '/logos/bayern-munchen.webp',
  'Bayern München': '/logos/bayern-munchen.webp',
  'Bayern': '/logos/bayern-munchen.webp',
  'bayern-munchen': '/logos/bayern-munchen.webp',

  // Inter
  'Inter': '/logos/inter.webp',
  'Inter Milan': '/logos/inter.webp',
  'FC Internazionale': '/logos/inter.webp',
  'Internazionale': '/logos/inter.webp',
  'inter': '/logos/inter.webp',

  // Juventus
  'Juventus': '/logos/juventus.webp',
  'Juventus FC': '/logos/juventus.webp',
  'Juve': '/logos/juventus.webp',
  'juventus': '/logos/juventus.webp',

  // Liverpool
  'Liverpool': '/logos/liverpool.webp',
  'Liverpool FC': '/logos/liverpool.webp',
  'liverpool': '/logos/liverpool.webp',

  // Manchester City
  'Manchester City': '/logos/manchester-city.webp',
  'Man City': '/logos/manchester-city.webp',
  'MCFC': '/logos/manchester-city.webp',
  'manchester-city': '/logos/manchester-city.webp',

  // Manchester United
  'Manchester United': '/logos/manchester-united.webp',
  'Man United': '/logos/manchester-united.webp',
  'Man Utd': '/logos/manchester-united.webp',
  'MUFC': '/logos/manchester-united.webp',
  'manchester-united': '/logos/manchester-united.webp',

  // Newcastle
  'Newcastle United': '/logos/newcastle.webp',
  'Newcastle': '/logos/newcastle.webp',
  'NUFC': '/logos/newcastle.webp',
  'newcastle': '/logos/newcastle.webp',

  // PSG
  'Paris Saint-Germain': '/logos/psg.webp',
  'Paris SG': '/logos/psg.webp',
  'PSG': '/logos/psg.webp',
  'psg': '/logos/psg.webp',

  // Real Madrid
  'Real Madrid': '/logos/real-madrid.webp',
  'Real': '/logos/real-madrid.webp',
  'real-madrid': '/logos/real-madrid.webp',

  // Tottenham
  'Tottenham Hotspur': '/logos/tottenham.webp',
  'Tottenham': '/logos/tottenham.webp',
  'Spurs': '/logos/tottenham.webp',
  'tottenham': '/logos/tottenham.webp',

  // AS Roma
  'AS Roma': '/logos/as-roma.webp',
  'Roma': '/logos/as-roma.webp',
  'A.S. Roma': '/logos/as-roma.webp',
  'as-roma': '/logos/as-roma.webp',
  'as_roma': '/logos/as-roma.webp',

  // SSC Napoli
  'SSC Napoli': '/logos/napoli.webp',
  'Napoli': '/logos/napoli.webp',
  'S.S.C. Napoli': '/logos/napoli.webp',
  'ssc-napoli': '/logos/napoli.webp',
  'napoli': '/logos/napoli.webp',
};

// Persian Names Mapping
const PERSIAN_TEAM_MAP = {
  'میلان': '/logos/ac-milan.webp',
  'آث میلان': '/logos/ac-milan.webp',
  'ای سی میلان': '/logos/ac-milan.webp',
  'آرسنال': '/logos/arsenal.webp',
  'اتلتیکو مادرید': '/logos/atletico-madrid.webp',
  'اتلتیکو': '/logos/atletico-madrid.webp',
  'دورتموند': '/logos/borussia-dortmund.webp',
  'بوروسیا دورتموند': '/logos/borussia-dortmund.webp',
  'چلسی': '/logos/chelsea.webp',
  'بارسلونا': '/logos/barcelona.webp',
  'بارسا': '/logos/barcelona.webp',
  'بایرن مونیخ': '/logos/bayern-munchen.webp',
  'بایرن': '/logos/bayern-munchen.webp',
  'اینتر': '/logos/inter.webp',
  'اینتر میلان': '/logos/inter.webp',
  'یوونتوس': '/logos/juventus.webp',
  'یووه': '/logos/juventus.webp',
  'لیورپول': '/logos/liverpool.webp',
  'منچستر سیتی': '/logos/manchester-city.webp',
  'منچسترسیتی': '/logos/manchester-city.webp',
  'منچستر یونایتد': '/logos/manchester-united.webp',
  'منچستریونایتد': '/logos/manchester-united.webp',
  'نیوکاسل': '/logos/newcastle.webp',
  'نیوکاسل یونایتد': '/logos/newcastle.webp',
  'پاری سن ژرمن': '/logos/psg.webp',
  'پاریسن ژرمن': '/logos/psg.webp',
  'پاریس': '/logos/psg.webp',
  'رئال مادرید': '/logos/real-madrid.webp',
  'رئال': '/logos/real-madrid.webp',
  'تاتنهام': '/logos/tottenham.webp',
  'تاتنهام هاتسپر': '/logos/tottenham.webp',
  'رم': '/logos/as-roma.webp',
  'آ اس رم': '/logos/as-roma.webp',
  'ناپولی': '/logos/napoli.webp',
};

/**
 * Returns the optimized WebP logo URL for any team name or object.
 * @param {string|object} teamOrName
 * @returns {string|null}
 */
export function getTeamLogoUrl(teamOrName) {
  if (!teamOrName) return null;

  let raw = '';
  let directLogo = '';

  if (typeof teamOrName === 'string') {
    raw = teamOrName.trim();
  } else if (typeof teamOrName === 'object') {
    raw = (teamOrName.name || teamOrName.team_name || '').trim();
    directLogo = (teamOrName.logo || teamOrName.team_logo || '').trim();
  }

  // 1. If direct path / URL was passed either directly or inside object
  const candidateUrl = directLogo || raw;
  if (candidateUrl) {
    if (candidateUrl.startsWith('http://') || candidateUrl.startsWith('https://')) {
      return candidateUrl;
    }
    if (candidateUrl.startsWith('/logos/')) {
      return candidateUrl;
    }
    if (candidateUrl.startsWith('/assets/logos/')) {
      return candidateUrl.replace('/assets/logos/', '/logos/');
    }
    if (candidateUrl.startsWith('Team Logos/')) {
      const cleanFileName = candidateUrl.replace('Team Logos/', '').replace('.png', '.webp');
      return `/logos/${cleanFileName}`;
    }
    if (candidateUrl.endsWith('.webp') || candidateUrl.endsWith('.png') || candidateUrl.endsWith('.svg') || candidateUrl.endsWith('.jpg')) {
      const fileName = candidateUrl.split('/').pop().replace(/\.(png|jpg|jpeg|svg)$/i, '.webp');
      return `/logos/${fileName}`;
    }
  }

  const name = raw;
  if (!name) return null;

  // 2. Direct lookup in English map
  if (TEAM_LOGOS[name]) {
    return TEAM_LOGOS[name];
  }

  // 3. Direct lookup in Persian map
  if (PERSIAN_TEAM_MAP[name]) {
    return PERSIAN_TEAM_MAP[name];
  }

  // 4. Normalized string matching (ignore spaces, dots, dashes, cases)
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');
  const normName = normalize(name);

  for (const [key, path] of Object.entries(TEAM_LOGOS)) {
    const normKey = normalize(key);
    if (normName === normKey || (normKey.length >= 4 && normName.includes(normKey)) || (normName.length >= 4 && normKey.includes(normName))) {
      return path;
    }
  }

  for (const [key, path] of Object.entries(PERSIAN_TEAM_MAP)) {
    const normKey = normalize(key);
    if (normName === normKey || (normKey.length >= 3 && normName.includes(normKey)) || (normName.length >= 3 && normKey.includes(normName))) {
      return path;
    }
  }

  return null;
}

export default getTeamLogoUrl;
