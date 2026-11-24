use crate::domain::models::DimensionCategory;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn get_dimension_categories(
    state: State<'_, AppState>,
    dimension: Option<String>,
) -> Result<Vec<DimensionCategory>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_categories(dimension.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_dimension_categories(
    state: State<'_, AppState>,
    dimension: String,
    categories: Vec<DimensionCategory>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.save_categories(&dimension, &categories)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reset_dimension_categories(
    state: State<'_, AppState>,
    dimension: Option<String>,
) -> Result<Vec<DimensionCategory>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.seed_defaults(dimension.as_deref())
        .map_err(|e| e.to_string())?;
    db.get_categories(dimension.as_deref())
        .map_err(|e| e.to_string())
}
