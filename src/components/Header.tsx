interface HeaderProps {
  title: string
  subtitle: string
  headerColor: string
  compact?: boolean
}

export const Header = ({ title, subtitle, headerColor, compact = false }: HeaderProps) => {
  return (
    <header className={`${compact ? 'mb-2' : 'mb-4'} text-center`}>
      <h1
        className={`font-display font-black uppercase tracking-[0.18em] ${
          compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-[2rem]'
        }`}
        style={{ color: headerColor, textShadow: '0 2px 20px rgba(0,0,0,0.45)' }}
      >
        {title}
      </h1>
      <p
        className={`font-display font-bold uppercase tracking-[0.3em] text-white/85 ${
          compact ? 'text-[11px] sm:text-xs' : 'text-sm sm:text-base'
        }`}
      >
        {subtitle}
      </p>
    </header>
  )
}
