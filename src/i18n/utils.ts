import { sv } from './sv';
import { en } from './en';

export type Lang = 'sv' | 'en';
// Keys come from the canonical `sv` dictionary; values are plain strings so each
// language can supply its own translation (en must define the SAME keys as sv).
export type Strings = { [K in keyof typeof sv]: string };

const dictionaries: Record<Lang, Strings> = { sv, en };

export function getStrings(lang: Lang): Strings {
  return dictionaries[lang];
}

export function t(lang: Lang, key: keyof Strings): string {
  return dictionaries[lang][key];
}
