import en from './actorCritic.en.json'
import zhHans from './actorCritic.zh-Hans.json'
import type { Locale } from './messages'

export type ActorCriticMessages = typeof en

const catalogs: Record<Locale, ActorCriticMessages> = { en, 'zh-Hans': zhHans }

export function actorCriticMessagesFor(locale: Locale): ActorCriticMessages {
  return catalogs[locale]
}
