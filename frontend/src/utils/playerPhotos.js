/**
 * playerPhotos.js
 * Utility to resolve player face images with automatic fallback to public/players/{Name}.png
 */

export function getPlayerPhotoUrl(player) {
  if (!player) return null;
  if (typeof player === 'string') {
    return `/players/${encodeURIComponent(player)}.png`;
  }
  if (player.photo_url) return player.photo_url;
  if (player.image) return player.image;
  if (player.avatar) return player.avatar;
  if (player.name) {
    return `/players/${encodeURIComponent(player.name)}.png`;
  }
  return null;
}
