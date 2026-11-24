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
        'relative flex flex-col border-r border-slate-200 bg-slate-900 text-slate-100 transition-all duration-200 select-none',
        isCollapsed ? 'w-16' : 'w-64'
      )}
      aria-label="Navegación principal"
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold shadow-sm">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="flex flex-col truncate">
              <span className="font-semibold text-sm tracking-tight text-white">
                Reportes CRM
              </span>
              <span className="text-xs text-slate-400">Generador XLSX</span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors',
            isCollapsed && 'hidden'
          )}
          title={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          aria-label={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-1.5 p-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left',
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                )}
              />
              {!isCollapsed && (
                <div className="flex flex-col truncate">
                  <span className="leading-tight">{item.label}</span>
                  <span
                    className={cn(
                      'text-[11px] truncate',
                      isActive ? 'text-emerald-100' : 'text-slate-400'
                    )}
                  >
                    {item.description}
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </nav>

      {/* Collapse toggle when collapsed */}
      {isCollapsed && (
        <div className="p-2 border-t border-slate-800 flex justify-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Expandir barra lateral"
            aria-label="Expandir barra lateral"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Offline Badge Footer */}
      <div className="p-3 border-t border-slate-800 text-xs text-slate-400">
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="truncate">Modo 100% offline</span>
          </div>
        ) : (
          <div className="flex justify-center" title="Modo 100% offline">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
        )}
      </div>
    </aside>
  )
}
