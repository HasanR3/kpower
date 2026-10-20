use crate::backend::UpsBackend;
use crate::model::UpsSnapshot;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub const SNAPSHOT_EVENT: &str = "ups://snapshot";

pub fn spawn_poller(
    app: AppHandle,
    backend: impl UpsBackend + 'static,
    latest: Arc<Mutex<Option<UpsSnapshot>>>,
    interval: Duration,
) {
    let mut backend = backend;
    thread::spawn(move || loop {
        let snap = backend.read_snapshot();
        if let Ok(mut guard) = latest.lock() {
            *guard = Some(snap.clone());
        }
        let _ = app.emit(SNAPSHOT_EVENT, snap);
        thread::sleep(interval);
    });
}
