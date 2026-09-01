import en from './bellman.en.json'
import zhHans from './bellman.zh-Hans.json'
import type { Locale } from './messages'

export type BellmanMessages = typeof en

const catalogs: Record<Locale, BellmanMessages> = {
  en,
  'zh-Hans': zhHans,
}

export function bellmanMessagesFor(locale: Locale): BellmanMessages {
  return catalogs[locale]
}
