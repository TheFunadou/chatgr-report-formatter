use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DimensionCategory {
    pub id: String,
    pub dimension: String,
    pub match_value: String,
    pub display_name: String,
    pub color_hex: String,
    pub is_conversion: bool,
    pub sort_order: i32,
    pub is_system_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub default_export_path: String,
    pub onboarding_completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CsvFileMetadata {
    pub path: String,
    pub file_name: String,
    pub file_size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CsvPreviewData {
    pub path: String,
    pub file_name: String,
    pub delimiter: String,
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub total_rows: usize,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SourceFileItem {
    pub id: String,
    pub source_route: String,
    pub original_file_name: String,
    pub alias: Option<String>,
    pub added_at: String,
    pub last_seen_at: Option<String>,
    pub file_size: Option<u64>,
    pub modified_at: Option<String>,
    pub is_available: bool,
}
