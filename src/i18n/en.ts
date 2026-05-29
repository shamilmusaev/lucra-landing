import type { sv as SvType } from './sv';
// en must have the same keys as sv; enforced by the cast in utils.ts
export const en: typeof SvType = {
} as const;
