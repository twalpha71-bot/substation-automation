/**
 * Local Offline Translation Endpoint Stub.
 * All translations for EN, TE, TA, HI, PT, KO, FR, and JA are resolved 100% locally
 * in src/i18n/offlineTranslation.ts without external translation APIs.
 * Kannada (KN) and Malayalam (ML) are removed.
 */
import { translateOfflineText, normalizeLanguageCode } from '../src/i18n/offlineTranslation';

export const SUPPORTED_TARGETS = new Set(['en', 'te', 'ta', 'hi', 'pt', 'ko', 'fr', 'ja']);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const target = normalizeLanguageCode(req.body?.target || 'EN');
  const q = req.body?.q;
  const texts = Array.isArray(q) ? q.map(String) : typeof q === 'string' ? [q] : [];
  const translatedText = texts.map((t: string) => translateOfflineText(t, target));
  res.status(200).json({ translatedText: Array.isArray(q) ? translatedText : translatedText[0] ?? '' });
}
