import React, { useState } from 'react'
import { AppSidebar, type NavSection } from './AppSidebar'
import { FolderCheck } from 'lucide-react'

interface AppLayoutProps {
  activeSection: NavSection
  onSelectSection: (section: NavSection) => void
  exportPath: string
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeSection,
  onSelectSection,
  exportPath,
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

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

  const currentInfo = sectionTitles[activeSection]

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased">
      <AppSidebar
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex flex-col">
            <h1 className="text-base font-semibold text-slate-800 leading-tight">
              {currentInfo.title}
            </h1>
            <p className="text-xs text-slate-500">{currentInfo.subtitle}</p>
          </div>

          {/* Active Export Path Badge */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 max-w-sm truncate shadow-xs">
            <FolderCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-medium text-slate-500">Salida:</span>
            <span className="truncate text-slate-700" title={exportPath}>
              {exportPath || 'No configurada'}
            </span>
          </div>
        </header>

        {/* Main Content View */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
