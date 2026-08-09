// Shared, mutable design tokens for the inline-style system.
// applyTheme updates existing references so every visible page can rerender with one palette.

const DARK_COLORS = {
  bg: '#0b0e14', bgSoft: '#10141c', card: '#12161f', cardSoft: '#161b26', cardHover: '#1a2030',
  border: '#222a3a', borderSoft: '#1a2130', text: '#e8ebf4', textMuted: '#9aa1b5', textFaint: '#5c6478',
  blue: '#9db8ff', blueDark: '#5a8bff', purple: '#d9a9ff', purpleDark: '#b55cff',
  green: '#a6f0a0', greenDark: '#3ddc84', pink: '#ff7aa8', orange: '#ffc88a', yellow: '#ffe08a', red: '#ff8a80',
}

const LIGHT_COLORS = {
  bg: '#f5f7fb', bgSoft: '#eef2f7', card: '#ffffff', cardSoft: '#fbfcfe', cardHover: '#f1f5fa',
  border: '#d9e1ec', borderSoft: '#e6ebf2', text: '#172033', textMuted: '#53627a', textFaint: '#7b8799',
  blue: '#3f66c5', blueDark: '#2851ae', purple: '#7650b6', purpleDark: '#62399e',
  green: '#218356', greenDark: '#176d45', pink: '#c84b7d', orange: '#b86c15', yellow: '#9a7000', red: '#bd4d45',
}

export const C = { ...DARK_COLORS }

export const fonts = {
  heading: "'Space Grotesk', sans-serif",
  body: "'Manrope', sans-serif",
}

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 }
export const shadow = {
  card: '0 1px 2px rgba(23,32,51,0.05), 0 8px 24px rgba(23,32,51,0.06)',
  lift: '0 12px 32px rgba(23,32,51,0.14)',
  glowBlue: '0 8px 32px rgba(40,81,174,0.2)',
  modal: '0 24px 64px rgba(23,32,51,0.24)',
}

// These shared objects are passed directly to JSX in multiple places. Keep them immutable
// and use CSS variables so React's development freeze does not block a theme change.
export const card = {
  background: 'linear-gradient(180deg, var(--review-card-soft) 0%, var(--review-card) 100%)',
  border: '1px solid var(--review-border)', borderRadius: radius.lg, padding: 20, boxShadow: shadow.card,
}

export const cardFlat = {
  background: 'var(--review-card)', border: '1px solid var(--review-border)', borderRadius: radius.md, padding: 16,
}

export const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: radius.sm + 2,
  background: 'var(--review-bg)', border: '1px solid var(--review-border)', color: 'var(--review-text)',
  fontSize: 14, fontFamily: fonts.body, boxSizing: 'border-box', outline: 'none',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
}

export const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '11px 20px', borderRadius: radius.sm + 2, border: 'none',
  background: 'linear-gradient(135deg, var(--review-blue) 0%, var(--review-blue-dark) 100%)', color: '#ffffff',
  cursor: 'pointer', fontFamily: fonts.heading, fontSize: 14, fontWeight: 700,
  boxShadow: shadow.glowBlue, transition: 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease',
}

export const btnGhost = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '10px 18px', borderRadius: radius.sm + 2, border: '1px solid var(--review-border)',
  background: 'transparent', color: 'var(--review-text)', cursor: 'pointer', fontFamily: fonts.heading,
  fontSize: 13, fontWeight: 600, transition: 'border-color 0.15s ease, background 0.15s ease',
}

export const tint = (hex, alpha = 0.12) => {
  const value = parseInt(hex.slice(1), 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255
  return `rgba(${red},${green},${blue},${alpha})`
}

export const applyTheme = (theme = 'dark') => {
  Object.assign(C, theme === 'light' ? LIGHT_COLORS : DARK_COLORS)
}

applyTheme('dark')

export const btnAccent = (color) => ({
  ...btnGhost,
  color,
  border: `1px solid ${tint(color, 0.35)}`,
  background: tint(color, 0.08),
})

export const chip = (color) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: radius.pill,
  background: tint(color, 0.12), border: `1px solid ${tint(color, 0.25)}`, color,
  fontFamily: fonts.heading, fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap',
})

export const iconBox = (color, size = 40) => ({
  width: size, height: size, borderRadius: Math.round(size * 0.3), flexShrink: 0,
  background: `linear-gradient(135deg, ${tint(color, 0.22)} 0%, ${tint(color, 0.08)} 100%)`,
  border: `1px solid ${tint(color, 0.25)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color,
})
