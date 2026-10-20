use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UpsMode {
    Line,
    Battery,
    Bypass,
    Fault,
    Unknown,
}

/// Live UPS telemetry — mirrors stock KPower Device → Data.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsSnapshot {
    pub connected: bool,
    pub mode: UpsMode,
    pub load_percent: f32,
    pub battery_percent: f32,
    pub runtime_seconds: u32,
    pub input_voltage: f32,
    pub output_voltage: f32,
    pub frequency: f32,
    /// Stock: Battery Single Voltage (V per cell)
    pub battery_single_voltage: f32,
    pub temperature_c: f32,
    pub alarm_codes: Vec<String>,
    pub timestamp_ms: u64,
}
