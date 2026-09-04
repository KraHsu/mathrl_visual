import en from './gridPolicy.en.json'
import zhHans from './gridPolicy.zh-Hans.json'
import type { Locale } from './messages'

export type GridPolicyMessages = typeof en

const catalogs: Record<Locale, GridPolicyMessages> = {
  en,
  'zh-Hans': zhHans,
}

export function gridPolicyMessagesFor(locale: Locale): GridPolicyMessages {
  return catalogs[locale]
}
