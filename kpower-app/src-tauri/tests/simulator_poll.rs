use kpower_app_lib::backend::{SimulatorBackend, UpsBackend};

#[test]
fn simulator_read_snapshot_is_connected() {
    let mut backend = SimulatorBackend::new(1);
    let snap = backend.read_snapshot();
    assert!(snap.connected);
    // Stock-calibrated line baselines
    assert!(snap.input_voltage > 200.0 && snap.input_voltage < 230.0);
    assert!(snap.output_voltage > 200.0 && snap.output_voltage < 230.0);
    assert!((snap.frequency - 50.0).abs() < 0.01);
    assert!(snap.battery_single_voltage > 2.0 && snap.battery_single_voltage < 2.5);
    assert!(snap.load_percent > 5.0 && snap.load_percent < 20.0);
    assert!((snap.temperature_c - 23.0).abs() < 2.0);
}
