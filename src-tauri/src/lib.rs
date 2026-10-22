use tauri::Manager;

mod security {
    pub mod anti_debug;
    pub mod process_monitor;
    pub mod integrity;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Ejecutar monitores de seguridad SOLAMENTE en Windows
    #[cfg(target_os = "windows")]
    {
        security::anti_debug::start_anti_debug_monitor();
        security::process_monitor::start_process_monitor();
    }

    // Verificación de integridad condicional para Desktop (omitida en mobile)
    #[cfg(not(mobile))]
    {
        if let Ok(hash) = security::integrity::calculate_exe_hash() {
            eprintln!("[SECURITY] Executable Fingerprint (SHA-256): {}", hash);

            let rt = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .expect("[SECURITY] No se pudo inicializar runtime de verificación");

            rt.block_on(async {
                match security::integrity::verify_with_supabase(&hash).await {
                    Ok(true) => eprintln!("[SECURITY] Binario verificado correctamente."),
                    Ok(false) => {
                        eprintln!("[SECURITY] ALERTA: Binario no registrado en Supabase.");
                        #[cfg(not(debug_assertions))]
                        std::process::exit(1);
                    }
                    Err(e) => eprintln!("[SECURITY] Advertencia al verificar hash: {}", e),
                }
            });
            // rt se destruye aquí antes de que Tauri cree su runtime
        }
    }

    let mut builder = tauri::Builder::default()
        .runtime(tauri_runtime_wry::Wry::default());

    // single-instance solo disponible en Desktop
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Si ya existe una instancia, enfocar su ventana en lugar de crashear
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
