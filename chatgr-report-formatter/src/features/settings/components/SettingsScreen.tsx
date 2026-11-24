import React, { useState } from 'react'
import type { DimensionCategory } from '../../../types/dimensions'
import {
  DEFAULT_STATUS_CATEGORIES,
  DEFAULT_PRIORITY_CATEGORIES,
  DEFAULT_SOURCE_CATEGORIES,
  DEFAULT_MEDIUM_CATEGORIES,
} from '../../../constants/defaultDimensions'
import { StepDimensionEditor } from '../../onboarding/components/StepDimensionEditor'
import { FolderCheck, Folder, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { pickFolderDialog, validateExportFolderApi } from '../../../lib/tauri'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { ConfirmDialog } from '../../../components/ui/confirm-dialog'

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

type FolderState = { tone: 'idle' | 'error' | 'success'; message: string }

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
  const [folderState, setFolderState] = useState<FolderState>({ tone: 'idle', message: '' })
  const [picking, setPicking] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const handleChangeFolder = async () => {
    setPicking(true)
    setFolderState({ tone: 'idle', message: '' })
    try {
      const path = await pickFolderDialog(exportPath || undefined)
      if (!path) return

      try {
        await validateExportFolderApi(path)
      } catch (err) {
        setFolderState({
          tone: 'error',
          message:
            typeof err === 'string'
              ? err
              : 'La carpeta elegida no tiene permisos de escritura. Elige otra.',
        })
        return
      }

      onUpdateExportPath(path)
      setFolderState({
        tone: 'success',
        message: 'Carpeta actualizada. Los próximos reportes se guardarán aquí.',
      })
    } finally {
      setPicking(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-900">
            Preferencias del espacio de trabajo
          </h2>
          <p className="mt-0.5 text-xs text-ink-500">
            Ajusta dónde se guardan los reportes y cómo se leen tus dimensiones comerciales.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setConfirmReset(true)}>
          <RotateCcw />
          Restablecer todo a fábrica
        </Button>
      </div>

      <Tabs defaultValue="folder">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="folder">Ruta de exportación</TabsTrigger>
          <TabsTrigger value="status">
            Estatus
            <span className="tnum rounded bg-ink-900/[0.06] px-1 text-[10px] text-ink-500">
              {statuses.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="priority">
            Prioridades
            <span className="tnum rounded bg-ink-900/[0.06] px-1 text-[10px] text-ink-500">
              {priorities.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="source">
            Orígenes
            <span className="tnum rounded bg-ink-900/[0.06] px-1 text-[10px] text-ink-500">
              {sources.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="medium">
            Medios
            <span className="tnum rounded bg-ink-900/[0.06] px-1 text-[10px] text-ink-500">
              {mediums.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="folder">
          <Card className="max-w-3xl">
            <div className="flex items-start gap-3 border-b border-line p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-signal-50 text-signal-700">
                <FolderCheck className="size-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[13px] font-semibold text-ink-900">
                    Carpeta predeterminada de salida XLSX
                  </h3>
                  <Badge tone="neutral">Sugerida desde Descargas</Badge>
                </div>
                <p className="mt-0.5 text-xs leading-5 text-ink-500">
                  Se sugiere la carpeta de Descargas de tu equipo y se crea la subcarpeta «Reportes
                  CRM». Puedes cambiarla con el explorador del sistema; nunca escribas la ruta a
                  mano.
                </p>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <span className="mb-1.5 block text-xs font-medium text-ink-700">Ruta activa</span>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2">
                    <Folder className="size-4 shrink-0 text-ink-500" />
                    <span
                      className="truncate font-mono text-[11px] text-ink-700"
                      title={exportPath}
                    >
                      {exportPath || 'Sin carpeta configurada'}
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleChangeFolder}
                    disabled={picking}
                    className="shrink-0"
                  >
                    <Folder />
                    {picking ? 'Abriendo…' : 'Elegir carpeta'}
                  </Button>
                </div>
              </div>

              {folderState.tone !== 'idle' && (
                <div
                  className={
                    folderState.tone === 'error'
                      ? 'flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] leading-4 text-red-800'
                      : 'flex items-start gap-2 rounded-lg border border-signal-200 bg-signal-50 p-2.5 text-[11px] leading-4 text-signal-700'
                  }
                >
                  {folderState.tone === 'error' ? (
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                  )}
                  {folderState.message}
                </div>
              )}

              <div className="rounded-lg border border-line bg-paper/60 p-3">
                <p className="text-[11px] font-medium text-ink-700">Cómo se valida</p>
                <p className="mt-0.5 text-[11px] leading-4 text-ink-500">
                  Antes de guardar, la app comprueba que la carpeta exista, sea un directorio y
                  permita crear archivos. Si algo falla, se muestra el motivo y no se cambia la
                  ruta activa.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <StepDimensionEditor
            title="Estatus comerciales"
            description="Edita, elimina o agrega estatus según los usados en tu CRM. Recuerda marcar cuáles representan conversión."
            dimension="status"
            categories={statuses}
            onChangeCategories={onUpdateStatuses}
            onResetDefaults={() => onUpdateStatuses(DEFAULT_STATUS_CATEGORIES)}
            supportsConversion={true}
          />
        </TabsContent>

        <TabsContent value="priority">
          <StepDimensionEditor
            title="Niveles de prioridad"
            description="Personaliza los niveles de prioridad de tus prospectos."
            dimension="priority"
            categories={priorities}
            onChangeCategories={onUpdatePriorities}
            onResetDefaults={() => onUpdatePriorities(DEFAULT_PRIORITY_CATEGORIES)}
          />
        </TabsContent>

        <TabsContent value="source">
          <StepDimensionEditor
            title="Plataformas de origen"
            description="Ajusta las plataformas y canales donde se originan tus prospectos."
            dimension="source"
            categories={sources}
            onChangeCategories={onUpdateSources}
            onResetDefaults={() => onUpdateSources(DEFAULT_SOURCE_CATEGORIES)}
          />
        </TabsContent>

        <TabsContent value="medium">
          <StepDimensionEditor
            title="Medios de captación"
            description="Ajusta los tipos o medios comerciales de captación."
            dimension="medium"
            categories={mediums}
            onChangeCategories={onUpdateMediums}
            onResetDefaults={() => onUpdateMediums(DEFAULT_MEDIUM_CATEGORIES)}
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmReset}
        title="Restablecer dimensiones"
        description={
          'Se restaurarán estatus, prioridades, orígenes y medios a los valores de fábrica.\n\nTus categorías personalizadas se perderán en las cuatro dimensiones.'
        }
        confirmLabel="Restablecer todo"
        onConfirm={() => {
          onResetAllDefaults()
          setConfirmReset(false)
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  )
}
