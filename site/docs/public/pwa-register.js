/*
 * Tiny, dependency-free client for the generated MathRL Visual service
 * worker.  VitePress pages are post-processed by generate-pwa-assets.mjs so
 * this file is loaded on every locale page.  Keeping it as a normal public
 * asset means the site remains a static GitHub Pages deployment.
 */
(function mathrlPwaBootstrap() {
  'use strict'

  var STORAGE_KEY = 'mathrl:pwa:state'
  var STORAGE_SCHEMA_VERSION = 2
  var REQUEST_TIMEOUT_MS = 45 * 1000
  var locales = { 'zh-Hans': true, en: true }

  function scriptBase() {
    var script = document.currentScript
    if (!script || !script.src) script = document.querySelector('script[src*="pwa-register.js"]')
    if (!script || !script.src) return '/'
    try {
      var path = new URL(script.src, window.location.href).pathname
      return path.replace(/pwa-register\.js(?:\?.*)?$/, '') || '/'
    } catch (_) {
      return '/'
    }
  }

  var base = scriptBase()
  if (base.charAt(0) !== '/') base = '/' + base
  if (base.charAt(base.length - 1) !== '/') base += '/'

  function url(path) {
    return base + String(path || '').replace(/^\/+/, '')
  }

  function emit(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }))
    } catch (_) {
      // Older embedded browsers may not expose CustomEvent; PWA support is
      // optional and the content remains usable without these notifications.
    }
  }

  function safeJson(raw) {
    if (typeof raw !== 'string' || raw.length > 512 * 1024) return undefined
    try {
      return JSON.parse(raw)
    } catch (_) {
      return undefined
    }
  }

  function cleanState(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    var source = value.data && typeof value.data === 'object' ? value.data : value
    var state = {}
    if (locales[source.locale]) state.locale = source.locale
    if (source.theme === 'light' || source.theme === 'dark' || source.theme === 'auto') state.theme = source.theme
    if (typeof source.reducedMotion === 'boolean') state.reducedMotion = source.reducedMotion
    if (typeof source.lastRoute === 'string' && source.lastRoute.length > 0 && source.lastRoute.length <= 240 && source.lastRoute.charAt(0) === '/' && source.lastRoute.slice(0, 2) !== '//') {
      state.lastRoute = source.lastRoute
    }
    if (source.experiments && typeof source.experiments === 'object' && !Array.isArray(source.experiments)) {
      var experiments = {}
      Object.keys(source.experiments).slice(0, 32).forEach(function (key) {
        if (!/^[a-zA-Z0-9:_-]{1,96}$/.test(key)) return
        var item = source.experiments[key]
        if (!item || typeof item !== 'object' || Array.isArray(item)) return
        var encoded
        try { encoded = JSON.stringify(item) } catch (_) { return }
        if (encoded && encoded.length <= 16 * 1024) experiments[key] = item
      })
      if (Object.keys(experiments).length) state.experiments = experiments
    }
    return state
  }

  function migrateState(value) {
    var version = value && typeof value === 'object' && Number.isInteger(value.schemaVersion)
      ? value.schemaVersion
      : value && typeof value === 'object' && Number.isInteger(value.v)
        ? value.v
        : 1
    if (version > STORAGE_SCHEMA_VERSION) return { state: undefined, migrated: false, reason: 'future-schema' }
    var state = cleanState(value)
    return {
      state: { schemaVersion: STORAGE_SCHEMA_VERSION, migratedFrom: version, data: state },
      migrated: version !== STORAGE_SCHEMA_VERSION,
      fromVersion: version,
    }
  }

  function migrateLocalState() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return { migrated: false }
      var parsed = safeJson(raw)
      var result = migrateState(parsed)
      if (!result.state) {
        // Never overwrite a state written by a newer application.  The user
        // can still use the site; a future build may understand this schema.
        emit('mathrl:pwa-migration', { ok: false, reason: result.reason })
        return result
      }
      if (result.migrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result.state))
      emit('mathrl:pwa-migration', { ok: true, migrated: result.migrated, fromVersion: result.fromVersion, toVersion: STORAGE_SCHEMA_VERSION })
      return result
    } catch (error) {
      emit('mathrl:pwa-migration', { ok: false, reason: 'storage-unavailable', error: String(error && error.message || error) })
      return { migrated: false, reason: 'storage-unavailable' }
    }
  }

  var pending = new Map()
  var registration
  var requestCounter = 0

  function requestId() {
    requestCounter += 1
    return 'pwa-' + Date.now().toString(36) + '-' + requestCounter.toString(36)
  }

  function rejectPending(id, error) {
    var item = pending.get(id)
    if (!item) return
    pending.delete(id)
    clearTimeout(item.timer)
    item.reject(error instanceof Error ? error : new Error(String(error || 'PWA request failed')))
  }

  function resolvePending(id, value) {
    var item = pending.get(id)
    if (!item) return
    pending.delete(id)
    clearTimeout(item.timer)
    item.resolve(value)
  }

  function onWorkerMessage(event) {
    var data = event.data || {}
    if (data.source !== 'mathrl-visual') return
    if (data.type === 'PWA_PROGRESS') emit('mathrl:pwa-progress', data)
    if (data.type === 'PWA_ERROR') emit('mathrl:pwa-error', data)
    if (data.type === 'PWA_STATUS') emit('mathrl:pwa-status', data)
    if (data.type === 'PWA_CLEARED') emit('mathrl:pwa-cleared', data)
    if (data.requestId && (data.phase === 'done' || data.phase === 'error' || data.type === 'PWA_STATUS' || data.type === 'PWA_CLEARED')) {
      if (data.phase === 'error' || data.type === 'PWA_ERROR') rejectPending(data.requestId, data.error || 'PWA operation failed')
      else resolvePending(data.requestId, data)
    }
  }

  function worker() {
    if (!registration) return undefined
    return registration.active || registration.waiting || registration.installing
  }

  function post(type, payload) {
    return new Promise(function (resolve, reject) {
      var target = worker()
      if (!target) {
        reject(new Error('service worker is not ready'))
        return
      }
      var id = requestId()
      var timer = setTimeout(function () { rejectPending(id, new Error('PWA operation timed out')) }, REQUEST_TIMEOUT_MS)
      pending.set(id, { resolve: resolve, reject: reject, timer: timer })
      target.postMessage(Object.assign({ type: type, requestId: id }, payload || {}))
    })
  }

  function unavailable() {
    return Promise.reject(new Error('service worker is not available in this browser'))
  }

  function readyRegistration() {
    if (!('serviceWorker' in navigator)) return unavailable()
    if (registration) return Promise.resolve(registration)
    return Promise.race([
      navigator.serviceWorker.ready,
      new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error('service worker did not become ready')) }, REQUEST_TIMEOUT_MS)
      }),
    ])
  }

  function register() {
    migrateLocalState()
    if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') {
      emit('mathrl:pwa-support', { supported: false, base: base })
      return Promise.resolve(undefined)
    }
    navigator.serviceWorker.addEventListener('message', onWorkerMessage)
    return navigator.serviceWorker.register(url('sw.js'), { scope: base }).then(function (next) {
      registration = next
      if (registration.waiting) emit('mathrl:pwa-update', { registration: registration })
      registration.addEventListener('updatefound', function () {
        var installing = registration.installing
        if (!installing) return
        installing.addEventListener('statechange', function () {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            emit('mathrl:pwa-update', { registration: registration })
          }
        })
      })
      emit('mathrl:pwa-support', { supported: true, base: base, registration: registration })
      return registration
    }).catch(function (error) {
      emit('mathrl:pwa-support', { supported: false, base: base, error: String(error && error.message || error) })
      return undefined
    })
  }

  var api = {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    base: base,
    register: register,
    migrate: migrateLocalState,
    prefetch: function (pack) {
      var requested = pack === 'all' ? 'all' : pack
      if (requested !== 'all' && !locales[requested]) return Promise.reject(new Error('unknown locale pack'))
      if (!('serviceWorker' in navigator)) return unavailable()
      return readyRegistration().then(function (ready) {
        registration = ready
        return post('PWA_PREFETCH', { pack: requested })
      })
    },
    clear: function (pack) {
      var requested = pack === 'all' ? 'all' : pack
      if (requested !== 'all' && !locales[requested]) return Promise.reject(new Error('unknown locale pack'))
      if (!('serviceWorker' in navigator)) return unavailable()
      return readyRegistration().then(function (ready) {
        registration = ready
        return post('PWA_CLEAR', { pack: requested })
      })
    },
    status: function (pack) {
      var requested = pack === 'all' ? 'all' : pack
      if (requested !== 'all' && !locales[requested]) return Promise.reject(new Error('unknown locale pack'))
      if (!('serviceWorker' in navigator)) return unavailable()
      return readyRegistration().then(function (ready) {
        registration = ready
        return post('PWA_STATUS', { pack: requested })
      })
    },
    activateUpdate: function () {
      if (!registration || !registration.waiting) return Promise.resolve(false)
      return new Promise(function (resolve) {
        // Activation and navigation are separate user actions.  The current
        // page may contain an in-flight Worker/Wasm experiment, so never
        // reload it behind the user's back after the waiting worker takes
        // control.  The UI receives `true` and offers an explicit refresh.
        var settled = false
        var finish = function (value) {
          if (settled) return
          settled = true
          navigator.serviceWorker.removeEventListener('controllerchange', handler)
          clearTimeout(timer)
          resolve(value)
        }
        var handler = function () { finish(true) }
        var timer = setTimeout(function () { finish(false) }, REQUEST_TIMEOUT_MS)
        navigator.serviceWorker.addEventListener('controllerchange', handler)
        // Register the listener before asking the waiting worker to activate.
        // A fast worker can otherwise dispatch `controllerchange` between the
        // postMessage call and listener registration, leaving the promise to
        // time out and making a valid update look like a failure.
        registration.waiting.postMessage({ type: 'PWA_SKIP_WAITING' })
      })
    },
  }

  window.mathrlPwa = api
  if (document.readyState === 'loading') window.addEventListener('load', register, { once: true })
  else register()
})()
