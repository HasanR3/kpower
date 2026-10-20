use crate::backend::traits::UpsBackend;
use crate::model::{UpsMode, UpsSnapshot};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct SimulatorBackend {
    seed: u64,
    tick: u64,
    connected: bool,
}

impl SimulatorBackend {
    pub fn new(seed: u64) -> Self {
        Self {
            seed,
            tick: 0,
            connected: true,
        }
    }

    pub fn set_connected(&mut self, connected: bool) {
        self.connected = connected;
    }
}

impl UpsBackend for SimulatorBackend {
    fn read_snapshot(&mut self) -> UpsSnapshot {
        self.tick = self.tick.wrapping_add(1);
        let wobble = ((self.tick + self.seed) as f32).sin() * 3.0;
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        if !self.connected {
            return UpsSnapshot {
                connected: false,
                mode: UpsMode::Unknown,
                load_percent: 0.0,
                battery_percent: 0.0,
                runtime_seconds: 0,
                input_voltage: 0.0,
                output_voltage: 0.0,
                frequency: 0.0,
                temperature_c: 0.0,
                alarm_codes: vec![],
                timestamp_ms: now,
            };
        }

        UpsSnapshot {
            connected: true,
            mode: UpsMode::Line,
            load_percent: 35.0 + wobble,
            battery_percent: 96.0,
            runtime_seconds: 5400,
            input_voltage: 230.0 + wobble,
            output_voltage: 229.0 + wobble * 0.5,
            frequency: 50.0,
            temperature_c: 28.0,
            alarm_codes: vec![],
            timestamp_ms: now,
        }
    }
}
