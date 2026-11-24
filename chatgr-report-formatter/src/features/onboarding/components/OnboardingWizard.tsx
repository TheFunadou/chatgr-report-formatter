import React, { useState } from 'react'
import type { DimensionCategory } from '../../../types/dimensions'
import {
  DEFAULT_STATUS_CATEGORIES,
  DEFAULT_PRIORITY_CATEGORIES,
  DEFAULT_SOURCE_CATEGORIES,
  DEFAULT_MEDIUM_CATEGORIES,
} from '../../../constants/defaultDimensions'
import { StepExportFolder } from './StepExportFolder'
import { StepDimensionEditor } from './StepDimensionEditor'
import { StepSummary } from './StepSummary'
import { ChevronLeft, ChevronRight, Check, FileSpreadsheet } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { cn } from '../../../lib/utils'

interface OnboardingWizardProps {
  initialExportPath?: string
  onComplete: (config: {
    exportPath: string
    statuses: DimensionCategory[]
    priorities: DimensionCategory[]
    sources: DimensionCategory[]
    mediums: DimensionCategory[]
  }) => void
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialExportPath = '',
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [exportPath, setExportPath] = useState(initialExportPath)
  const [statuses, setStatuses] = useState<DimensionCategory[]>(DEFAULT_STATUS_CATEGORIES)
  const [priorities, setPriorities] = useState<DimensionCategory[]>(DEFAULT_PRIORITY_CATEGORIES)
  const [sources, setSources] = useState<DimensionCategory[]>(DEFAULT_SOURCE_CATEGORIES)
  const [mediums, setMediums] = useState<DimensionCategory[]>(DEFAULT_MEDIUM_CATEGORIES)

  const stepsList = [
    { number: 1, label: 'Carpeta de salida', hint: 'Dónde se guardan los XLSX' },
    { number: 2, label: 'Estatus comerciales', hint: 'Venta y seguimiento' },
    { number: 3, label: 'Niveles de prioridad', hint: 'Urgencia del lead' },
    { number: 4, label: 'Plataformas de origen', hint: 'Canal de llegada' },
    { number: 5, label: 'Medios de captación', hint: 'Tipo de campaña' },
    { number: 6, label: 'Confirmación', hint: 'Resumen y entrada' },
  ]

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1)
    } else {
      onComplete({ exportPath, statuses, priorities, sources, mediums })
    }
  }

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1)
  }

  return (
    <div className="flex min-h-screen w-screen flex-col bg-paper font-sans text-ink-900">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-signal-600 text-white">
            <FileSpreadsheet className="size-[18px]" strokeWidth={1.9} />
          </span>
          <div>
            <p className="text-[13px] font-semibold leading-tight tracking-[-0.01em]">
              Reportes CRM
            </p>
            <p className="text-[11px] leading-tight text-ink-500">Configuración inicial</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <p className="hidden text-xs text-ink-500 sm:block">
            Asistente de Configuración Inicial
          </p>
          <span className="rounded-md border border-line bg-paper px-2 py-1 text-[11px] font-medium text-ink-600">
            Paso {currentStep} de 6
          </span>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-[250px_1fr]">
        {/* Steps rail */}
        <nav aria-label="Pasos de configuración" className="lg:pt-2">
          <ol className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5 lg:overflow-visible">
            {stepsList.map((step) => {
              const isCompleted = step.number < currentStep
              const isCurrent = step.number === currentStep
              return (
                <li key={step.number} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(step.number)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors',
                      isCurrent ? 'bg-surface' : 'hover:bg-surface/60'
                    )}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    <span
                      className={cn(
                        'tnum mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                        isCompleted
                          ? 'border-signal-600 bg-signal-600 text-white'
                          : isCurrent
                            ? 'border-signal-600 bg-signal-50 text-signal-700'
                            : 'border-line-strong bg-transparent text-ink-500'
                      )}
                    >
                      {isCompleted ? <Check className="size-3.5" strokeWidth={2.5} /> : step.number}
                    </span>
                    <span className="hidden min-w-0 lg:block">
                      <span
                        className={cn(
                          'block text-[12.5px] font-medium leading-tight',
                          isCurrent ? 'text-ink-900' : 'text-ink-600'
                        )}
                      >
                        {step.label}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] leading-tight text-ink-500">
                        {step.hint}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        {/* Step content */}
        <main className="min-w-0">
          <div className="min-h-full rounded-xl border border-line bg-surface p-6 sm:p-8">
            {currentStep === 1 && (
              <StepExportFolder exportPath={exportPath} onSelectPath={setExportPath} />
            )}

            {currentStep === 2 && (
              <StepDimensionEditor
                title="Estatus Comerciales"
                description="Define los estados de tus prospectos, sus colores y marca cuáles representan venta o conversión para calcular la tasa de éxito."
                dimension="status"
                categories={statuses}
                onChangeCategories={setStatuses}
                onResetDefaults={() => setStatuses(DEFAULT_STATUS_CATEGORIES)}
                supportsConversion={true}
              />
            )}

            {currentStep === 3 && (
              <StepDimensionEditor
                title="Niveles de Prioridad"
                description="Establece los niveles de prioridad de tus prospectos para el análisis de urgencia comercial."
                dimension="priority"
                categories={priorities}
                onChangeCategories={setPriorities}
                onResetDefaults={() => setPriorities(DEFAULT_PRIORITY_CATEGORIES)}
              />
            )}

            {currentStep === 4 && (
              <StepDimensionEditor
                title="Plataformas de Origen"
                description="Configura los canales de procedencia del lead (WhatsApp, Facebook, Instagram, Web, etc.)."
                dimension="source"
                categories={sources}
                onChangeCategories={setSources}
                onResetDefaults={() => setSources(DEFAULT_SOURCE_CATEGORIES)}
              />
            )}

            {currentStep === 5 && (
              <StepDimensionEditor
                title="Medios de Captación"
                description="Gestiona los medios comerciales (Orgánico, Campaña publicitaria, Referido, Prospección)."
                dimension="medium"
                categories={mediums}
                onChangeCategories={setMediums}
                onResetDefaults={() => setMediums(DEFAULT_MEDIUM_CATEGORIES)}
              />
            )}

            {currentStep === 6 && (
              <StepSummary
                exportPath={exportPath}
                statusCategories={statuses}
                priorityCategories={priorities}
                sourceCategories={sources}
                mediumCategories={mediums}
              />
            )}
          </div>
        </main>
      </div>

      <footer className="border-t border-line bg-surface px-6 py-3.5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Button variant="secondary" onClick={handleBack} disabled={currentStep === 1}>
            <ChevronLeft />
            Anterior
          </Button>

          <Button variant="primary" onClick={handleNext}>
            {currentStep === 6 ? (
              <>
                <Check />
                Finalizar y entrar a Inicio
              </>
            ) : (
              <>
                Siguiente
                <ChevronRight />
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  )
}
