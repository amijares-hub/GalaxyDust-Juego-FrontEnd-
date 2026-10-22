use std::time::Duration;
use sysinfo::{ProcessesToUpdate, System};

const SUSPICIOUS_PROCESSES: &[&str] = &[
    "cheatengine", "x64dbg", "x32dbg", "ollydbg",
    "processhacker", "cheat engine", "idag", "ida64"
];

pub fn start_process_monitor() {
    std::thread::Builder::new()
        .name("process-monitor".into())
        .spawn(|| {
            let mut sys = System::new();
            loop {
                std::thread::sleep(Duration::from_secs(5));
                
                // En sysinfo v0.30+, refresh_processes requiere indicar qué procesos actualizar y limpiar extintos
                sys.refresh_processes(ProcessesToUpdate::All, true);
                
                for (_pid, process) in sys.processes() {
                    let name = process.name().to_string_lossy().to_lowercase();
                    for &suspicious in SUSPICIOUS_PROCESSES {
                        if name.contains(suspicious) {
                            eprintln!("[SECURITY] Herramienta sospechosa detectada: {}", name);
                            std::process::exit(1);
                        }
                    }
                }
            }
        })
        .expect("No se pudo iniciar el monitor de procesos");
}
