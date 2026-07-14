use wasm_bindgen::prelude::*;
use allsorts::binary::read::ReadScope;
use allsorts::font_data::FontData;
use allsorts::tables::variable_fonts::fvar::FvarTable;
use allsorts::tables::FontTableProvider;
use allsorts::tables::Fixed;
use allsorts::tag;
use allsorts::variations::instance;
use std::collections::HashMap;
use read_fonts::types::Tag;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

fn console_log(msg: &str) {
    log(msg);
}

// ==================== Error Types ====================

#[derive(Debug, Clone)]
pub enum FontError {
    InvalidTag(String),
    InvalidAxisSetting(String),
    InvalidStylisticSet(String),
    NoStylisticSets,
    NoVariableSettings,
    NotVariableFont,
    InstancingNotSupported,
    FontParseError(String),
    FontCreationError(String),
    GsubError(String),
    GdefError(String),
    CmapError(String),
    InvalidNumericConversion(String),
    ArrayBoundsError(String),
    ArithmeticOverflow(String),
    InvalidFontData(String),
}

impl std::fmt::Display for FontError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FontError::InvalidTag(msg) => write!(f, "Invalid tag: {}", msg),
            FontError::InvalidAxisSetting(msg) => write!(f, "Invalid axis setting: {}", msg),
            FontError::InvalidStylisticSet(msg) => write!(f, "Invalid stylistic set: {}", msg),
            FontError::NoStylisticSets => write!(f, "No stylistic sets provided"),
            FontError::NoVariableSettings => write!(f, "No variable settings provided"),
            FontError::NotVariableFont => write!(f, "Not a variable font (no fvar table)"),
            FontError::InstancingNotSupported => write!(f, "Font doesn't support instancing (no gvar or CFF2)"),
            FontError::FontParseError(msg) => write!(f, "Failed to parse font: {}", msg),
            FontError::FontCreationError(msg) => write!(f, "Failed to create font: {}", msg),
            FontError::GsubError(msg) => write!(f, "GSUB error: {}", msg),
            FontError::GdefError(msg) => write!(f, "GDEF error: {}", msg),
            FontError::CmapError(msg) => write!(f, "CMAP error: {}", msg),
            FontError::InvalidNumericConversion(msg) => write!(f, "Invalid numeric conversion: {}", msg),
            FontError::ArrayBoundsError(msg) => write!(f, "Array bounds error: {}", msg),
            FontError::ArithmeticOverflow(msg) => write!(f, "Arithmetic overflow: {}", msg),
            FontError::InvalidFontData(msg) => write!(f, "Invalid font data: {}", msg),
        }
    }
}

impl From<FontError> for String {
    fn from(err: FontError) -> String {
        err.to_string()
    }
}

// ==================== Domain Types ====================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct FontTag(u32);

impl FontTag {
    pub fn from_str(s: &str) -> Result<Self, FontError> {
        let bytes = s.as_bytes();
        if bytes.len() != 4 {
            return Err(FontError::InvalidTag(format!("Tag must be 4 characters: {}", s)));
        }
        Ok(FontTag(u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]])))
    }
    
    /// Like from_str, but space-pads tags shorter than 4 bytes (CSS/OpenType
    /// semantics, matching the TS compiler's normalizeTag). Accepts 1–4 chars.
    pub fn from_str_padded(s: &str) -> Result<Self, FontError> {
        let src_bytes = s.as_bytes();
        if src_bytes.is_empty() || src_bytes.len() > 4 {
            return Err(FontError::InvalidTag(format!(
                "Feature tag must be 1-4 characters: {}", s
            )));
        }
        let mut bytes = [b' '; 4];
        bytes[..src_bytes.len()].copy_from_slice(src_bytes);
        Ok(FontTag(u32::from_be_bytes(bytes)))
    }

    pub fn value(&self) -> u32 {
        self.0
    }
}

impl TryFrom<&str> for FontTag {
    type Error = FontError;
    
    fn try_from(s: &str) -> Result<Self, Self::Error> {
        FontTag::from_str(s)
    }
}

#[derive(Debug, Clone)]
pub struct AxisSetting {
    pub tag: FontTag,
    pub value: f32,
}

impl AxisSetting {
    pub fn new(tag: FontTag, value: f32) -> Self {
        Self { tag, value }
    }
    
    pub fn parse(setting: &str) -> Result<Self, FontError> {
        let tokens: Vec<&str> = setting.split_whitespace().collect();
        if tokens.len() != 2 {
            return Err(FontError::InvalidAxisSetting(
                format!("Invalid setting format: {}", setting)
            ));
        }
        
        let tag = FontTag::from_str(tokens[0])?;
        let value = tokens[1]
            .parse::<f32>()
            .map_err(|_| FontError::InvalidAxisSetting(
                format!("Invalid axis value: {}", tokens[1])
            ))?;
        
        Ok(AxisSetting::new(tag, value))
    }
}

#[derive(Debug, Clone)]
pub struct StylisticSet {
    pub number: u32,
    pub name: String,
}

impl StylisticSet {
    pub fn new(number: u32) -> Result<Self, FontError> {
        if !(1..=20).contains(&number) {
            return Err(FontError::InvalidStylisticSet(
                format!("Stylistic set must be SS01-SS20, got: SS{:02}", number)
            ));
        }
        
        Ok(StylisticSet {
            number,
            name: format!("SS{:02}", number),
        })
    }
    
    pub fn from_str(s: &str) -> Result<Self, FontError> {
        let s_lower = s.to_lowercase();
        if !s_lower.starts_with("ss") || s_lower.len() != 4 {
            return Err(FontError::InvalidStylisticSet(
                format!("Invalid stylistic set: {}. Expected SS01-SS20.", s)
            ));
        }
        
        let number_str = &s_lower[2..];
        let number: u32 = number_str.parse()
            .map_err(|_| FontError::InvalidStylisticSet(
                format!("Invalid stylistic set number: {}", s)
            ))?;
        
        Self::new(number)
    }
    
    pub fn feature_tag(&self) -> Result<FontTag, FontError> {
        let tag_str = format!("ss{:02}", self.number);
        FontTag::from_str(&tag_str)
    }
}

// ==================== Shared settings splitter ====================
// Both variable-settings and feature-settings use the same CSS-like grammar:
// a comma-separated list, quotes optional. Centralizing the split keeps the two
// parsers in lockstep.

