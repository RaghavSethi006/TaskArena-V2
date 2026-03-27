use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use tauri::Manager;

const BACKEND_PORT: u16 = 8765;

#[tauri::command]
fn get_backend_port() -> u16 {
    BACKEND_PORT
}

fn set_backend_port(app: &tauri::App, port: u16) {
    *app.state::<Mutex<u16>>().lock().unwrap() = port;

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.eval(&format!("window.__BACKEND_PORT__ = {}", port));
    }
}

#[cfg(dev)]
fn start_backend(app: &mut tauri::App) {
    set_backend_port(app, BACKEND_PORT);
}

#[cfg(not(dev))]
fn start_backend(app: &mut tauri::App) {
    use std::fs::{self, OpenOptions};
    use std::path::Path;
    use std::process::{Command, Stdio};

    fn open_log_file(path: &Path) -> std::fs::File {
        OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .unwrap_or_else(|error| {
                panic!(
                    "failed to open backend log file at {}: {error}",
                    path.display()
                )
            })
    }

    set_backend_port(app, BACKEND_PORT);

    let resource_dir = app
        .path()
        .resource_dir()
        .expect("failed to resolve the Tauri resource directory");
    let backend_dir = resource_dir.join("backend");
    let runtime_dir = app
        .path()
        .app_local_data_dir()
        .expect("failed to resolve the local app data directory")
        .join("backend");

    fs::create_dir_all(&runtime_dir).unwrap_or_else(|error| {
        panic!(
            "failed to create backend runtime directory at {}: {error}",
            runtime_dir.display()
        )
    });

    if !backend_dir.exists() {
        panic!(
            "bundled backend resources were not found at {}",
            backend_dir.display()
        );
    }

    let log_path = runtime_dir.join("backend.log");
    let log_file = open_log_file(&log_path);
    let python_exe = backend_dir.join("python.exe");

    if python_exe.exists() {
        Command::new(&python_exe)
            .arg("sidecar/main.py")
            .arg("--port")
            .arg(BACKEND_PORT.to_string())
            .current_dir(&backend_dir)
            .env("TASKARENA_RUNTIME_DIR", &runtime_dir)
            .env("TASKARENA_RESOURCE_DIR", &backend_dir)
            .stdin(Stdio::null())
            .stdout(Stdio::from(
                log_file
                    .try_clone()
                    .expect("failed to clone backend log handle"),
            ))
            .stderr(Stdio::from(log_file))
            .spawn()
            .unwrap_or_else(|error| {
                panic!(
                    "failed to launch bundled Python backend at {}: {error}",
                    python_exe.display()
                )
            });
        return;
    }

    let backend_exe_name = if cfg!(target_os = "windows") {
        "taskarena-backend.exe"
    } else {
        "taskarena-backend"
    };
    let backend_exe = backend_dir.join(backend_exe_name);
    let log_file = open_log_file(&log_path);

    Command::new(&backend_exe)
        .arg("--port")
        .arg(BACKEND_PORT.to_string())
        .current_dir(&backend_dir)
        .env("TASKARENA_RUNTIME_DIR", &runtime_dir)
        .env("TASKARENA_RESOURCE_DIR", &backend_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::from(
            log_file
                .try_clone()
                .expect("failed to clone backend log handle"),
        ))
        .stderr(Stdio::from(log_file))
        .spawn()
        .unwrap_or_else(|error| {
            panic!(
                "failed to launch bundled backend at {}: {error}",
                backend_exe.display()
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
