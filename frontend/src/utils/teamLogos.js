/**
 * teamLogos.js
 * Centralized registry and helper for high-resolution, optimized 512x512 team logos.
 */

export const TEAM_LOGOS = {
  'AC Milan': '/logos/ac-milan.webp',
  'Arsenal': '/logos/arsenal.webp',
  'Atlético Madrid': '/logos/atletico-madrid.webp',
  'Atletico Madrid': '/logos/atletico-madrid.webp',
  'BVB Borussia Dortmund': '/logos/borussia-dortmund.webp',
  'Borussia Dortmund': '/logos/borussia-dortmund.webp',
  'Chelsea': '/logos/chelsea.webp',
  'FC Barcelona': '/logos/barcelona.webp',
  'Barcelona': '/logos/barcelona.webp',
  'FC Bayern München': '/logos/bayern-munchen.webp',
  'FC Bayern Munchen': '/logos/bayern-munchen.webp',
  'Bayern Munich': '/logos/bayern-munchen.webp',
  'Inter': '/logos/inter.webp',
  'Inter Milan': '/logos/inter.webp',
  'Juventus': '/logos/juventus.webp',
  'Liverpool': '/logos/liverpool.webp',
  'Manchester City': '/logos/manchester-city.webp',
  'Man City': '/logos/manchester-city.webp',
  'Manchester United': '/logos/manchester-united.webp',
  'Man United': '/logos/manchester-united.webp',
  'Newcastle United': '/logos/newcastle.webp',
  'Newcastle': '/logos/newcastle.webp',
  'Paris Saint-Germain': '/logos/psg.webp',
  'PSG': '/logos/psg.webp',
  'Real Madrid': '/logos/real-madrid.webp',
  'Tottenham Hotspur': '/logos/tottenham.webp',
  'Tottenham': '/logos/tottenham.webp',
};

// Persian Names Mapping
const PERSIAN_TEAM_MAP = {
  'میلان': '/logos/ac-milan.webp',
  'آرسنال': '/logos/arsenal.webp',
  'اتلتیکو مادرید': '/logos/atletico-madrid.webp',
  'دورتموند': '/logos/borussia-dortmund.webp',
  'بوروسیا دورتموند': '/logos/borussia-dortmund.webp',
  'چلسی': '/logos/chelsea.webp',
  'بارسلونا': '/logos/barcelona.webp',
  'بایرن مونیخ': '/logos/bayern-munchen.webp',
  'اینتر': '/logos/inter.webp',
  'یوونتوس': '/logos/juventus.webp',
  'لیورپول': '/logos/liverpool.webp',
  'منچستر سیتی': '/logos/manchester-city.webp',
  'منچستر یونایتد': '/logos/manchester-united.webp',
  'نیوکاسل': '/logos/newcastle.webp',
  'پاری سن ژرمن': '/logos/psg.webp',
  'رئال مادرید': '/logos/real-madrid.webp',
  'تاتنهام': '/logos/tottenham.webp',
};

/**
 * Returns the optimized WebP logo URL for any team name or object.
 * @param {string|object} teamOrName
 * @returns {string|null}
 */
export function getTeamLogoUrl(teamOrName) {
  if (!teamOrName) return null;

  let name = '';
  let directLogo = '';

  if (typeof teamOrName === 'string') {
    name = teamOrName.trim();
  } else if (typeof teamOrName === 'object') {
    name = (teamOrName.name || teamOrName.team_name || '').trim();
    directLogo = teamOrName.logo || teamOrName.team_logo || '';
  }

  // 1. If directLogo exists and starts with /logos/ or http, return clean URL
  if (directLogo) {
    if (directLogo.startsWith('http://') || directLogo.startsWith('https://')) {
      return directLogo;
    }
    if (directLogo.startsWith('/logos/')) {
      return directLogo;
    }
    if (directLogo.startsWith('/assets/logos/')) {
      return directLogo.replace('/assets/logos/', '/logos/');
    }
    if (directLogo.startsWith('Team Logos/')) {
      const cleanFileName = directLogo.replace('Team Logos/', '').replace('.png', '.webp');
      return `/logos/${cleanFileName}`;
    }
    if (directLogo.startsWith('/')) {
      return directLogo;
    }
    return `/logos/${directLogo.replace('.png', '.webp')}`;
  }

  // 2. Lookup in standard english map
  if (TEAM_LOGOS[name]) {
    return TEAM_LOGOS[name];
  }

  // 3. Lookup in Persian map
  if (PERSIAN_TEAM_MAP[name]) {
    return PERSIAN_TEAM_MAP[name];
  }

  // 4. Case-insensitive / partial match
  const lower = name.toLowerCase();
  for (const [key, path] of Object.entries(TEAM_LOGOS)) {
    if (lower === key.toLowerCase() || lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return path;
    }
  }

  return null;
}

export default getTeamLogoUrl;