fn split_settings_entries(settings: &str) -> Vec<String> {
    settings
        .replace(['"', '\''], "")
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

// ==================== Variable Settings Parser ====================

mod variable_settings {
    use super::*;

    pub fn parse(settings: &str) -> Result<HashMap<FontTag, f32>, FontError> {
        split_settings_entries(settings)
            .iter()
            .map(|entry| AxisSetting::parse(entry).map(|s| (s.tag, s.value)))
            .collect()
    }
}

// ==================== Feature Settings Parser ====================
// Parses CSS `font-feature-settings` strings, e.g. `"calt" 1, "smcp"`. Tags may
// be quoted or bare; the value is optional (default on), or "on"/"off" or an
// integer. Tags shorter than 4 chars are space-padded (matches the compiler).

mod feature_settings {
    use super::*;

    pub fn parse(settings: &str) -> Result<Vec<(FontTag, f32)>, FontError> {
        let mut out = Vec::new();
        for entry in split_settings_entries(settings) {
            let mut tokens = entry.split_whitespace();
            let tag_str = tokens.next().ok_or_else(|| {
                FontError::InvalidTag(format!("Empty feature entry: {}", entry))
            })?;
            let tag = FontTag::from_str_padded(tag_str)?;
            let value = match tokens.next() {
                None => 1.0, // default: on
                Some("on") => 1.0,
                Some("off") => 0.0,
                Some(v) => v.parse::<f32>().map_err(|_| {
                    FontError::InvalidAxisSetting(format!("Invalid feature value: {}", v))
                })?,
            };
            if tokens.next().is_some() {
                return Err(FontError::InvalidAxisSetting(format!(
                    "Too many tokens in feature entry: {}", entry
                )));
            }
            out.push((tag, value));
        }
        Ok(out)
    }
}

// ==================== GSUB Modifier ====================
// Modifies GSUB table to inject stylistic set lookups into calt feature,
// enabling stylistic alternates in Canvas 2D text rendering.

mod gsub_modifier {
    use super::*;
    use read_fonts::{FontRead, types::Tag};

    /// Checked u16 offset addition
    fn offset_add(base: u16, len: usize) -> Result<u16, FontError> {
        u16::try_from(len)
            .ok()
            .and_then(|l| base.checked_add(l))
            .ok_or_else(|| FontError::ArithmeticOverflow("Offset exceeds u16 max".into()))
    }

    /// OpenType tag constants
    /// Using 'calt' (Contextual Alternates) instead of 'ccmp' because:
    /// - ccmp is for glyph composition/decomposition and may not run for all text
    /// - calt is typically enabled by default and runs for all text in most browsers
    const CALT_TAG: Tag = Tag::new(b"calt");

    /// Extract lookup indices for a given feature tag from GSUB table
    pub fn extract_feature_lookups(gsub_data: &[u8], feature_tag: Tag) -> Result<Vec<u16>, FontError> {
        let gsub = read_fonts::tables::gsub::Gsub::read(read_fonts::FontData::new(gsub_data))
            .map_err(|e| FontError::GsubError(format!("Failed to parse GSUB: {:?}", e)))?;

        let feature_list = gsub.feature_list()
            .map_err(|e| FontError::GsubError(format!("Failed to read feature list: {:?}", e)))?;

        // Find the feature by tag
        for feature_record in feature_list.feature_records() {
            if feature_record.feature_tag() == feature_tag {
                let feature_table = feature_record.feature(feature_list.offset_data())
                    .map_err(|e| FontError::GsubError(format!("Failed to read feature: {:?}", e)))?;
                
                let indices: Vec<u16> = feature_table.lookup_list_indices()
                    .iter()
                    .map(|idx| idx.get())
                    .collect();
                
                return Ok(indices);
            }
        }

        // Feature not found - return empty vec (not an error)
        Ok(Vec::new())
    }


    /// Tags that browsers apply automatically (the "always-on" set).
    /// These are applied by the shaping engine for all scripts, plus
    /// Arabic joining features (init/medi/fina/isol) that are always
    /// applied for Arabic. Features NOT in this set (e.g., frac, smcp,
    /// onum, ss01) are optional and only fire when explicitly enabled.
    const ALWAYS_ON_TAGS: &[[u8; 4]] = &[
        *b"ccmp", *b"locl", *b"rlig", *b"mark", *b"mkmk",
        *b"calt", *b"clig", *b"liga", *b"rclt",
        *b"init", *b"medi", *b"fina", *b"isol",
        *b"rvrn", *b"abvm", *b"blwm", *b"curs", *b"dist",
    ];

    /// Extract the set of feature tags that are truly "default-on" — i.e.
    /// referenced by any LangSys AND in the browser's always-on set.
    /// These features fire automatically; injecting their lookups into
    /// `calt` would cause double-firing (Bug 1). Features in the LangSys
    /// but NOT in the always-on set (e.g., frac, onum, smcp) are optional
    /// and SHOULD be injected into calt when explicitly enabled.
    pub fn extract_default_on_tags(gsub_data: &[u8]) -> Result<std::collections::HashSet<Tag>, FontError> {
        let gsub = read_fonts::tables::gsub::Gsub::read(read_fonts::FontData::new(gsub_data))
            .map_err(|e| FontError::GsubError(format!("Failed to parse GSUB: {:?}", e)))?;

        let script_list = gsub.script_list()
            .map_err(|e| FontError::GsubError(format!("Failed to read script list: {:?}", e)))?;
        let feature_list = gsub.feature_list()
            .map_err(|e| FontError::GsubError(format!("Failed to read feature list: {:?}", e)))?;

        let mut tags = std::collections::HashSet::new();

        for script_record in script_list.script_records() {
            let script = script_record.script(script_list.offset_data())
                .map_err(|e| FontError::GsubError(format!("Failed to read script: {:?}", e)))?;

            // Default LangSys
            if let Some(default_ls) = script.default_lang_sys() {
                if let Ok(ls) = default_ls {
                    let req_idx = ls.required_feature_index();
                    if req_idx != 0xFFFF {
                        if let Some(record) = feature_list.feature_records().get(req_idx as usize) {
                            tags.insert(record.feature_tag());
                        }
                    }
                    for idx in ls.feature_indices() {
                        let i = idx.get() as usize;
                        if let Some(record) = feature_list.feature_records().get(i) {
                            tags.insert(record.feature_tag());
                        }
                    }
                }
            }

            // Per-language LangSys
            for lang_record in script.lang_sys_records() {
                if let Ok(ls) = lang_record.lang_sys(script.offset_data()) {
                    let req_idx = ls.required_feature_index();
                    if req_idx != 0xFFFF {
                        if let Some(record) = feature_list.feature_records().get(req_idx as usize) {
                            tags.insert(record.feature_tag());
                        }
                    }
                    for idx in ls.feature_indices() {
                        let i = idx.get() as usize;
                        if let Some(record) = feature_list.feature_records().get(i) {
                            tags.insert(record.feature_tag());
                        }
                    }
                }
            }
        }

        // Intersect with the always-on set. Only features that are BOTH in
        // the LangSys AND in the browser's always-on set are truly default-on.
        let always_on: std::collections::HashSet<Tag> = ALWAYS_ON_TAGS
            .iter()
            .map(|&t| Tag::new(&t))
            .collect();
        tags.retain(|t| always_on.contains(t));
        Ok(tags)
    }

    /// Read a big-endian u16 from a byte slice.
    fn read_u16(data: &[u8], offset: usize) -> Result<u16, FontError> {
        data.get(offset..offset + 2)
            .map(|b| u16::from_be_bytes([b[0], b[1]]))
            .ok_or_else(|| FontError::GsubError("GSUB offset out of bounds".into()))
    }

    /// Read a big-endian u32 from a byte slice.
    fn read_u32(data: &[u8], offset: usize) -> Result<u32, FontError> {
        data.get(offset..offset + 4)
            .map(|b| u32::from_be_bytes([b[0], b[1], b[2], b[3]]))
            .ok_or_else(|| FontError::GsubError("GSUB offset out of bounds".into()))
    }

    /// Build a modified GSUB table with SS lookups injected into calt
    /// 
    /// This uses a binary patching approach rather than full table reconstruction,
    /// which avoids complex API compatibility issues with write-fonts.
    pub fn build_modified_gsub(
        original_gsub: &[u8],
        enable_lookup_indices: &[u16],
        disable_tags: &[Tag],
    ) -> Result<Vec<u8>, FontError> {
        if enable_lookup_indices.is_empty() && disable_tags.is_empty() {
            return Ok(original_gsub.to_vec());
        }

        let gsub = read_fonts::tables::gsub::Gsub::read(read_fonts::FontData::new(original_gsub))
            .map_err(|e| FontError::GsubError(format!("Failed to parse GSUB: {:?}", e)))?;

        // Validate lookup indices are within bounds
        let lookup_list = gsub.lookup_list()
            .map_err(|e| FontError::GsubError(format!("Failed to read lookup list: {:?}", e)))?;
        let max_lookup = lookup_list.lookup_count() as u16;
        
        for &idx in enable_lookup_indices {
            if idx >= max_lookup {
                return Err(FontError::GsubError(
                    format!("Lookup index {} out of bounds (max: {})", idx, max_lookup)
                ));
            }
        }

        let feature_list = gsub.feature_list()
            .map_err(|e| FontError::GsubError(format!("Failed to read feature list: {:?}", e)))?;

        // Find calt feature and its lookup indices.
        //
        // calt is our injection point: enabled features' lookups are placed
        // here so they fire automatically (calt is always-on). If calt itself
        // is disabled ("calt" 0), we clear its ORIGINAL lookups but still use
        // it as the injection site — the enabled lookups survive. This matches
        // CSS semantics: "calt" 0, "ss01" 1 disables calt's own alternates
        // while still applying ss01.
        let calt_disabled = disable_tags.contains(&CALT_TAG);
        let mut calt_lookups: Vec<u16> = Vec::new();
        let mut calt_found = false;

        for feature_record in feature_list.feature_records() {
            if feature_record.feature_tag() == CALT_TAG {
                calt_found = true;
                if !calt_disabled {
                    let feature = feature_record.feature(feature_list.offset_data())
                        .map_err(|e| FontError::GsubError(format!("Failed to read calt feature: {:?}", e)))?;
                    calt_lookups = feature.lookup_list_indices()
                        .iter()
                        .map(|idx| idx.get())
                        .collect();
                }
                break;
            }
        }

        // Merge enable lookups with calt lookups (enable at END for proper ordering)
        for idx in enable_lookup_indices {
            if !calt_lookups.contains(idx) {
                calt_lookups.push(*idx);
            }
        }

        // calt is handled above — remove it from the disable set so
        // build_gsub_with_modified_calt doesn't double-clear it.
        let disable_set: std::collections::HashSet<Tag> = disable_tags.iter()
            .filter(|t| **t != CALT_TAG)
            .copied()
            .collect();

        // Build the modified GSUB table using binary construction
        build_gsub_with_modified_calt(original_gsub, &calt_lookups, calt_found, &disable_set)
    }

    /// Build GSUB table binary with modified calt feature
    fn build_gsub_with_modified_calt(
        original_gsub: &[u8],
        calt_lookups: &[u16],
        calt_exists: bool,
        disable_tags: &std::collections::HashSet<Tag>,
    ) -> Result<Vec<u8>, FontError> {
        let gsub = read_fonts::tables::gsub::Gsub::read(read_fonts::FontData::new(original_gsub))
            .map_err(|e| FontError::GsubError(format!("Failed to parse GSUB: {:?}", e)))?;

        // Read all original feature data
        let feature_list = gsub.feature_list()
            .map_err(|e| FontError::GsubError(format!("Failed to read feature list: {:?}", e)))?;
        let script_list = gsub.script_list()
            .map_err(|e| FontError::GsubError(format!("Failed to read script list: {:?}", e)))?;

        // Build feature records with modified/new calt
        let mut feature_records: Vec<(Tag, Vec<u16>)> = Vec::new();
        
        if !calt_exists {
            // Add new calt feature at the beginning
            feature_records.push((CALT_TAG, calt_lookups.to_vec()));
        }

        for feature_record in feature_list.feature_records() {
            let tag = feature_record.feature_tag();
            let feature = feature_record.feature(feature_list.offset_data())
                .map_err(|e| FontError::GsubError(format!("Failed to read feature: {:?}", e)))?;
            
            let lookups: Vec<u16> = if tag == CALT_TAG {
                calt_lookups.to_vec()
            } else if disable_tags.contains(&tag) {
                Vec::new() // feature disabled — clear its lookup indices
            } else {
                feature.lookup_list_indices()
                    .iter()
                    .map(|idx| idx.get())
                    .collect()
            };
            
            feature_records.push((tag, lookups));
        }

        // Calculate the calt feature index offset if we added a new feature
        let feature_index_offset: u16 = if !calt_exists { 1 } else { 0 };

        // Build script list with updated feature indices
        let script_list_data = build_script_list_binary(&script_list, feature_index_offset)?;
        let feature_list_data = build_feature_list_binary(&feature_records)?;

        // Copy the lookup list as-is from the original. For GSUB v1.1 a
        // FeatureVariations table may follow the lookup list; we carry it
        // through so no data is silently dropped.
        let lookup_list_offset = gsub.lookup_list_offset().to_u32() as usize;

        // Preserve the original GSUB version. v1.1 adds a 4th header field
        // (FeatureVariationsOffset, u32) plus a trailing FeatureVariations
        // table; both are preserved. v1.0 stays v1.0.
        let version_bytes: [u8; 4] = match original_gsub.get(0..4) {
            Some(b) => [b[0], b[1], b[2], b[3]],
            None => [0, 1, 0, 0],
        };
        let is_v11 = version_bytes == [0, 1, 0, 1];
        let src_fv_offset: u32 = if is_v11 && original_gsub.len() >= 14 {
            u32::from_be_bytes([
                original_gsub[10], original_gsub[11],
                original_gsub[12], original_gsub[13],
            ])
        } else {
            0
        };
        // The lookup list ends where FeatureVariations begins (if present), else
        // at the end of the GSUB table.
        let lookup_list_end = if src_fv_offset != 0
            && (src_fv_offset as usize) >= lookup_list_offset
            && (src_fv_offset as usize) <= original_gsub.len()
        {
            src_fv_offset as usize
        } else {
            original_gsub.len()
        };
        let lookup_list_data = &original_gsub[lookup_list_offset..lookup_list_end];
        let feat_var_data: &[u8] = if src_fv_offset != 0 && (src_fv_offset as usize) < original_gsub.len() {
            &original_gsub[src_fv_offset as usize..]
        } else {
            &[]
        };

        let header_size: u16 = if is_v11 { 14 } else { 10 };
        let script_list_offset = header_size;
        let feature_list_offset = offset_add(script_list_offset, script_list_data.len())?;
        let new_lookup_list_offset = offset_add(feature_list_offset, feature_list_data.len())?;
        let new_fv_offset: u32 = if !feat_var_data.is_empty() {
            u32::try_from(new_lookup_list_offset as usize + lookup_list_data.len())
                .map_err(|_| FontError::ArithmeticOverflow("FeatureVariations offset".into()))?
        } else {
            0
        };

        // Build the final GSUB table
        let mut output = Vec::with_capacity(
            header_size as usize
                + script_list_data.len()
                + feature_list_data.len()
                + lookup_list_data.len()
                + feat_var_data.len(),
        );
        // Header (version preserved; v1.1 emits the FeatureVariationsOffset too)
        output.extend_from_slice(&version_bytes);
        output.extend_from_slice(&script_list_offset.to_be_bytes());
        output.extend_from_slice(&feature_list_offset.to_be_bytes());
        output.extend_from_slice(&new_lookup_list_offset.to_be_bytes());
        if is_v11 {
            output.extend_from_slice(&new_fv_offset.to_be_bytes());
        }
        // Tables
        output.extend_from_slice(&script_list_data);
        output.extend_from_slice(&feature_list_data);
        output.extend_from_slice(lookup_list_data);
        output.extend_from_slice(feat_var_data);

        Ok(output)
    }

    /// Build ScriptList binary data
    fn build_script_list_binary(
        script_list: &read_fonts::tables::layout::ScriptList,
        feature_index_offset: u16,
    ) -> Result<Vec<u8>, FontError> {
        let script_records: Vec<_> = script_list.script_records().iter().collect();
        let script_count = u16::try_from(script_records.len())
            .map_err(|_| FontError::ArithmeticOverflow("Too many scripts".into()))?;
        
        // First pass: collect all script data
        let mut scripts_data: Vec<Vec<u8>> = Vec::new();
        for script_record in &script_records {
            let script = script_record.script(script_list.offset_data())
                .map_err(|e| FontError::GsubError(format!("Failed to read script: {:?}", e)))?;
            scripts_data.push(build_script_binary(&script, feature_index_offset)?);
        }
        
        // Calculate offsets with overflow checking
        let header_size = 2 + script_count as usize * 6;
        let mut current_offset = u16::try_from(header_size)
            .map_err(|_| FontError::ArithmeticOverflow("Header too large".into()))?;
        let mut script_offsets: Vec<u16> = Vec::new();
        
        for data in &scripts_data {
            script_offsets.push(current_offset);
            current_offset = offset_add(current_offset, data.len())?;
        }
        
        // Build output
        let mut output = Vec::new();
        output.extend_from_slice(&script_count.to_be_bytes());
        
        for (i, script_record) in script_records.iter().enumerate() {
            output.extend_from_slice(&script_record.script_tag().to_be_bytes());
            output.extend_from_slice(&script_offsets[i].to_be_bytes());
        }
        
        for data in scripts_data {
            output.extend_from_slice(&data);
        }
        
        Ok(output)
    }

    /// Build Script binary data
    fn build_script_binary(
        script: &read_fonts::tables::layout::Script,
        feature_index_offset: u16,
    ) -> Result<Vec<u8>, FontError> {
        let lang_sys_records: Vec<_> = script.lang_sys_records().iter().collect();
        let lang_sys_count = u16::try_from(lang_sys_records.len())
            .map_err(|_| FontError::ArithmeticOverflow("Too many lang sys records".into()))?;
        
        // Collect lang sys data
        let mut default_lang_sys_data: Option<Vec<u8>> = None;
        let mut lang_sys_data: Vec<Vec<u8>> = Vec::new();
        
        if let Some(default) = script.default_lang_sys() {
            let default = default
                .map_err(|e| FontError::GsubError(format!("Failed to read default lang sys: {:?}", e)))?;
            default_lang_sys_data = Some(build_lang_sys_binary(&default, feature_index_offset)?);
        }
        
        for record in &lang_sys_records {
            let lang_sys = record.lang_sys(script.offset_data())
                .map_err(|e| FontError::GsubError(format!("Failed to read lang sys: {:?}", e)))?;
            lang_sys_data.push(build_lang_sys_binary(&lang_sys, feature_index_offset)?);
        }
        
        // Calculate offsets with overflow checking
        let header_size = 4 + lang_sys_count as usize * 6;
        let mut current_offset = u16::try_from(header_size)
            .map_err(|_| FontError::ArithmeticOverflow("Header too large".into()))?;
        
        let default_offset: u16 = if let Some(ref data) = default_lang_sys_data {
            let offset = current_offset;
            current_offset = offset_add(current_offset, data.len())?;
            offset
        } else {
            0 // NULL offset
        };
        
        let mut lang_sys_offsets: Vec<u16> = Vec::new();
        for data in &lang_sys_data {
            lang_sys_offsets.push(current_offset);
            current_offset = offset_add(current_offset, data.len())?;
        }
        
        // Build output
        let mut output = Vec::new();
        output.extend_from_slice(&default_offset.to_be_bytes());
        output.extend_from_slice(&lang_sys_count.to_be_bytes());
        
        for (i, record) in lang_sys_records.iter().enumerate() {
            output.extend_from_slice(&record.lang_sys_tag().to_be_bytes());
            output.extend_from_slice(&lang_sys_offsets[i].to_be_bytes());
        }
        
        if let Some(data) = default_lang_sys_data {
            output.extend_from_slice(&data);
        }
        
        for data in lang_sys_data {
            output.extend_from_slice(&data);
        }
        
        Ok(output)
    }

    /// Build LangSys binary data
    /// When feature_index_offset > 0, a new calt was added at index 0, so we must:
    /// 1. Offset all existing feature indices
    /// 2. Add index 0 to include the new calt feature
    fn build_lang_sys_binary(
        lang_sys: &read_fonts::tables::layout::LangSys,
        feature_index_offset: u16,
    ) -> Result<Vec<u8>, FontError> {
        let required_feature_index = lang_sys.required_feature_index();
        
        // Offset existing feature indices
        let mut feature_indices: Vec<u16> = lang_sys.feature_indices()
            .iter()
            .map(|idx| idx.get() + feature_index_offset)
            .collect();
        
        // If we added a new calt at index 0, include it in this LangSys
        if feature_index_offset > 0 {
            // Insert calt (index 0) at the beginning to maintain sorted order
            feature_indices.insert(0, 0);
        }
        
        let adjusted_required = if required_feature_index == 0xFFFF {
            0xFFFF
        } else {
            required_feature_index + feature_index_offset
        };
        
        let mut output = Vec::new();
        output.extend_from_slice(&0u16.to_be_bytes()); // lookupOrder (reserved)
        output.extend_from_slice(&adjusted_required.to_be_bytes());
        output.extend_from_slice(&(feature_indices.len() as u16).to_be_bytes());
        
        for idx in feature_indices {
            output.extend_from_slice(&idx.to_be_bytes());
        }
        
        Ok(output)
    }

    /// Build FeatureList binary data
    fn build_feature_list_binary(
        features: &[(Tag, Vec<u16>)],
    ) -> Result<Vec<u8>, FontError> {
        let feature_count = u16::try_from(features.len())
            .map_err(|_| FontError::ArithmeticOverflow("Too many features".into()))?;
        
        // Build feature table data
        let mut feature_tables: Vec<Vec<u8>> = Vec::new();
        for (_, lookups) in features {
            let lookup_count = u16::try_from(lookups.len())
                .map_err(|_| FontError::ArithmeticOverflow("Too many lookups".into()))?;
            let mut data = Vec::new();
            data.extend_from_slice(&0u16.to_be_bytes()); // featureParams (NULL)
            data.extend_from_slice(&lookup_count.to_be_bytes());
            for idx in lookups {
                data.extend_from_slice(&idx.to_be_bytes());
            }
            feature_tables.push(data);
        }
        
        // Calculate offsets with overflow checking
        let header_size = 2 + feature_count as usize * 6;
        let mut current_offset = u16::try_from(header_size)
            .map_err(|_| FontError::ArithmeticOverflow("Header too large".into()))?;
        let mut feature_offsets: Vec<u16> = Vec::new();
        
        for data in &feature_tables {
            feature_offsets.push(current_offset);
            current_offset = offset_add(current_offset, data.len())?;
        }
        
        // Build output
        let mut output = Vec::new();
        output.extend_from_slice(&feature_count.to_be_bytes());
        
        for (i, (tag, _)) in features.iter().enumerate() {
            output.extend_from_slice(&tag.to_be_bytes());
            output.extend_from_slice(&feature_offsets[i].to_be_bytes());
        }
        
        for data in feature_tables {
            output.extend_from_slice(&data);
        }
        
        Ok(output)
    }

    /// Extract GSUB table data from a font (uses allsorts for woff2 support)
    pub fn extract_gsub_table(font_data: &[u8]) -> Result<Vec<u8>, FontError> {
        let scope = ReadScope::new(font_data);
        let font = scope.read::<FontData>()
            .map_err(|e| FontError::FontParseError(format!("Failed to parse font: {:?}", e)))?;
        let provider = font.table_provider(0)
            .map_err(|e| FontError::FontParseError(format!("Failed to get font provider: {:?}", e)))?;

        let gsub_data = provider.table_data(allsorts::tag::GSUB)
            .map_err(|e| FontError::FontParseError(format!("Failed to read GSUB table: {:?}", e)))?
            .ok_or_else(|| FontError::GsubError("Font has no GSUB table".to_string()))?;

        Ok(gsub_data.to_vec())
    }

    /// Parse stylistic set strings to Tags
    pub fn parse_ss_tags(stylistic_sets: &str) -> Result<Vec<Tag>, FontError> {
        let cleaned = stylistic_sets.replace(['"', '\''], "");
        cleaned
            .split(',')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .map(|s| {
                let ss = StylisticSet::from_str(s)?;
                let tag_str = format!("ss{:02}", ss.number);
                Ok(Tag::new(tag_str.as_bytes().try_into().map_err(|_| 
                    FontError::InvalidTag(format!("Invalid tag bytes: {}", tag_str)))?))
            })
            .collect()
    }
}

// ==================== Font Rebuilder ====================

mod font_rebuilder {
    use super::*;
    use allsorts::tables::SfntVersion;

    /// GSUB table tag as u32
    const GSUB_TAG_U32: u32 = u32::from_be_bytes(*b"GSUB");

    /// Rebuild font with GSUB table replaced.
    /// Uses allsorts to read the font (supports woff2), then produces raw sfnt output.
    pub fn rebuild_with_gsub(
        original_data: &[u8],
        new_gsub_data: &[u8],
    ) -> Result<Vec<u8>, FontError> {
        let scope = ReadScope::new(original_data);
        let font = scope.read::<FontData>()
            .map_err(|e| FontError::FontParseError(format!("Failed to parse font: {:?}", e)))?;
        let provider = font.table_provider(0)
            .map_err(|e| FontError::FontParseError(format!("Failed to get font provider: {:?}", e)))?;

        let flavor = provider.sfnt_version();

        let table_tags = provider.table_tags()
            .ok_or_else(|| FontError::GsubError("Cannot enumerate font tables".to_string()))?;

        let mut tables: Vec<(u32, Vec<u8>)> = Vec::new();
        for tag in &table_tags {
            let data = if *tag == GSUB_TAG_U32 {
                new_gsub_data.to_vec()
            } else {
                provider.table_data(*tag)
                    .map_err(|e| FontError::FontParseError(format!("Failed to read table {:x}: {:?}", tag, e)))?
                    .map(|d| d.to_vec())
                    .unwrap_or_default()
            };
            tables.push((*tag, data));
        }

        tables.sort_by_key(|(tag, _)| *tag);
        Ok(build_font_file(flavor, tables))
    }

    fn build_font_file(version_tag: u32, tables: Vec<(u32, Vec<u8>)>) -> Vec<u8> {
        let num_tables = tables.len();
        let num_tables_u16 = u16::try_from(num_tables).unwrap_or(u16::MAX);

        let (search_range, entry_selector, range_shift) = calculate_search_params(num_tables_u16);

        let header_size = 12 + tables.len() * 16;
        let table_records = build_table_records(&tables, header_size);

        let total_size = table_records.last()
            .map(|(_, _, offset, length)| {
                offset.checked_add(*length)
                    .and_then(|sum| sum.checked_add(3))
                    .map(|sum| sum & !3)
                    .unwrap_or(u32::try_from(header_size).unwrap_or(0))
            })
            .unwrap_or(u32::try_from(header_size).unwrap_or(0));

        let total_size_usize = usize::try_from(total_size).unwrap_or(0);
        let mut output = Vec::with_capacity(total_size_usize);

        write_offset_table(&mut output, version_tag, num_tables_u16, search_range, entry_selector, range_shift);
        write_table_records(&mut output, &table_records);
        write_table_data(&mut output, &tables);

        // Adjust head table checkSumAdjustment so the entire font sums to 0xB1B0AFBA.
        // OpenType spec requires this; browsers (esp. Firefox canvas) reject fonts
        // with invalid font-wide checksums.
        adjust_head_checksum(&mut output, &table_records, &tables);

        output
    }


    fn calculate_search_params(num_tables: u16) -> (u16, u16, u16) {
        let search_range = if num_tables > 0 {
            (1u16 << (15 - num_tables.leading_zeros())) * 16
        } else {
            0
        };
        let entry_selector = if num_tables > 0 {
            15u16.checked_sub(num_tables.leading_zeros() as u16).unwrap_or(0)
        } else {
            0
        };
        let range_shift = num_tables * 16 - search_range;
        (search_range, entry_selector, range_shift)
    }

    fn build_table_records(tables: &[(u32, Vec<u8>)], header_size: usize) -> Vec<(u32, u32, u32, u32)> {
        let mut offset = header_size;
        tables
            .iter()
            .map(|(tag, data)| {
                let checksum = calculate_checksum(data);
                let length = u32::try_from(data.len()).unwrap_or(0);
                let offset_u32 = u32::try_from(offset).unwrap_or(0);
                let record = (*tag, checksum, offset_u32, length);

                offset = offset.checked_add(data.len())
                    .and_then(|sum| {
                        let padding = (4 - (sum % 4)) % 4;
                        sum.checked_add(padding)
                    })
                    .unwrap_or(offset);

                record
            })
            .collect()
    }

    fn write_offset_table(
        output: &mut Vec<u8>,
        version_tag: u32,
        num_tables: u16,
        search_range: u16,
        entry_selector: u16,
        range_shift: u16,
    ) {
        output.extend_from_slice(&version_tag.to_be_bytes());
        output.extend_from_slice(&num_tables.to_be_bytes());
        output.extend_from_slice(&search_range.to_be_bytes());
        output.extend_from_slice(&entry_selector.to_be_bytes());
        output.extend_from_slice(&range_shift.to_be_bytes());
    }

    fn write_table_records(output: &mut Vec<u8>, records: &[(u32, u32, u32, u32)]) {
        for (tag, checksum, offset, length) in records {
            output.extend_from_slice(&tag.to_be_bytes());
            output.extend_from_slice(&checksum.to_be_bytes());
            output.extend_from_slice(&offset.to_be_bytes());
            output.extend_from_slice(&length.to_be_bytes());
        }
    }

    fn write_table_data(output: &mut Vec<u8>, tables: &[(u32, Vec<u8>)]) {
        for (_, data) in tables {
            output.extend_from_slice(data);
            let padding = (4 - (data.len() % 4)) % 4;
            output.extend(std::iter::repeat(0).take(padding));
        }
    }

    fn calculate_checksum(data: &[u8]) -> u32 {
        let mut sum: u32 = 0;
        let mut chunks = data.chunks_exact(4);

        for chunk in &mut chunks {
            sum = sum.wrapping_add(u32::from_be_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]));
        }

        let remainder = chunks.remainder();
        if !remainder.is_empty() {
            let mut last = [0u8; 4];
            last[..remainder.len()].copy_from_slice(remainder);
            sum = sum.wrapping_add(u32::from_be_bytes(last));
        }

        sum
    }
    /// Adjust head table checkSumAdjustment so the entire font checksums to 0xB1B0AFBA.
    /// OpenType spec §5.1: the sum of all uint32s in the font file must equal 0xB1B0AFBA.
    fn adjust_head_checksum(
        font: &mut [u8],
        table_records: &[(u32, u32, u32, u32)],
        tables: &[(u32, Vec<u8>)],
    ) {
        const HEAD_TAG: u32 = u32::from_be_bytes(*b"head");
        const TARGET: u32 = 0xB1B0AFBA;

        // Find the head table
        let head_idx = tables.iter().position(|(tag, _)| *tag == HEAD_TAG);
        let Some(head_idx) = head_idx else { return; };
        let record = &table_records[head_idx];
        let head_offset = record.2 as usize; // offset in font

        // The checkSumAdjustment is at offset 8 in the head table
        let head_checksum_offset = head_offset + 8;

        // Ensure font buffer is large enough
        if font.len() < head_checksum_offset + 4 {
            return;
        }

        // Zero out the checkSumAdjustment for calculation
        font[head_checksum_offset] = 0;
        font[head_checksum_offset + 1] = 0;
        font[head_checksum_offset + 2] = 0;
        font[head_checksum_offset + 3] = 0;

        // Calculate the current checksum of the entire font
        let mut sum: u32 = 0;
        let mut chunks = font.chunks_exact(4);
        for chunk in &mut chunks {
            sum = sum.wrapping_add(u32::from_be_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]));
        }
        let remainder = chunks.remainder();
        if !remainder.is_empty() {
            let mut last = [0u8; 4];
            last[..remainder.len()].copy_from_slice(remainder);
            sum = sum.wrapping_add(u32::from_be_bytes(last));
        }

        // checkSumAdjustment = TARGET - sum
        let adjustment = TARGET.wrapping_sub(sum);

        // Write the adjustment into the font
        let adj_bytes = adjustment.to_be_bytes();
        font[head_checksum_offset] = adj_bytes[0];
        font[head_checksum_offset + 1] = adj_bytes[1];
        font[head_checksum_offset + 2] = adj_bytes[2];
        font[head_checksum_offset + 3] = adj_bytes[3];

        // Update the head table record checksum to match the modified table.
        // The record is at offset 12 + head_idx * 16 + 4 (skip tag, go to checksum).
        let record_offset = 12 + head_idx * 16 + 4;
        let new_checksum = calculate_checksum(&font[head_offset..head_offset + tables[head_idx].1.len()]);
        let cs_bytes = new_checksum.to_be_bytes();
        font[record_offset] = cs_bytes[0];
        font[record_offset + 1] = cs_bytes[1];
        font[record_offset + 2] = cs_bytes[2];
        font[record_offset + 3] = cs_bytes[3];
    }
}
// ==================== Variable Font Instancer ====================

