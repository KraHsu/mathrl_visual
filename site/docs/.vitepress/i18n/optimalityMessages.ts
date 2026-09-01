import en from './optimality.en.json'
import zhHans from './optimality.zh-Hans.json'
import type { Locale } from './messages'

export type OptimalityMessages = typeof en

const catalogs: Record<Locale, OptimalityMessages> = {
  en,
  'zh-Hans': zhHans,
}

export function optimalityMessagesFor(locale: Locale): OptimalityMessages {
  return catalogs[locale]
}
