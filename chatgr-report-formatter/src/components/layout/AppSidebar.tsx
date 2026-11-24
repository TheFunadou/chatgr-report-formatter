import React from 'react'
import {
  FileSpreadsheet,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '../../lib/utils'

export type NavSection = 'home' | 'files' | 'settings'

interface AppSidebarProps {
  activeSection: NavSection
  onSelectSection: (section: NavSection) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeSection,
  onSelectSection,
  isCollapsed,
  onToggleCollapse,
}) => {
  const navItems = [
    {
      id: 'home' as NavSection,
      label: 'Inicio',
      description: 'Importar y procesar CSV',
      icon: FileSpreadsheet,
    },
    {
      id: 'files' as NavSection,
      label: 'Archivos',
      description: 'Fuentes recientes',
      icon: FolderOpen,
    },
    {
      id: 'settings' as NavSection,
      label: 'Configuración',
      description: 'Rutas y dimensiones',
      icon: Settings,
    },
  ]

  return (
    <aside
      className={cn(
        'relative flex shrink-0 flex-col bg-ink-950 text-white transition-[width] duration-200 select-none',
        isCollapsed ? 'w-[68px]' : 'w-60'
      )}
      aria-label="Navegación principal"
    >
      <div className="hairline-grid absolute inset-0 opacity-60" aria-hidden="true" />

      {/* Brand */}
      <div className="relative flex h-16 items-center gap-2.5 border-b border-white/[0.08] px-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-signal-500 text-white shadow-[0_1px_0_rgb(255_255_255/0.2)_inset]">
          <FileSpreadsheet className="size-[18px]" strokeWidth={1.9} />
        </div>

        {!isCollapsed && (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-semibold tracking-[-0.01em] text-white">
              Reportes CRM
            </span>
            <span className="truncate text-[11px] text-white/45">Excel local</span>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            'ml-auto flex size-7 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white',
            isCollapsed && 'hidden'
          )}
          title="Colapsar barra lateral"
          aria-label="Colapsar barra lateral"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 space-y-0.5 p-2.5">
        {!isCollapsed && (
          <p className="px-2.5 pb-2 pt-2 text-[11px] font-medium text-white/35">
            Espacio de trabajo
          </p>
        )}

        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors',
                isActive
                  ? 'bg-white/[0.07] text-white'
                  : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
              )}
              title={isCollapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={cn(
                  'absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-signal-300 transition-opacity',
                  isActive ? 'opacity-100' : 'opacity-0'
                )}
                aria-hidden="true"
              />
              <Icon
                className={cn(
                  'size-[18px] shrink-0',
                  isActive ? 'text-signal-200' : 'text-white/40 group-hover:text-white/70'
                )}
                strokeWidth={1.8}
              />
              {!isCollapsed && (
                <span className="flex min-w-0 flex-col">
                  <span className="text-[13px] font-medium leading-tight">{item.label}</span>
                  <span className="truncate text-[11px] leading-tight text-white/35">
                    {item.description}
                  </span>
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {isCollapsed && (
        <div className="relative border-t border-white/[0.08] p-2.5">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="mx-auto flex size-8 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white"
            title="Expandir barra lateral"
            aria-label="Expandir barra lateral"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {/* Offline note */}
      <div className="relative border-t border-white/[0.08] p-3">
        {isCollapsed ? (
          <div className="flex justify-center" title="Modo 100% offline">
            <ShieldCheck className="size-4 text-signal-300" />
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md bg-white/[0.04] px-2.5 py-2">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-signal-300" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-white/70">Modo 100% offline</p>
              <p className="text-[10px] leading-4 text-white/35">
                Tus CSV y reportes nunca salen del equipo.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
