import type { FastifyInstance } from 'fastify';
import { getPricing, SUPPORTED_LOCALES, type Locale } from '../../config/pricing.js';

export function registerPricingRoutes(app: FastifyInstance): void {
  app.get('/api/pricing', async (req) => {
    const q = (req.query as { locale?: string }).locale;
    const locale: Locale = q === 'de' ? 'de' : 'en';
    return { pricing: getPricing(locale), locales: SUPPORTED_LOCALES };
  });
}
