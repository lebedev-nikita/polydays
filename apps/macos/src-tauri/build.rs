fn main() {
    println!("cargo:rerun-if-env-changed=EXPO_PUBLIC_API_URL");
    let url = std::env::var("EXPO_PUBLIC_API_URL")
        .expect("EXPO_PUBLIC_API_URL is required for desktop builds");
    assert!(
        url.starts_with("https://"),
        "Desktop releases require HTTPS"
    );
    println!(
        "cargo:rustc-env=POLYDAYS_API_URL={}",
        url.trim_end_matches('/')
    );
    tauri_build::build()
}
