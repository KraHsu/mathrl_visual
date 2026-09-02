import en from './monteCarlo.en.json'
import zhHans from './monteCarlo.zh-Hans.json'
import type { Locale } from './messages'

export type MonteCarloMessages = typeof en

const catalogs: Record<Locale, MonteCarloMessages> = {
  en,
  'zh-Hans': zhHans,
}

export function monteCarloMessagesFor(locale: Locale): MonteCarloMessages {
  return catalogs[locale]
}
