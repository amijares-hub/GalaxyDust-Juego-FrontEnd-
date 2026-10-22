use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

static DEBUGGER_DETECTED: AtomicBool = AtomicBool::new(false);

/// Inicia un hilo secundario que verifica periódicamente si hay un debugger adjunto
pub fn start_anti_debug_monitor() {
    std::thread::Builder::new()
        .name("anti-debug-monitor".into())
        .spawn(|| loop {
            std::thread::sleep(Duration::from_secs(3));
            if is_debugger_present() {
                DEBUGGER_DETECTED.store(true, Ordering::SeqCst);
                eprintln!("[SECURITY] Depurador detectado. Terminando proceso por seguridad...");
                std::process::exit(1);
            }
        })
        .expect("No se pudo iniciar el monitor anti-debug");
}

fn is_debugger_present() -> bool {
    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::System::Diagnostics::Debug::IsDebuggerPresent;
        unsafe { IsDebuggerPresent() != 0 }
    }
    #[cfg(not(target_os = "windows"))]
    {
        false
    }
}
