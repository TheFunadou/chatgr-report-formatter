use crate::domain::models::AppSettings;
use crate::state::AppState;
use tauri::{AppHandle, Manager, State};

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

#[tauri::command]
pub fn get_suggested_export_folder(app: AppHandle) -> Result<String, String> {
    if let Ok(path) = app.path().document_dir() {
        let suggested = path.join("Reportes CRM");
        Ok(suggested.to_string_lossy().to_string())
    } else {
        Ok("C:/Reportes_CRM".to_string())
    }
}
