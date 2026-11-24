use crate::infrastructure::database::Database;
use std::sync::Mutex;

pub struct AppState {
    pub db: Mutex<Database>,
}
