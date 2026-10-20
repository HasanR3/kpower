pub mod backend;
pub mod model;
pub mod poller;

use backend::SimulatorBackend;
use model::UpsSnapshot;
use poller::spawn_poller;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State,
};

struct LatestSnapshot(Arc<Mutex<Option<UpsSnapshot>>>);

#[tauri::command]
fn get_latest_snapshot(state: State<'_, LatestSnapshot>) -> Option<UpsSnapshot> {
    state.0.lock().ok().and_then(|g| g.clone())
}

#[tauri::command]
fn simulator_set_connected(connected: bool, state: State<'_, LatestSnapshot>) {
    let _ = (connected, state);
    // Real wiring: hold SimulatorBackend behind a mutex in a later pass.
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let latest = Arc::new(Mutex::new(None));
    let latest_for_setup = latest.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(LatestSnapshot(latest.clone()))
        .invoke_handler(tauri::generate_handler![
            get_latest_snapshot,
            simulator_set_connected
        ])
        .setup(move |app| {
            let handle = app.handle().clone();
            spawn_poller(
                handle,
                SimulatorBackend::new(1),
                latest_for_setup,
                Duration::from_secs(1),
            );

            let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("KPower")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
