use crate::domain::cleaning::{CleaningEngine, CleaningRules, CleaningSummary};
use crate::domain::models::{CsvFileMetadata, CsvPreviewData};
use crate::infrastructure::csv_reader::CsvReader;
use std::fs;
use std::path::Path;

#[tauri::command]
pub fn validate_csv_file(path: String) -> Result<CsvFileMetadata, String> {
    let p = Path::new(&path);

    if !p.exists() {
        return Err(format!("El archivo no existe en la ruta: {}", path));
    }

    if !p.is_file() {
        return Err("La ruta seleccionada no corresponde a un archivo regular.".into());
    }

    // Verify .csv extension (case-insensitive)
    match p.extension().and_then(|ext| ext.to_str()) {
        Some(ext) if ext.eq_ignore_ascii_case("csv") => {}
        _ => {
            return Err("El archivo seleccionado no tiene extensión .csv válida.".into());
        }
    }

    let metadata = fs::metadata(p).map_err(|e| format!("Error de lectura o permisos: {}", e))?;

    if metadata.len() == 0 {
        return Err("El archivo CSV está vacío (0 bytes).".into());
    }

    let file_name = p
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("archivo.csv")
        .to_string();

    Ok(CsvFileMetadata {
        path,
        file_name,
        file_size: metadata.len(),
    })
}

#[tauri::command]
pub fn get_csv_preview(
    path: String,
    delimiter: Option<String>,
    limit: Option<usize>,
) -> Result<CsvPreviewData, String> {
    let delim_char = delimiter.and_then(|d| d.chars().next());
    let max_rows = limit.unwrap_or(50);
    CsvReader::read_preview(&path, delim_char, max_rows)
}

#[tauri::command]
pub fn apply_cleaning_rules(
    path: String,
    rules: CleaningRules,
    delimiter: Option<String>,
) -> Result<CleaningSummary, String> {
    let delim_char = delimiter.and_then(|d| d.chars().next());
    // Read all rows to apply cleaning rules across the entire dataset
    let preview = CsvReader::read_preview(&path, delim_char, usize::MAX)?;
    let (_, summary) = CleaningEngine::process(&preview.headers, &preview.rows, &rules);
    Ok(summary)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_validate_csv_file_success() {
        let mut temp = NamedTempFile::with_suffix(".csv").expect("create temp csv");
        write!(temp, "nombre,telefono,estatus\nJuan,12345,nuevo\n").expect("write temp");

        let path = temp.path().to_string_lossy().to_string();
        let result = validate_csv_file(path).expect("validation should succeed");

        assert!(result.file_size > 0);
        assert!(result.file_name.ends_with(".csv"));
    }

    #[test]
    fn test_validate_csv_file_non_existent() {
        let result = validate_csv_file("C:/ruta/inexistente/leads.csv".into());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("no existe"));
    }

    #[test]
    fn test_validate_csv_file_wrong_extension() {
        let temp = NamedTempFile::with_suffix(".txt").expect("create temp txt");
        let path = temp.path().to_string_lossy().to_string();

        let result = validate_csv_file(path);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("extensión .csv"));
    }

    #[test]
    fn test_validate_csv_file_empty() {
        let temp = NamedTempFile::with_suffix(".csv").expect("create temp csv");
        let path = temp.path().to_string_lossy().to_string();

        let result = validate_csv_file(path);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("vacío"));
    }

    #[test]
    fn test_get_csv_preview_command() {
        let mut temp = NamedTempFile::with_suffix(".csv").expect("create temp csv");
        write!(temp, "lead,tel\nJuan,00123\nPedro,+521\n").expect("write temp");

        let path = temp.path().to_string_lossy().to_string();
        let preview = get_csv_preview(path, None, Some(10)).expect("preview command");

        assert_eq!(preview.headers, vec!["lead", "tel"]);
        assert_eq!(preview.rows.len(), 2);
        assert_eq!(preview.rows[0][1], "00123");
        assert_eq!(preview.rows[1][1], "+521");
    }

    #[test]
    fn test_apply_cleaning_rules_command() {
        let mut temp = NamedTempFile::with_suffix(".csv").expect("create temp csv");
        write!(
            temp,
            "nombre,telefono,estatus\nJuan,111,nuevo\n  ,  ,  \nPedro,222,sin respuesta\n"
        )
        .expect("write temp");

        let path = temp.path().to_string_lossy().to_string();
        let rules = CleaningRules {
            exclude_empty_rows: true,
            excluded_statuses: vec!["sin respuesta".into()],
            ..Default::default()
        };

        let summary = apply_cleaning_rules(path, rules, None).expect("cleaning rules");
        assert_eq!(summary.total_rows, 3);
        assert_eq!(summary.excluded_by_empty, 1);
        assert_eq!(summary.excluded_by_status, 1);
        assert_eq!(summary.kept_rows, 1);
    }
}
