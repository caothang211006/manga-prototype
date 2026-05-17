'use client'

import { AppShell } from '@/components/layout/app-shell'
import { AppRouter } from '@/components/app-router'

export default function Home() {
  return (
    <AppShell>
      <AppRouter />
    </AppShell>
  )
}
