pub mod commands;
pub mod domain;
pub mod infrastructure;
pub mod state;

use commands::csv::{apply_cleaning_rules, get_csv_preview, validate_csv_file};
use commands::dimensions::{
    get_dimension_categories, reset_dimension_categories, save_dimension_categories,
};
use commands::settings::{
    get_app_settings, get_suggested_export_folder, save_app_settings, validate_export_folder,
};
use commands::source_files::{
    clean_missing_sources, clear_source_library, delete_source_file, list_source_files,
    register_source_file, relink_source_file, update_source_alias,
};
use infrastructure::database::Database;
use state::AppState;
use std::fs;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Prepare database in local app data directory
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::current_dir().unwrap());

            fs::create_dir_all(&app_data_dir).ok();
            let db_path = app_data_dir.join("reports_crm.db");

            let db = Database::new(db_path).expect("Failed to initialize SQLite database");
            app.manage(AppState {
                db: Mutex::new(db),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_settings,
            save_app_settings,
            get_suggested_export_folder,
            validate_export_folder,
            get_dimension_categories,
            save_dimension_categories,
            reset_dimension_categories,
            validate_csv_file,
            get_csv_preview,
            apply_cleaning_rules,
            register_source_file,
            list_source_files,
            update_source_alias,
            relink_source_file,
            delete_source_file,
            clean_missing_sources,
            clear_source_library,
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
