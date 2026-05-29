import { sv } from './sv';
import { en } from './en';

export type Lang = 'sv' | 'en';
export type Strings = typeof sv;

const dictionaries: Record<Lang, Strings> = { sv, en };

export function getStrings(lang: Lang): Strings {
  return dictionaries[lang];
}

export function t(lang: Lang, key: keyof Strings): string {
  return dictionaries[lang][key];
}