mod variable_font_instancer {
    use super::*;

    pub fn create_static_instance(
        font_data: &[u8],
        settings: &HashMap<FontTag, f32>,
    ) -> Result<Vec<u8>, FontError> {
        let scope = ReadScope::new(font_data);
        let font_file = scope.read::<FontData>()
            .map_err(|e| FontError::FontParseError(format!("{:?}", e)))?;
        
        let provider = font_file.table_provider(0)
            .map_err(|e| FontError::FontParseError(format!("{:?}", e)))?;

        let fvar_data_owned: Vec<u8> = provider.table_data(tag::FVAR)
            .map_err(|e| FontError::FontParseError(format!("Failed to read fvar: {:?}", e)))?
            .ok_or(FontError::NotVariableFont)?
            .to_vec();
        let fvar_scope = ReadScope::new(&fvar_data_owned);
        let fvar = fvar_scope.read::<FvarTable>()
            .map_err(|e| FontError::FontParseError(format!("Failed to parse fvar: {:?}", e)))?;
        let coordinates = build_coordinates(&fvar, settings);
        
        validate_instancing_support(&provider)?;
        
        instance(&provider, &coordinates)
            .map(|(data, _)| data)
            .map_err(|e| FontError::FontParseError(format!("Instancing failed: {:?}", e)))
    }

