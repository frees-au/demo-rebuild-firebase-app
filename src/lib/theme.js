export const themeColors = Object.freeze([
  { name: 'paper', token: '--ac-color-paper', label: 'Paper', defaultValue: '#f4f1ea', text: 'var(--ac-color-ink)' },
  { name: 'paperHard', token: '--ac-color-paper-hard', label: 'Hard paper', defaultValue: '#fffdf7', text: 'var(--ac-color-ink)' },
  { name: 'ink', token: '--ac-color-ink', label: 'Ink', defaultValue: '#090909', text: 'var(--ac-color-paper-hard)' },
  { name: 'inkSoft', token: '--ac-color-ink-soft', label: 'Soft ink', defaultValue: '#33302c', text: 'var(--ac-color-paper-hard)' },
  { name: 'line', token: '--ac-color-line', label: 'Line', defaultValue: '#090909', text: 'var(--ac-color-paper-hard)' },
  { name: 'red', token: '--ac-color-red', label: 'Red', defaultValue: '#7f1111', text: 'var(--ac-color-paper-hard)' },
  { name: 'redDark', token: '--ac-color-red-dark', label: 'Dark red', defaultValue: '#4c0909', text: 'var(--ac-color-paper-hard)' },
  { name: 'redWash', token: '--ac-color-red-wash', label: 'Red wash', defaultValue: '#ead6d1', text: 'var(--ac-color-ink)' },
  { name: 'steel', token: '--ac-color-steel', label: 'Steel', defaultValue: '#c9c2b8', text: 'var(--ac-color-ink)' },
]);

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function emptyThemeColors() {
  return Object.fromEntries(themeColors.map((color) => [color.name, '']));
}

export function normalizeThemeColors(colors = {}) {
  return Object.fromEntries(
    themeColors
      .map((color) => [color.name, String(colors[color.name] || '').trim()])
      .filter(([, value]) => hexColorPattern.test(value))
      .map(([name, value]) => [name, value.toLowerCase()]),
  );
}

export function toThemeFormValues(colors = {}) {
  return {
    ...emptyThemeColors(),
    ...normalizeThemeColors(colors),
  };
}

export function applyThemeColors(colors = {}) {
  if (typeof document === 'undefined') {
    return;
  }

  const normalized = normalizeThemeColors(colors);

  for (const color of themeColors) {
    if (normalized[color.name]) {
      document.documentElement.style.setProperty(color.token, normalized[color.name]);
    } else {
      document.documentElement.style.removeProperty(color.token);
    }
  }
}
