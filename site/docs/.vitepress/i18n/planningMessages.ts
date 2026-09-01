import en from './planning.en.json'
import zhHans from './planning.zh-Hans.json'
import type { Locale } from './messages'

export type PlanningMessages = typeof en

const catalogs: Record<Locale, PlanningMessages> = {
  en,
  'zh-Hans': zhHans,
}

export function planningMessagesFor(locale: Locale): PlanningMessages {
  return catalogs[locale]
}
