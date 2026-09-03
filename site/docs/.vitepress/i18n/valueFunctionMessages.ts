import en from './valueFunction.en.json'
import zhHans from './valueFunction.zh-Hans.json'
import type { Locale } from './messages'

export type ValueFunctionMessages = typeof en
const catalogs: Record<Locale, ValueFunctionMessages> = { en, 'zh-Hans': zhHans }
export function valueFunctionMessagesFor(locale: Locale): ValueFunctionMessages { return catalogs[locale] }
