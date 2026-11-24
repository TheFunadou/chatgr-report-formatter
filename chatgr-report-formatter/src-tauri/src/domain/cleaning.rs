use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CleaningRules {
    pub date_filter: Option<DateFilterRule>,
    pub deduplication: Option<DeduplicationRule>,
    pub exclude_empty_rows: bool,
    pub excluded_statuses: Vec<String>,
    pub normalize_whitespace: bool,
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
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CleaningSummary {
    pub total_rows: usize,
    pub kept_rows: usize,
    pub excluded_total: usize,
    pub excluded_by_date: usize,
    pub excluded_by_duplicates: usize,
    pub excluded_by_empty: usize,
    pub excluded_by_status: usize,
    pub sample_cleaned_rows: Vec<Vec<String>>,
    pub headers: Vec<String>,
}

pub struct CleaningEngine;

impl CleaningEngine {
    pub fn process(
        headers: &[String],
        rows: &[Vec<String>],
        rules: &CleaningRules,
    ) -> (Vec<Vec<String>>, CleaningSummary) {
        let total_rows = rows.len();
        let mut excluded_by_empty = 0usize;
        let mut excluded_by_date = 0usize;
        let mut excluded_by_status = 0usize;
        let mut excluded_by_duplicates = 0usize;

        // Map column names lowercase for matching
        let header_index_map: std::collections::HashMap<String, usize> = headers
            .iter()
            .enumerate()
            .map(|(i, h)| (h.trim().to_lowercase(), i))
            .collect();

        // Step 1: Normalize whitespace and exclude empty rows
        let mut stage1: Vec<Vec<String>> = Vec::new();
        for row in rows {
            let processed_row: Vec<String> = if rules.normalize_whitespace {
                row.iter()
                    .map(|val| {
                        val.split_whitespace()
                            .collect::<Vec<&str>>()
                            .join(" ")
                    })
                    .collect()
            } else {
                row.clone()
            };

            if rules.exclude_empty_rows {
                let is_all_empty = processed_row.iter().all(|val| val.trim().is_empty());
                if is_all_empty {
                    excluded_by_empty += 1;
                    continue;
                }
            }

            stage1.push(processed_row);
        }

        // Step 2: Date filtering
        let mut stage2: Vec<Vec<String>> = Vec::new();
        if let Some(date_rule) = &rules.date_filter {
            let col_idx = header_index_map.get(&date_rule.column.trim().to_lowercase()).copied();
            let start = date_rule
                .start_date
                .as_ref()
                .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
            let end = date_rule
                .end_date
                .as_ref()
                .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

            for row in stage1 {
                if let Some(idx) = col_idx {
                    if let Some(cell) = row.get(idx) {
                        if let Some(parsed_date) = parse_flexible_date(cell) {
                            if let Some(start_d) = start {
                                if parsed_date < start_d {
                                    excluded_by_date += 1;
                                    continue;
                                }
                            }
                            if let Some(end_d) = end {
                                if parsed_date > end_d {
                                    excluded_by_date += 1;
                                    continue;
                                }
                            }
                        }
                    }
                }
                stage2.push(row);
            }
        } else {
            stage2 = stage1;
        }

        // Step 3: Status filtering
        let mut stage3: Vec<Vec<String>> = Vec::new();
        if !rules.excluded_statuses.is_empty() {
            let excluded_set: HashSet<String> = rules
                .excluded_statuses
                .iter()
                .map(|s| s.trim().to_lowercase())
                .collect();

            // Find status column ("estatus" or "status")
            let status_idx = header_index_map
                .get("estatus")
                .or_else(|| header_index_map.get("status"))
                .copied();

            for row in stage2 {
                if let Some(idx) = status_idx {
                    if let Some(cell) = row.get(idx) {
                        let normalized_cell = cell.trim().to_lowercase();
                        if excluded_set.contains(&normalized_cell) {
                            excluded_by_status += 1;
                            continue;
                        }
                    }
                }
                stage3.push(row);
            }
        } else {
            stage3 = stage2;
        }

        // Step 4: Deduplication
        let stage4: Vec<Vec<String>> = if let Some(dedup_rule) = &rules.deduplication {
            let col_indices: Vec<usize> = dedup_rule
                .columns
                .iter()
                .filter_map(|c| header_index_map.get(&c.trim().to_lowercase()).copied())
                .collect();

            if col_indices.is_empty() {
                stage3
            } else {
                let mut seen_keys = HashSet::new();
                let mut result = Vec::new();

                // If "last", we can iterate in reverse or collect and reverse
                let is_last = dedup_rule.keep.eq_ignore_ascii_case("last");
                let items_to_process: Box<dyn Iterator<Item = Vec<String>>> = if is_last {
                    Box::new(stage3.into_iter().rev())
                } else {
                    Box::new(stage3.into_iter())
                };

                for row in items_to_process {
                    let key: Vec<String> = col_indices
                        .iter()
                        .map(|&idx| row.get(idx).map(|s| s.trim().to_lowercase()).unwrap_or_default())
                        .collect();

                    if seen_keys.contains(&key) {
                        excluded_by_duplicates += 1;
                    } else {
                        seen_keys.insert(key);
                        result.push(row);
                    }
                }

                if is_last {
                    result.reverse();
                }

                result
            }
        } else {
            stage3
        };

        let kept_rows = stage4.len();
        let excluded_total = excluded_by_empty
            + excluded_by_date
            + excluded_by_status
            + excluded_by_duplicates;

        let sample_cleaned_rows = stage4.iter().take(20).cloned().collect();

        let summary = CleaningSummary {
            total_rows,
            kept_rows,
            excluded_total,
            excluded_by_date,
            excluded_by_duplicates,
            excluded_by_empty,
            excluded_by_status,
            sample_cleaned_rows,
            headers: headers.to_vec(),
        };

        (stage4, summary)
    }
}

/// Flexible parser for common date formats in CRM exports
pub fn parse_flexible_date(input: &str) -> Option<NaiveDate> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return None;
    }

    // Split on space in case there is time e.g. "2026-11-20 14:30:00"
    let date_part = trimmed.split_whitespace().next().unwrap_or(trimmed);

    let formats = [
        "%Y-%m-%d", // 2026-11-23
        "%d/%m/%Y", // 23/11/2026
        "%d-%m-%Y", // 23-11-2026
        "%Y/%m/%d", // 2026/11/23
        "%m/%d/%Y", // 11/23/2026
    ];

    for fmt in &formats {
        if let Ok(d) = NaiveDate::parse_from_str(date_part, fmt) {
            return Some(d);
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_rows_and_whitespace() {
        let headers = vec!["nombre".into(), "estatus".into()];
        let rows = vec![
            vec!["  Juan   Perez  ".into(), "  nuevo  ".into()],
            vec!["".into(), "".into()],
            vec!["   ".into(), "   ".into()],
            vec!["Ana".into(), "compra".into()],
        ];

        let rules = CleaningRules {
            exclude_empty_rows: true,
            normalize_whitespace: true,
            ..Default::default()
        };

        let (cleaned, summary) = CleaningEngine::process(&headers, &rows, &rules);
        assert_eq!(summary.total_rows, 4);
        assert_eq!(summary.excluded_by_empty, 2);
        assert_eq!(summary.kept_rows, 2);
        assert_eq!(cleaned[0][0], "Juan Perez");
        assert_eq!(cleaned[0][1], "nuevo");
    }

    #[test]
    fn test_date_filter_range() {
        let headers = vec!["nombre".into(), "fecha".into()];
        let rows = vec![
            vec!["Octubre".into(), "2026-10-15".into()],
            vec!["Noviembre".into(), "2026-11-20".into()],
            vec!["Diciembre".into(), "2026-12-05".into()],
        ];

        let rules = CleaningRules {
            date_filter: Some(DateFilterRule {
                column: "fecha".into(),
                start_date: Some("2026-11-01".into()),
                end_date: Some("2026-11-30".into()),
            }),
            ..Default::default()
        };

        let (cleaned, summary) = CleaningEngine::process(&headers, &rows, &rules);
        assert_eq!(summary.kept_rows, 1);
        assert_eq!(summary.excluded_by_date, 2);
        assert_eq!(cleaned[0][0], "Noviembre");
    }

    #[test]
    fn test_deduplication_by_columns() {
        let headers = vec!["telefono".into(), "nombre".into()];
        let rows = vec![
            vec!["5500000001".into(), "Juan".into()],
            vec!["5500000002".into(), "Pedro".into()],
            vec!["5500000001".into(), "Juan Duplicado".into()],
        ];

        let rules = CleaningRules {
            deduplication: Some(DeduplicationRule {
                columns: vec!["telefono".into()],
                keep: "first".into(),
            }),
            ..Default::default()
        };

        let (cleaned, summary) = CleaningEngine::process(&headers, &rows, &rules);
        assert_eq!(summary.kept_rows, 2);
        assert_eq!(summary.excluded_by_duplicates, 1);
        assert_eq!(cleaned[0][1], "Juan");
    }

    #[test]
    fn test_excluded_statuses() {
        let headers = vec!["nombre".into(), "estatus".into()];
        let rows = vec![
            vec!["Lead 1".into(), "nuevo".into()],
            vec!["Lead 2".into(), "sin respuesta".into()],
            vec!["Lead 3".into(), "compra".into()],
        ];

        let rules = CleaningRules {
            excluded_statuses: vec!["sin respuesta".into()],
            ..Default::default()
        };

        let (cleaned, summary) = CleaningEngine::process(&headers, &rows, &rules);
        assert_eq!(summary.kept_rows, 2);
        assert_eq!(summary.excluded_by_status, 1);
        assert_eq!(cleaned[0][0], "Lead 1");
        assert_eq!(cleaned[1][0], "Lead 3");
    }
}
