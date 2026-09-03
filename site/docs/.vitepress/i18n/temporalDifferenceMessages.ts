import en from './temporalDifference.en.json'
import zhHans from './temporalDifference.zh-Hans.json'
import type { Locale } from './messages'

export type TemporalDifferenceMessages = typeof en
const catalogs: Record<Locale, TemporalDifferenceMessages> = { en, 'zh-Hans': zhHans }
export function temporalDifferenceMessagesFor(locale: Locale): TemporalDifferenceMessages { return catalogs[locale] }
