import React from 'react'
import type { DimensionCategory } from '../../../types/dimensions'
import { CheckCircle, FolderCheck, Tag, Award } from 'lucide-react'

interface StepSummaryProps {
  exportPath: string
  statusCategories: DimensionCategory[]
  priorityCategories: DimensionCategory[]
  sourceCategories: DimensionCategory[]
  mediumCategories: DimensionCategory[]
}

export const StepSummary: React.FC<StepSummaryProps> = ({
  exportPath,
  statusCategories,
  priorityCategories,
  sourceCategories,
  mediumCategories,
}) => {
  const conversionStatuses = statusCategories.filter((s) => s.isConversion)

  return (
    <div className="space-y-6">
      <div className="text-center max-w-lg mx-auto">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 mb-3">
          <CheckCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800">
          ¡Todo listo para comenzar!
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Revisa el resumen de tus preferencias comerciales configuradas. Podrás modificarlas
          cuando lo desees en la sección de Configuración.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {/* Export Folder Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs mb-2">
            <FolderCheck className="h-4 w-4" />
            <span>Carpeta de exportación</span>
          </div>
          <p className="text-xs font-mono text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 break-all">
            {exportPath || 'C:/Usuarios/Reportes_CRM'}
          </p>
        </div>

        {/* Conversion Statuses Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs mb-2">
            <Award className="h-4 w-4" />
            <span>Estatus que cuentan como venta ({conversionStatuses.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {conversionStatuses.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: `${s.colorHex}22`,
                  color: s.colorHex,
                  border: `1px solid ${s.colorHex}55`,
                }}
              >
                {s.displayName}
              </span>
            ))}
          </div>
        </div>

        {/* Status & Priority Stats */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs mb-2">
            <Tag className="h-4 w-4 text-emerald-600" />
            <span>Estatus y Prioridades activas</span>
          </div>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>• {statusCategories.length} estatus comerciales configurados</li>
            <li>• {priorityCategories.length} niveles de prioridad activos</li>
          </ul>
        </div>

        {/* Source & Medium Stats */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs mb-2">
            <Tag className="h-4 w-4 text-emerald-600" />
            <span>Orígenes y Medios activos</span>
          </div>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>• {sourceCategories.length} plataformas de origen configuradas</li>
            <li>• {mediumCategories.length} medios de captación activos</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
