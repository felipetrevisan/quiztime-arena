import { setActivePersonaAlias } from '@/utils/persona'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/bea')({
  component: BeaAliasRoute,
})

function BeaAliasRoute() {
  const navigate = useNavigate()

  useEffect(() => {
    setActivePersonaAlias('bea')
    void navigate({ to: '/' })
  }, [navigate])

  return (
    <section className="mt-6 flex flex-1 items-center justify-center">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
        Preparando sua experiencia...
      </p>
    </section>
  )
}
