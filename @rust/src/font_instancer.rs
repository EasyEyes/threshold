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

// ==================== Variable Settings Parser ====================

mod variable_settings {
    use super::*;

    pub fn parse(settings: &str) -> Result<HashMap<FontTag, f32>, FontError> {
        let cleaned = settings.replace(['"', '\''], "");
        cleaned
            .split(',')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .map(AxisSetting::parse)
            .map(|result| result.map(|setting| (setting.tag, setting.value)))
            .collect()
    }
}

// ==================== GSUB Modifier ====================
// Modifies GSUB table to inject stylistic set lookups into calt feature,
// enabling stylistic alternates in Canvas 2D text rendering.

mod gsub_modifier {
    use super::*;
    use read_fonts::{FontRef, FontRead, types::Tag};

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
    const GSUB_TAG: Tag = Tag::new(b"GSUB");

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

    /// Build a modified GSUB table with SS lookups injected into calt
    /// 
    /// This uses a binary patching approach rather than full table reconstruction,
    /// which avoids complex API compatibility issues with write-fonts.
    pub fn build_modified_gsub(
        original_gsub: &[u8],
        ss_lookup_indices: &[u16],
    ) -> Result<Vec<u8>, FontError> {
        if ss_lookup_indices.is_empty() {
            return Ok(original_gsub.to_vec());
        }

        let gsub = read_fonts::tables::gsub::Gsub::read(read_fonts::FontData::new(original_gsub))
            .map_err(|e| FontError::GsubError(format!("Failed to parse GSUB: {:?}", e)))?;

        // Validate lookup indices are within bounds
        let lookup_list = gsub.lookup_list()
            .map_err(|e| FontError::GsubError(format!("Failed to read lookup list: {:?}", e)))?;
        let max_lookup = lookup_list.lookup_count() as u16;
        
        for &idx in ss_lookup_indices {
            if idx >= max_lookup {
                return Err(FontError::GsubError(
                    format!("Lookup index {} out of bounds (max: {})", idx, max_lookup)
                ));
            }
        }

        let feature_list = gsub.feature_list()
            .map_err(|e| FontError::GsubError(format!("Failed to read feature list: {:?}", e)))?;

        // Find calt feature and its lookup indices
        let mut calt_lookups: Vec<u16> = Vec::new();
        let mut calt_found = false;

        for feature_record in feature_list.feature_records() {
            if feature_record.feature_tag() == CALT_TAG {
                calt_found = true;
                let feature = feature_record.feature(feature_list.offset_data())
                    .map_err(|e| FontError::GsubError(format!("Failed to read calt feature: {:?}", e)))?;
                
                calt_lookups = feature.lookup_list_indices()
                    .iter()
                    .map(|idx| idx.get())
                    .collect();
                break;
            }
        }

        // Merge SS lookups with calt lookups (SS lookups at END for proper ordering)
        for idx in ss_lookup_indices {
            if !calt_lookups.contains(idx) {
                calt_lookups.push(*idx);
            }
        }

        // Build the modified GSUB table using binary construction
        build_gsub_with_modified_calt(original_gsub, &calt_lookups, calt_found)
    }

