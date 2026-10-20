export const VERIFICATION_BADGES = {
  verified: {
    color: '#1D9BF0',
    background: '#EFF8FF',
    border: '#B6E0FE',
    icon: 'check-circle',
  },
  credentialed: {
    color: '#0F766E',
    background: '#F0FDFA',
    border: '#99F6E4',
    icon: 'award',
  },
  institutional: {
    color: '#6D28D9',
    background: '#F5F3FF',
    border: '#DDD6FE',
    icon: 'shield',
  },
};

export const getVerificationBadge = (tier) =>
  VERIFICATION_BADGES[String(tier || '').toLowerCase()] || VERIFICATION_BADGES.verified;
