use kpower_app_lib::model::{UpsMode, UpsSnapshot};

#[test]
fn snapshot_serializes_camel_case() {
    let snap = UpsSnapshot {
        connected: true,
        mode: UpsMode::Battery,
        load_percent: 42.0,
        battery_percent: 88.5,
        runtime_seconds: 3600,
        input_voltage: 230.0,
        output_voltage: 229.0,
        frequency: 50.0,
        temperature_c: 31.0,
        alarm_codes: vec![],
        timestamp_ms: 1,
    };
    let json = serde_json::to_string(&snap).expect("serialize");
    assert!(json.contains("\"batteryPercent\""), "json={json}");
    assert!(json.contains("\"mode\":\"battery\""), "json={json}");
}
