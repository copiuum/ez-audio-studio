// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Manager, Menu, MenuItem, Submenu, WindowEvent};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
use serde_json;
use std::path::PathBuf;

mod audio_types;
mod audio_loader;
mod audio_processor;

use audio_types::{AudioBuffer, AdvancedAudioEffects};
use audio_loader::AudioLoader;
use audio_processor::AudioProcessor;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
async fn open_file_dialog(app: AppHandle) -> Result<Vec<String>, String> {
    let file_paths = app
        .dialog()
        .file()
        .add_filter("Audio Files", &["mp3", "wav", "ogg", "flac", "m4a", "aac"])
        .add_filter("All Files", &["*"])
        .pick_files()
        .await
        .map_err(|e| e.to_string())?;

    match file_paths {
        Some(paths) => Ok(paths.iter().map(|p| p.to_string_lossy().to_string()).collect()),
        None => Ok(vec![]),
    }
}

#[tauri::command]
async fn save_file_dialog(app: AppHandle, default_name: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = app
        .dialog()
        .file()
        .add_filter("WAV Files", &["wav"])
        .add_filter("All Files", &["*"]);

    if let Some(name) = default_name {
        dialog = dialog.set_file_name(&name);
    } else {
        dialog = dialog.set_file_name("processed-audio.wav");
    }

    let file_path = dialog
        .save_file()
        .await
        .map_err(|e| e.to_string())?;

    Ok(file_path.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
async fn load_audio_file(file_path: String) -> Result<AudioBuffer, String> {
    AudioLoader::load_audio_file(&file_path)
        .map_err(|e| format!("Failed to load audio file: {}", e))
}

#[tauri::command]
async fn process_audio_with_effects(
    audio_buffer: AudioBuffer,
    effects: AdvancedAudioEffects,
) -> Result<AudioBuffer, String> {
    AudioProcessor::process_audio(audio_buffer, &effects)
        .map_err(|e| format!("Failed to process audio: {}", e))
}

#[tauri::command]
async fn save_audio_file(
    audio_buffer: AudioBuffer,
    output_path: String,
) -> Result<(), String> {
    AudioLoader::save_as_wav(&audio_buffer, &output_path)
        .map_err(|e| format!("Failed to save audio file: {}", e))
}

#[tauri::command]
async fn get_audio_analysis(audio_buffer: AudioBuffer) -> Result<serde_json::Value, String> {
    let mut peak_levels = Vec::new();
    let mut rms_levels = Vec::new();
    
    for channel in &audio_buffer.channels {
        let peak = channel.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
        let rms = (channel.iter().map(|s| s * s).sum::<f32>() / channel.len() as f32).sqrt();
        
        peak_levels.push(peak);
        rms_levels.push(rms);
    }
    
    let analysis = serde_json::json!({
        "peak_levels": peak_levels,
        "rms_levels": rms_levels,
        "sample_rate": audio_buffer.sample_rate,
        "channels": audio_buffer.channels.len(),
        "duration": audio_buffer.duration,
        "samples_per_channel": if !audio_buffer.channels.is_empty() { 
            audio_buffer.channels[0].len() 
        } else { 
            0 
        }
    });
    
    Ok(analysis)
}

fn create_menu() -> Menu {
    let file_menu = Submenu::new(
        "File",
        Menu::new()
            .add_item(MenuItem::new("Open Audio File", "open_file", Some("CmdOrCtrl+O")))
            .add_item(MenuItem::new("Export Audio", "export_file", Some("CmdOrCtrl+S")))
            .add_separator()
            .add_item(MenuItem::new("Quit", "quit", Some(if cfg!(target_os = "macos") { "Cmd+Q" } else { "Ctrl+Q" }))),
    );

    let edit_menu = Submenu::new(
        "Edit",
        Menu::new()
            .add_item(MenuItem::new("Undo", "undo", Some("CmdOrCtrl+Z")))
            .add_item(MenuItem::new("Redo", "redo", Some("CmdOrCtrl+Shift+Z")))
            .add_separator()
            .add_item(MenuItem::new("Cut", "cut", Some("CmdOrCtrl+X")))
            .add_item(MenuItem::new("Copy", "copy", Some("CmdOrCtrl+C")))
            .add_item(MenuItem::new("Paste", "paste", Some("CmdOrCtrl+V"))),
    );

    let view_menu = Submenu::new(
        "View",
        Menu::new()
            .add_item(MenuItem::new("Reload", "reload", Some("CmdOrCtrl+R")))
            .add_item(MenuItem::new("Force Reload", "force_reload", Some("CmdOrCtrl+Shift+R")))
            .add_item(MenuItem::new("Toggle Developer Tools", "toggle_devtools", Some("F12")))
            .add_separator()
            .add_item(MenuItem::new("Reset Zoom", "reset_zoom", Some("CmdOrCtrl+0")))
            .add_item(MenuItem::new("Zoom In", "zoom_in", Some("CmdOrCtrl+Plus")))
            .add_item(MenuItem::new("Zoom Out", "zoom_out", Some("CmdOrCtrl+-")))
            .add_separator()
            .add_item(MenuItem::new("Toggle Fullscreen", "toggle_fullscreen", Some("F11"))),
    );

    let window_menu = Submenu::new(
        "Window",
        Menu::new()
            .add_item(MenuItem::new("Minimize", "minimize", None))
            .add_item(MenuItem::new("Close", "close", Some("CmdOrCtrl+W"))),
    );

    Menu::new()
        .add_submenu(file_menu)
        .add_submenu(edit_menu)
        .add_submenu(view_menu)
        .add_submenu(window_menu)
}

fn main() {
    let menu = create_menu();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .menu(menu)
        .on_menu_event(|app, event| {
            let window = app.get_webview_window("main").unwrap();
            
            match event.id().as_ref() {
                "open_file" => {
                    let _ = window.emit("menu-open-file", ());
                }
                "export_file" => {
                    let _ = window.emit("menu-export-file", ());
                }
                "quit" => {
                    app.exit(0);
                }
                "reload" => {
                    let _ = window.reload();
                }
                "force_reload" => {
                    let _ = window.reload();
                }
                "toggle_devtools" => {
                    if window.is_devtools_open() {
                        let _ = window.close_devtools();
                    } else {
                        let _ = window.open_devtools();
                    }
                }
                "reset_zoom" => {
                    let _ = window.zoom(1.0);
                }
                "zoom_in" => {
                    let _ = window.zoom(1.1);
                }
                "zoom_out" => {
                    let _ = window.zoom(0.9);
                }
                "toggle_fullscreen" => {
                    let _ = window.set_fullscreen(!window.is_fullscreen().unwrap_or(false));
                }
                "minimize" => {
                    let _ = window.minimize();
                }
                "close" => {
                    let _ = window.close();
                }
                _ => {}
            }
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                window.app_handle().exit(0);
            }
        })
        .invoke_handler(tauri::generate_handler![
            open_file_dialog, 
            save_file_dialog, 
            load_audio_file, 
            process_audio_with_effects, 
            save_audio_file,
            get_audio_analysis
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}