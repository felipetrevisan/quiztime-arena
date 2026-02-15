interface HeaderProps {
  title: string
  subtitle: string
  headerColor: string
}

export const Header = ({ title, subtitle, headerColor }: HeaderProps) => {
  return (
    <header className="mb-4 text-center">
      <h1
        className="font-display text-2xl font-black uppercase tracking-[0.2em] sm:text-[2rem]"
        style={{ color: headerColor, textShadow: '0 2px 20px rgba(0,0,0,0.45)' }}
      >
        {title}
      </h1>
      <p className="font-display text-sm font-bold uppercase tracking-[0.34em] text-white/85 sm:text-base">
        {subtitle}
      </p>
    </header>
  )
}
