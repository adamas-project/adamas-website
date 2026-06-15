// Config-driven pricing. The tier names, amounts, and team-size bands are
// IDENTICAL across locales; only the currency symbol differs. There is NO
// $200/mo tier and no self-serve tier — the model is exactly three subscription
// tiers plus the one-time Clarity Audit and Build. Render per locale without
// code changes by selecting a locale config.

export type Locale = 'en' | 'de';

export interface PricingTier {
  id: 'foundation' | 'growth' | 'scale';
  name: string;
  monthly: number;
  teamSize: string;
  mostCommon?: boolean;
}

export interface OneTime {
  id: 'clarity-audit' | 'build';
  name: string;
  amount: number;
  note: string;
}

export interface PricingModel {
  locale: Locale;
  currency: string; // symbol
  currencyCode: string;
  oneTime: OneTime[];
  subscriptionName: string;
  tiers: PricingTier[];
  annualNote: string;
  journey: string[];
}

// Locale differs ONLY by currency symbol/code and surface copy.
const CURRENCY: Record<Locale, { symbol: string; code: string }> = {
  en: { symbol: '$', code: 'USD' },
  de: { symbol: '€', code: 'EUR' },
};

// Shared, currency-agnostic amounts — the single source of truth.
const AMOUNTS = {
  clarityAudit: 1000,
  build: 4000,
  foundation: 300,
  growth: 600,
  scale: 1200,
} as const;

const TEAM_BANDS = {
  foundation: '~5–15 staff',
  growth: '~16–35 staff · most common',
  scale: '~36–50+ staff',
} as const;

export function getPricing(locale: Locale = 'en'): PricingModel {
  const cur = CURRENCY[locale];
  return {
    locale,
    currency: cur.symbol,
    currencyCode: cur.code,
    subscriptionName: 'ADAMAS Intelligence',
    oneTime: [
      {
        id: 'clarity-audit',
        name: 'Clarity Audit',
        amount: AMOUNTS.clarityAudit,
        note: 'One-time. Credited toward the Build; refunded if it surfaces nothing worth fixing.',
      },
      {
        id: 'build',
        name: 'The Build',
        amount: AMOUNTS.build,
        note: 'One-time. Configure the vault, connect read-only sources, seed the ledger, set up the first generated assets.',
      },
    ],
    tiers: [
      { id: 'foundation', name: 'Foundation', monthly: AMOUNTS.foundation, teamSize: TEAM_BANDS.foundation },
      { id: 'growth', name: 'Growth', monthly: AMOUNTS.growth, teamSize: TEAM_BANDS.growth, mostCommon: true },
      { id: 'scale', name: 'Scale', monthly: AMOUNTS.scale, teamSize: TEAM_BANDS.scale },
    ],
    annualNote: 'Annual billing = two months free.',
    journey: ['Clarity Audit', 'The Build', 'ADAMAS Intelligence subscription (ongoing)'],
  };
}

export const SUPPORTED_LOCALES: Locale[] = ['en', 'de'];
