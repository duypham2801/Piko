import { vi, type TranslationKey } from './vi';

export function t(key: TranslationKey): string {
  return vi[key];
}
