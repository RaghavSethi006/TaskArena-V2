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
    use std::process::{Command, Output, Stdio};

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

    fn extract_backend_bundle(bundle_zip: &Path, output_dir: &Path) {
        fn command_failed(command_name: &str, output: Output, bundle_zip: &Path, output_dir: &Path) -> ! {
            panic!(
                "failed to extract backend bundle with {} from {} to {}: {}",
                command_name,
                bundle_zip.display(),
                output_dir.display(),
                String::from_utf8_lossy(&output.stderr)
            );
        }

        if output_dir.exists() {
            fs::remove_dir_all(output_dir).unwrap_or_else(|error| {
                panic!(
                    "failed to clear extracted backend bundle at {}: {error}",
                    output_dir.display()
                )
            });
        }
        fs::create_dir_all(output_dir).unwrap_or_else(|error| {
            panic!(
                "failed to create extracted backend bundle directory at {}: {error}",
                output_dir.display()
            )
        });

        let output = if cfg!(target_os = "windows") {
            let zip_path = bundle_zip.display().to_string().replace('\'', "''");
            let output_path = output_dir.display().to_string().replace('\'', "''");
            Command::new("powershell.exe")
                .args([
                    "-NoProfile",
                    "-NonInteractive",
                    "-Command",
                    &format!(
                        "Expand-Archive -LiteralPath '{}' -DestinationPath '{}' -Force",
                        zip_path, output_path
                    ),
                ])
                .output()
                .unwrap_or_else(|error| {
                    panic!(
                        "failed to run PowerShell extraction for backend bundle at {}: {error}",
                        bundle_zip.display()
                    )
                })
        } else if cfg!(target_os = "macos") {
            Command::new("ditto")
                .args(["-x", "-k"])
                .arg(bundle_zip)
                .arg(output_dir)
                .output()
                .unwrap_or_else(|error| {
                    panic!(
                        "failed to run ditto extraction for backend bundle at {}: {error}",
                        bundle_zip.display()
                    )
                })
        } else {
            Command::new("unzip")
                .arg("-o")
                .arg(bundle_zip)
                .args(["-d"])
                .arg(output_dir)
                .output()
                .unwrap_or_else(|error| {
                    panic!(
                        "failed to run unzip extraction for backend bundle at {}: {error}",
                        bundle_zip.display()
                    )
                })
        };

        if !output.status.success() {
            let command_name = if cfg!(target_os = "windows") {
                "powershell Expand-Archive"
            } else if cfg!(target_os = "macos") {
                "ditto"
            } else {
                "unzip"
            };
            command_failed(command_name, output, bundle_zip, output_dir);
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;

            let backend_executable = output_dir.join("taskarena-backend");
            if backend_executable.exists() {
                fs::set_permissions(&backend_executable, fs::Permissions::from_mode(0o755))
                    .unwrap_or_else(|error| {
                        panic!(
                            "failed to mark extracted backend executable at {}: {error}",
                            backend_executable.display()
                        )
                    });
            }
        }
    }

    set_backend_port(app, BACKEND_PORT);

    let resource_dir = app
        .path()
        .resource_dir()
        .expect("failed to resolve the Tauri resource directory");
    let bundled_backend_zip = resource_dir.join("backend").join("backend-bundle.zip");
    let runtime_dir = app
        .path()
        .app_local_data_dir()
        .expect("failed to resolve the local app data directory")
        .join("backend");
    let extracted_backend_dir = runtime_dir.join("bundle");
    let extracted_bundle_stamp = extracted_backend_dir.join(".bundle-size");

    fs::create_dir_all(&runtime_dir).unwrap_or_else(|error| {
        panic!(
            "failed to create backend runtime directory at {}: {error}",
            runtime_dir.display()
        )
    });

    if !bundled_backend_zip.exists() {
        panic!(
            "bundled backend archive was not found at {}",
            bundled_backend_zip.display()
        );
    }

    let expected_backend_entry = if cfg!(target_os = "windows") {
        extracted_backend_dir.join("python.exe")
    } else {
        extracted_backend_dir.join("taskarena-backend")
    };
    let bundle_size = fs::metadata(&bundled_backend_zip)
        .unwrap_or_else(|error| {
            panic!(
                "failed to read backend bundle archive metadata at {}: {error}",
                bundled_backend_zip.display()
            )
        })
        .len();
    let extracted_bundle_size = fs::read_to_string(&extracted_bundle_stamp)
        .ok()
        .and_then(|value| value.trim().parse::<u64>().ok());

    if !expected_backend_entry.exists()
        || !extracted_backend_dir.join("sidecar").join("main.py").exists()
        || extracted_bundle_size != Some(bundle_size)
    {
        extract_backend_bundle(&bundled_backend_zip, &extracted_backend_dir);
        fs::write(&extracted_bundle_stamp, bundle_size.to_string()).unwrap_or_else(|error| {
            panic!(
                "failed to write backend bundle stamp at {}: {error}",
                extracted_bundle_stamp.display()
            )
        });
    }

    let log_path = runtime_dir.join("backend.log");
    let log_file = open_log_file(&log_path);
    let python_exe = extracted_backend_dir.join("python.exe");

    if python_exe.exists() {
        Command::new(&python_exe)
            .arg("sidecar/main.py")
            .arg("--port")
            .arg(BACKEND_PORT.to_string())
            .current_dir(&extracted_backend_dir)
            .env("TASKARENA_RUNTIME_DIR", &runtime_dir)
            .env("TASKARENA_RESOURCE_DIR", &extracted_backend_dir)
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
    let backend_exe = extracted_backend_dir.join(backend_exe_name);
    let log_file = open_log_file(&log_path);

    Command::new(&backend_exe)
        .arg("--port")
        .arg(BACKEND_PORT.to_string())
        .current_dir(&extracted_backend_dir)
        .env("TASKARENA_RUNTIME_DIR", &runtime_dir)
        .env("TASKARENA_RESOURCE_DIR", &extracted_backend_dir)
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
