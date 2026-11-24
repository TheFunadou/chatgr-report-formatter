use crate::domain::models::SourceFileItem;
use crate::state::AppState;
use std::fs;
use tauri::State;

#[tauri::command]
pub fn register_source_file(
    state: State<'_, AppState>,
    route: String,
    file_name: String,
    alias: Option<String>,
) -> Result<SourceFileItem, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let size = fs::metadata(&route).ok().map(|m| m.len());

    db.add_source_file(&route, &file_name, alias.as_deref(), size)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_source_files(
    state: State<'_, AppState>,
    query: Option<String>,
) -> Result<Vec<SourceFileItem>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_source_files(query.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_source_alias(
    state: State<'_, AppState>,
    id: String,
    alias: Option<String>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_source_file_alias(&id, alias.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn relink_source_file(
    state: State<'_, AppState>,
    id: String,
    new_route: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.relink_source_file(&id, &new_route)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_source_file(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_source_file(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clean_missing_sources(state: State<'_, AppState>) -> Result<usize, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.clean_missing_source_files().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_source_library(state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.clear_all_source_files().map_err(|e| e.to_string())
}
