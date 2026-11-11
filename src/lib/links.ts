import type { LeaderboardTrader } from './types';

const TWIMG = /^https:\/\/pbs\.twimg\.com\/profile_images\/(\d+)\/([\w-]+?)(?:_(?:normal|bigger|mini|400x400|200x200))?\.(\w+)$/;

function twimgVariant(url: string, size: string): string {
  const m = url.match(TWIMG);
  return m ? `/api/x-avatar/${m[1]}/${m[2]}_${size}.${m[3]}` : url;
}

/** Small table avatar, routed through our own /api so the browser never hits pbs.twimg.com directly. */
export const avatarSmall = (url: string) => sameOriginAvatar(twimgVariant(url, 'bigger'));
/** Large profile avatar. */
export const avatarLarge = (url: string) => sameOriginAvatar(twimgVariant(url, '400x400'));

/** Kalshi avatars arrive as absolute predicting.top URLs; rewrite to our proxy. */
function sameOriginAvatar(url: string): string {
  return url.replace(/^https:\/\/predicting\.top(\/api\/)/, '$1');
}

/** Where a trader's name links to. Kalshi-only traders use their username. */
export function profilePath(t: Pick<LeaderboardTrader, 'platform' | 'kalshi_username' | 'wallet'>): string | null {
  if (t.platform === 'kalshi' && t.kalshi_username) return `/account/${t.kalshi_username}`;
  if (t.wallet) return `/account/${t.wallet}`;
  if (t.kalshi_username) return `/account/${t.kalshi_username}`;
  return null;
}

const X_HOSTS = ['x.com', 'twitter.com', 'www.x.com', 'www.twitter.com'];

/**
 * Turns the free-form `twitter` field into a safe https://x.com link, or null.
 * Rejects non-https, foreign hosts and javascript:/data: payloads.
 */
export function safeTwitterUrl(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const v = raw.trim();
  if (v.startsWith('http://') || v.startsWith('https://')) {
    try {
      const u = new URL(v);
      if (u.protocol !== 'https:' || !X_HOSTS.includes(u.hostname)) return null;
      if (u.pathname.includes('javascript:') || u.pathname.includes('data:')) return null;
      return v;
    } catch {
      return null;
    }
  }
  if (/^(x\.com|twitter\.com)\/[\w_]+$/.test(v)) return `https://${v}`;
  const handle = v.replace(/^@/, '');
  return handle && /^[A-Za-z0-9_]{1,15}$/.test(handle) ? `https://x.com/${handle}` : null;
}

/** Profile page: twitter field to URL (looser, mirrors the reference). */
export function twitterHref(t: string): string {
  return t.startsWith('http') ? t : `https://x.com/${t.startsWith('@') ? t.slice(1) : t}`;
}

export function twitterHandle(t: string): string {
  if (t.startsWith('http')) {
    const m = t.match(/(?:twitter\.com|x\.com)\/([^/?]+)/);
    return m ? m[1] : t;
  }
  return t.startsWith('@') ? t.slice(1) : t;
}

/**
 * Canonical Polymarket profile URL. The reference appends its own affiliate
 * code; the replica deliberately does not (see docs/EVALS.md, "Intentional differences").
 */
export function polymarketUrl(wallet: string | null, profile?: string | null): string {
  if (wallet && /^0x[0-9a-fA-F]{40}$/.test(wallet)) return `https://polymarket.com/profile/${wallet}`;
  if (profile) return stripTracking(profile);
  return 'https://polymarket.com';
}

export function stripTracking(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete('via');
    u.searchParams.delete('referral');
    return u.toString();
  } catch {
    return url;
  }
}