    /// Build GSUB table binary with modified calt feature
    fn build_gsub_with_modified_calt(
        original_gsub: &[u8],
        calt_lookups: &[u16],
        calt_exists: bool,
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

        // Copy the lookup list as-is from the original
        let lookup_list_offset = gsub.lookup_list_offset().to_u32() as usize;
        let lookup_list_data = &original_gsub[lookup_list_offset..];

        // Build the final GSUB table
        let mut output = Vec::new();
        
        // GSUB Header (version 1.0)
        output.extend_from_slice(&[0, 1, 0, 0]); // Major.Minor version
        
        // Calculate offsets with overflow checking
        let header_size: u16 = 10;
        let script_list_offset = header_size;
        let feature_list_offset = offset_add(script_list_offset, script_list_data.len())?;
        let new_lookup_list_offset = offset_add(feature_list_offset, feature_list_data.len())?;
        
        // Write offsets
        output.extend_from_slice(&script_list_offset.to_be_bytes());
        output.extend_from_slice(&feature_list_offset.to_be_bytes());
        output.extend_from_slice(&new_lookup_list_offset.to_be_bytes());
        
        // Write tables
        output.extend_from_slice(&script_list_data);
        output.extend_from_slice(&feature_list_data);
        output.extend_from_slice(lookup_list_data);
        
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

    /// Extract GSUB table data from a font
    pub fn extract_gsub_table(font_data: &[u8]) -> Result<Vec<u8>, FontError> {
        let font = FontRef::new(font_data)
            .map_err(|e| FontError::FontParseError(format!("Failed to parse font: {:?}", e)))?;
        
        let gsub_data = font.table_data(GSUB_TAG)
            .ok_or_else(|| FontError::GsubError("Font has no GSUB table".to_string()))?;
        
        Ok(gsub_data.as_bytes().to_vec())
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
    use read_fonts::{FontRef, types::Tag};

    /// GSUB table tag as u32
    const GSUB_TAG_U32: u32 = u32::from_be_bytes(*b"GSUB");

    /// Rebuild font with a specific table replaced
    pub fn rebuild_with_table(
        original_data: &[u8],
        target_table_tag: u32,
        new_table_data: &[u8],
    ) -> Result<Vec<u8>, FontError> {
        let header = parse_font_header(original_data)?;
        let table_tags = read_table_tags(original_data, header.num_tables)?;
        let tables = collect_tables_generic(original_data, &table_tags, target_table_tag, new_table_data)?;
        
        Ok(build_font_file(header.version_tag, tables))
    }

    /// Rebuild font with GSUB table replaced (convenience function)
    pub fn rebuild_with_gsub(
        original_data: &[u8],
        new_gsub_data: &[u8],
    ) -> Result<Vec<u8>, FontError> {
        rebuild_with_table(original_data, GSUB_TAG_U32, new_gsub_data)
    }

    struct FontHeader {
        version_tag: u32,
        num_tables: u16,
    }

    fn parse_font_header(data: &[u8]) -> Result<FontHeader, FontError> {
        if data.len() < 12 {
            return Err(FontError::ArrayBoundsError(
                "Font data too short for header".to_string()
            ));
        }
        
        Ok(FontHeader {
            version_tag: u32::from_be_bytes([
                *data.get(0).ok_or_else(|| FontError::ArrayBoundsError("Index 0 out of bounds".to_string()))?,
                *data.get(1).ok_or_else(|| FontError::ArrayBoundsError("Index 1 out of bounds".to_string()))?,
                *data.get(2).ok_or_else(|| FontError::ArrayBoundsError("Index 2 out of bounds".to_string()))?,
                *data.get(3).ok_or_else(|| FontError::ArrayBoundsError("Index 3 out of bounds".to_string()))?,
            ]),
            num_tables: u16::from_be_bytes([
                *data.get(4).ok_or_else(|| FontError::ArrayBoundsError("Index 4 out of bounds".to_string()))?,
                *data.get(5).ok_or_else(|| FontError::ArrayBoundsError("Index 5 out of bounds".to_string()))?,
            ]),
        })
    }

    fn read_table_tags(data: &[u8], num_tables: u16) -> Result<Vec<u32>, FontError> {
        let num_tables_usize = usize::from(num_tables);
        let required_len = 12 + num_tables_usize * 16;
        
        if data.len() < required_len {
            return Err(FontError::ArrayBoundsError(
                format!("Font data too short for {} table records", num_tables)
            ));
        }

        let mut tags = Vec::with_capacity(num_tables_usize);
        
        for i in 0..num_tables_usize {
            let offset = 12 + i * 16;
            
            // Use get() for bounds checking
            let bytes = [
                *data.get(offset).ok_or_else(|| FontError::ArrayBoundsError(format!("Offset {} out of bounds", offset)))?,
                *data.get(offset + 1).ok_or_else(|| FontError::ArrayBoundsError(format!("Offset {} out of bounds", offset + 1)))?,
                *data.get(offset + 2).ok_or_else(|| FontError::ArrayBoundsError(format!("Offset {} out of bounds", offset + 2)))?,
                *data.get(offset + 3).ok_or_else(|| FontError::ArrayBoundsError(format!("Offset {} out of bounds", offset + 3)))?,
            ];
            
            tags.push(u32::from_be_bytes(bytes));
        }
        
        Ok(tags)
    }

    /// Collect tables using read-fonts, replacing specified table
    fn collect_tables_generic(
        font_data: &[u8],
        tags: &[u32],
        target_tag: u32,
        new_table_data: &[u8],
    ) -> Result<Vec<(u32, Vec<u8>)>, FontError> {
        let font = FontRef::new(font_data)
            .map_err(|e| FontError::FontParseError(format!("Failed to parse font: {:?}", e)))?;

        let mut tables: Vec<(u32, Vec<u8>)> = tags
            .iter()
            .filter_map(|&tag| {
                let data = if tag == target_tag {
                    Some(new_table_data.to_vec())
                } else {
                    // Use read-fonts to get table data
                    let tag_obj = Tag::from_be_bytes(tag.to_be_bytes());
                    font.table_data(tag_obj).map(|d| d.as_bytes().to_vec())
                };
                data.map(|d| (tag, d))
            })
            .collect();
        
        tables.sort_by_key(|(tag, _)| *tag);
        Ok(tables)
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
                
                // Calculate next offset with overflow check
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

        let fvar = read_fvar_table(&provider)?;
        let coordinates = build_coordinates(&fvar, settings);
        
        validate_instancing_support(&provider)?;
        
        instance(&provider, &coordinates)
            .map(|(data, _)| data)
            .map_err(|e| FontError::FontParseError(format!("Instancing failed: {:?}", e)))
    }

    fn read_fvar_table<T: FontTableProvider>(provider: &T) -> Result<FvarTable<'static>, FontError> {
        let fvar_data = provider.table_data(tag::FVAR)
            .map_err(|e| FontError::FontParseError(format!("Failed to read fvar: {:?}", e)))?
            .ok_or(FontError::NotVariableFont)?;

        // Note: This creates a memory leak by using Box::leak to get a 'static lifetime.
        // In a WASM context where this runs once per font, this is acceptable.
        // The alternative would be to modify the allsorts library to accept owned data.
        let fvar_data_owned: Vec<u8> = fvar_data.to_vec();
        let fvar_data_leaked: &'static [u8] = Box::leak(fvar_data_owned.into_boxed_slice());
        
        let fvar_scope = ReadScope::new(fvar_data_leaked);
        fvar_scope.read::<FvarTable>()
            .map_err(|e| FontError::FontParseError(format!("Failed to parse fvar: {:?}", e)))
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

/// Apply stylistic sets by injecting their GSUB lookups into the calt feature.
/// The calt (Contextual Alternates) feature is typically enabled by default in browsers
/// and runs for all text, making it suitable for applying stylistic set substitutions.
#[wasm_bindgen]
pub fn apply_stylistic_sets(font_data: &[u8], stylistic_sets: &str) -> Result<Vec<u8>, String> {
    // 1. Parse stylistic set names to feature tags
    let ss_tags = gsub_modifier::parse_ss_tags(stylistic_sets)
        .map_err(|e| e.to_string())?;
    
    if ss_tags.is_empty() {
        return Err("No stylistic sets provided".to_string());
    }
    
    // 2. Extract GSUB table from font
    let gsub_data = gsub_modifier::extract_gsub_table(font_data)
        .map_err(|e| e.to_string())?;
    
    // 3. Collect lookup indices from all specified stylistic sets
    let mut all_ss_lookups: Vec<u16> = Vec::new();
    for tag in &ss_tags {
        let lookups = gsub_modifier::extract_feature_lookups(&gsub_data, *tag)
            .map_err(|e| e.to_string())?;
        
        if lookups.is_empty() {
            console_log(&format!("[fontProcessor] WARNING: No lookups for {:?}", tag));
        }
        
        // Add lookups, avoiding duplicates
        for lookup in lookups {
            if !all_ss_lookups.contains(&lookup) {
                all_ss_lookups.push(lookup);
            }
        }
    }
    
    if all_ss_lookups.is_empty() {
        console_log("[fontProcessor] No lookups found for stylistic sets - font unchanged");
        return Ok(font_data.to_vec());
    }
    
    // 4. Build modified GSUB with SS lookups in calt
    let new_gsub = gsub_modifier::build_modified_gsub(&gsub_data, &all_ss_lookups)
        .map_err(|e| e.to_string())?;
    
    // 5. Rebuild font with new GSUB
    font_rebuilder::rebuild_with_gsub(font_data, &new_gsub)
        .map_err(|e| e.to_string())
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

#[wasm_bindgen]
pub fn process_font(
    font_data: &[u8],
    variable_settings: &str,
    stylistic_sets: &str,
) -> Result<Vec<u8>, String> {
    let mut result = font_data.to_vec();
    
    if !variable_settings.trim().is_empty() {
        result = generate_static_font_instance(&result, variable_settings)?;
    }
    
    if !stylistic_sets.trim().is_empty() {
        result = apply_stylistic_sets(&result, stylistic_sets)?;
    }
    
    Ok(result)
}