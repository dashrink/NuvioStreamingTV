#!/usr/bin/env rust
//! Generates UniFFI bindings for Kotlin and Swift
//!
//! Usage:
//!   cargo run --bin gen-bindings kotlin
//!   cargo run --bin gen-bindings swift

use std::process::{Command, exit};
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        eprintln!("Usage: cargo run --bin gen-bindings <kotlin|swift>");
        exit(1);
    }

    let language = &args[1];

    if language != "kotlin" && language != "swift" {
        eprintln!("Error: Language must be 'kotlin' or 'swift', got: {}", language);
        exit(1);
    }

    // Path to the compiled library
    let lib_path = "../target/debug/libnuvio_core.so";
    let out_dir = format!("../target/bindings/{}", language);

    println!("Generating {} bindings...", language);
    println!("Library: {}", lib_path);
    println!("Output directory: {}", out_dir);

    let status = Command::new("uniffi-bindgen")
        .arg("generate")
        .arg("--library")
        .arg(lib_path)
        .arg("--language")
        .arg(language)
        .arg("--out-dir")
        .arg(&out_dir)
        .status();

    match status {
        Ok(status) => {
            if status.success() {
                println!("✓ Successfully generated {} bindings in {}", language, out_dir);
                exit(0);
            } else {
                eprintln!("✗ uniffi-bindgen exited with status: {}", status);
                exit(1);
            }
        }
        Err(e) => {
            eprintln!("✗ Failed to run uniffi-bindgen: {}", e);
            eprintln!("Make sure uniffi-bindgen is installed: cargo install uniffi-bindgen");
            exit(1);
        }
    }
}
