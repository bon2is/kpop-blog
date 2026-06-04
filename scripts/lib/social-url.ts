/**
 * UTM-tagged URL builder for SNS auto-posting scripts.
 *
 * GA4 attributes traffic by utm_source / utm_medium / utm_campaign.
 * Without these, every social click lands as (direct) or (referral),
 * making per-channel performance invisible.
 */

export type SocialSource =
  | 'discord'
  | 'threads'
  | 'bluesky'
  | 'reddit'
  | 'twitter'
  | 'pinterest';

export interface UtmOptions {
  source: SocialSource;
  medium?: string;
  campaign?: string;
}

const DEFAULT_MEDIUM = 'social';
const DEFAULT_CAMPAIGN = 'auto_v1';

export function withUtm(rawUrl: string, opts: UtmOptions): string {
  const u = new URL(rawUrl);
  u.searchParams.set('utm_source', opts.source);
  u.searchParams.set('utm_medium', opts.medium ?? DEFAULT_MEDIUM);
  u.searchParams.set('utm_campaign', opts.campaign ?? DEFAULT_CAMPAIGN);
  return u.toString();
}
