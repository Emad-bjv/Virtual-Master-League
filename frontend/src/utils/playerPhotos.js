/**
 * playerPhotos.js
 * Utility to resolve player face images with automatic fallback and disambiguation
 */

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
        return '/players/Lautaro%20Mart%C3%ADnez.png?v=3';
      }
      return '/players/Lisandro%20Mart%C3%ADnez.png?v=3';
    }

    if (rawName === 'J. Bellingham') {
      const ovr = Number(extraContext?.overall || 0);
      const team = String(extraContext?.team?.name || extraContext?.team_name || '');
      if (ovr >= 88 || team.toLowerCase().includes('madrid')) {
        return '/players/Jude%20Bellingham.png?v=3';
      }
      return '/players/Jobe%20Bellingham.png?v=3';
    }

    return `/players/${encodeURIComponent(rawName)}.png?v=3`;
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

  // 1. Disambiguate Lautaro Martinez (Inter / CF / 89) vs Lisandro Martinez (Man Utd / CB / 84)
  if (name === 'L. Martínez' || name === 'L. Martinez') {
    if (position === 'CF' || position === 'SS' || overall >= 86 || teamName.toLowerCase().includes('inter')) {
      return '/players/Lautaro%20Mart%C3%ADnez.png?v=3';
    }
    return '/players/Lisandro%20Mart%C3%ADnez.png?v=3';
  }

  // 2. Disambiguate Jude Bellingham (Real Madrid / CMF / 90) vs Jobe Bellingham (Dortmund / CMF / 78)
  if (name === 'J. Bellingham') {
    if (overall >= 88 || teamName.toLowerCase().includes('madrid')) {
      return '/players/Jude%20Bellingham.png?v=3';
    }
    return '/players/Jobe%20Bellingham.png?v=3';
  }

  return `/players/${encodeURIComponent(name)}.png?v=3`;
}

