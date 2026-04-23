/**
 * Hook to get the default avatar GIF URL
 * The GIF is used as the fallback avatar throughout the app
 */
export function useDefaultAvatar() {
  const DEFAULT_AVATAR = '/default-avatar.gif';
  
  return DEFAULT_AVATAR;
}

/**
 * Get avatar URL with fallback to default GIF
 * @param userAvatar - User's avatar URL if exists
 * @returns Avatar URL or default GIF
 */
export function getAvatarUrl(userAvatar?: string) {
  const DEFAULT_AVATAR = '/default-avatar.gif';
  return userAvatar && userAvatar.trim() ? userAvatar : DEFAULT_AVATAR;
}
