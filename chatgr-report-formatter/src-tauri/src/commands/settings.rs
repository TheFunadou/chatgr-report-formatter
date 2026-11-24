use crate::domain::models::AppSettings;
use crate::state::AppState;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, State};

pub const EXPORT_FOLDER_NAME: &str = "Reportes CRM";

#[tauri::command]
pub fn get_app_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_app_settings().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_app_settings(
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.save_app_settings(&settings).map_err(|e| e.to_string())
}

/// Chooses the best cross-platform base directory for generated reports.
///
/// Preference order is Downloads, Documents, Home and finally the system temp
/// directory. The exported folder always gets the `Reportes CRM` child.
pub fn resolve_export_folder(
    downloads: Option<PathBuf>,
    documents: Option<PathBuf>,
    home: Option<PathBuf>,
) -> PathBuf {
    downloads
        .or(documents)
        .or(home)
        .unwrap_or_else(std::env::temp_dir)
        .join(EXPORT_FOLDER_NAME)
}

#[tauri::command]
pub fn get_suggested_export_folder(app: AppHandle) -> Result<String, String> {
    // Tauri's resolver is the primary source; `dirs` covers the cases where a
    // platform does not expose a known folder to the webview runtime.
    let downloads = app.path().download_dir().ok().or_else(dirs::download_dir);
    let documents = app
        .path()
        .document_dir()
        .ok()
        .or_else(dirs::document_dir);
    let home = app.path().home_dir().ok().or_else(dirs::home_dir);

    let folder = resolve_export_folder(downloads, documents, home);
    fs::create_dir_all(&folder).map_err(|err| {
        format!(
            "No se pudo preparar la carpeta de exportación «{}»: {}",
            folder.display(),
            err
        )
    })?;

    Ok(folder.to_string_lossy().to_string())
}

#[tauri::command]
pub fn validate_export_folder(path: String) -> Result<(), String> {
    validate_export_folder_path(&path)
}

pub fn validate_export_folder_path(path: &str) -> Result<(), String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Selecciona una carpeta de exportación antes de continuar.".into());
    }

    let folder = PathBuf::from(trimmed);
    if !folder.exists() {
        return Err(format!(
            "La carpeta «{}» no existe. Elígela de nuevo con el explorador del sistema.",
            trimmed
        ));
    }

    if !folder.is_dir() {
        return Err(format!(
            "La ruta «{}» es un archivo, no una carpeta. Elige un directorio.",
            trimmed
        ));
    }

    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    let probe = folder.join(format!(".chatgr-write-test-{}-{}", std::process::id(), stamp));

    match fs::write(&probe, b"ok") {
        Ok(_) => {
            let _ = fs::remove_file(&probe);
            Ok(())
        }
        Err(err) => Err(format!(
            "No se puede escribir en «{}». Revisa los permisos o elige otra carpeta. ({})",
            trimmed, err
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_export_folder_prefers_downloads() {
        let folder = resolve_export_folder(
            Some(PathBuf::from("/home/ana/Descargas")),
            Some(PathBuf::from("/home/ana/Documentos")),
            Some(PathBuf::from("/home/ana")),
        );
        assert_eq!(folder, PathBuf::from("/home/ana/Descargas").join(EXPORT_FOLDER_NAME));
    }

    #[test]
    fn resolve_export_folder_falls_back_to_documents_then_home() {
        assert_eq!(
            resolve_export_folder(None, Some(PathBuf::from("/docs")), Some(PathBuf::from("/home"))),
            PathBuf::from("/docs").join(EXPORT_FOLDER_NAME)
        );
        assert_eq!(
            resolve_export_folder(None, None, Some(PathBuf::from("/home"))),
            PathBuf::from("/home").join(EXPORT_FOLDER_NAME)
        );
    }

    #[test]
    fn validate_export_folder_accepts_writable_directory() {
        let temp = tempfile::tempdir().expect("temp dir");
        let path = temp.path().to_string_lossy().to_string();
        assert!(validate_export_folder_path(&path).is_ok());
    }

    #[test]
    fn validate_export_folder_rejects_empty_missing_and_files() {
        assert!(validate_export_folder_path("   ").is_err());

        let missing = std::env::temp_dir().join("chatgr-carpeta-inexistente-xyz");
        assert!(validate_export_folder_path(&missing.to_string_lossy()).is_err());

        let temp = tempfile::NamedTempFile::new().expect("temp file");
        assert!(validate_export_folder_path(&temp.path().to_string_lossy()).is_err());
    }
}
