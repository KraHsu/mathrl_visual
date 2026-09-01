import en from './ui.en.json'
import zhHans from './ui.zh-Hans.json'

export type Locale = 'zh-Hans' | 'en'
export type Messages = typeof en

const catalogs: Record<Locale, Messages> = {
  en,
  'zh-Hans': zhHans,
}

export function messagesFor(locale: Locale): Messages {
  return catalogs[locale]
}

export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`))
}
