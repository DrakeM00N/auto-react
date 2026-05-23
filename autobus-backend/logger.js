// Minimal structured-ish logger. Stdlib only — no dependency.
//
// All output goes through here so a future swap to pino/winston is a
// single-file change. Format: ISO-timestamp level scope message ...extra.
// Errors get their stack appended automatically.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }
const MIN_LEVEL = LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] ?? LEVELS.info

function format(level, scope, args) {
  const ts = new Date().toISOString()
  const head = `${ts} ${level.toUpperCase().padEnd(5)} [${scope}]`
  return [head, ...args.map(a => {
    if (a instanceof Error) return `${a.message}\n${a.stack || ''}`
    if (typeof a === 'object' && a !== null) {
      try { return JSON.stringify(a) } catch { return String(a) }
    }
    return a
  })]
}

function emit(level, scope, args, stream) {
  if (LEVELS[level] < MIN_LEVEL) return
  stream(...format(level, scope, args))
}

function logger(scope) {
  return {
    debug: (...a) => emit('debug', scope, a, console.log),
    info:  (...a) => emit('info',  scope, a, console.log),
    warn:  (...a) => emit('warn',  scope, a, console.warn),
    error: (...a) => emit('error', scope, a, console.error),
  }
}

module.exports = { logger }