    fn build_coordinates(fvar: &FvarTable, settings: &HashMap<FontTag, f32>) -> Vec<Fixed> {
        fvar.axes()
            .map(|axis| {
                let value = settings
                    .get(&FontTag(axis.axis_tag))
                    .copied()
                    .unwrap_or_else(|| f32::from(axis.default_value));
                
                let clamped = value
                    .max(f32::from(axis.min_value))
                    .min(f32::from(axis.max_value));
                
                Fixed::from(clamped)
            })
            .collect()
    }

    fn validate_instancing_support<T: FontTableProvider>(provider: &T) -> Result<(), FontError> {
        let has_gvar = provider.table_data(tag::GVAR).ok().flatten().is_some();
        let has_cff2 = provider.table_data(tag::CFF2).ok().flatten().is_some();
        
        if !has_gvar && !has_cff2 {
            return Err(FontError::InstancingNotSupported);
        }
        Ok(())
    }
}

// ==================== WASM Bindings ====================

/// Core operation shared by `apply_stylistic_sets` and `apply_feature_settings`:
/// extract the GSUB lookup indices for every tag in `tags`, then rebuild the
/// font with those indices merged into the `calt` feature (so the substitutions
/// run wherever calt does). Idempotent; tags absent from the font are no-ops;
/// returns the font unchanged if there are no lookups to inject.
/// Apply font features: inject enabled features into calt AND clear disabled
/// features' lookup indices. Both operations modify the GSUB FeatureList in a
/// single rebuild pass. The LookupList is preserved unchanged (lookups stay
/// available for other features that may reference them).
fn apply_font_features(
    font_data: &[u8],
    enable_tags: &[Tag],
    disable_tags: &[Tag],
) -> Result<Vec<u8>, FontError> {
    if enable_tags.is_empty() && disable_tags.is_empty() {
        return Ok(font_data.to_vec());
    }
    let gsub_data = gsub_modifier::extract_gsub_table(font_data)?;

    // Skip features that are already default-on (in the LangSys). Injecting
    // their lookups into calt would cause double-firing (Bug 1): the lookups
    // fire once via the original feature and again via calt. This is
    // idempotent without ctx.lang, but when locl activates (ctx.lang="ar"),
    // the alternate forms make the double-firing non-idempotent.
    let default_on_tags = gsub_modifier::extract_default_on_tags(&gsub_data)?;
    let enable_tags: Vec<Tag> = enable_tags
        .iter()
        .filter(|tag| !default_on_tags.contains(*tag))
        .copied()
        .collect();

    // Collect enable lookups (dedup)
    let mut all_lookups: Vec<u16> = Vec::new();
    for tag in &enable_tags {
        for idx in gsub_modifier::extract_feature_lookups(&gsub_data, *tag)? {
            if !all_lookups.contains(&idx) {
                all_lookups.push(idx);
            }
        }
    }

    if all_lookups.is_empty() && disable_tags.is_empty() {
        return Ok(font_data.to_vec());
    }

    let new_gsub = gsub_modifier::build_modified_gsub(&gsub_data, &all_lookups, disable_tags)?;
    font_rebuilder::rebuild_with_gsub(font_data, &new_gsub)
}

