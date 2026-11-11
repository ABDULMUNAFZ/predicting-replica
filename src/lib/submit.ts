/** Client-side validation for the "Get listed" form. Same rules and messages as the reference form. */

export interface Submission {
  x_handle: string;
  account: string;
  platform: 'polymarket' | 'kalshi' | 'both';
  pnl: string;
  website: string;
}

const HANDLE = /^[A-Za-z0-9_]{1,15}$/;
const ACCOUNT = /^[A-Za-z0-9@._:/?=&#%+\- ]*$/;
const PNL = /^[A-Za-z0-9$+\-.,~ ]+$/;

/** "https://x.com/foo?x=1" or "@foo" becomes "foo". */
export function normalizeHandle(s: string): string {
  return s
    .trim()
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '');
}

/** Returns the first error message, or null when the form is valid. */
export function validateSubmission(s: Submission): string | null {
  if (s.x_handle.length > 100 || !HANDLE.test(normalizeHandle(s.x_handle))) {
    return 'Enter a valid X handle (letters, numbers and _ only, up to 15).';
  }
  const account = s.account.trim();
  if (account.length > 200) return 'Keep the account under 200 characters.';
  if (account.length < 1) return 'Enter your Polymarket wallet or Kalshi account name.';
  if (!ACCOUNT.test(account)) return 'Use a wallet address, Kalshi username or profile link.';
  if (!['polymarket', 'kalshi', 'both'].includes(s.platform)) return 'Check the form and try again.';
  const pnl = s.pnl.trim();
  if (pnl.length < 1) return 'Enter your P&L.';
  if (pnl.length > 40) return 'Keep the P&L under 40 characters.';
  if (!PNL.test(pnl)) return 'Use numbers and $ , . k m only.';
  if (s.website.length > 200) return 'Check the form and try again.';
  return null;
}
