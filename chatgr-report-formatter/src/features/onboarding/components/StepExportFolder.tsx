import React, { useState } from 'react'
import { Folder, FolderCheck, Download, AlertTriangle, ArrowUpRight } from 'lucide-react'
import { pickFolderDialog, validateExportFolderApi } from '../../../lib/tauri'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'

interface StepExportFolderProps {
  exportPath: string
  onSelectPath: (path: string) => void
}

export const StepExportFolder: React.FC<StepExportFolderProps> = ({
  exportPath,
  onSelectPath,
}) => {
  const [error, setError] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)

  const handleBrowse = async () => {
    setPicking(true)
    setError(null)
    try {
      const chosen = await pickFolderDialog(exportPath || undefined)
      if (!chosen) return

      try {
        await validateExportFolderApi(chosen)
        onSelectPath(chosen)
      } catch (err) {
        setError(
          typeof err === 'string'
            ? err
            : 'La carpeta elegida no permite escribir archivos. Elige otra.'
        )
      }
    } finally {
      setPicking(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <span className="flex size-10 items-center justify-center rounded-lg bg-signal-50 text-signal-700">
          <FolderCheck className="size-5" strokeWidth={1.8} />
        </span>
        <h2 className="mt-4 text-lg font-semibold tracking-[-0.015em] text-ink-900">
          Define tu carpeta de exportación predeterminada
        </h2>
        <p className="mt-1 max-w-lg text-xs leading-5 text-ink-500">
          Todos los libros de Excel generados se guardarán automáticamente en este directorio. Podrás
          cambiarlo en cualquier momento desde Configuración.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-line bg-paper/50 p-5">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-surface text-signal-700">
            <Download className="size-3.5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium text-ink-700">Sugerencia del sistema</p>
              <Badge tone="neutral">Descargas</Badge>
            </div>
            <p className="mt-0.5 text-[11px] leading-4 text-ink-500">
              Se propone la carpeta de Descargas de tu equipo con una subcarpeta «Reportes CRM». No
              tienes que escribir ninguna ruta.
            </p>
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-700">Carpeta seleccionada</span>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
              <Folder className="size-4 shrink-0 text-ink-500" />
              <span className="truncate font-mono text-[11px] text-ink-700" title={exportPath}>
                {exportPath || 'Elige una carpeta para continuar'}
              </span>
            </div>
            <Button variant="secondary" onClick={handleBrowse} disabled={picking} className="shrink-0">
              <Folder />
              {picking ? 'Abriendo…' : 'Explorar carpeta'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] leading-4 text-red-800">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-start gap-2 rounded-lg border border-line bg-surface p-3 text-[11px] leading-4 text-ink-600">
          <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-signal-600" />
          La app abre el selector nativo de tu sistema operativo, así que funciona igual en Windows,
          macOS y Linux.
        </div>
      </div>
    </div>
  )
}
