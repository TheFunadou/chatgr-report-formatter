import React, { useState } from 'react'
import { AppSidebar, type NavSection } from './AppSidebar'
import { FolderCheck } from 'lucide-react'

interface AppLayoutProps {
  activeSection: NavSection
  onSelectSection: (section: NavSection) => void
  exportPath: string
  children: React.ReactNode
}

const sectionTitles: Record<NavSection, { title: string; subtitle: string }> = {
  home: {
    title: 'Importación y Procesamiento',
    subtitle: 'Convierte tus CSV comerciales en reportes Excel ejecutables',
  },
  files: {
    title: 'Biblioteca de Archivos',
    subtitle: 'Fuentes recientes y revinculación local de datos',
  },
  settings: {
    title: 'Configuración de Preferencias',
    subtitle: 'Ruta de salida y personalización de estatus, prioridades y orígenes',
  },
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeSection,
  onSelectSection,
  exportPath,
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const currentInfo = sectionTitles[activeSection]

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-paper font-sans text-ink-900">
      <AppSidebar
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-6 border-b border-line bg-surface px-7">
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink-900">
              {currentInfo.title}
            </h1>
            <p className="truncate text-xs text-ink-500">{currentInfo.subtitle}</p>
          </div>

          <div className="flex max-w-[46%] items-center gap-2.5 rounded-lg border border-line bg-paper px-3 py-1.5">
            <FolderCheck className="size-4 shrink-0 text-signal-600" strokeWidth={1.8} />
            <div className="min-w-0">
              <p className="text-[10px] font-medium leading-3 text-ink-500">Guardando en</p>
              <p
                className="truncate font-mono text-[11px] leading-4 text-ink-800"
                title={exportPath}
              >
                {exportPath || 'Sin carpeta configurada'}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-7 py-7">{children}</div>
        </main>
      </div>
    </div>
  )
}
