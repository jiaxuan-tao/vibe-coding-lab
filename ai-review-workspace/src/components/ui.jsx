// Shared UI primitives for the inline-style design system.
// Every page composes these for a consistent look.
import { C, fonts, tint, iconBox, card, btnPrimary, btnGhost } from '../utils/theme'

export function PageHeader({ icon: Icon, title, subtitle, accent = C.blue, actions }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, flexWrap: 'wrap', marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        {Icon && (
          <div style={iconBox(accent, 44)}>
            <Icon size={21} strokeWidth={2.2} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={{
            fontFamily: fonts.heading, fontSize: 22, fontWeight: 700,
            color: C.text, lineHeight: 1.2, margin: 0,
          }}>{title}</h1>
          {subtitle && (
            <p style={{ fontSize: 13, color: C.textMuted, marginTop: 3 }}>{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

export function Card({ children, style, className = '', onClick, lift }) {
  return (
    <div
      onClick={onClick}
      className={`${lift ? 'hover-lift' : ''} ${className}`.trim()}
      style={{ ...card, cursor: onClick ? 'pointer' : undefined, ...style }}
    >
      {children}
    </div>
  )
}

export function StatCard({ icon: Icon, label, value, color = C.blue, sub }) {
  return (
    <div className="hover-lift" style={{ ...card, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
      {Icon && (
        <div style={iconBox(color, 42)}>
          <Icon size={20} strokeWidth={2.2} />
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}{sub ? <span style={{ color: C.textFaint }}> · {sub}</span> : null}
        </div>
      </div>
    </div>
  )
}

export function SectionTitle({ icon: Icon, children, color = C.blue, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <h2 style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: fonts.heading, fontSize: 15, fontWeight: 700, color: C.text, margin: 0,
      }}>
        {Icon && <Icon size={16} color={color} strokeWidth={2.4} />}
        {children}
      </h2>
      {action}
    </div>
  )
}

export function Empty({ icon: Icon, title, description, action, actionLabel, accent = C.blue }) {
  return (
    <div className="page-enter" style={{ textAlign: 'center', padding: '40px 20px' }}>
      {Icon && (
        <div style={{ ...iconBox(accent, 64), margin: '0 auto 16px' }}>
          <Icon size={28} strokeWidth={1.8} />
        </div>
      )}
      <h3 style={{ fontFamily: fonts.heading, fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: 13, color: C.textMuted, maxWidth: 380, margin: '0 auto 18px', lineHeight: 1.6 }}>
          {description}
        </p>
      )}
      {action && (
        <button onClick={action} style={btnPrimary}>{actionLabel || 'Get started'}</button>
      )}
    </div>
  )
}

export function Spinner({ size = 22, color = C.blue }) {
  return (
    <div
      className="spin"
      style={{
        width: size, height: size,
        border: `2.5px solid ${tint(color, 0.2)}`,
        borderTopColor: color,
        borderRadius: '50%',
      }}
    />
  )
}

export function PageLoading({ label = 'Loading…' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '80px 0' }}>
      <Spinner size={28} />
      <span style={{ fontSize: 13, color: C.textMuted, fontFamily: fonts.body }}>{label}</span>
    </div>
  )
}

export { btnPrimary, btnGhost }
