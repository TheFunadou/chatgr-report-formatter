import React, { useState, useEffect } from 'react'
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
  Edit2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderSearch,
  ArrowUpRight,
  HardDrive,
} from 'lucide-react'

interface LibraryScreenProps {
  onLoadFileToHome?: (file: { path: string; name: string; size: number }) => void
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ onLoadFileToHome }) => {
  const [files, setFiles] = useState<SourceFileItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAliasValue, setEditAliasValue] = useState('')

  const loadFiles = async (query?: string) => {
    setLoading(true)
    try {
      const items = await listSourceFilesApi(query?.trim() ? query.trim() : undefined)
      setFiles(items)
    } catch (err) {
      console.warn('Error loading source files from SQLite:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFiles(searchQuery)
  }, [searchQuery])

  const handleRegisterNewFile = async () => {
    const paths = await pickCsvFilesDialog(false)
    if (!paths || paths.length === 0) return

    const path = paths[0]
    try {
      const meta = await validateCsvFileApi(path)
      const alias = prompt(`Ingresa un alias para "${meta.fileName}" (opcional):`, '') || undefined
      await registerSourceFileApi(path, meta.fileName, alias)
      await loadFiles(searchQuery)
    } catch (err: any) {
      alert(typeof err === 'string' ? err : err?.message || 'Error al validar archivo CSV.')
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
      await loadFiles(searchQuery)
    } catch (err) {
      console.warn('Error updating alias:', err)
    }
  }

  const handleRelink = async (id: string) => {
    const paths = await pickCsvFilesDialog(false)
    if (!paths || paths.length === 0) return

    const newPath = paths[0]
    try {
      await validateCsvFileApi(newPath)
      await relinkSourceFileApi(id, newPath)
      await loadFiles(searchQuery)
    } catch (err: any) {
      alert(typeof err === 'string' ? err : err?.message || 'Error al revincular archivo.')
    }
  }

  const handleDelete = async (file: SourceFileItem) => {
    const confirmed = confirm(
      `¿Deseas eliminar la referencia de "${file.alias || file.originalFileName}" del catálogo?\n\n(Aviso: El archivo CSV original en tu disco NO será eliminado).`
    )
    if (!confirmed) return

    try {
      await deleteSourceFileApi(file.id)
      await loadFiles(searchQuery)
    } catch (err) {
      console.warn('Error deleting source file reference:', err)
    }
  }

  const handleCleanMissing = async () => {
    const missingCount = files.filter((f) => !f.isAvailable).length
    if (missingCount === 0) {
      alert('Todos los archivos registrados están disponibles en el disco.')
      return
    }

    if (confirm(`Se eliminarán ${missingCount} referencia(s) cuyos archivos no existen en el disco. ¿Continuar?`)) {
      await cleanMissingSourcesApi()
      await loadFiles(searchQuery)
    }
  }

  const handleClearAll = async () => {
    if (files.length === 0) return

    if (
      confirm(
        '¿Deseas vaciar todo el catálogo de fuentes registradas?\n\n(Aviso: Solo se eliminan las referencias en la base de datos local, no los archivos físicos).'
      )
    ) {
      await clearSourceLibraryApi()
      await loadFiles()
    }
  }

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      {/* Search and Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o alias..."
            className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-4 py-2 text-xs text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-hidden"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRegisterNewFile}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Registrar CSV
          </button>

          <button
            type="button"
            onClick={handleCleanMissing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            title="Eliminar referencias de archivos que ya no existen físicamente"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            Limpiar huérfanos
          </button>

          {files.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 shadow-xs hover:bg-red-50 transition-colors"
              title="Vaciar todo el catálogo"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Vaciar catálogo
            </button>
          )}
        </div>
      </div>

      {/* Files Table / List */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 select-none">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Fuente / Alias</th>
                <th className="py-2.5 px-4 font-semibold">Ruta en disco</th>
                <th className="py-2.5 px-4 font-semibold">Tamaño</th>
                <th className="py-2.5 px-4 font-semibold text-center">Disponibilidad</th>
                <th className="py-2.5 px-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-slate-50/70">
                  {/* File Name & Alias */}
                  <td className="py-3 px-4">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-md bg-slate-100 text-slate-500 mt-0.5 shrink-0">
                        <FolderOpen className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5">
                        {editingId === file.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editAliasValue}
                              onChange={(e) => setEditAliasValue(e.target.value)}
                              placeholder="Escribe un alias..."
                              className="rounded border border-emerald-500 px-2 py-0.5 text-xs font-semibold"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveAlias(file.id)}
                              className="text-xs text-emerald-700 font-semibold hover:underline"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">
                              {file.alias || file.originalFileName}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStartEditAlias(file)}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                              title="Editar alias"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        {file.alias && (
                          <p className="text-[11px] text-slate-400">
                            Archivo: {file.originalFileName}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Route */}
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600 max-w-xs truncate" title={file.sourceRoute}>
                    {file.sourceRoute}
                  </td>

                  {/* Size */}
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {formatFileSize(file.fileSize)}
                  </td>

                  {/* Availability Badge */}
                  <td className="py-3 px-4 text-center">
                    {file.isAvailable ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Disponible
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                        <AlertCircle className="h-3 w-3 text-red-600" />
                        Archivo no encontrado
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      {/* If file is missing, offer Relink */}
                      {!file.isAvailable && (
                        <button
                          type="button"
                          onClick={() => handleRelink(file.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
                          title="Localizar archivo en otra ubicación"
                        >
                          <FolderSearch className="h-3.5 w-3.5" />
                          Localizar archivo
                        </button>
                      )}

                      {/* If available, offer Load into Home */}
                      {file.isAvailable && onLoadFileToHome && (
                        <button
                          type="button"
                          onClick={() =>
                            onLoadFileToHome({
                              path: file.sourceRoute,
                              name: file.originalFileName,
                              size: file.fileSize || 0,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          title="Cargar archivo en la pantalla de inicio"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          Cargar a Inicio
                        </button>
                      )}

                      {/* Delete reference */}
                      <button
                        type="button"
                        onClick={() => handleDelete(file)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors ml-1"
                        title="Eliminar del catálogo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && files.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <HardDrive className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No hay archivos en la biblioteca</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery
                        ? 'No se encontraron resultados para tu búsqueda.'
                        : 'Puedes registrar archivos CSV manualmente con el botón "Registrar CSV".'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
