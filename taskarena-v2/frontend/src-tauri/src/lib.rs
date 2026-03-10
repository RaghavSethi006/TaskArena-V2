use std::sync::Mutex;
use tauri::{AppHandle, Manager};

#[tauri::command]
fn get_backend_port(app: AppHandle) -> u16 {
    *app.state::<Mutex<u16>>().lock().unwrap()
}

// ─── DEV MODE ────────────────────────────────────────────────────────────────
// In debug builds, assume uvicorn is already running on port 8765.
// Just inject the port into the window — no binary needed.
// Run backend separately: uvicorn backend.main:app --port 8765 --reload
#[cfg(debug_assertions)]
fn start_backend(app: &mut tauri::App) {
    *app.state::<Mutex<u16>>().lock().unwrap() = 8765;

    // Inject immediately — window may not be ready yet so also set on page load
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.eval("window.__BACKEND_PORT__ = 8765");
    }
}

// ─── RELEASE MODE ────────────────────────────────────────────────────────────
// In release builds, spawn the PyInstaller sidecar binary.
// The sidecar picks a free port, prints "READY port=XXXX", and we inject it.
#[cfg(not(debug_assertions))]
fn start_backend(app: &mut tauri::App) {
    use tauri_plugin_shell::process::CommandChild;
    use tauri_plugin_shell::ShellExt;

    struct SidecarState(Mutex<Option<CommandChild>>);

    let handle = app.handle().clone();

    let sidecar_command = app
        .shell()
        .sidecar("taskarena-backend")
        .expect("sidecar binary not found — run PyInstaller first")
        .args(["--port", "0"]);

    let (mut rx, child) = sidecar_command
        .spawn()
        .expect("failed to spawn sidecar binary");

    // Store child so Tauri kills it on app exit
    app.manage(SidecarState(Mutex::new(Some(child))));

    tauri::async_runtime::spawn(async move {
        use tauri_plugin_shell::process::CommandEvent;

        while let Some(event) = rx.recv().await {
            if let CommandEvent::Stdout(line_bytes) = event {
                let line = String::from_utf8_lossy(&line_bytes);
                if let Some(raw_port) = line.trim().strip_prefix("READY port=") {
                    if let Ok(port) = raw_port.parse::<u16>() {
                        *handle.state::<Mutex<u16>>().lock().unwrap() = port;

                        if let Some(window) = handle.get_webview_window("main") {
                            let _ = window.eval(&format!(
                                "window.__BACKEND_PORT__ = {}",
                                port
                            ));
                        }

                        println!("Backend sidecar ready on port {}", port);
                    }
                }
            }
        }
    });
}

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(0u16))
        // Re-inject port on every page load (handles hot reloads in dev)
        .on_page_load(|window, _| {
            let port = *window.state::<Mutex<u16>>().lock().unwrap();
            if port > 0 {
                let _ = window.eval(&format!("window.__BACKEND_PORT__ = {}", port));
            }
        })
        .setup(|app| {
            start_backend(app);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_backend_port])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}