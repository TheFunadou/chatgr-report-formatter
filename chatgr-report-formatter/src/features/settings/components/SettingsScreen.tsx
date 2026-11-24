import React, { useState } from 'react'
import type { DimensionCategory } from '../../../types/dimensions'
import { StepDimensionEditor } from '../../onboarding/components/StepDimensionEditor'
import { Folder, FolderCheck, RotateCcw } from 'lucide-react'
import { pickFolderDialog } from '../../../lib/tauri'

interface SettingsScreenProps {
  exportPath: string
  onUpdateExportPath: (path: string) => void
  statuses: DimensionCategory[]
  onUpdateStatuses: (updated: DimensionCategory[]) => void
  priorities: DimensionCategory[]
  onUpdatePriorities: (updated: DimensionCategory[]) => void
  sources: DimensionCategory[]
  onUpdateSources: (updated: DimensionCategory[]) => void
  mediums: DimensionCategory[]
  onUpdateMediums: (updated: DimensionCategory[]) => void
  onResetAllDefaults: () => void
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  exportPath,
  onUpdateExportPath,
  statuses,
  onUpdateStatuses,
  priorities,
  onUpdatePriorities,
  sources,
  onUpdateSources,
  mediums,
  onUpdateMediums,
  onResetAllDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<'folder' | 'status' | 'priority' | 'source' | 'medium'>('folder')

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('folder')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'folder'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Ruta de Exportación
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('status')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'status'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Estatus Comerciales ({statuses.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('priority')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'priority'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Niveles de Prioridad ({priorities.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('source')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'source'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Plataformas de Origen ({sources.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('medium')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'medium'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Medios de Captación ({mediums.length})
        </button>

        <button
          type="button"
          onClick={() => {
            if (confirm('¿Deseas restablecer todas las dimensiones a los valores predeterminados de fábrica?')) {
              onResetAllDefaults()
            }
          }}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-xs transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
          Restablecer todo a fábrica
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'folder' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700">
              <FolderCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Carpeta predeterminada de salida XLSX
              </h3>
              <p className="text-xs text-slate-500">
                Ubicación en tu disco donde se generarán los libros de Excel.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ruta activa actual
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={exportPath}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700"
              />
              <button
                type="button"
                onClick={async () => {
                  const path = await pickFolderDialog(exportPath)
                  if (path) onUpdateExportPath(path)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors shrink-0"
              >
                <Folder className="h-4 w-4 text-slate-500" />
                Cambiar carpeta
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'status' && (
        <StepDimensionEditor
          title="Estatus Comerciales"
          description="Edita, elimina o agrega estatus según los usados en tu CRM. Recuerda marcar cuáles representan conversión."
          dimension="status"
          categories={statuses}
          onChangeCategories={onUpdateStatuses}
          onResetDefaults={() => onUpdateStatuses(statuses)}
          supportsConversion={true}
        />
      )}

      {activeTab === 'priority' && (
        <StepDimensionEditor
          title="Niveles de Prioridad"
          description="Personaliza los niveles de prioridad de tus prospectos."
          dimension="priority"
          categories={priorities}
          onChangeCategories={onUpdatePriorities}
          onResetDefaults={() => onUpdatePriorities(priorities)}
        />
      )}

      {activeTab === 'source' && (
        <StepDimensionEditor
          title="Plataformas de Origen"
          description="Ajusta las plataformas y canales donde se originan tus prospectos."
          dimension="source"
          categories={sources}
          onChangeCategories={onUpdateSources}
          onResetDefaults={() => onUpdateSources(sources)}
        />
      )}

      {activeTab === 'medium' && (
        <StepDimensionEditor
          title="Medios de Captación"
          description="Ajusta los tipos o medios comerciales de captación."
          dimension="medium"
          categories={mediums}
          onChangeCategories={onUpdateMediums}
          onResetDefaults={() => onUpdateMediums(mediums)}
        />
      )}
    </div>
  )
}
