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
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

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
  initialExportPath = 'C:/Reportes_CRM',
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [exportPath, setExportPath] = useState(initialExportPath)
  const [statuses, setStatuses] = useState<DimensionCategory[]>(DEFAULT_STATUS_CATEGORIES)
  const [priorities, setPriorities] = useState<DimensionCategory[]>(DEFAULT_PRIORITY_CATEGORIES)
  const [sources, setSources] = useState<DimensionCategory[]>(DEFAULT_SOURCE_CATEGORIES)
  const [mediums, setMediums] = useState<DimensionCategory[]>(DEFAULT_MEDIUM_CATEGORIES)

  const stepsList = [
    { number: 1, label: 'Carpeta de salida' },
    { number: 2, label: 'Estatus comerciales' },
    { number: 3, label: 'Niveles de prioridad' },
    { number: 4, label: 'Plataformas de origen' },
    { number: 5, label: 'Medios de captación' },
    { number: 6, label: 'Confirmación' },
  ]

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1)
    } else {
      onComplete({
        exportPath,
        statuses,
        priorities,
        sources,
        mediums,
      })
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  return (
    <div className="min-h-screen w-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      {/* Top Wizard Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-xs">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-slate-800">
              Asistente de Configuración Inicial
            </h1>
            <p className="text-xs text-slate-500">
              Personaliza las categorías de tu CRM para generar reportes adaptados a tu negocio.
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Paso {currentStep} de 6
          </span>
        </div>

        {/* Step Indicator Bar */}
        <div className="mx-auto max-w-5xl mt-4 flex items-center justify-between">
          {stepsList.map((step) => {
            const isCompleted = step.number < currentStep
            const isCurrent = step.number === currentStep
            return (
              <div
                key={step.number}
                className="flex items-center gap-2 text-xs font-medium"
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-600'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.number}
                </div>
                <span
                  className={`hidden sm:inline ${
                    isCurrent
                      ? 'text-slate-900 font-semibold'
                      : isCompleted
                      ? 'text-slate-700'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </header>

      {/* Main Step Content */}
      <main className="flex-1 overflow-y-auto p-6 flex justify-center">
        <div className="w-full max-w-4xl py-2">
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

      {/* Footer Navigation Buttons */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 shadow-xs">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors ${
              currentStep === 1
                ? 'opacity-40 cursor-not-allowed bg-slate-100'
                : 'hover:bg-slate-50'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            {currentStep === 6 ? (
              <>
                <Check className="h-4 w-4" />
                Finalizar y entrar a Inicio
              </>
            ) : (
              <>
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  )
}
