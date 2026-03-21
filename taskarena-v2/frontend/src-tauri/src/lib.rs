use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use tauri::Manager;

#[tauri::command]
fn get_backend_port() -> u16 {
    8765
}

#[cfg(dev)]
fn start_backend(app: &mut tauri::App) {
    *app.state::<Mutex<u16>>().lock().unwrap() = 8765;

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.eval("window.__BACKEND_PORT__ = 8765");
    }
}

#[cfg(not(dev))]
fn start_backend(app: &mut tauri::App) {
    let resource_dir = app
        .path()
        .resource_dir()
        .expect("failed to resolve the Tauri resource directory");
    let exe_name = format!("taskarena-backend{}", std::env::consts::EXE_SUFFIX);
    let backend_path = resource_dir.join("backend").join(exe_name);

    std::process::Command::new(&backend_path)
        .spawn()
        .unwrap_or_else(|error| {
            panic!(
                "failed to launch bundled backend at {}: {error}",
                backend_path.display()
            )
        });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(0u16))
        .on_page_load(|window, _| {
            let port = *window.state::<Mutex<u16>>().lock().unwrap();
            if port > 0 {
                let _ = window.eval(&format!("window.__BACKEND_PORT__ = {}", port));
            }
            let window = window.clone();
            thread::spawn(move || {
                thread::sleep(Duration::from_millis(50));
                let _ = window.show();
                let _ = window.set_focus();
            });
        })
        .setup(|app| {
            start_backend(app);
            if let Some(window) = app.get_webview_window("main") {
                thread::spawn(move || {
                    thread::sleep(Duration::from_millis(200));
                    let _ = window.show();
                    let _ = window.set_focus();
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_backend_port])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
