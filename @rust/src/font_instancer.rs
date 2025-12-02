//! Font Instancer - Generate static font instances from variable fonts.
//!
//! Uses the allsorts library to create static instances from variable fonts
//! with specified axis values (e.g., weight, width).

use wasm_bindgen::prelude::*;
use allsorts::binary::read::ReadScope;
use allsorts::font_data::FontData;
use allsorts::tables::variable_fonts::fvar::FvarTable;
use allsorts::tables::FontTableProvider;
use allsorts::tables::Fixed;
use allsorts::tag;
use allsorts::variations::instance;
use std::collections::HashMap;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

fn console_log(msg: &str) {
    log(msg);
}

/// Parse variable settings string (e.g., "wght" 625, "wdth" 25)
/// Returns a map of axis tag to value
fn parse_variable_settings(settings: &str) -> Result<HashMap<u32, f32>, String> {
    let mut result = HashMap::new();
    
    // Remove quotes and split by comma
    let cleaned = settings.replace('"', "").replace('\'', "");
    let parts: Vec<&str> = cleaned.split(',').collect();
    
    for part in parts {
        let trimmed = part.trim();
        if trimmed.is_empty() {
            continue;
        }
        
        // Split by whitespace to get tag and value
        let tokens: Vec<&str> = trimmed.split_whitespace().collect();
        if tokens.len() != 2 {
            return Err(format!("Invalid variable setting format: {}", trimmed));
        }
        
        let tag_str = tokens[0].trim();
        let value_str = tokens[1].trim();
        
        if tag_str.len() != 4 {
            return Err(format!("Axis tag must be 4 characters: {}", tag_str));
        }
        
        // Convert tag string to u32 (4 bytes)
        let tag_bytes = tag_str.as_bytes();
        if tag_bytes.len() != 4 {
            return Err(format!("Invalid axis tag: {}", tag_str));
        }
        let tag = u32::from_be_bytes([tag_bytes[0], tag_bytes[1], tag_bytes[2], tag_bytes[3]]);
        
        let value: f32 = value_str.parse()
            .map_err(|_| format!("Invalid axis value: {}", value_str))?;
        
        result.insert(tag, value);
    }
    
    Ok(result)
}

/// Generate a static font instance from a variable font
/// 
/// # Arguments
/// * `font_data` - The variable font file as bytes
/// * `variable_settings` - CSS-like variable settings string (e.g., "wght" 625, "wdth" 25)
/// 
/// # Returns
/// Static font instance as bytes (same format as input)
#[wasm_bindgen]
pub fn generate_static_font_instance(
    font_data: &[u8],
    variable_settings: &str,
) -> Result<Vec<u8>, String> {
    console_log(&format!("Generating static instance with settings: {}", variable_settings));
    
    // Parse variable settings
    let settings_map = parse_variable_settings(variable_settings)?;
    
    if settings_map.is_empty() {
        return Err("No variable settings provided".to_string());
    }
    
    // Read font data (handles TTF, OTF, WOFF, WOFF2 automatically)
    let scope = ReadScope::new(font_data);
    let font_file = scope.read::<FontData>()
        .map_err(|e| format!("Failed to read font data: {:?}", e))?;
    
    // Get table provider (use first font in collection if multiple)
    let provider = font_file.table_provider(0)
        .map_err(|e| format!("Failed to get table provider: {:?}", e))?;
    
    console_log("Font loaded successfully");
    
    // Check if font has fvar table (variable font)
    let fvar_data = match provider.table_data(tag::FVAR) {
        Ok(Some(data)) => data,
        Ok(None) => return Err("Font does not appear to be a variable font (no fvar table)".to_string()),
        Err(e) => return Err(format!("Failed to read fvar table: {:?}", e)),
    };
    
    // Read fvar table
    let fvar_scope = ReadScope::new(&fvar_data);
    let fvar = fvar_scope.read::<FvarTable>()
        .map_err(|e| format!("Failed to read fvar table: {:?}", e))?;
    
    // Build coordinates array matching the axes in fvar
    let axes: Vec<_> = fvar.axes().collect();
    let mut coordinates = Vec::new();
    let mut axis_info = Vec::new();
    
    for axis in &axes {
        let axis_tag = axis.axis_tag;
        
        // Get value from settings, or use default
        let value = settings_map.get(&axis_tag)
            .copied()
            .unwrap_or_else(|| f32::from(axis.default_value));
        
        // Clamp to min/max
        let min_val = f32::from(axis.min_value);
        let max_val = f32::from(axis.max_value);
        let clamped_value = value.max(min_val).min(max_val);
        
        coordinates.push(Fixed::from(clamped_value));
        axis_info.push(format!("axis={} value={} (range: {}-{}, default: {})", 
            axis_tag, clamped_value, min_val, max_val, f32::from(axis.default_value)));
    }
    
    console_log(&format!("Font has {} axis/axes: {}", axes.len(), axis_info.join(", ")));
    console_log(&format!("Using coordinates: {:?}", 
        coordinates.iter().map(|c| f32::from(*c)).collect::<Vec<_>>()));
    
    // Check if font supports instancing (needs gvar or CFF2 table)
    let has_gvar = match provider.table_data(tag::GVAR) {
        Ok(Some(_)) => true,
        _ => false,
    };
    let has_cff2 = match provider.table_data(tag::CFF2) {
        Ok(Some(_)) => true,
        _ => false,
    };
    
    if !has_gvar && !has_cff2 {
        return Err("Font does not support instancing: requires gvar (TrueType) or CFF2 (OpenType) table".to_string());
    }
    
    console_log(&format!("Font supports instancing (gvar: {}, CFF2: {})", has_gvar, has_cff2));
    
    // Generate static instance using allsorts variations API
    match instance(&provider, &coordinates) {
        Ok((static_font_data, _tuple)) => {
            console_log(&format!("Successfully generated static instance ({} bytes, was {} bytes)", 
                static_font_data.len(), font_data.len()));
            Ok(static_font_data)
        }
        Err(e) => {
            let error_msg = format!("Failed to generate static instance: {:?}. Note: Font must have gvar (TrueType) or CFF2 (OpenType) table.", e);
            console_log(&error_msg);
            Err(error_msg)
        }
    }
}

