/**
 * cli/style.js
 *
 * Terminal color helpers for CLI output.
 */

export const style = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

export function color(c, text) {
  return `${style[c]}${text}${style.reset}`;
}

export function header(text) {
  const line = '─'.repeat(Math.min(text.length + 4, 60));
  return `\n${color('bold', color('cyan', line))}\n  ${color('bold', color('cyan', text))}\n${color('bold', color('cyan', line))}`;
}

export function success(text) { console.log(`  ${color('green', '✓')} ${text}`); }
export function warn(text) { console.log(`  ${color('yellow', '⚠')} ${text}`); }
export function error(text) { console.log(`  ${color('red', '✗')} ${text}`); }
export function info(label, value) { console.log(`  ${color('bold', label)}: ${value}`); }
export function dim(text) { console.log(`  ${color('gray', text)}`); }

export function plural(n, singular, pluralStr) {
  return `${n} ${n === 1 ? singular : (pluralStr || singular + 's')}`;
}

export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
