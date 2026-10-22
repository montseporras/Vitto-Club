import type { ReactNode } from 'react'
import { dividedSectionStyles } from '@/styles/ui'

type ProfileSectionProps = {
  title: string
  children: ReactNode
}

/** Bloque de Mi perfil con su título, separado del anterior por una línea. */
export function ProfileSection({ title, children }: ProfileSectionProps) {
  return (
    <section className={`${dividedSectionStyles} first:mt-0 first:border-t-0 first:pt-0`}>
      <h3 className="mb-4 text-xl leading-tight text-accent-800">{title}</h3>
      {children}
    </section>
  )
}
