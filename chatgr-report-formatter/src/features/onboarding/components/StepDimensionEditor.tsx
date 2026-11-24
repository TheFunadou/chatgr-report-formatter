import React, { useState } from 'react'
import type { DimensionCategory, DimensionType } from '../../../types/dimensions'
import { Plus, Trash2, CheckCircle2, RotateCcw, Pencil, Check, X } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Checkbox } from '../../../components/ui/checkbox'
import { Input } from '../../../components/ui/input'
import { cn } from '../../../lib/utils'

interface StepDimensionEditorProps {
  title: string
  description: string
  dimension: DimensionType
  categories: DimensionCategory[]
  onChangeCategories: (updated: DimensionCategory[]) => void
  onResetDefaults: () => void
  supportsConversion?: boolean
}

const PRESET_COLORS = [
  '#38BDF8',
  '#A855F7',
  '#F97316',
  '#22C55E',
  '#06B6D4',
  '#EF4444',
  '#EAB308',
  '#9CA3AF',
  '#1877F2',
  '#E1306C',
  '#111827',
]

function toMatchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export const StepDimensionEditor: React.FC<StepDimensionEditorProps> = ({
  title,
  description,
  dimension,
  categories,
  onChangeCategories,
  onResetDefaults,
  supportsConversion = false,
}) => {
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#22C55E')
  const [newIsConversion, setNewIsConversion] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')

  const handleAdd = () => {
    const trimmed = newLabel.trim()
    if (!trimmed) return

    const matchVal = toMatchValue(trimmed)
    if (categories.some((category) => category.matchValue === matchVal)) {
      setAddError('Ya existe una categoría con este nombre o coincidencia.')
      return
    }

    const newCategory: DimensionCategory = {
      id: `${dimension}-${Date.now()}`,
      dimension,
      matchValue: matchVal,
      displayName: trimmed,
      colorHex: newColor,
      isConversion: supportsConversion ? newIsConversion : false,
      sortOrder: categories.length + 1,
      isSystemDefault: false,
    }

    onChangeCategories([...categories, newCategory])
    setNewLabel('')
    setNewIsConversion(false)
    setAddError(null)
  }

  const handleRemove = (id: string) => {
    onChangeCategories(categories.filter((category) => category.id !== id))
  }

  const handleToggleConversion = (id: string) => {
    onChangeCategories(
      categories.map((category) =>
        category.id === id ? { ...category, isConversion: !category.isConversion } : category
      )
    )
  }

  const handleUpdateColor = (id: string, colorHex: string) => {
    onChangeCategories(
      categories.map((category) => (category.id === id ? { ...category, colorHex } : category))
    )
  }

  const startEditing = (category: DimensionCategory) => {
    setEditingId(category.id)
    setEditingLabel(category.displayName)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingLabel('')
  }

  const commitEditing = (category: DimensionCategory) => {
    const trimmed = editingLabel.trim()
    if (!trimmed) {
      cancelEditing()
      return
    }

    const matchValue = toMatchValue(trimmed)
    const duplicated = categories.some(
      (item) => item.id !== category.id && item.matchValue === matchValue
    )
    if (duplicated) {
      setAddError('Ya existe otra categoría con ese nombre normalizado.')
      cancelEditing()
      return
    }

    onChangeCategories(
      categories.map((item) =>
        item.id === category.id ? { ...item, displayName: trimmed, matchValue } : item
      )
    )
    setAddError(null)
    cancelEditing()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-900">{title}</h2>
          <p className="mt-0.5 max-w-2xl text-xs leading-5 text-ink-500">{description}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onResetDefaults} className="self-start">
          <RotateCcw />
          Restablecer predeterminados
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-paper/70 text-ink-600">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Categoría</th>
                <th className="px-4 py-2.5 font-semibold">Valor de coincidencia</th>
                <th className="px-4 py-2.5 font-semibold">Color</th>
                {supportsConversion && (
                  <th className="px-4 py-2.5 text-center font-semibold">Conversión</th>
                )}
                <th className="px-4 py-2.5 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {categories.map((category) => (
                <tr key={category.id} className="transition-colors hover:bg-paper/40">
                  <td className="px-4 py-2.5">
                    {editingId === category.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          autoFocus
                          value={editingLabel}
                          onChange={(event) => setEditingLabel(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') commitEditing(category)
                            if (event.key === 'Escape') cancelEditing()
                          }}
                          className="h-7 w-44 text-xs"
                          aria-label="Editar etiqueta"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-signal-700"
                          onClick={() => commitEditing(category)}
                          aria-label="Guardar etiqueta"
                        >
                          <Check className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={cancelEditing}
                          aria-label="Cancelar edición"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span
                        className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          backgroundColor: `${category.colorHex}1f`,
                          color: category.colorHex,
                          borderColor: `${category.colorHex}55`,
                        }}
                      >
                        {category.displayName}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-2.5 font-mono text-[11px] text-ink-500">
                    {category.matchValue}
                  </td>

                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={category.colorHex}
                        onChange={(event) => handleUpdateColor(category.id, event.target.value)}
                        className="size-6 cursor-pointer rounded border border-line-strong bg-surface p-0.5"
                        title={`Cambiar color de ${category.displayName}`}
                        aria-label={`Color de ${category.displayName}`}
                      />
                      <span className="font-mono text-[10px] text-ink-500">
                        {category.colorHex}
                      </span>
                    </div>
                  </td>

                  {supportsConversion && (
                    <td className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleConversion(category.id)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                          category.isConversion
                            ? 'border-signal-300 bg-signal-50 text-signal-700'
                            : 'border-line bg-surface text-ink-500 hover:border-line-strong'
                        )}
                        aria-pressed={category.isConversion}
                      >
                        <CheckCircle2
                          className={cn(
                            'size-3.5',
                            category.isConversion ? 'text-signal-600' : 'text-ink-500/60'
                          )}
                        />
                        {category.isConversion ? 'Cuenta como venta' : 'No cuenta'}
                      </button>
                    </td>
                  )}

                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title="Editar etiqueta"
                        aria-label={`Editar ${category.displayName}`}
                        onClick={() => startEditing(category)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 hover:bg-red-50 hover:text-red-600"
                        title="Eliminar categoría"
                        aria-label={`Eliminar ${category.displayName}`}
                        onClick={() => handleRemove(category.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {categories.length === 0 && (
                <tr>
                  <td
                    colSpan={supportsConversion ? 5 : 4}
                    className="px-4 py-10 text-center text-xs text-ink-500"
                  >
                    No hay categorías activas. Añade una para continuar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-line bg-paper/60 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-ink-700">Agregar categoría</p>
            {addError && <Badge tone="danger">{addError}</Badge>}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <Input
                type="text"
                value={newLabel}
                onChange={(event) => setNewLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleAdd()
                }}
                placeholder="Nombre de la categoría (ej. Cotizado especial)"
                aria-label="Nombre de la nueva categoría"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {PRESET_COLORS.slice(0, 6).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  style={{ backgroundColor: color }}
                  className={cn(
                    'size-5 rounded-full border transition-transform',
                    newColor === color
                      ? 'scale-110 border-ink-900 ring-2 ring-signal-500 ring-offset-1'
                      : 'border-transparent'
                  )}
                  title={color}
                  aria-label={`Usar color ${color}`}
                />
              ))}
              <input
                type="color"
                value={newColor}
                onChange={(event) => setNewColor(event.target.value)}
                className="ml-1 size-7 cursor-pointer rounded border border-line-strong bg-surface p-0.5"
                aria-label="Color personalizado"
              />
            </div>

            {supportsConversion && (
              <label className="flex items-center gap-2 text-[11px] text-ink-700">
                <Checkbox
                  checked={newIsConversion}
                  onCheckedChange={(checked) => setNewIsConversion(checked === true)}
                />
                Cuenta como venta
              </label>
            )}

            <Button variant="primary" size="sm" onClick={handleAdd}>
              <Plus />
              Agregar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
