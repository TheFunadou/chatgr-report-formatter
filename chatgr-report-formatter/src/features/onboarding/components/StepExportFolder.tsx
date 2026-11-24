import React from 'react'
import { Folder, FolderCheck, Sparkles } from 'lucide-react'
import { pickFolderDialog } from '../../../lib/tauri'

interface StepExportFolderProps {
  exportPath: string
  onSelectPath: (path: string) => void
}

export const StepExportFolder: React.FC<StepExportFolderProps> = ({
  exportPath,
  onSelectPath,
}) => {
  const defaultSuggestedPath = 'C:/Reportes_CRM'

  const handleBrowse = async () => {
    const chosen = await pickFolderDialog(exportPath || defaultSuggestedPath)
    if (chosen) onSelectPath(chosen)
  }

  return (
    <div className="space-y-6">
      <div className="text-center max-w-lg mx-auto">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 mb-3">
          <FolderCheck className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800">
          Define tu carpeta de exportación predeterminada
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Todos los libros de Excel generados se guardarán automáticamente en este directorio.
          Podrás cambiarlo en cualquier momento desde Configuración.
        </p>
      </div>

      <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ruta activa seleccionada
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 font-mono truncate">
              {exportPath || defaultSuggestedPath}
            </div>
            <button
              type="button"
              onClick={handleBrowse}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors shrink-0"
            >
              <Folder className="h-4 w-4 text-slate-500" />
              Explorar carpeta
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-emerald-50/70 p-3 text-xs text-emerald-800 border border-emerald-100">
          <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            Ruta sugerida automáticamente para fácil acceso dentro de tus documentos.
          </span>
        </div>
      </div>
    </div>
  )
}
