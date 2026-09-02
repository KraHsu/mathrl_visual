import en from './stochasticApproximation.en.json'
import zhHans from './stochasticApproximation.zh-Hans.json'
import type { Locale } from './messages'

export type StochasticApproximationMessages = typeof en

const catalogs: Record<Locale, StochasticApproximationMessages> = {
  en,
  'zh-Hans': zhHans,
}

export function stochasticApproximationMessagesFor(locale: Locale): StochasticApproximationMessages {
  return catalogs[locale]
}
