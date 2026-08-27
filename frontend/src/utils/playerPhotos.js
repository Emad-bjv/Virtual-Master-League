/**
 * playerPhotos.js
 * Utility to resolve player face images with automatic fallback and disambiguation
 */

export const PHOTO_CACHE_TAG = 'v=20260827_2';

export function getPlayerPhotoUrl(player, extraContext = null) {
  if (!player) return null;

  // If already a full URL or relative path with file extension
  if (typeof player === 'string') {
    const rawName = player.trim();
    if (rawName.startsWith('http') || rawName.startsWith('/assets/') || rawName.startsWith('/players/')) {
      return rawName;
    }
    
    // Disambiguate known duplicate short names when string is passed
    if (rawName === 'L. Martínez' || rawName === 'L. Martinez') {
      const pos = extraContext?.position;
      const ovr = Number(extraContext?.overall || 0);
      const team = String(extraContext?.team?.name || extraContext?.team_name || '');
      if (pos === 'CF' || pos === 'SS' || ovr >= 86 || team.toLowerCase().includes('inter')) {
        return `/players/Lautaro%20Mart%C3%ADnez.png?${PHOTO_CACHE_TAG}`;
      }
      return `/players/Lisandro%20Mart%C3%ADnez.png?${PHOTO_CACHE_TAG}`;
    }

    if (rawName === 'J. Bellingham') {
      const ovr = Number(extraContext?.overall || 0);
      const team = String(extraContext?.team?.name || extraContext?.team_name || '');
      if (ovr >= 88 || team.toLowerCase().includes('madrid')) {
        return `/players/Jude%20Bellingham.png?${PHOTO_CACHE_TAG}`;
      }
      return `/players/Jobe%20Bellingham.png?${PHOTO_CACHE_TAG}`;
    }

    if (rawName === 'N. Gonzalez' || rawName === 'Nico González') {
      const pos = extraContext?.position;
      const team = String(extraContext?.team?.name || extraContext?.team_name || '');
      if (pos === 'CMF' || pos === 'DMF' || team.toLowerCase().includes('city')) {
        return `/players/Nico%20Gonz%C3%A1lez.png?${PHOTO_CACHE_TAG}`;
      }
      return `/players/N.%20Gonzalez.png?${PHOTO_CACHE_TAG}`;
    }

    return `/players/${encodeURIComponent(rawName)}.png?${PHOTO_CACHE_TAG}`;
  }

  // Object-based resolution
  if (player.photo_url && !player.photo_url.includes('undefined')) return player.photo_url;
  if (player.image) return player.image;
  if (player.avatar) return player.avatar;

  const name = (player.name || player.player_name || '').trim();
  if (!name) return null;

  const position = player.position || player.target_player_position || extraContext?.position;
  const overall = Number(player.overall || player.target_player_overall || extraContext?.overall || 0);
  const teamName = String(player.team?.name || player.team_name || extraContext?.team?.name || extraContext?.team_name || '');

  // 1. Disambiguate Lautaro Martinez vs Lisandro Martinez
  if (name === 'L. Martínez' || name === 'L. Martinez') {
    if (position === 'CF' || position === 'SS' || overall >= 86 || teamName.toLowerCase().includes('inter')) {
      return `/players/Lautaro%20Mart%C3%ADnez.png?${PHOTO_CACHE_TAG}`;
    }
    return `/players/Lisandro%20Mart%C3%ADnez.png?${PHOTO_CACHE_TAG}`;
  }

  // 2. Disambiguate Jude Bellingham vs Jobe Bellingham
  if (name === 'J. Bellingham') {
    if (overall >= 88 || teamName.toLowerCase().includes('madrid')) {
      return `/players/Jude%20Bellingham.png?${PHOTO_CACHE_TAG}`;
    }
    return `/players/Jobe%20Bellingham.png?${PHOTO_CACHE_TAG}`;
  }

  // 3. Disambiguate Nico Gonzalez
  if (name === 'N. Gonzalez' || name === 'Nico González') {
    if (position === 'CMF' || position === 'DMF' || teamName.toLowerCase().includes('city')) {
      return `/players/Nico%20Gonz%C3%A1lez.png?${PHOTO_CACHE_TAG}`;
    }
    return `/players/N.%20Gonzalez.png?${PHOTO_CACHE_TAG}`;
  }

  return `/players/${encodeURIComponent(name)}.png?${PHOTO_CACHE_TAG}`;
}
