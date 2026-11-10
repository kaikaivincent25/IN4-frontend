import { COLORS } from './colors';

export const VERIFICATION_BADGES = {
  verified: {
    color: COLORS.BRAND_BLUE,
    background: COLORS.PALE_BLUE,
    border: COLORS.BORDER,
    icon: 'check-circle',
  },
  credentialed: {
    color: COLORS.BRAND_GREEN,
    background: COLORS.PALE_GREEN,
    border: COLORS.BORDER,
    icon: 'award',
  },
  institutional: {
    color: COLORS.ACCENT_TEAL,
    background: COLORS.SURFACE_ALT,
    border: COLORS.BORDER,
    icon: 'shield',
  },
};

export const getVerificationBadge = (tier) =>
  VERIFICATION_BADGES[String(tier || '').toLowerCase()] || VERIFICATION_BADGES.verified;
