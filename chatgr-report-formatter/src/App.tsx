import { useState, useEffect } from 'react'
import type { DimensionCategory } from './types/dimensions'
import {
  DEFAULT_STATUS_CATEGORIES,
  DEFAULT_PRIORITY_CATEGORIES,
  DEFAULT_SOURCE_CATEGORIES,
  DEFAULT_MEDIUM_CATEGORIES,
} from './constants/defaultDimensions'
import { OnboardingWizard } from './features/onboarding/components/OnboardingWizard'
import { AppLayout } from './components/layout/AppLayout'
import { HomeScreen } from './features/home/components/HomeScreen'
import { LibraryScreen } from './features/library/components/LibraryScreen'
import { SettingsScreen } from './features/settings/components/SettingsScreen'
import type { NavSection } from './components/layout/AppSidebar'
import {
  getAppSettingsApi,
  saveAppSettingsApi,
  getSuggestedExportFolderApi,
  getDimensionCategoriesApi,
  saveDimensionCategoriesApi,
  resetDimensionCategoriesApi,
} from './lib/tauri'

export function App() {
  const [loading, setLoading] = useState(true)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)
  const [activeSection, setActiveSection] = useState<NavSection>('home')

  const [loadedFileFromLibrary, setLoadedFileFromLibrary] = useState<{
    path: string
    name: string
    size: number
  } | null>(null)
  const [exportPath, setExportPath] = useState('')
  const [statuses, setStatuses] = useState<DimensionCategory[]>(DEFAULT_STATUS_CATEGORIES)
  const [priorities, setPriorities] = useState<DimensionCategory[]>(DEFAULT_PRIORITY_CATEGORIES)
  const [sources, setSources] = useState<DimensionCategory[]>(DEFAULT_SOURCE_CATEGORIES)
  const [mediums, setMediums] = useState<DimensionCategory[]>(DEFAULT_MEDIUM_CATEGORIES)

  // Load persistent settings and categories from SQLite on initial startup
  useEffect(() => {
    async function loadData() {
      try {
        const settings = await getAppSettingsApi()
        const allCategories = await getDimensionCategoriesApi()

        if (allCategories && allCategories.length > 0) {
          const s = allCategories.filter((c) => c.dimension === 'status')
          const p = allCategories.filter((c) => c.dimension === 'priority')
          const src = allCategories.filter((c) => c.dimension === 'source')
          const m = allCategories.filter((c) => c.dimension === 'medium')

          if (s.length > 0) setStatuses(s)
          if (p.length > 0) setPriorities(p)
          if (src.length > 0) setSources(src)
          if (m.length > 0) setMediums(m)
        }

        if (settings) {
          if (settings.defaultExportPath) {
            setExportPath(settings.defaultExportPath)
          } else {
            const suggested = await getSuggestedExportFolderApi().catch(() => '')
            setExportPath(suggested)
          }
          setHasCompletedOnboarding(settings.onboardingCompleted)
        }
      } catch {
        // Fallback to defaults when running in web or test without mock
        try {
          const suggested = await getSuggestedExportFolderApi()
          setExportPath(suggested)
        } catch {
          // ignore
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleCompleteOnboarding = async (config: {
    exportPath: string
    statuses: DimensionCategory[]
    priorities: DimensionCategory[]
    sources: DimensionCategory[]
    mediums: DimensionCategory[]
  }) => {
    setExportPath(config.exportPath)
    setStatuses(config.statuses)
    setPriorities(config.priorities)
    setSources(config.sources)
    setMediums(config.mediums)
    setHasCompletedOnboarding(true)
    setActiveSection('home')

    // Persist to SQLite
    try {
      await saveAppSettingsApi({
        defaultExportPath: config.exportPath,
        onboardingCompleted: true,
      })
      await saveDimensionCategoriesApi('status', config.statuses)
      await saveDimensionCategoriesApi('priority', config.priorities)
      await saveDimensionCategoriesApi('source', config.sources)
      await saveDimensionCategoriesApi('medium', config.mediums)
    } catch (err) {
      console.warn('Failed to persist onboarding to SQLite:', err)
    }
  }

  const handleUpdateExportPath = async (newPath: string) => {
    setExportPath(newPath)
    try {
      await saveAppSettingsApi({
        defaultExportPath: newPath,
        onboardingCompleted: hasCompletedOnboarding,
      })
    } catch (err) {
      console.warn('Failed to save export path to SQLite:', err)
    }
  }

  const handleUpdateStatuses = async (updated: DimensionCategory[]) => {
    setStatuses(updated)
    try {
      await saveDimensionCategoriesApi('status', updated)
    } catch (err) {
      console.warn('Failed to save statuses to SQLite:', err)
    }
  }

  const handleUpdatePriorities = async (updated: DimensionCategory[]) => {
    setPriorities(updated)
    try {
      await saveDimensionCategoriesApi('priority', updated)
    } catch (err) {
      console.warn('Failed to save priorities to SQLite:', err)
    }
  }

  const handleUpdateSources = async (updated: DimensionCategory[]) => {
    setSources(updated)
    try {
      await saveDimensionCategoriesApi('source', updated)
    } catch (err) {
      console.warn('Failed to save sources to SQLite:', err)
    }
  }

  const handleUpdateMediums = async (updated: DimensionCategory[]) => {
    setMediums(updated)
    try {
      await saveDimensionCategoriesApi('medium', updated)
    } catch (err) {
      console.warn('Failed to save mediums to SQLite:', err)
    }
  }

  const handleResetAllDefaults = async () => {
    try {
      const resetCategories = await resetDimensionCategoriesApi()
      if (resetCategories && resetCategories.length > 0) {
        setStatuses(resetCategories.filter((c) => c.dimension === 'status'))
        setPriorities(resetCategories.filter((c) => c.dimension === 'priority'))
        setSources(resetCategories.filter((c) => c.dimension === 'source'))
        setMediums(resetCategories.filter((c) => c.dimension === 'medium'))
        return
      }
    } catch {
      // Fallback
    }

    setStatuses(DEFAULT_STATUS_CATEGORIES)
    setPriorities(DEFAULT_PRIORITY_CATEGORIES)
    setSources(DEFAULT_SOURCE_CATEGORIES)
    setMediums(DEFAULT_MEDIUM_CATEGORIES)
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-paper">
        <div className="flex items-center gap-3 text-xs font-medium text-ink-500">
          <span className="size-4 animate-spin rounded-full border-2 border-line-strong border-t-signal-600" />
          Cargando configuración...
        </div>
      </div>
    )
  }

  // 1. If onboarding is not completed, show the 6-step Onboarding Wizard
  if (!hasCompletedOnboarding) {
    return (
      <OnboardingWizard
        initialExportPath={exportPath}
        onComplete={handleCompleteOnboarding}
      />
    )
  }

  // 2. Once completed, show main application layout with navigation
  return (
    <AppLayout
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      exportPath={exportPath}
    >
      {activeSection === 'home' && (
        <HomeScreen
          exportPath={exportPath}
          onOpenSettings={() => setActiveSection('settings')}
          initialFile={loadedFileFromLibrary}
          statuses={statuses}
        />
      )}

      {activeSection === 'files' && (
        <LibraryScreen
          onLoadFileToHome={(file) => {
            setLoadedFileFromLibrary(file)
            setActiveSection('home')
          }}
        />
      )}

      {activeSection === 'settings' && (
        <SettingsScreen
          exportPath={exportPath}
          onUpdateExportPath={handleUpdateExportPath}
          statuses={statuses}
          onUpdateStatuses={handleUpdateStatuses}
          priorities={priorities}
          onUpdatePriorities={handleUpdatePriorities}
          sources={sources}
          onUpdateSources={handleUpdateSources}
          mediums={mediums}
          onUpdateMediums={handleUpdateMediums}
          onResetAllDefaults={handleResetAllDefaults}
        />
      )}
    </AppLayout>
  )
}

export default App
