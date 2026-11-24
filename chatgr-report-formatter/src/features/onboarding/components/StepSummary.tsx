import React from 'react'
import type { DimensionCategory } from '../../../types/dimensions'
import { CheckCircle2, FolderCheck, Tag, Award, Layers } from 'lucide-react'
import { Badge } from '../../../components/ui/badge'

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
  const conversionStatuses = statusCategories.filter((status) => status.isConversion)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <span className="flex size-10 items-center justify-center rounded-lg bg-signal-50 text-signal-700">
          <CheckCircle2 className="size-5" strokeWidth={1.8} />
        </span>
        <h2 className="mt-4 text-lg font-semibold tracking-[-0.015em] text-ink-900">
          ¡Todo listo para comenzar!
        </h2>
        <p className="mt-1 max-w-lg text-xs leading-5 text-ink-500">
          Revisa el resumen de tus preferencias comerciales. Podrás modificarlas cuando quieras en
          Configuración.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-line">
        <div className="flex items-start gap-3 border-b border-line p-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-paper text-signal-700">
            <FolderCheck className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-700">Carpeta de exportación</p>
            <p className="mt-1 break-all rounded-md border border-line bg-paper px-2.5 py-1.5 font-mono text-[11px] text-ink-700">
              {exportPath || 'Sin carpeta seleccionada'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-ink-700">
              <Award className="size-3.5 text-signal-600" />
              Conversiones
              <Badge tone="signal">{conversionStatuses.length}</Badge>
            </div>
            <p className="mt-1 text-[11px] leading-4 text-ink-500">
              Estatus que cuentan como venta en la tasa de conversión.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {conversionStatuses.length === 0 && (
                <span className="text-[11px] text-ink-500">
                  Ningún estatus marcado como conversión.
                </span>
              )}
              {conversionStatuses.map((status) => (
                <span
                  key={status.id}
                  className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: `${status.colorHex}1f`,
                    color: status.colorHex,
                    borderColor: `${status.colorHex}55`,
                  }}
                >
                  {status.displayName}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-ink-700">
              <Tag className="size-3.5 text-signal-600" />
              Dimensiones activas
            </div>
            <dl className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Estatus</dt>
                <dd className="tnum font-semibold text-ink-800">{statusCategories.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Prioridades</dt>
                <dd className="tnum font-semibold text-ink-800">{priorityCategories.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Orígenes</dt>
                <dd className="tnum font-semibold text-ink-800">{sourceCategories.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Medios</dt>
                <dd className="tnum font-semibold text-ink-800">{mediumCategories.length}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="flex items-start gap-2 border-t border-line bg-paper/60 px-4 py-3 text-[11px] leading-4 text-ink-600">
          <Layers className="mt-0.5 size-3.5 shrink-0 text-signal-600" />
          La app es 100% local: tus CSV, configuraciones y reportes permanecen en este equipo.
        </div>
      </div>
    </div>
  )
}
