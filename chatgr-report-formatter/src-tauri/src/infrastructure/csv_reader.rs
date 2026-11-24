use crate::domain::models::CsvPreviewData;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

pub struct CsvReader;

impl CsvReader {
    /// Detect the most likely delimiter (comma, semicolon, tab, pipe) by consistency across lines.
    pub fn detect_delimiter<P: AsRef<Path>>(path: P) -> char {
        let file = match File::open(path) {
            Ok(f) => f,
            Err(_) => return ',',
        };

        let reader = BufReader::new(file);
        let sample_lines: Vec<String> = reader
            .lines()
            .take(15)
            .filter_map(|l| l.ok())
            .filter(|l| !l.trim().is_empty())
            .collect();

        if sample_lines.is_empty() {
            return ',';
        }

        let candidates = [',', ';', '\t', '|'];
        let mut best_delimiter = ',';
        let mut best_score = 0usize;

        for &delim in &candidates {
            let counts: Vec<usize> = sample_lines
                .iter()
                .map(|line| line.chars().filter(|&c| c == delim).count())
                .collect();

            let first_count = counts[0];
            if first_count > 0 && counts.iter().all(|&c| c == first_count) {
                // Completely consistent across all sampled lines
                let score = first_count * 100;
                if score > best_score {
                    best_score = score;
                    best_delimiter = delim;
                }
            } else {
                let sum: usize = counts.iter().sum();
                if sum > best_score {
                    best_score = sum;
                    best_delimiter = delim;
                }
            }
        }

        best_delimiter
    }

    /// Read preview with headers, up to `limit` rows, total rows count, and warnings.
    pub fn read_preview<P: AsRef<Path>>(
        path: P,
        custom_delimiter: Option<char>,
        limit: usize,
    ) -> Result<CsvPreviewData, String> {
        let p = path.as_ref();
        if !p.exists() {
            return Err(format!("El archivo no existe: {}", p.display()));
        }

        let detected = Self::detect_delimiter(p);
        let delimiter = custom_delimiter.unwrap_or(detected);
        let delimiter_byte = delimiter as u8;

        let mut warnings = Vec::new();
        if custom_delimiter.is_none() && delimiter != ',' {
            warnings.push(format!(
                "Delimitador detectado automáticamente: '{}'.",
                match delimiter {
                    ';' => "punto y coma (;)",
                    '\t' => "tabulador (\\t)",
                    '|' => "barra vertical (|)",
                    _ => "personalizado",
                }
            ));
        }

        let file = File::open(p).map_err(|e| format!("Error al abrir archivo: {}", e))?;
        let mut rdr = csv::ReaderBuilder::new()
            .delimiter(delimiter_byte)
            .has_headers(true)
            .flexible(true)
            .from_reader(file);

        // Read and strip UTF-8 BOM from headers if present
        let raw_headers = rdr
            .headers()
            .map_err(|e| format!("Error al leer encabezados: {}", e))?;

        let headers: Vec<String> = raw_headers
            .iter()
            .enumerate()
            .map(|(i, h)| {
                let trimmed = h.trim();
                if i == 0 {
                    trimmed.trim_start_matches('\u{feff}').to_string()
                } else {
                    trimmed.to_string()
                }
            })
            .collect();

        if headers.is_empty() {
            return Err("No se encontraron encabezados válidos en el archivo CSV.".into());
        }

        let mut preview_rows = Vec::new();
        let mut total_rows = 0usize;
        let mut irregular_row_count = 0usize;

        for result in rdr.records() {
            total_rows += 1;
            match result {
                Ok(record) => {
                    if record.len() != headers.len() {
                        irregular_row_count += 1;
                    }
                    if preview_rows.len() < limit {
                        // Preserves exact text without conversion to numbers
                        let row_vec: Vec<String> = record.iter().map(|s| s.to_string()).collect();
                        preview_rows.push(row_vec);
                    }
                }
                Err(e) => {
                    warnings.push(format!("Fila {} con formato inválido: {}", total_rows, e));
                }
            }
        }

        if irregular_row_count > 0 {
            warnings.push(format!(
                "Se encontraron {} fila(s) con un número de columnas diferente a los encabezados.",
                irregular_row_count
            ));
        }

        let file_name = p
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("archivo.csv")
            .to_string();

        Ok(CsvPreviewData {
            path: p.to_string_lossy().to_string(),
            file_name,
            delimiter: delimiter.to_string(),
            headers,
            rows: preview_rows,
            total_rows,
            warnings,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_detect_semicolon_and_preview() {
        let mut temp = NamedTempFile::with_suffix(".csv").expect("create temp");
        writeln!(temp, "nombre;telefono;estatus").unwrap();
        writeln!(temp, "Juan Perez;+5215500000000;compra").unwrap();
        writeln!(temp, "Ana Gomez;018001234567;nuevo").unwrap();

        let path = temp.path();
        let delim = CsvReader::detect_delimiter(path);
        assert_eq!(delim, ';');

        let preview = CsvReader::read_preview(path, None, 10).expect("read preview");
        assert_eq!(preview.delimiter, ";");
        assert_eq!(preview.headers, vec!["nombre", "telefono", "estatus"]);
        assert_eq!(preview.rows.len(), 2);
        assert_eq!(preview.total_rows, 2);
        // Preserves leading + and zeros
        assert_eq!(preview.rows[0][1], "+5215500000000");
        assert_eq!(preview.rows[1][1], "018001234567");
    }

    #[test]
    fn test_utf8_bom_stripping() {
        let mut temp = NamedTempFile::with_suffix(".csv").expect("create temp");
        // UTF-8 BOM is \xEF\xBB\xBF
        temp.write_all("\u{feff}id,nombre,estatus\n1,Maria,contactado\n".as_bytes())
            .unwrap();

        let preview = CsvReader::read_preview(temp.path(), Some(','), 10).expect("read bom");
        assert_eq!(preview.headers[0], "id");
    }

    #[test]
    fn test_preview_limit() {
        let mut temp = NamedTempFile::with_suffix(".csv").expect("create temp");
        writeln!(temp, "col1,col2").unwrap();
        for i in 0..50 {
            writeln!(temp, "{},val_{}", i, i).unwrap();
        }

        let preview = CsvReader::read_preview(temp.path(), Some(','), 5).expect("read limit");
        assert_eq!(preview.rows.len(), 5);
        assert_eq!(preview.total_rows, 50);
    }
}
