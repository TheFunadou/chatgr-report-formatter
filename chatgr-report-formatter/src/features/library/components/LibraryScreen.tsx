import React, { useEffect, useState } from 'react'
import type { SourceFileItem } from '../../../types/sourceFiles'
import {
  listSourceFilesApi,
  registerSourceFileApi,
  updateSourceAliasApi,
  relinkSourceFileApi,
  deleteSourceFileApi,
  cleanMissingSourcesApi,
  clearSourceLibraryApi,
  pickCsvFilesDialog,
  validateCsvFileApi,
} from '../../../lib/tauri'
import {
  FolderOpen,
  Search,
  Plus,
  Trash2,
  Pencil,
  RefreshCw,
  FolderSearch,
  ArrowUpRight,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Input, Label } from '../../../components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { ConfirmDialog } from '../../../components/ui/confirm-dialog'

interface LibraryScreenProps {
  onLoadFileToHome?: (file: { path: string; name: string; size: number }) => void
}

type Feedback = { tone: 'error' | 'success' | 'info'; message: string }
type PendingRegister = { path: string; name: string }

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ onLoadFileToHome }) => {
  const [files, setFiles] = useState<SourceFileItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAliasValue, setEditAliasValue] = useState('')
  const [pendingRegister, setPendingRegister] = useState<PendingRegister | null>(null)
  const [aliasInput, setAliasInput] = useState('')
  const [pendingDelete, setPendingDelete] = useState<SourceFileItem | null>(null)
  const [confirmCleanMissing, setConfirmCleanMissing] = useState(false)
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const loadFiles = async (query?: string) => {
    setLoading(true)
    try {
      const items = await listSourceFilesApi(query?.trim() ? query.trim() : undefined)
      setFiles(items)
    } catch (err) {
      console.warn('Error loading source files from SQLite:', err)
      setFeedback({
        tone: 'error',
        message: 'No se pudo leer la biblioteca local de archivos.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFiles(searchQuery)
  }, [searchQuery])

  const handleRegisterNewFile = async () => {
    setFeedback(null)
    const paths = await pickCsvFilesDialog(false)
    if (!paths || paths.length === 0) return

    const path = paths[0]
    try {
      const meta = await validateCsvFileApi(path)
      setPendingRegister({ path: meta.path, name: meta.fileName })
      setAliasInput('')
    } catch (err) {
      setFeedback({
        tone: 'error',
        message:
          typeof err === 'string'
            ? err
            : err instanceof Error
              ? err.message
              : 'Error al validar el archivo CSV.',
      })
    }
  }

  const handleConfirmRegister = async (withAlias: boolean) => {
    if (!pendingRegister) return
    try {
      await registerSourceFileApi(
        pendingRegister.path,
        pendingRegister.name,
        withAlias && aliasInput.trim() ? aliasInput.trim() : undefined
      )
      setPendingRegister(null)
      setAliasInput('')
      setFeedback({
        tone: 'success',
        message: `«${pendingRegister.name}» se agregó a la biblioteca.`,
      })
      await loadFiles(searchQuery)
    } catch (err) {
      setFeedback({
        tone: 'error',
        message:
          typeof err === 'string'
            ? err
            : err instanceof Error
              ? err.message
              : 'No se pudo registrar el archivo.',
      })
    }
  }

  const handleStartEditAlias = (file: SourceFileItem) => {
    setEditingId(file.id)
    setEditAliasValue(file.alias || '')
  }

  const handleSaveAlias = async (id: string) => {
    const trimmed = editAliasValue.trim()
    try {
      await updateSourceAliasApi(id, trimmed.length > 0 ? trimmed : undefined)
      setEditingId(null)
      setFeedback({ tone: 'success', message: 'Alias actualizado.' })
      await loadFiles(searchQuery)
    } catch (err) {
      setFeedback({
        tone: 'error',
        message:
          typeof err === 'string'
            ? err
            : err instanceof Error
              ? err.message
              : 'No se pudo actualizar el alias.',
      })
    }
  }

  const handleRelink = async (id: string) => {
    const paths = await pickCsvFilesDialog(false)
    if (!paths || paths.length === 0) return

    const newPath = paths[0]
    try {
      await validateCsvFileApi(newPath)
      await relinkSourceFileApi(id, newPath)
      setFeedback({ tone: 'success', message: 'Archivo revinculado correctamente.' })
      await loadFiles(searchQuery)
    } catch (err) {
      setFeedback({
        tone: 'error',
        message:
          typeof err === 'string'
            ? err
            : err instanceof Error
              ? err.message
              : 'No se pudo revincular el archivo.',
      })
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteSourceFileApi(pendingDelete.id)
      setPendingDelete(null)
      setFeedback({
        tone: 'success',
        message: 'Referencia eliminada. El CSV original no se modificó.',
      })
      await loadFiles(searchQuery)
    } catch (err) {
      setFeedback({
        tone: 'error',
        message: 'No se pudo eliminar la referencia del catálogo.',
      })
    }
  }

  const handleCleanMissing = async () => {
    try {
      const removed = await cleanMissingSourcesApi()
      setConfirmCleanMissing(false)
      setFeedback({
        tone: 'success',
        message:
          removed > 0
            ? `${removed} referencia(s) huérfana(s) eliminadas.`
            : 'No había referencias huérfanas.',
      })
      await loadFiles(searchQuery)
    } catch (err) {
      setFeedback({ tone: 'error', message: 'No se pudieron limpiar las referencias.' })
    }
  }

  const handleClearAll = async () => {
    try {
      await clearSourceLibraryApi()
      setConfirmClearAll(false)
      setFeedback({ tone: 'success', message: 'Catálogo vaciado. Los archivos siguen en disco.' })
      await loadFiles()
    } catch (err) {
      setFeedback({ tone: 'error', message: 'No se pudo vaciar el catálogo.' })
    }
  }

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const missingCount = files.filter((file) => !file.isAvailable).length

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-500" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por nombre o alias..."
            className="pl-9"
            aria-label="Buscar archivos"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={handleRegisterNewFile}>
            <Plus />
            Registrar CSV
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (missingCount === 0) {
                setFeedback({
                  tone: 'info',
                  message: 'Todos los archivos registrados están disponibles en el disco.',
                })
                return
              }
              setConfirmCleanMissing(true)
            }}
            title="Eliminar referencias de archivos que ya no existen físicamente"
          >
            <RefreshCw />
            Limpiar huérfanos
          </Button>
          {files.length > 0 && (
            <Button
              variant="danger"
              onClick={() => setConfirmClearAll(true)}
              title="Vaciar todo el catálogo"
            >
              <Trash2 />
              Vaciar catálogo
            </Button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={
            feedback.tone === 'error'
              ? 'flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800'
              : feedback.tone === 'success'
                ? 'flex items-start justify-between gap-3 rounded-lg border border-signal-200 bg-signal-50 p-3 text-xs text-signal-700'
                : 'flex items-start justify-between gap-3 rounded-lg border border-line bg-surface p-3 text-xs text-ink-700'
          }
        >
          <span className="flex items-start gap-2">
            {feedback.tone === 'error' ? (
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
            )}
            <span className="leading-5">{feedback.message}</span>
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
            aria-label="Cerrar aviso"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-semibold text-ink-900">Fuentes registradas</h3>
            <Badge tone="neutral">{files.length}</Badge>
            {missingCount > 0 && <Badge tone="warning">{missingCount} no encontradas</Badge>}
          </div>
          <p className="text-[11px] text-ink-500">
            Solo metadatos y rutas; los CSV no se copian a la base de datos.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="select-none border-b border-line bg-paper/70 text-ink-600">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Fuente / Alias</th>
                <th className="px-4 py-2.5 font-semibold">Ruta en disco</th>
                <th className="px-4 py-2.5 font-semibold">Tamaño</th>
                <th className="px-4 py-2.5 text-center font-semibold">Disponibilidad</th>
                <th className="px-4 py-2.5 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {files.map((file) => (
                <tr key={file.id} className="transition-colors hover:bg-paper/40">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-line bg-paper text-ink-500">
                        <FolderOpen className="size-3.5" />
                      </span>
                      <div className="min-w-0 space-y-0.5">
                        {editingId === file.id ? (
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="text"
                              value={editAliasValue}
                              onChange={(event) => setEditAliasValue(event.target.value)}
                              placeholder="Escribe un alias..."
                              className="h-7 w-44 text-xs"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSaveAlias(file.id)}
                              className="text-signal-700"
                            >
                              Guardar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-medium text-ink-900">
                              {file.alias || file.originalFileName}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStartEditAlias(file)}
                              className="rounded p-0.5 text-ink-500 transition-colors hover:text-ink-900"
                              title="Editar alias"
                              aria-label={`Editar alias de ${file.originalFileName}`}
                            >
                              <Pencil className="size-3" />
                            </button>
                          </div>
                        )}
                        {file.alias && (
                          <p className="text-[11px] text-ink-500">
                            Archivo: {file.originalFileName}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td
                    className="max-w-xs truncate px-4 py-3 font-mono text-[11px] text-ink-600"
                    title={file.sourceRoute}
                  >
                    {file.sourceRoute}
                  </td>

                  <td className="tnum px-4 py-3 font-mono text-[11px] text-ink-500">
                    {formatFileSize(file.fileSize)}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {file.isAvailable ? (
                      <Badge tone="signal" dot>
                        Disponible
                      </Badge>
                    ) : (
                      <Badge tone="danger" dot>
                        Archivo no encontrado
                      </Badge>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {!file.isAvailable && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRelink(file.id)}
                          title="Localizar archivo en otra ubicación"
                        >
                          <FolderSearch />
                          Localizar archivo
                        </Button>
                      )}

                      {file.isAvailable && onLoadFileToHome && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            onLoadFileToHome({
                              path: file.sourceRoute,
                              name: file.originalFileName,
                              size: file.fileSize || 0,
                            })
                          }
                          title="Cargar archivo en la pantalla de inicio"
                          className="border-signal-200 text-signal-700 hover:bg-signal-50"
                        >
                          <ArrowUpRight />
                          Cargar a Inicio
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPendingDelete(file)}
                        className="hover:bg-red-50 hover:text-red-600"
                        title="Eliminar del catálogo"
                        aria-label={`Eliminar referencia de ${file.originalFileName}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && files.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center">
                    <HardDrive className="mx-auto mb-2 size-7 text-ink-500/40" />
                    <p className="text-[13px] font-medium text-ink-700">
                      No hay archivos en la biblioteca
                    </p>
                    <p className="mx-auto mt-1 max-w-sm text-[11px] leading-4 text-ink-500">
                      {searchQuery
                        ? 'No se encontraron resultados para tu búsqueda.'
                        : 'Registra un CSV para conservar su ruta y metadatos entre sesiones.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register alias dialog */}
      <Dialog
        open={pendingRegister !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRegister(null)
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Registrar fuente</DialogTitle>
            <DialogDescription>
              {pendingRegister?.name} se guardará en la biblioteca local con su ruta actual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 px-5 py-4">
            <Label htmlFor="source-alias">Alias (opcional)</Label>
            <Input
              id="source-alias"
              autoFocus
              value={aliasInput}
              onChange={(event) => setAliasInput(event.target.value)}
              placeholder="ej. Leads noviembre"
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleConfirmRegister(true)
              }}
            />
            <p className="text-[11px] leading-4 text-ink-500">
              Un alias facilita encontrarla después. Puedes cambiarlo con el lápiz de la tabla.
            </p>
          </div>
          <DialogFooter className="justify-end">
            <Button variant="ghost" onClick={() => handleConfirmRegister(false)}>
              Registrar sin alias
            </Button>
            <Button variant="primary" onClick={() => handleConfirmRegister(true)}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar referencia"
        description={`Se quitará «${pendingDelete?.alias || pendingDelete?.originalFileName || ''}» del catálogo.\n\nEl archivo CSV original en tu disco no se elimina.`}
        confirmLabel="Eliminar referencia"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={confirmCleanMissing}
        title="Limpiar referencias huérfanas"
        description={`Se eliminarán ${missingCount} referencia(s) cuyos archivos ya no existen en el disco. Los archivos físicos no se tocan.`}
        confirmLabel="Limpiar referencias"
        tone="primary"
        onConfirm={handleCleanMissing}
        onCancel={() => setConfirmCleanMissing(false)}
      />

      <ConfirmDialog
        open={confirmClearAll}
        title="Vaciar catálogo"
        description={'Se eliminarán todas las referencias de la base de datos local.\n\nLos archivos CSV y los reportes XLSX permanecen intactos en el disco.'}
        confirmLabel="Vaciar catálogo"
        onConfirm={handleClearAll}
        onCancel={() => setConfirmClearAll(false)}
      />
    </div>
  )
}
