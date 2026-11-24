use crate::domain::normalization::{normalize_display, normalize_key};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct CleaningRules {
    pub date_filter: Option<DateFilterRule>,
    pub deduplication: Option<DeduplicationRule>,
    pub exclude_empty_rows: bool,
    pub exclude_invalid_rows: bool,
    pub excluded_statuses: Vec<String>,
    pub normalize_whitespace: bool,
    pub invalid_date_policy: InvalidDatePolicy,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum InvalidDatePolicy {
    /// Keep rows whose date cannot be parsed. Default, safest option.
    #[default]
    Keep,
    /// Exclude rows whose date is empty or cannot be parsed.
    Exclude,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DateFilterRule {
    pub column: String,
    pub start_date: Option<String>, // "YYYY-MM-DD"
    pub end_date: Option<String>,   // "YYYY-MM-DD"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeduplicationRule {
    pub columns: Vec<String>,
    pub keep: String, // "first" or "last"
    #[serde(default = "default_true")]
    pub ignore_empty_keys: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CleaningSummary {
    pub total_rows: usize,
    pub kept_rows: usize,
    pub excluded_total: usize,
    pub excluded_by_date: usize,
    pub excluded_by_invalid_date: usize,
    pub excluded_by_duplicates: usize,
    pub excluded_by_empty: usize,
    pub excluded_by_invalid: usize,
    pub excluded_by_status: usize,
    pub invalid_dates: usize,
    pub sample_cleaned_rows: Vec<Vec<String>>,
    pub excluded_samples: Vec<ExcludedRow>,
    pub warnings: Vec<String>,
    pub headers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExcludedRow {
    /// 1-based index in the source CSV, excluding the header row.
    pub row_number: usize,
    pub values: Vec<String>,
    pub reason: String,
}

const EXCLUDED_SAMPLE_LIMIT: usize = 12;

pub struct CleaningEngine;

impl CleaningEngine {
    pub fn process(
        headers: &[String],
        rows: &[Vec<String>],
        rules: &CleaningRules,
    ) -> (Vec<Vec<String>>, CleaningSummary) {
        let total_rows = rows.len();
        let header_index_map: HashMap<String, usize> = headers
            .iter()
            .enumerate()
            .map(|(i, h)| (normalize_key(h), i))
            .collect();

        let mut excluded_by_empty = 0usize;
        let mut excluded_by_invalid = 0usize;
        let mut excluded_by_date = 0usize;
        let mut excluded_by_invalid_date = 0usize;
        let mut excluded_by_status = 0usize;
        let mut excluded_by_duplicates = 0usize;
        let mut invalid_dates = 0usize;
        let mut warnings: Vec<String> = Vec::new();
        let mut excluded_samples: Vec<ExcludedRow> = Vec::new();

        let record_exclusion =
            |row_number: usize, row: &[String], reason: &str, samples: &mut Vec<ExcludedRow>| {
                if samples.len() < EXCLUDED_SAMPLE_LIMIT {
                    samples.push(ExcludedRow {
                        row_number,
                        values: row.to_vec(),
                        reason: reason.to_string(),
                    });
                }
            };

        // Step 1: value normalization, empty rows and malformed rows.
        let mut stage1: Vec<(usize, Vec<String>)> = Vec::with_capacity(rows.len());
        for (index, row) in rows.iter().enumerate() {
            let row_number = index + 1;
            let processed_row: Vec<String> = if rules.normalize_whitespace {
                row.iter().map(|value| normalize_display(value)).collect()
            } else {
                row.clone()
            };

            let all_empty = processed_row.iter().all(|value| value.trim().is_empty());
            if all_empty {
                excluded_by_empty += 1;
                record_exclusion(row_number, &processed_row, "Fila vacía", &mut excluded_samples);
                continue;
            }

            if processed_row.len() > headers.len() {
                excluded_by_invalid += 1;
                record_exclusion(
                    row_number,
                    &processed_row,
                    "Fila con más columnas que el encabezado",
                    &mut excluded_samples,
                );
                continue;
            }

            if rules.exclude_invalid_rows && processed_row.len() < headers.len() {
                excluded_by_invalid += 1;
                record_exclusion(
                    row_number,
                    &processed_row,
                    "Fila incompleta",
                    &mut excluded_samples,
                );
                continue;
            }

            stage1.push((row_number, processed_row));
        }

        // Step 2: date range filtering on the selected column.
        let mut stage2: Vec<(usize, Vec<String>)> = Vec::with_capacity(stage1.len());
        if let Some(date_rule) = &rules.date_filter {
            let column_key = normalize_key(&date_rule.column);
            let column_index = header_index_map.get(&column_key).copied();

            if column_index.is_none() {
                warnings.push(format!(
                    "La columna de fecha «{}» no existe en este archivo; el filtro de fechas no se aplicó.",
                    date_rule.column
                ));
            }

            let start = date_rule
                .start_date
                .as_ref()
                .and_then(|value| NaiveDate::parse_from_str(value, "%Y-%m-%d").ok());
            let end = date_rule
                .end_date
                .as_ref()
                .and_then(|value| NaiveDate::parse_from_str(value, "%Y-%m-%d").ok());

            if date_rule.start_date.is_some() && start.is_none() {
                warnings.push("La fecha inicial no es válida; se ignoró ese límite.".into());
            }
            if date_rule.end_date.is_some() && end.is_none() {
                warnings.push("La fecha final no es válida; se ignoró ese límite.".into());
            }

            for (row_number, row) in stage1 {
                let Some(index) = column_index else {
                    stage2.push((row_number, row));
                    continue;
                };

                let cell = row.get(index).map(String::as_str).unwrap_or("");
                match parse_flexible_date(cell) {
                    Some(date) => {
                        let before_start = start.is_some_and(|limit| date < limit);
                        let after_end = end.is_some_and(|limit| date > limit);
                        if before_start || after_end {
                            excluded_by_date += 1;
                            record_exclusion(
                                row_number,
                                &row,
                                "Fuera del rango de fechas",
                                &mut excluded_samples,
                            );
                        } else {
                            stage2.push((row_number, row));
                        }
                    }
                    None => {
                        invalid_dates += 1;
                        if rules.invalid_date_policy == InvalidDatePolicy::Exclude {
                            excluded_by_invalid_date += 1;
                            record_exclusion(
                                row_number,
                                &row,
                                "Fecha vacía o no reconocida",
                                &mut excluded_samples,
                            );
                        } else {
                            stage2.push((row_number, row));
                        }
                    }
                }
            }

            if invalid_dates > 0 {
                warnings.push(format!(
                    "{} registro(s) tienen una fecha vacía o no reconocida en «{}».",
                    invalid_dates, date_rule.column
                ));
            }
        } else {
            stage2 = stage1;
        }

        // Step 3: exclude records by commercial status.
        let mut stage3: Vec<(usize, Vec<String>)> = Vec::with_capacity(stage2.len());
        if !rules.excluded_statuses.is_empty() {
            let excluded_set: HashSet<String> = rules
                .excluded_statuses
                .iter()
                .map(|status| normalize_key(status))
                .collect();

            let status_index = header_index_map
                .get("estatus")
                .or_else(|| header_index_map.get("status"))
                .copied();

            if status_index.is_none() {
                warnings.push(
                    "No se encontró una columna de estatus; la exclusión por estatus no se aplicó."
                        .into(),
                );
            }

            for (row_number, row) in stage2 {
                let Some(index) = status_index else {
                    stage3.push((row_number, row));
                    continue;
                };

                let normalized_cell = row
                    .get(index)
                    .map(|value| normalize_key(value))
                    .unwrap_or_default();

                if excluded_set.contains(&normalized_cell) {
                    excluded_by_status += 1;
                    record_exclusion(
                        row_number,
                        &row,
                        "Estatus excluido",
                        &mut excluded_samples,
                    );
                } else {
                    stage3.push((row_number, row));
                }
            }
        } else {
            stage3 = stage2;
        }

        // Step 4: deduplication by the selected columns, keeping first or last.
        let stage4: Vec<(usize, Vec<String>)> = if let Some(dedup_rule) = &rules.deduplication {
            let mut indices: Vec<usize> = Vec::new();
            let mut missing_columns: Vec<String> = Vec::new();
            for column in &dedup_rule.columns {
                match header_index_map.get(&normalize_key(column)).copied() {
                    Some(index) => indices.push(index),
                    None => missing_columns.push(column.clone()),
                }
            }

            if !missing_columns.is_empty() {
                warnings.push(format!(
                    "No se encontraron estas columnas para detectar duplicados: {}.",
                    missing_columns.join(", ")
                ));
            }

            if indices.is_empty() {
                if !dedup_rule.columns.is_empty() {
                    warnings.push(
                        "No se aplicó la detección de duplicados porque ninguna columna coincidió."
                            .into(),
                    );
                }
                stage3
            } else {
                let keep_last = dedup_rule.keep.eq_ignore_ascii_case("last");
                let iterator: Box<dyn Iterator<Item = (usize, Vec<String>)>> = if keep_last {
                    Box::new(stage3.into_iter().rev())
                } else {
                    Box::new(stage3.into_iter())
                };

                let mut seen_keys: HashSet<Vec<String>> = HashSet::new();
                let mut kept: Vec<(usize, Vec<String>)> = Vec::new();

                for (row_number, row) in iterator {
                    let key: Vec<String> = indices
                        .iter()
                        .map(|index| {
                            row.get(*index)
                                .map(|value| normalize_key(value))
                                .unwrap_or_default()
                        })
                        .collect();

                    let key_is_empty = key.iter().all(|part| part.is_empty());
                    if dedup_rule.ignore_empty_keys && key_is_empty {
                        kept.push((row_number, row));
                        continue;
                    }

                    if seen_keys.contains(&key) {
                        excluded_by_duplicates += 1;
                        record_exclusion(
                            row_number,
                            &row,
                            "Registro duplicado",
                            &mut excluded_samples,
                        );
                    } else {
                        seen_keys.insert(key);
                        kept.push((row_number, row));
                    }
                }

                if keep_last {
                    kept.reverse();
                }
                kept
            }
        } else {
            stage3
        };

        let kept_rows = stage4.len();
        let excluded_total = excluded_by_empty
            + excluded_by_invalid
            + excluded_by_date
            + excluded_by_invalid_date
            + excluded_by_status
            + excluded_by_duplicates;

        let sample_cleaned_rows = stage4
            .iter()
            .take(20)
            .map(|(_, row)| row.clone())
            .collect();

        let summary = CleaningSummary {
            total_rows,
            kept_rows,
            excluded_total,
            excluded_by_date,
            excluded_by_invalid_date,
            excluded_by_duplicates,
            excluded_by_empty,
            excluded_by_invalid,
            excluded_by_status,
            invalid_dates,
            sample_cleaned_rows,
            excluded_samples,
            warnings,
            headers: headers.to_vec(),
        };

        (stage4.into_iter().map(|(_, row)| row).collect(), summary)
    }
}

/// Flexible parser for the common date formats found in CRM exports.
pub fn parse_flexible_date(input: &str) -> Option<NaiveDate> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return None;
    }

    let date_part = trimmed.split_whitespace().next().unwrap_or(trimmed);
    let date_part = date_part.trim_end_matches(|c| c == 'T' || c == 't');

    let formats = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y/%m/%d",
        "%m/%d/%Y",
        "%Y.%m.%d",
        "%d.%m.%Y",
        "%Y%m%d",
    ];

    for format in formats {
        if let Ok(date) = NaiveDate::parse_from_str(date_part, format) {
            return Some(date);
        }
    }

    // ISO timestamps such as 2026-11-20T14:30:00
    if let Some(date_part) = trimmed.split('T').next() {
        if let Ok(date) = NaiveDate::parse_from_str(date_part, "%Y-%m-%d") {
            return Some(date);
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn headers() -> Vec<String> {
        vec![
            "nombre".into(),
            "estatus".into(),
            "fecha".into(),
            "telefono".into(),
        ]
    }

    #[test]
    fn test_empty_rows_and_whitespace() {
        let rows = vec![
            vec!["  Juan   Perez  ".into(), "  nuevo  ".into(), "".into(), "".into()],
            vec!["".into(), "".into(), "".into(), "".into()],
            vec!["   ".into(), "   ".into(), "   ".into(), "   ".into()],
            vec!["Ana".into(), "compra".into(), "2026-11-20".into(), "555".into()],
        ];

        let rules = CleaningRules {
            exclude_empty_rows: true,
            normalize_whitespace: true,
            ..Default::default()
        };

        let (cleaned, summary) = CleaningEngine::process(&headers(), &rows, &rules);
        assert_eq!(summary.total_rows, 4);
        assert_eq!(summary.excluded_by_empty, 2);
        assert_eq!(summary.kept_rows, 2);
        assert_eq!(cleaned[0][0], "Juan Perez");
        assert_eq!(cleaned[0][1], "nuevo");
    }

    #[test]
    fn test_date_filter_range() {
        let rows = vec![
            vec!["Octubre".into(), "nuevo".into(), "2026-10-15".into(), "".into()],
            vec!["Noviembre".into(), "nuevo".into(), "2026-11-20".into(), "".into()],
            vec!["Diciembre".into(), "nuevo".into(), "2026-12-05".into(), "".into()],
        ];

        let rules = CleaningRules {
            date_filter: Some(DateFilterRule {
                column: "fecha".into(),
                start_date: Some("2026-11-01".into()),
                end_date: Some("2026-11-30".into()),
            }),
            ..Default::default()
        };

        let (cleaned, summary) = CleaningEngine::process(&headers(), &rows, &rules);
        assert_eq!(summary.kept_rows, 1);
        assert_eq!(summary.excluded_by_date, 2);
        assert_eq!(cleaned[0][0], "Noviembre");
    }

    #[test]
    fn test_date_filter_with_missing_column_keeps_rows_and_warns() {
        let rows = vec![vec!["Juan".into(), "nuevo".into(), "".into(), "".into()]];
        let rules = CleaningRules {
            date_filter: Some(DateFilterRule {
                column: "creado_en".into(),
                start_date: Some("2026-01-01".into()),
                end_date: None,
            }),
            ..Default::default()
        };

        let (cleaned, summary) = CleaningEngine::process(&headers(), &rows, &rules);
        assert_eq!(cleaned.len(), 1);
        assert_eq!(summary.kept_rows, 1);
        assert!(!summary.warnings.is_empty());
    }

    #[test]
    fn test_invalid_dates_can_be_kept_or_excluded() {
        let rows = vec![
            vec!["A".into(), "nuevo".into(), "no es fecha".into(), "".into()],
            vec!["B".into(), "nuevo".into(), "2026-11-20".into(), "".into()],
        ];
        let base = CleaningRules {
            date_filter: Some(DateFilterRule {
                column: "fecha".into(),
                start_date: Some("2026-01-01".into()),
                end_date: Some("2026-12-31".into()),
            }),
            ..Default::default()
        };

        let (_, kept_summary) = CleaningEngine::process(&headers(), &rows, &base);
        assert_eq!(kept_summary.kept_rows, 2);
        assert_eq!(kept_summary.invalid_dates, 1);

        let exclude = CleaningRules {
            invalid_date_policy: InvalidDatePolicy::Exclude,
            ..base
        };
        let (_, excluded_summary) = CleaningEngine::process(&headers(), &rows, &exclude);
        assert_eq!(excluded_summary.kept_rows, 1);
        assert_eq!(excluded_summary.excluded_by_invalid_date, 1);
    }

    #[test]
    fn test_deduplication_by_columns() {
        let rows = vec![
            vec!["Juan".into(), "nuevo".into(), "".into(), "5500000001".into()],
            vec!["Pedro".into(), "nuevo".into(), "".into(), "5500000002".into()],
            vec!["Juan Duplicado".into(), "compra".into(), "".into(), "5500000001".into()],
        ];

        let rules = CleaningRules {
            deduplication: Some(DeduplicationRule {
                columns: vec!["telefono".into()],
                keep: "first".into(),
                ignore_empty_keys: true,
            }),
            ..Default::default()
        };

        let (cleaned, summary) = CleaningEngine::process(&headers(), &rows, &rules);
        assert_eq!(summary.kept_rows, 2);
        assert_eq!(summary.excluded_by_duplicates, 1);
        assert_eq!(cleaned[0][0], "Juan");
    }

    #[test]
    fn test_duplicate_keys_ignore_case_whitespace_and_diacritics() {
        let rows = vec![
            vec!["José".into(), "nuevo".into(), "".into(), "ABC".into()],
            vec!["Jose".into(), "nuevo".into(), "".into(), " abc ".into()],
        ];

        let rules = CleaningRules {
            deduplication: Some(DeduplicationRule {
                columns: vec!["telefono".into()],
                keep: "first".into(),
                ignore_empty_keys: true,
            }),
            ..Default::default()
        };

        let (_, summary) = CleaningEngine::process(&headers(), &rows, &rules);
        assert_eq!(summary.kept_rows, 1);
        assert_eq!(summary.excluded_by_duplicates, 1);
    }

    #[test]
    fn test_empty_duplicate_keys_are_not_collapsed() {
        let rows = vec![
            vec!["Juan".into(), "nuevo".into(), "".into(), "".into()],
            vec!["Pedro".into(), "nuevo".into(), "".into(), "".into()],
        ];

        let rules = CleaningRules {
            deduplication: Some(DeduplicationRule {
                columns: vec!["telefono".into()],
                keep: "first".into(),
                ignore_empty_keys: true,
            }),
            ..Default::default()
        };

        let (_, summary) = CleaningEngine::process(&headers(), &rows, &rules);
        assert_eq!(summary.kept_rows, 2);
    }

    #[test]
    fn test_excluded_statuses() {
        let rows = vec![
            vec!["Lead 1".into(), "nuevo".into(), "".into(), "".into()],
            vec!["Lead 2".into(), "Sin Respuesta".into(), "".into(), "".into()],
            vec!["Lead 3".into(), "compra".into(), "".into(), "".into()],
        ];

        let rules = CleaningRules {
            excluded_statuses: vec!["sin respuesta".into()],
            ..Default::default()
        };

        let (cleaned, summary) = CleaningEngine::process(&headers(), &rows, &rules);
        assert_eq!(summary.kept_rows, 2);
        assert_eq!(summary.excluded_by_status, 1);
        assert_eq!(cleaned[0][0], "Lead 1");
        assert_eq!(cleaned[1][0], "Lead 3");
    }

    #[test]
    fn test_excluded_statuses_accept_accented_variants() {
        let rows = vec![
            vec!["Lead 1".into(), "en seguimiento".into(), "".into(), "".into()],
            vec!["Lead 2".into(), "compra".into(), "".into(), "".into()],
        ];

        let rules = CleaningRules {
            excluded_statuses: vec!["En Seguimiento".into()],
            ..Default::default()
        };

        let (_, summary) = CleaningEngine::process(&headers(), &rows, &rules);
        assert_eq!(summary.excluded_by_status, 1);
    }

    #[test]
    fn test_invalid_rows_and_excluded_samples() {
        let rows = vec![
            vec!["Juan".into(), "nuevo".into()],
            vec!["Pedro".into(), "nuevo".into(), "2026-01-01".into(), "555".into()],
        ];

        let rules = CleaningRules {
            exclude_invalid_rows: true,
            ..Default::default()
        };

        let (_, summary) = CleaningEngine::process(&headers(), &rows, &rules);
        assert_eq!(summary.excluded_by_invalid, 1);
        assert_eq!(summary.kept_rows, 1);
        assert_eq!(summary.excluded_samples[0].row_number, 1);
    }

    #[test]
    fn test_counts_reconcile() {
        let rows = vec![
            vec!["A".into(), "nuevo".into(), "2026-11-20".into(), "1".into()],
            vec!["A".into(), "nuevo".into(), "2026-11-20".into(), "1".into()],
            vec!["".into(), "".into(), "".into(), "".into()],
            vec!["B".into(), "sin respuesta".into(), "2020-01-01".into(), "2".into()],
        ];

        let rules = CleaningRules {
            date_filter: Some(DateFilterRule {
                column: "fecha".into(),
                start_date: Some("2026-01-01".into()),
                end_date: None,
            }),
            deduplication: Some(DeduplicationRule {
                columns: vec!["telefono".into()],
                keep: "first".into(),
                ignore_empty_keys: true,
            }),
            exclude_empty_rows: true,
            excluded_statuses: vec!["sin respuesta".into()],
            ..Default::default()
        };

        let (cleaned, summary) = CleaningEngine::process(&headers(), &rows, &rules);
        assert_eq!(
            summary.total_rows,
            summary.kept_rows + summary.excluded_total
        );
        assert_eq!(cleaned.len(), summary.kept_rows);
    }

    #[test]
    fn test_parse_flexible_date_formats() {
        assert!(parse_flexible_date("2026-11-23").is_some());
        assert!(parse_flexible_date("23/11/2026").is_some());
        assert!(parse_flexible_date("2026-11-23 10:30:00").is_some());
        assert!(parse_flexible_date("2026-11-23T10:30:00").is_some());
        assert!(parse_flexible_date("").is_none());
        assert!(parse_flexible_date("ayer").is_none());
    }
}
