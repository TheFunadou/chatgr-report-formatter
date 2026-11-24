use crate::domain::models::{AppSettings, DimensionCategory, SourceFileItem};
use rusqlite::{params, Connection, Result};
use std::fs;
use std::path::Path;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let conn = Connection::open(path)?;
        let db = Self { conn };
        db.init_schema()?;
        db.seed_defaults_if_empty()?;
        Ok(db)
    }

    pub fn new_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let db = Self { conn };
        db.init_schema()?;
        db.seed_defaults_if_empty()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS dimension_categories (
                id TEXT PRIMARY KEY,
                dimension TEXT NOT NULL,
                match_value TEXT NOT NULL,
                display_name TEXT NOT NULL,
                color_hex TEXT NOT NULL,
                is_conversion INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                is_system_default INTEGER NOT NULL DEFAULT 0,
                UNIQUE(dimension, match_value)
            );

            CREATE TABLE IF NOT EXISTS source_files (
                id TEXT PRIMARY KEY,
                source_route TEXT NOT NULL,
                original_file_name TEXT NOT NULL,
                alias TEXT,
                added_at TEXT NOT NULL,
                last_seen_at TEXT,
                file_size INTEGER,
                modified_at TEXT,
                content_hash TEXT
            );
            ",
        )?;
        Ok(())
    }

    pub fn seed_defaults_if_empty(&self) -> Result<()> {
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM dimension_categories", [], |r| r.get(0))?;

        if count == 0 {
            self.seed_defaults(None)?;
        }
        Ok(())
    }

    pub fn seed_defaults(&self, dimension_filter: Option<&str>) -> Result<()> {
        let default_categories = Self::get_system_default_categories();

        let tx = self.conn.unchecked_transaction()?;

        if let Some(dim) = dimension_filter {
            tx.execute(
                "DELETE FROM dimension_categories WHERE dimension = ?1",
                params![dim],
            )?;
        } else {
            tx.execute("DELETE FROM dimension_categories", [])?;
        }

        for cat in default_categories {
            if let Some(dim) = dimension_filter {
                if cat.dimension != dim {
                    continue;
                }
            }

            tx.execute(
                "INSERT INTO dimension_categories (
                    id, dimension, match_value, display_name, color_hex, is_conversion, sort_order, is_system_default
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    cat.id,
                    cat.dimension,
                    cat.match_value,
                    cat.display_name,
                    cat.color_hex,
                    if cat.is_conversion { 1 } else { 0 },
                    cat.sort_order,
                    1
                ],
            )?;
        }

        tx.commit()?;
        Ok(())
    }

    pub fn get_app_settings(&self) -> Result<AppSettings> {
        let default_export_path = self.get_setting("default_export_path")?.unwrap_or_default();
        let onboarding_completed_str = self
            .get_setting("onboarding_completed")?
            .unwrap_or_else(|| "false".to_string());

        Ok(AppSettings {
            default_export_path,
            onboarding_completed: onboarding_completed_str == "true" || onboarding_completed_str == "1",
        })
    }

    pub fn save_app_settings(&self, settings: &AppSettings) -> Result<()> {
        self.set_setting("default_export_path", &settings.default_export_path)?;
        self.set_setting(
            "onboarding_completed",
            if settings.onboarding_completed { "true" } else { "false" },
        )?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let mut stmt = self
            .conn
            .prepare("SELECT value FROM app_settings WHERE key = ?1")?;
        let mut rows = stmt.query(params![key])?;

        if let Some(row) = rows.next()? {
            let val: String = row.get(0)?;
            Ok(Some(val))
        } else {
            Ok(None)
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO app_settings (key, value, updated_at) 
             VALUES (?1, ?2, datetime('now'))
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn get_categories(&self, dimension_filter: Option<&str>) -> Result<Vec<DimensionCategory>> {
        let mut categories = Vec::new();

        let query = if dimension_filter.is_some() {
            "SELECT id, dimension, match_value, display_name, color_hex, is_conversion, sort_order, is_system_default 
             FROM dimension_categories WHERE dimension = ?1 ORDER BY sort_order ASC"
        } else {
            "SELECT id, dimension, match_value, display_name, color_hex, is_conversion, sort_order, is_system_default 
             FROM dimension_categories ORDER BY dimension ASC, sort_order ASC"
        };

        let mut stmt = self.conn.prepare(query)?;
        let rows = if let Some(dim) = dimension_filter {
            stmt.query(params![dim])?
        } else {
            stmt.query([])?
        };

        let mut mapped_rows = rows;
        while let Some(row) = mapped_rows.next()? {
            let is_conversion_int: i32 = row.get(5)?;
            let is_system_default_int: i32 = row.get(7)?;

            categories.push(DimensionCategory {
                id: row.get(0)?,
                dimension: row.get(1)?,
                match_value: row.get(2)?,
                display_name: row.get(3)?,
                color_hex: row.get(4)?,
                is_conversion: is_conversion_int == 1,
                sort_order: row.get(6)?,
                is_system_default: is_system_default_int == 1,
            });
        }

        Ok(categories)
    }

    pub fn save_categories(
        &self,
        dimension: &str,
        categories: &[DimensionCategory],
    ) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;

        tx.execute(
            "DELETE FROM dimension_categories WHERE dimension = ?1",
            params![dimension],
        )?;

        for (idx, cat) in categories.iter().enumerate() {
            tx.execute(
                "INSERT INTO dimension_categories (
                    id, dimension, match_value, display_name, color_hex, is_conversion, sort_order, is_system_default
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    cat.id,
                    dimension,
                    cat.match_value,
                    cat.display_name,
                    cat.color_hex,
                    if cat.is_conversion { 1 } else { 0 },
                    idx as i32 + 1,
                    if cat.is_system_default { 1 } else { 0 }
                ],
            )?;
        }

        tx.commit()?;
        Ok(())
    }

    // --- Source Files Catalog Operations ---

    pub fn add_source_file(
        &self,
        source_route: &str,
        original_file_name: &str,
        alias: Option<&str>,
        file_size: Option<u64>,
    ) -> Result<SourceFileItem> {
        let id = format!("src-{}", uuid_simple());
        let now = chrono_now_iso();

        self.conn.execute(
            "INSERT INTO source_files (
                id, source_route, original_file_name, alias, added_at, last_seen_at, file_size
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?6)",
            params![
                id,
                source_route,
                original_file_name,
                alias,
                now,
                file_size.map(|s| s as i64)
            ],
        )?;

        let is_available = Path::new(source_route).exists();

        Ok(SourceFileItem {
            id,
            source_route: source_route.to_string(),
            original_file_name: original_file_name.to_string(),
            alias: alias.map(|s| s.to_string()),
            added_at: now.clone(),
            last_seen_at: Some(now),
            file_size,
            modified_at: None,
            is_available,
        })
    }

    pub fn get_source_files(&self, search_query: Option<&str>) -> Result<Vec<SourceFileItem>> {
        let mut items = Vec::new();

        let query = if search_query.is_some() {
            "SELECT id, source_route, original_file_name, alias, added_at, last_seen_at, file_size, modified_at
             FROM source_files 
             WHERE original_file_name LIKE ?1 OR alias LIKE ?1 
             ORDER BY added_at DESC"
        } else {
            "SELECT id, source_route, original_file_name, alias, added_at, last_seen_at, file_size, modified_at
             FROM source_files 
             ORDER BY added_at DESC"
        };

        let mut stmt = self.conn.prepare(query)?;
        let rows = if let Some(q) = search_query {
            let pattern = format!("%{}%", q);
            stmt.query(params![pattern])?
        } else {
            stmt.query([])?
        };

        let mut mapped_rows = rows;
        while let Some(row) = mapped_rows.next()? {
            let route: String = row.get(1)?;
            let is_available = Path::new(&route).exists();
            let size_int: Option<i64> = row.get(6)?;

            items.push(SourceFileItem {
                id: row.get(0)?,
                source_route: route,
                original_file_name: row.get(2)?,
                alias: row.get(3)?,
                added_at: row.get(4)?,
                last_seen_at: row.get(5)?,
                file_size: size_int.map(|s| s as u64),
                modified_at: row.get(7)?,
                is_available,
            });
        }

        Ok(items)
    }

    pub fn update_source_file_alias(&self, id: &str, alias: Option<&str>) -> Result<()> {
        self.conn.execute(
            "UPDATE source_files SET alias = ?1 WHERE id = ?2",
            params![alias, id],
        )?;
        Ok(())
    }

    pub fn relink_source_file(&self, id: &str, new_route: &str) -> Result<()> {
        let now = chrono_now_iso();
        let new_file_name = Path::new(new_route)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("archivo.csv");

        let size = fs::metadata(new_route).ok().map(|m| m.len() as i64);

        self.conn.execute(
            "UPDATE source_files 
             SET source_route = ?1, original_file_name = ?2, file_size = ?3, last_seen_at = ?4 
             WHERE id = ?5",
            params![new_route, new_file_name, size, now, id],
        )?;
        Ok(())
    }

    pub fn delete_source_file(&self, id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM source_files WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn clean_missing_source_files(&self) -> Result<usize> {
        let all_files = self.get_source_files(None)?;
        let mut removed_count = 0;

        for file in all_files {
            if !file.is_available {
                self.delete_source_file(&file.id)?;
                removed_count += 1;
            }
        }

        Ok(removed_count)
    }

    pub fn clear_all_source_files(&self) -> Result<()> {
        self.conn.execute("DELETE FROM source_files", [])?;
        Ok(())
    }

    pub fn get_system_default_categories() -> Vec<DimensionCategory> {
        vec![
            // Statuses
            DimensionCategory {
                id: "status-nuevo".into(),
                dimension: "status".into(),
                match_value: "nuevo".into(),
                display_name: "Nuevo".into(),
                color_hex: "#38BDF8".into(),
                is_conversion: false,
                sort_order: 1,
                is_system_default: true,
            },
            DimensionCategory {
                id: "status-contactado".into(),
                dimension: "status".into(),
                match_value: "contactado".into(),
                display_name: "Contactado".into(),
                color_hex: "#A855F7".into(),
                is_conversion: false,
                sort_order: 2,
                is_system_default: true,
            },
            DimensionCategory {
                id: "status-cotizado".into(),
                dimension: "status".into(),
                match_value: "cotizado".into(),
                display_name: "Cotizado".into(),
                color_hex: "#F97316".into(),
                is_conversion: false,
                sort_order: 3,
                is_system_default: true,
            },
            DimensionCategory {
                id: "status-compra".into(),
                dimension: "status".into(),
                match_value: "compra".into(),
                display_name: "Compra".into(),
                color_hex: "#22C55E".into(),
                is_conversion: true,
                sort_order: 4,
                is_system_default: true,
            },
            DimensionCategory {
                id: "status-seguimiento".into(),
                dimension: "status".into(),
                match_value: "en seguimiento".into(),
                display_name: "En seguimiento".into(),
                color_hex: "#06B6D4".into(),
                is_conversion: false,
                sort_order: 5,
                is_system_default: true,
            },
            DimensionCategory {
                id: "status-sin-respuesta".into(),
                dimension: "status".into(),
                match_value: "sin respuesta".into(),
                display_name: "Sin respuesta".into(),
                color_hex: "#EF4444".into(),
                is_conversion: false,
                sort_order: 6,
                is_system_default: true,
            },
            DimensionCategory {
                id: "status-en-espera".into(),
                dimension: "status".into(),
                match_value: "en espera".into(),
                display_name: "En espera".into(),
                color_hex: "#EAB308".into(),
                is_conversion: false,
                sort_order: 7,
                is_system_default: true,
            },
            DimensionCategory {
                id: "status-sin-estatus".into(),
                dimension: "status".into(),
                match_value: "sin estatus".into(),
                display_name: "Sin estatus".into(),
                color_hex: "#9CA3AF".into(),
                is_conversion: false,
                sort_order: 8,
                is_system_default: true,
            },
            // Priorities
            DimensionCategory {
                id: "prio-baja".into(),
                dimension: "priority".into(),
                match_value: "baja".into(),
                display_name: "Baja".into(),
                color_hex: "#9CA3AF".into(),
                is_conversion: false,
                sort_order: 1,
                is_system_default: true,
            },
            DimensionCategory {
                id: "prio-media".into(),
                dimension: "priority".into(),
                match_value: "media".into(),
                display_name: "Media".into(),
                color_hex: "#22C55E".into(),
                is_conversion: false,
                sort_order: 2,
                is_system_default: true,
            },
            DimensionCategory {
                id: "prio-alta".into(),
                dimension: "priority".into(),
                match_value: "alta".into(),
                display_name: "Alta".into(),
                color_hex: "#EAB308".into(),
                is_conversion: false,
                sort_order: 3,
                is_system_default: true,
            },
            DimensionCategory {
                id: "prio-urgente".into(),
                dimension: "priority".into(),
                match_value: "urgente".into(),
                display_name: "Urgente".into(),
                color_hex: "#EF4444".into(),
                is_conversion: false,
                sort_order: 4,
                is_system_default: true,
            },
            DimensionCategory {
                id: "prio-nula".into(),
                dimension: "priority".into(),
                match_value: "nula".into(),
                display_name: "Nula".into(),
                color_hex: "#111827".into(),
                is_conversion: false,
                sort_order: 5,
                is_system_default: true,
            },
            // Sources
            DimensionCategory {
                id: "source-whatsapp".into(),
                dimension: "source".into(),
                match_value: "whatsapp".into(),
                display_name: "WhatsApp".into(),
                color_hex: "#22C55E".into(),
                is_conversion: false,
                sort_order: 1,
                is_system_default: true,
            },
            DimensionCategory {
                id: "source-facebook".into(),
                dimension: "source".into(),
                match_value: "facebook".into(),
                display_name: "Facebook".into(),
                color_hex: "#1877F2".into(),
                is_conversion: false,
                sort_order: 2,
                is_system_default: true,
            },
            DimensionCategory {
                id: "source-instagram".into(),
                dimension: "source".into(),
                match_value: "instagram".into(),
                display_name: "Instagram".into(),
                color_hex: "#E1306C".into(),
                is_conversion: false,
                sort_order: 3,
                is_system_default: true,
            },
            DimensionCategory {
                id: "source-web".into(),
                dimension: "source".into(),
                match_value: "web".into(),
                display_name: "Web".into(),
                color_hex: "#111827".into(),
                is_conversion: false,
                sort_order: 4,
                is_system_default: true,
            },
            DimensionCategory {
                id: "source-organico".into(),
                dimension: "source".into(),
                match_value: "organico".into(),
                display_name: "Orgánico".into(),
                color_hex: "#FDE68A".into(),
                is_conversion: false,
                sort_order: 5,
                is_system_default: true,
            },
            // Mediums
            DimensionCategory {
                id: "medium-organico".into(),
                dimension: "medium".into(),
                match_value: "organico".into(),
                display_name: "Orgánico".into(),
                color_hex: "#22C55E".into(),
                is_conversion: false,
                sort_order: 1,
                is_system_default: true,
            },
            DimensionCategory {
                id: "medium-campana".into(),
                dimension: "medium".into(),
                match_value: "campana".into(),
                display_name: "Campaña".into(),
                color_hex: "#F97316".into(),
                is_conversion: false,
                sort_order: 2,
                is_system_default: true,
            },
            DimensionCategory {
                id: "medium-referido".into(),
                dimension: "medium".into(),
                match_value: "referido".into(),
                display_name: "Referido".into(),
                color_hex: "#A855F7".into(),
                is_conversion: false,
                sort_order: 3,
                is_system_default: true,
            },
            DimensionCategory {
                id: "medium-prospeccion".into(),
                dimension: "medium".into(),
                match_value: "prospeccion".into(),
                display_name: "Prospección".into(),
                color_hex: "#06B6D4".into(),
                is_conversion: false,
                sort_order: 4,
                is_system_default: true,
            },
        ]
    }
}

fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let d = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{:x}", d)
}

fn chrono_now_iso() -> String {
    // Basic standard ISO string representation
    let now = std::time::SystemTime::now();
    let duration = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    format!("timestamp-{}", duration.as_secs())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn test_source_files_lifecycle() {
        let db = Database::new_in_memory().expect("failed to create db");

        let temp = NamedTempFile::with_suffix(".csv").expect("create temp");
        let path = temp.path().to_string_lossy().to_string();

        // 1. Add source file
        let added = db
            .add_source_file(&path, "clientes_2026.csv", Some("Leads Q4"), Some(1024))
            .expect("add source");
        assert_eq!(added.original_file_name, "clientes_2026.csv");
        assert_eq!(added.alias, Some("Leads Q4".into()));
        assert!(added.is_available);

        // 2. List source files
        let list = db.get_source_files(None).expect("get all");
        assert_eq!(list.len(), 1);

        // 3. Search by alias
        let search = db.get_source_files(Some("Leads")).expect("search");
        assert_eq!(search.len(), 1);

        // 4. Update alias
        db.update_source_file_alias(&added.id, Some("Leads Finales"))
            .expect("update alias");
        let updated = db.get_source_files(None).expect("get updated");
        assert_eq!(updated[0].alias, Some("Leads Finales".into()));

        // 5. Relink to another path
        let temp2 = NamedTempFile::with_suffix(".csv").expect("create temp 2");
        let path2 = temp2.path().to_string_lossy().to_string();
        db.relink_source_file(&added.id, &path2).expect("relink");
        let relinked = db.get_source_files(None).expect("get relinked");
        assert_eq!(relinked[0].source_route, path2);

        // 6. Delete reference
        db.delete_source_file(&added.id).expect("delete");
        let after_delete = db.get_source_files(None).expect("get empty");
        assert_eq!(after_delete.len(), 0);
    }
}