/// Apply stylistic sets by injecting their GSUB lookups into the calt feature.
/// The calt (Contextual Alternates) feature is typically enabled by default in
/// browsers and runs for all text, making it suitable for applying stylistic
/// set substitutions.
#[wasm_bindgen]
pub fn apply_stylistic_sets(font_data: &[u8], stylistic_sets: &str) -> Result<Vec<u8>, String> {
    let tags = gsub_modifier::parse_ss_tags(stylistic_sets).map_err(|e| e.to_string())?;
    if tags.is_empty() {
        return Err("No stylistic sets provided".to_string());
    }
    apply_font_features(font_data, &tags, &[]).map_err(|e| e.to_string())
}

/// Apply OpenType feature settings by injecting each enabled feature's GSUB
/// lookups into the calt feature. The Canvas 2D API has no font-feature-settings,
/// so this "bakes" the features into the font binary. Tags are validated up front
/// by the compiler. Disabling (value 0) clears the feature's lookup indices.
#[wasm_bindgen]
pub fn apply_feature_settings(font_data: &[u8], feature_settings: &str) -> Result<Vec<u8>, String> {
    let parsed = feature_settings::parse(feature_settings).map_err(|e| e.to_string())?;
    let mut enable_tags: Vec<Tag> = Vec::new();
    let mut disable_tags: Vec<Tag> = Vec::new();
    for (t, v) in &parsed {
        let tag = Tag::new(&t.value().to_be_bytes());
        if *v == 0.0 {
            disable_tags.push(tag);
        } else {
            enable_tags.push(tag);
        }
    }
    if enable_tags.is_empty() && disable_tags.is_empty() {
        return Ok(font_data.to_vec());
    }
    apply_font_features(font_data, &enable_tags, &disable_tags).map_err(|e| e.to_string())
}

#[wasm_bindgen]
pub fn generate_static_font_instance(font_data: &[u8], variable_settings: &str) -> Result<Vec<u8>, String> {
    let settings = variable_settings::parse(variable_settings)
        .map_err(|e| e.to_string())?;

    if settings.is_empty() {
        return Err("No variable settings provided".to_string());
    }

    variable_font_instancer::create_static_instance(font_data, &settings)
        .map_err(|e| e.to_string())
}

/// Process a font: apply variable-font instancing, then bake stylistic sets AND
/// feature settings into `calt` in a single GSUB rebuild (the lookups are
/// deduped, so overlapping features cost nothing extra).
#[wasm_bindgen]
pub fn process_font(
    font_data: &[u8],
    variable_settings: &str,
    stylistic_sets: &str,
    feature_settings: &str,
) -> Result<Vec<u8>, String> {
    let mut result = font_data.to_vec();

    if !variable_settings.trim().is_empty() {
        result = generate_static_font_instance(&result, variable_settings)?;
    }

    // Collect ALL calt-injection tags (stylistic sets + enabled feature settings)
    // and apply them in one pass.
    let mut enable_tags: Vec<Tag> = Vec::new();
    let mut disable_tags: Vec<Tag> = Vec::new();
    if !stylistic_sets.trim().is_empty() {
        enable_tags.extend(gsub_modifier::parse_ss_tags(stylistic_sets).map_err(|e| e.to_string())?);
    }
    if !feature_settings.trim().is_empty() {
        for (t, v) in feature_settings::parse(feature_settings).map_err(|e| e.to_string())? {
            let tag = Tag::new(&t.value().to_be_bytes());
            if v == 0.0 {
                disable_tags.push(tag);
            } else {
                enable_tags.push(tag);
            }
        }
    }
    if !enable_tags.is_empty() || !disable_tags.is_empty() {
        result = apply_font_features(&result, &enable_tags, &disable_tags)?;
    }

    Ok(result)
}

