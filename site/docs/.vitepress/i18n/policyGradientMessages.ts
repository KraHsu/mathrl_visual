import en from './policyGradient.en.json'
import zhHans from './policyGradient.zh-Hans.json'
import type { Locale } from './messages'

export type PolicyGradientMessages = typeof en

const catalogs: Record<Locale, PolicyGradientMessages> = { en, 'zh-Hans': zhHans }

export function policyGradientMessagesFor(locale: Locale): PolicyGradientMessages {
  return catalogs[locale]
}