/// Get variable font axes information as JSON.
/// Returns JSON with isVariable flag and axis details (tag, min, max, default).
/// Used by the compiler to validate fontVariableSettings at compile time.
#[wasm_bindgen]
pub fn get_font_variable_axes(font_data: &[u8]) -> Result<String, String> {
    let scope = ReadScope::new(font_data);
    let font_file = scope.read::<FontData>()
        .map_err(|e| format!("Failed to parse font: {:?}", e))?;
    
    let provider = font_file.table_provider(0)
        .map_err(|e| format!("Failed to get font provider: {:?}", e))?;

    // Try to read fvar table
    let fvar_result = provider.table_data(tag::FVAR)
        .ok()
        .flatten();
    
    match fvar_result {
        None => {
            // Not a variable font
            Ok(r#"{"isVariable":false,"axes":[]}"#.to_string())
        }
        Some(fvar_data) => {
            let fvar_data_owned: Vec<u8> = fvar_data.to_vec();
            let fvar_scope = ReadScope::new(&fvar_data_owned);
            let fvar = fvar_scope.read::<FvarTable>()
                .map_err(|e| format!("Failed to parse fvar table: {:?}", e))?;
            
            // Build JSON for axes
            let axes: Vec<String> = fvar.axes()
                .map(|axis| {
                    let tag_bytes = axis.axis_tag.to_be_bytes();
                    let tag_str = String::from_utf8_lossy(&tag_bytes);
                    let min = f32::from(axis.min_value);
                    let max = f32::from(axis.max_value);
                    let default = f32::from(axis.default_value);
                    format!(
                        r#"{{"tag":"{}","min":{},"max":{},"default":{}}}"#,
                        tag_str, min, max, default
                    )
                })
                .collect();
            
            Ok(format!(r#"{{"isVariable":true,"axes":[{}]}}"#, axes.join(",")))
        }
    }
}
// ==================== Tests ====================
#[cfg(test)]
mod tests {
    use super::*;

    /// Build a minimal valid GSUB table with: 1 script (DFLT, default LangSys →
    /// feature 0), features "calt"(lookups [0]) & "dlig"(lookups [1]), and 2
    /// empty lookups. `v1_1` emits a 14-byte header (FeatureVariationsOffset=0).
    fn build_minimal_gsub(v1_1: bool) -> Vec<u8> {
        let header_size: usize = if v1_1 { 14 } else { 10 };
        let script_list_off = header_size as u16;
        let feature_list_off = (header_size + 20) as u16; // ScriptList = 20 (LangSys is 8 B)
        let lookup_list_off = (header_size + 20 + 26) as u16;
        let mut o = Vec::new();
        // Header
        o.extend_from_slice(&[0u8, 1, 0, if v1_1 { 1 } else { 0 }]); // version
        o.extend_from_slice(&script_list_off.to_be_bytes());
        o.extend_from_slice(&feature_list_off.to_be_bytes());
        o.extend_from_slice(&lookup_list_off.to_be_bytes());
        if v1_1 {
            o.extend_from_slice(&0u32.to_be_bytes()); // FeatureVariationsOffset (none)
        }
        // ScriptList (18 bytes)
        o.extend_from_slice(&1u16.to_be_bytes()); // scriptCount
        o.extend_from_slice(b"DFLT");
        o.extend_from_slice(&8u16.to_be_bytes()); // scriptOffset (→ Script)
        o.extend_from_slice(&4u16.to_be_bytes()); // defaultLangSysOffset (→ LangSys)
        o.extend_from_slice(&0u16.to_be_bytes()); // langSysCount
        // LangSys
        o.extend_from_slice(&0u16.to_be_bytes()); // lookupOrder (reserved)
        o.extend_from_slice(&0xFFFFu16.to_be_bytes()); // reqFeatureIndex (none)
        o.extend_from_slice(&1u16.to_be_bytes()); // featureIndexCount
        o.extend_from_slice(&0u16.to_be_bytes()); // featureIndex[0] → calt
        // FeatureList (26 bytes)
        o.extend_from_slice(&2u16.to_be_bytes()); // featureCount
        o.extend_from_slice(b"calt");
        o.extend_from_slice(&14u16.to_be_bytes()); // featureOffset (→ calt table)
        o.extend_from_slice(b"dlig");
        o.extend_from_slice(&20u16.to_be_bytes()); // featureOffset (→ dlig table)
        // calt feature table
        o.extend_from_slice(&0u16.to_be_bytes()); // featureParams (NULL)
        o.extend_from_slice(&1u16.to_be_bytes()); // lookupCount
        o.extend_from_slice(&0u16.to_be_bytes()); // lookupIndex[0]
        // dlig feature table
        o.extend_from_slice(&0u16.to_be_bytes()); // featureParams
        o.extend_from_slice(&1u16.to_be_bytes()); // lookupCount
        o.extend_from_slice(&1u16.to_be_bytes()); // lookupIndex[0]
        // LookupList (18 bytes)
        o.extend_from_slice(&2u16.to_be_bytes()); // lookupCount
        o.extend_from_slice(&6u16.to_be_bytes()); // offset[0] → Lookup0
        o.extend_from_slice(&12u16.to_be_bytes()); // offset[1] → Lookup1
        // Lookup0
        o.extend_from_slice(&1u16.to_be_bytes()); // lookupType (Single)
        o.extend_from_slice(&0u16.to_be_bytes()); // lookupFlag
        o.extend_from_slice(&0u16.to_be_bytes()); // subTableCount
        // Lookup1
        o.extend_from_slice(&1u16.to_be_bytes());
        o.extend_from_slice(&0u16.to_be_bytes());
        o.extend_from_slice(&0u16.to_be_bytes());
        o
    }

    #[test]
    fn feature_settings_parse_basic() {
        let r = feature_settings::parse(r#""calt" 1"#).unwrap();
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].0, FontTag::from_str_padded("calt").unwrap());
        assert_eq!(r[0].1, 1.0);
    }

    #[test]
    fn feature_settings_parse_defaults_and_keywords() {
        assert_eq!(feature_settings::parse(r#""smcp""#).unwrap()[0].1, 1.0); // default on
        assert_eq!(feature_settings::parse(r#""liga" off"#).unwrap()[0].1, 0.0);
        assert_eq!(feature_settings::parse(r#""liga" on"#).unwrap()[0].1, 1.0);
        assert_eq!(feature_settings::parse("dlig").unwrap()[0].1, 1.0); // unquoted, default
        let two = feature_settings::parse(r#""calt" 1, "smcp""#).unwrap();
        assert_eq!(two.len(), 2);
    }

    #[test]
    fn feature_settings_parse_pads_short_tag() {
        let (t, _) = &feature_settings::parse("vrt").unwrap()[0];
        assert_eq!(t.value(), u32::from_be_bytes(*b"vrt ")); // 3-char → space-padded to 4
    }

    #[test]
    fn feature_settings_parse_rejects_bad() {
        assert!(feature_settings::parse("ligaa").is_err()); // >4 chars
        assert!(feature_settings::parse(r#""calt" x"#).is_err()); // bad value
        assert!(feature_settings::parse(r#""calt" 1 2"#).is_err()); // too many tokens
    }

    #[test]
    fn inject_dlig_lookups_into_calt() {
        let gsub = build_minimal_gsub(false);
        let dlig = gsub_modifier::extract_feature_lookups(&gsub, Tag::new(b"dlig")).unwrap();
        assert_eq!(dlig, vec![1]);
        let new_gsub = gsub_modifier::build_modified_gsub(&gsub, &dlig, &[]).unwrap();
        let calt = gsub_modifier::extract_feature_lookups(&new_gsub, Tag::new(b"calt")).unwrap();
        assert!(calt.contains(&0), "original calt lookup preserved: {:?}", calt);
        assert!(calt.contains(&1), "dlig lookup injected: {:?}", calt);
    }


    /// Build a GSUB with a `frac` feature pointing to lookups [0, 1], plus a
    /// `calt` feature pointing to [2].  Lookup 0 is Type 1 (Single, empty).
    /// Lookup 1 is Type 6 (ChainContext, Format 3) whose SubstLookupRecord
    /// references lookup 0.  Lookup 2 is Type 1 (Single, empty).
    fn build_gsub_with_chain_context() -> Vec<u8> {
        let mut o = Vec::new();
        // GSUB header (10 bytes) — offsets filled after layout
        o.extend_from_slice(&[0u8, 1, 0, 0]); // version 1.0
        let sl_off = o.len(); o.extend_from_slice(&0u16.to_be_bytes()); // placeholder
        let fl_off = o.len(); o.extend_from_slice(&0u16.to_be_bytes());
        let ll_off = o.len(); o.extend_from_slice(&0u16.to_be_bytes());

        // --- ScriptList ---
        let sl_start = o.len();
        o[sl_off..sl_off+2].copy_from_slice(&(sl_start as u16).to_be_bytes());
        o.extend_from_slice(&1u16.to_be_bytes()); // scriptCount
        o.extend_from_slice(b"DFLT");
        let scr_off_p = o.len(); o.extend_from_slice(&0u16.to_be_bytes()); // scriptOffset placeholder
        // Script
        let scr_start = o.len();
        o[scr_off_p..scr_off_p+2].copy_from_slice(&((scr_start - sl_start) as u16).to_be_bytes());
        let ls_off_p = o.len(); o.extend_from_slice(&0u16.to_be_bytes()); // defaultLangSysOffset
        o.extend_from_slice(&0u16.to_be_bytes()); // langSysCount
        // LangSys
        let ls_start = o.len();
        o[ls_off_p..ls_off_p+2].copy_from_slice(&((ls_start - scr_start) as u16).to_be_bytes());
        o.extend_from_slice(&0u16.to_be_bytes()); // lookupOrder
        o.extend_from_slice(&0xFFFFu16.to_be_bytes()); // reqFeatureIndex
        o.extend_from_slice(&2u16.to_be_bytes()); // featureIndexCount
        o.extend_from_slice(&0u16.to_be_bytes()); // [0] frac
        o.extend_from_slice(&1u16.to_be_bytes()); // [1] calt

        // --- FeatureList ---
        let fl_start = o.len();
        o[fl_off..fl_off+2].copy_from_slice(&(fl_start as u16).to_be_bytes());
        o.extend_from_slice(&2u16.to_be_bytes()); // featureCount
        // frac record
        o.extend_from_slice(b"frac");
        let frac_p = o.len(); o.extend_from_slice(&0u16.to_be_bytes());
        // calt record
        o.extend_from_slice(b"calt");
        let calt_p = o.len(); o.extend_from_slice(&0u16.to_be_bytes());
        // frac table
        let frac_s = o.len();
        o[frac_p..frac_p+2].copy_from_slice(&((frac_s - fl_start) as u16).to_be_bytes());
        o.extend_from_slice(&0u16.to_be_bytes()); // featureParams
        o.extend_from_slice(&2u16.to_be_bytes()); // lookupCount
        o.extend_from_slice(&0u16.to_be_bytes()); // [0]
        o.extend_from_slice(&1u16.to_be_bytes()); // [1]
        // calt table
        let calt_s = o.len();
        o[calt_p..calt_p+2].copy_from_slice(&((calt_s - fl_start) as u16).to_be_bytes());
        o.extend_from_slice(&0u16.to_be_bytes()); // featureParams
        o.extend_from_slice(&1u16.to_be_bytes()); // lookupCount
        o.extend_from_slice(&2u16.to_be_bytes()); // [2]

        // --- LookupList ---
        let ll_start = o.len();
        o[ll_off..ll_off+2].copy_from_slice(&(ll_start as u16).to_be_bytes());
        o.extend_from_slice(&3u16.to_be_bytes()); // lookupCount
        let lk0_p = o.len(); o.extend_from_slice(&0u16.to_be_bytes());
        let lk1_p = o.len(); o.extend_from_slice(&0u16.to_be_bytes());
        let lk2_p = o.len(); o.extend_from_slice(&0u16.to_be_bytes());

        // Lookup 0: Type 1 (Single), 0 subtables  [the helper]
        let lk0_s = o.len();
        o[lk0_p..lk0_p+2].copy_from_slice(&((lk0_s - ll_start) as u16).to_be_bytes());
        o.extend_from_slice(&1u16.to_be_bytes()); // type
        o.extend_from_slice(&0u16.to_be_bytes()); // flag
        o.extend_from_slice(&0u16.to_be_bytes()); // subTableCount

        // Lookup 1: Type 6 (ChainContext), 1 subtable  [the orchestrator]
        let lk1_s = o.len();
        o[lk1_p..lk1_p+2].copy_from_slice(&((lk1_s - ll_start) as u16).to_be_bytes());
        o.extend_from_slice(&6u16.to_be_bytes()); // type
        o.extend_from_slice(&0u16.to_be_bytes()); // flag
        o.extend_from_slice(&1u16.to_be_bytes()); // subTableCount
        let st_p = o.len(); o.extend_from_slice(&0u16.to_be_bytes()); // subtableOffset

        // ChainContextSubstFormat3 subtable
        let st_s = o.len();
        o[st_p..st_p+2].copy_from_slice(&((st_s - lk1_s) as u16).to_be_bytes());
        o.extend_from_slice(&3u16.to_be_bytes());   // format
        o.extend_from_slice(&0u16.to_be_bytes());   // backtrackGlyphCount
        o.extend_from_slice(&1u16.to_be_bytes());   // inputGlyphCount
        let cov_p = o.len(); o.extend_from_slice(&0u16.to_be_bytes()); // inputCoverageOffset
        o.extend_from_slice(&0u16.to_be_bytes());   // lookaheadGlyphCount
        o.extend_from_slice(&1u16.to_be_bytes());   // substitutionCount
        // SubstLookupRecord: references lookup 0
        o.extend_from_slice(&0u16.to_be_bytes());   // sequenceIndex
        o.extend_from_slice(&0u16.to_be_bytes());   // lookupListIndex = 0
        // Coverage table (Format 1, 1 glyph)
        let cov_s = o.len();
        o[cov_p..cov_p+2].copy_from_slice(&((cov_s - st_s) as u16).to_be_bytes());
        o.extend_from_slice(&1u16.to_be_bytes()); // coverageFormat
        o.extend_from_slice(&1u16.to_be_bytes()); // glyphCount
        o.extend_from_slice(&1u16.to_be_bytes()); // glyph 1

        // Lookup 2: Type 1 (Single), 0 subtables  [calt's original]
        let lk2_s = o.len();
        o[lk2_p..lk2_p+2].copy_from_slice(&((lk2_s - ll_start) as u16).to_be_bytes());
        o.extend_from_slice(&1u16.to_be_bytes());
        o.extend_from_slice(&0u16.to_be_bytes());
        o.extend_from_slice(&0u16.to_be_bytes());

        o
    }

    #[test]
    fn inject_is_idempotent_and_dedup() {
        let gsub = build_minimal_gsub(false);
        let dlig = gsub_modifier::extract_feature_lookups(&gsub, Tag::new(b"dlig")).unwrap();
        let once = gsub_modifier::build_modified_gsub(&gsub, &dlig, &[]).unwrap();
        let twice = gsub_modifier::build_modified_gsub(&once, &dlig, &[]).unwrap();
        let c1 = gsub_modifier::extract_feature_lookups(&once, Tag::new(b"calt")).unwrap();
        let c2 = gsub_modifier::extract_feature_lookups(&twice, Tag::new(b"calt")).unwrap();
        assert_eq!(c1, c2, "re-injecting the same lookups must not duplicate");
    }

    // ── Feature-disable tests ─────────────────────────────────────────────
    // These verify that build_modified_gsub can CLEAR a feature's lookup
    // indices (disable), not just ADD to calt (enable).

    #[test]
    fn disable_feature_clears_lookups() {
        let gsub = build_minimal_gsub(false);
        let dlig = gsub_modifier::extract_feature_lookups(&gsub, Tag::new(b"dlig")).unwrap();
        assert_eq!(dlig, vec![1], "dlig starts with lookup [1]");
        let new_gsub = gsub_modifier::build_modified_gsub(&gsub, &[], &[Tag::new(b"dlig")]).unwrap();
        let dlig_after = gsub_modifier::extract_feature_lookups(&new_gsub, Tag::new(b"dlig")).unwrap();
        assert!(dlig_after.is_empty(), "dlig lookups must be empty after disable: {:?}", dlig_after);
    }

    #[test]
    fn disable_preserves_other_features() {
        let gsub = build_minimal_gsub(false);
        let calt_orig = gsub_modifier::extract_feature_lookups(&gsub, Tag::new(b"calt")).unwrap();
        let new_gsub = gsub_modifier::build_modified_gsub(&gsub, &[], &[Tag::new(b"dlig")]).unwrap();
        let calt_after = gsub_modifier::extract_feature_lookups(&new_gsub, Tag::new(b"calt")).unwrap();
        assert_eq!(calt_after, calt_orig, "calt must be unchanged when disabling dlig");
    }

    #[test]
    fn enable_and_disable_coexist() {
        let gsub = build_minimal_gsub(false);
        // Enable dlig (inject into calt) + disable dlig's own feature record
        // This means: calt gets dlig's lookups, dlig feature is cleared
        let new_gsub = gsub_modifier::build_modified_gsub(
            &gsub, &[1], &[Tag::new(b"dlig")]
        ).unwrap();
        let calt = gsub_modifier::extract_feature_lookups(&new_gsub, Tag::new(b"calt")).unwrap();
        let dlig = gsub_modifier::extract_feature_lookups(&new_gsub, Tag::new(b"dlig")).unwrap();
        assert!(calt.contains(&0), "calt retains original lookup 0: {:?}", calt);
        assert!(calt.contains(&1), "calt has injected lookup 1: {:?}", calt);
        assert!(dlig.is_empty(), "dlig is cleared: {:?}", dlig);
    }

    #[test]
    fn disable_calt_clears_original_but_keeps_injected() {
        let gsub = build_minimal_gsub(false);
        // calt starts with lookup [0], dlig has [1].
        // Disabling calt should clear its original [0] but injected [1] survives.
        let new_gsub = gsub_modifier::build_modified_gsub(
            &gsub, &[1], &[Tag::new(b"calt")]
        ).unwrap();
        let calt = gsub_modifier::extract_feature_lookups(&new_gsub, Tag::new(b"calt")).unwrap();
        assert!(!calt.contains(&0), "original calt lookup 0 must be cleared: {:?}", calt);
        assert!(calt.contains(&1), "injected lookup 1 must survive: {:?}", calt);
    }

    #[test]
    fn disable_calt_alone_clears_all_lookups() {
        let gsub = build_minimal_gsub(false);
        // calt starts with lookup [0]. Disabling calt with no enables → empty.
        let new_gsub = gsub_modifier::build_modified_gsub(
            &gsub, &[], &[Tag::new(b"calt")]
        ).unwrap();
        let calt = gsub_modifier::extract_feature_lookups(&new_gsub, Tag::new(b"calt")).unwrap();
        assert!(calt.is_empty(), "calt must be empty when disabled: {:?}", calt);
    }

    #[test]
    fn disable_nonexistent_feature_is_noop() {
        let gsub = build_minimal_gsub(false);
        // smcp doesn't exist in this font — should not crash or corrupt GSUB
        let new_gsub = gsub_modifier::build_modified_gsub(
            &gsub, &[], &[Tag::new(b"smcp")]
        ).unwrap();
        // GSUB should still be valid — calt and dlig unchanged
        let calt = gsub_modifier::extract_feature_lookups(&new_gsub, Tag::new(b"calt")).unwrap();
        let dlig = gsub_modifier::extract_feature_lookups(&new_gsub, Tag::new(b"dlig")).unwrap();
        assert_eq!(calt, vec![0]);
        assert_eq!(dlig, vec![1]);
    }

    #[test]
    fn disable_preserves_lookup_list() {
        let gsub = build_gsub_with_chain_context();
        // frac → [0, 1], lookup 0 is the helper
        // Disable frac — the lookup DATA must remain (other features may reference it)
        let new_gsub = gsub_modifier::build_modified_gsub(
            &gsub, &[], &[Tag::new(b"frac")]
        ).unwrap();
        let frac = gsub_modifier::extract_feature_lookups(&new_gsub, Tag::new(b"frac")).unwrap();
        assert!(frac.is_empty(), "frac cleared: {:?}", frac);
        // calt still has lookup 2 (its original) — lookups 0 and 1 are still in LookupList
        let calt = gsub_modifier::extract_feature_lookups(&new_gsub, Tag::new(b"calt")).unwrap();
        assert!(calt.contains(&2), "calt retains lookup 2: {:?}", calt);
    }

    // ── Bug 1: Double-firing when enabling default-on features ──────────────
    // When a feature is already in the LangSys (default-on for the script),
    // injecting its lookups into calt causes them to fire TWICE: once via
    // the original feature and once via calt. This produces glyph corruption
    // (e.g. "x" artifacts in Nastaliq). The baker should NOT inject lookups
    // from features that are already in the LangSys.

    /// Build a GSUB where a feature is in the LangSys (default-on).
    /// LangSys references feature indices: [calt_idx, other_feature_idx].
    fn build_gsub_with_langsys_feature(
        other_tag: &str,
        other_lookups: &[u16],
    ) -> Vec<u8> {
        let header_size = 10usize;
        // ScriptList: scriptCount(2) + ScriptRecord(6) + Script(4) + LangSys(2+2+2+2*2)
        let script_list_size = 2 + 6 + 4 + 2 + 2 + 2 + 2 * 2; // LangSys has 2 feature indices
        // FeatureList: count(2) + 2 records(6*2) + 2 tables(4 + (4 + other_lookups.len()*2))
        let other_table_size = 4 + other_lookups.len() * 2;
        let feature_list_size = 2 + 6 * 2 + 4 + other_table_size;
        // LookupList: count(2) + offsets
        let max_lookup = other_lookups.iter().copied().max().unwrap_or(0);
        let num_lookups = (max_lookup + 1) as usize;
        let lookup_list_size = 2 + num_lookups * 2 + num_lookups * 6;

        let script_list_off = header_size;
        let feature_list_off = script_list_off + script_list_size;
        let lookup_list_off = feature_list_off + feature_list_size;

        let mut o = Vec::new();
        // GSUB header
        o.extend_from_slice(&[0, 1, 0, 0]); // v1.0
        o.extend_from_slice(&(script_list_off as u16).to_be_bytes());
        o.extend_from_slice(&(feature_list_off as u16).to_be_bytes());
        o.extend_from_slice(&(lookup_list_off as u16).to_be_bytes());

        // ScriptList
        o.extend_from_slice(&1u16.to_be_bytes()); // scriptCount
        o.extend_from_slice(b"DFLT");
        o.extend_from_slice(&8u16.to_be_bytes()); // scriptOffset
        // Script
        o.extend_from_slice(&4u16.to_be_bytes()); // defaultLangSysOffset
        o.extend_from_slice(&0u16.to_be_bytes()); // langSysCount
        // LangSys — references BOTH calt (index 0) AND other feature (index 1)
        o.extend_from_slice(&0u16.to_be_bytes()); // lookupOrder
        o.extend_from_slice(&0xFFFFu16.to_be_bytes()); // reqFeatureIndex
        o.extend_from_slice(&2u16.to_be_bytes()); // featureIndexCount = 2
        o.extend_from_slice(&0u16.to_be_bytes()); // featureIndex[0] → calt
        o.extend_from_slice(&1u16.to_be_bytes()); // featureIndex[1] → other feature

        // FeatureList
        let feat_table_off = 2 + 6 * 2;
        o.extend_from_slice(&2u16.to_be_bytes()); // featureCount
        // calt record
        o.extend_from_slice(b"calt");
        o.extend_from_slice(&(feat_table_off as u16).to_be_bytes());
        // other feature record
        let other_tag_bytes: [u8; 4] = other_tag.as_bytes().try_into().unwrap_or(*b"XXXX");
        o.extend_from_slice(&other_tag_bytes);
        o.extend_from_slice(&((feat_table_off + 4) as u16).to_be_bytes());
        // calt feature table
        o.extend_from_slice(&0u16.to_be_bytes()); // featureParams
        o.extend_from_slice(&0u16.to_be_bytes()); // lookupCount (calt has no lookups)
        // other feature table
        o.extend_from_slice(&0u16.to_be_bytes()); // featureParams
        o.extend_from_slice(&(other_lookups.len() as u16).to_be_bytes());
        for &l in other_lookups {
            o.extend_from_slice(&l.to_be_bytes());
        }

        // LookupList
        let mut lookup_data_off = 2 + num_lookups * 2;
        o.extend_from_slice(&(num_lookups as u16).to_be_bytes());
        for _ in 0..num_lookups {
            o.extend_from_slice(&(lookup_data_off as u16).to_be_bytes());
            lookup_data_off += 6;
        }
        for _ in 0..num_lookups {
            o.extend_from_slice(&1u16.to_be_bytes()); // type = Single
            o.extend_from_slice(&0u16.to_be_bytes()); // flag
            o.extend_from_slice(&0u16.to_be_bytes()); // subtableCount
        }

        o
    }

    /// Extract LangSys feature indices from a GSUB table (DFLT script, default LangSys).
    fn extract_langsys_feature_indices(gsub: &[u8]) -> Vec<u16> {
        if gsub.len() < 10 { return vec![]; }
        let sl_off = u16::from_be_bytes([gsub[4], gsub[5]]) as usize;
        if sl_off + 2 > gsub.len() { return vec![]; }
        let script_count = u16::from_be_bytes([gsub[sl_off], gsub[sl_off+1]]) as usize;
        if script_count == 0 { return vec![]; }
        // First script record
        let script_rec_off = sl_off + 2;
        let script_off = u16::from_be_bytes([gsub[script_rec_off+4], gsub[script_rec_off+5]]) as usize;
        let script_abs = sl_off + script_off;
        if script_abs + 4 > gsub.len() { return vec![]; }
        let default_ls_off = u16::from_be_bytes([gsub[script_abs], gsub[script_abs+1]]) as usize;
        if default_ls_off == 0 { return vec![]; }
        let ls_abs = script_abs + default_ls_off;
        if ls_abs + 6 > gsub.len() { return vec![]; }
        let feature_count = u16::from_be_bytes([gsub[ls_abs+4], gsub[ls_abs+5]]) as usize;
        let mut indices = Vec::new();
        for i in 0..feature_count {
            let off = ls_abs + 6 + i * 2;
            if off + 2 > gsub.len() { break; }
            indices.push(u16::from_be_bytes([gsub[off], gsub[off+1]]));
        }
        indices
    }

    // ── E2E: Real font GSUB verification ─────────────────────────────────────
    // Uses the real NotoNastaliqUrdu.ttf to verify that disabling rlig
    // doesn't corrupt other features in the GSUB rebuild.

    #[test]
    fn real_font_disable_rlig_preserves_all_other_features() {
        let font_path = "../examples/fonts/NotoNastaliqUrdu.ttf";
        let font_data = match std::fs::read(font_path) {
            Ok(d) => d,
            Err(_) => {
                eprintln!("SKIP: {} not found", font_path);
                return;
            }
        };

        let gsub_raw = gsub_modifier::extract_gsub_table(&font_data).unwrap();

        // Disable rlig
        let baked = apply_font_features(&font_data, &[], &[Tag::new(b"rlig")]).unwrap();
        let gsub_baked = gsub_modifier::extract_gsub_table(&baked).unwrap();

        // Check each known feature tag
        for tag_bytes in &[b"aalt", b"ccmp", b"fina", b"init", b"isol", b"locl", b"medi", b"ordn", b"rlig"] {
            let tag = Tag::new(tag_bytes);
            let raw_lookups = gsub_modifier::extract_feature_lookups(&gsub_raw, tag).unwrap();
            let baked_lookups = gsub_modifier::extract_feature_lookups(&gsub_baked, tag).unwrap();

            if tag_bytes == &b"rlig" {
                assert!(
                    baked_lookups.is_empty(),
                    "rlig should be cleared, but has lookups: {:?}", baked_lookups
                );
            } else {
                let mut r = raw_lookups.clone();
                let mut b = baked_lookups.clone();
                r.sort();
                b.sort();
                assert_eq!(
                    r, b,
                    "Feature {:?} changed after disabling rlig! Before: {:?}, After: {:?}",
                    tag_bytes, raw_lookups, baked_lookups
                );
            }
        }

        // calt (created since NotoNastaliqUrdu has no calt) should be empty
        let calt_lookups = gsub_modifier::extract_feature_lookups(&gsub_baked, Tag::new(b"calt")).unwrap();
        assert!(
            calt_lookups.is_empty(),
            "calt should be empty (no lookups leaked from rlig): {:?}", calt_lookups
        );
    }

    #[test]
    fn enable_default_on_feature_should_not_inject_into_calt() {
        // Uses the real NotoNastaliqUrdu font, which has init/medi/fina/isol/
        // rlig/ccmp all in the LangSys (default-on). Enabling these via the
        // baker should be a NO-OP — their lookups should NOT be injected into
        // calt, because that would cause double-firing.
        let font_path = "../examples/fonts/NotoNastaliqUrdu.ttf";
        let font_data = match std::fs::read(font_path) {
            Ok(d) => d,
            Err(_) => {
                eprintln!("SKIP: {} not found", font_path);
                return;
            }
        };

        // Verify these features ARE default-on (in LangSys)
        let gsub_raw = gsub_modifier::extract_gsub_table(&font_data).unwrap();
        let default_on = gsub_modifier::extract_default_on_tags(&gsub_raw).unwrap();
        for tag_str in &["init", "medi", "fina", "isol", "rlig", "ccmp"] {
            let tb: [u8; 4] = tag_str.as_bytes().try_into().unwrap();
            let tag = Tag::new(&tb);
            assert!(
                default_on.contains(&tag),
                "{} should be default-on (in LangSys)", tag_str
            );
        }

        // Enable ALL default-on features via the baker
        let enable_tags: Vec<Tag> = ["init", "medi", "fina", "isol", "rlig", "ccmp"]
            .iter()
            .map(|s| { let tb: [u8; 4] = s.as_bytes().try_into().unwrap(); Tag::new(&tb) })
            .collect();
        let baked = apply_font_features(&font_data, &enable_tags, &[]).unwrap();
        let gsub_baked = gsub_modifier::extract_gsub_table(&baked).unwrap();

        // calt should be EMPTY — no lookups injected, since all enabled features
        // are already default-on. Injecting would cause double-firing (Bug 1).
        let calt = gsub_modifier::extract_feature_lookups(&gsub_baked, Tag::new(b"calt")).unwrap();
        assert!(
            calt.is_empty(),
            "BUG: calt contains lookups from default-on features. This causes double-firing. calt={:?}", calt
        );
    }

    // ── Inverse of Bug 1: non-always-on LangSys feature IS injected ────────
    // frac is in IBM Plex Sans's LangSys (available for the script) but NOT
    // in ALWAYS_ON_TAGS (not browser-default-on). Enabling frac SHOULD inject
    // its lookups into calt. This is the inverse of the test above (which
    // verifies always-on features are NOT injected). Together they prove the
    // ALWAYS_ON_TAGS intersection works correctly in both directions.
    #[test]
    fn non_always_on_langsys_feature_is_injected_into_calt() {
        let font_path = "../examples/fonts/IBMPlexSans.ttf";
        let font_data = match std::fs::read(font_path) {
            Ok(d) => d,
            Err(_) => {
                eprintln!("SKIP: {} not found", font_path);
                return;
            }
        };

        let gsub_raw = gsub_modifier::extract_gsub_table(&font_data).unwrap();

        // frac IS in the LangSys but must NOT be in the default-on set
        let default_on = gsub_modifier::extract_default_on_tags(&gsub_raw).unwrap();
        let frac_tag = Tag::new(b"frac");
        assert!(
            !default_on.contains(&frac_tag),
            "frac should NOT be default-on (not in ALWAYS_ON_TAGS)"
        );

        // Record frac's original lookups
        let frac_lookups =
            gsub_modifier::extract_feature_lookups(&gsub_raw, frac_tag).unwrap();
        assert!(
            !frac_lookups.is_empty(),
            "frac should have lookups in IBM Plex Sans"
        );

        // Enable frac — its lookups SHOULD be injected into calt
        let baked = apply_font_features(&font_data, &[frac_tag], &[]).unwrap();
        let gsub_baked = gsub_modifier::extract_gsub_table(&baked).unwrap();
        let calt =
            gsub_modifier::extract_feature_lookups(&gsub_baked, Tag::new(b"calt")).unwrap();

        for idx in &frac_lookups {
            assert!(
                calt.contains(idx),
                "frac lookup {} should be injected into calt, but calt={:?}",
                idx,
                calt
            );
        }
    }

    // ── Bug 2: Verify rlig is properly cleared when calt doesn't exist ──────
    // When the font has no calt feature, disabling rlig creates a new calt
    // (shifting all feature indices by 1). We verify rlig is cleared and
    // the LangSys correctly references the shifted indices.

    #[test]
    fn disable_rlig_without_calt_preserves_langsys_indices() {
        // Build a GSUB WITHOUT calt, with dlig → [0] and rlig → [1].
        // LangSys references both: [0 (dlig), 1 (rlig)].
        let gsub = build_gsub_without_calt_and_langsys();

        // Verify original LangSys
        let langsys_before = extract_langsys_feature_indices(&gsub);
        assert!(langsys_before.contains(&0), "dlig at index 0: {:?}", langsys_before);
        assert!(langsys_before.contains(&1), "rlig at index 1: {:?}", langsys_before);

        // Disable rlig
        let new_gsub = gsub_modifier::build_modified_gsub(
            &gsub, &[], &[Tag::new(b"rlig")]
        ).unwrap();

        // rlig should be cleared
        let rlig = gsub_modifier::extract_feature_lookups(&new_gsub, Tag::new(b"rlig")).unwrap();
        assert!(rlig.is_empty(), "rlig should be cleared: {:?}", rlig);

        // dlig should be unchanged
        let dlig = gsub_modifier::extract_feature_lookups(&new_gsub, Tag::new(b"dlig")).unwrap();
        assert_eq!(dlig, vec![0], "dlig should be unchanged: {:?}", dlig);

        // LangSys should reference shifted indices:
        // calt at index 0 (new), dlig at index 1 (was 0), rlig at index 2 (was 1)
        let langsys_after = extract_langsys_feature_indices(&new_gsub);
        assert!(
            langsys_after.contains(&1),
            "LangSys should reference dlig at shifted index 1: {:?}", langsys_after
        );
        assert!(
            langsys_after.contains(&2),
            "LangSys should reference rlig at shifted index 2: {:?}", langsys_after
        );
    }

    /// Build a GSUB without calt, with dlig → [0] and rlig → [1].
    /// LangSys references both features.
    fn build_gsub_without_calt_and_langsys() -> Vec<u8> {
        let header_size = 10usize;
        let script_list_size = 2 + 6 + 4 + 2 + 2 + 2 + 2 * 2; // 2 features in LangSys
        let feature_list_size = 2 + 6 * 2 + (4 + 2) + (4 + 2); // 2 features, 1 lookup each
        let lookup_list_size = 2 + 2 * 2 + 2 * 6; // 2 lookups

        let script_list_off = header_size;
        let feature_list_off = script_list_off + script_list_size;
        let lookup_list_off = feature_list_off + feature_list_size;

        let mut o = Vec::new();
        o.extend_from_slice(&[0, 1, 0, 0]);
        o.extend_from_slice(&(script_list_off as u16).to_be_bytes());
        o.extend_from_slice(&(feature_list_off as u16).to_be_bytes());
        o.extend_from_slice(&(lookup_list_off as u16).to_be_bytes());

        // ScriptList
        o.extend_from_slice(&1u16.to_be_bytes());
        o.extend_from_slice(b"DFLT");
        o.extend_from_slice(&8u16.to_be_bytes());
        o.extend_from_slice(&4u16.to_be_bytes()); // defaultLangSysOffset
        o.extend_from_slice(&0u16.to_be_bytes()); // langSysCount
        // LangSys: references dlig (index 0) and rlig (index 1)
        o.extend_from_slice(&0u16.to_be_bytes()); // lookupOrder
        o.extend_from_slice(&0xFFFFu16.to_be_bytes()); // reqFeatureIndex
        o.extend_from_slice(&2u16.to_be_bytes()); // featureIndexCount
        o.extend_from_slice(&0u16.to_be_bytes()); // → dlig
        o.extend_from_slice(&1u16.to_be_bytes()); // → rlig

        // FeatureList (NO calt!)
        let feat_table_off = 2 + 6 * 2;
        o.extend_from_slice(&2u16.to_be_bytes());
        o.extend_from_slice(b"dlig");
        o.extend_from_slice(&(feat_table_off as u16).to_be_bytes());
        o.extend_from_slice(b"rlig");
        o.extend_from_slice(&((feat_table_off + 4) as u16).to_be_bytes());
        // dlig table
        o.extend_from_slice(&0u16.to_be_bytes()); // params
        o.extend_from_slice(&1u16.to_be_bytes()); // lookupCount
        o.extend_from_slice(&0u16.to_be_bytes()); // lookup[0]
        // rlig table
        o.extend_from_slice(&0u16.to_be_bytes());
        o.extend_from_slice(&1u16.to_be_bytes());
        o.extend_from_slice(&1u16.to_be_bytes()); // lookup[1]

        // LookupList
        o.extend_from_slice(&2u16.to_be_bytes());
        o.extend_from_slice(&6u16.to_be_bytes()); // offset[0]
        o.extend_from_slice(&12u16.to_be_bytes()); // offset[1]
        // Lookup 0
        o.extend_from_slice(&1u16.to_be_bytes()); // type
        o.extend_from_slice(&0u16.to_be_bytes()); // flag
        o.extend_from_slice(&0u16.to_be_bytes()); // subtableCount
        // Lookup 1
        o.extend_from_slice(&1u16.to_be_bytes());
        o.extend_from_slice(&0u16.to_be_bytes());
        o.extend_from_slice(&0u16.to_be_bytes());

        o
    }

    #[test]
    fn disable_only_is_valid_when_no_enable_lookups() {
        // build_modified_gsub previously short-circuited on empty enable_lookups.
        // With disable tags, it must proceed even when enable_lookups is empty.
        let gsub = build_minimal_gsub(false);
        let new_gsub = gsub_modifier::build_modified_gsub(
            &gsub, &[], &[Tag::new(b"dlig")]
        ).unwrap();
        // Verify the GSUB version is preserved
        assert_eq!(&new_gsub[0..4], &[0, 1, 0, 0], "version 1.0 preserved");
        // Verify dlig is actually cleared (not just passed through unchanged)
        let dlig = gsub_modifier::extract_feature_lookups(&new_gsub, Tag::new(b"dlig")).unwrap();
        assert!(dlig.is_empty());
    }

    #[test]
    fn preserve_gsub_version_v1_0() {
        let gsub = build_minimal_gsub(false);
        assert_eq!(&gsub[0..4], &[0, 1, 0, 0]);
        let new_gsub = gsub_modifier::build_modified_gsub(&gsub, &[1], &[]).unwrap();
        assert_eq!(&new_gsub[0..4], &[0, 1, 0, 0], "v1.0 version preserved");
    }

    #[test]
    fn preserve_gsub_version_v1_1() {
        let gsub = build_minimal_gsub(true);
        assert_eq!(&gsub[0..4], &[0, 1, 0, 1]);
        let new_gsub = gsub_modifier::build_modified_gsub(&gsub, &[1], &[]).unwrap();
        assert_eq!(&new_gsub[0..4], &[0, 1, 0, 1], "v1.1 version preserved");
        assert!(new_gsub.len() >= 14, "v1.1 header is 14 bytes");
    }



}
