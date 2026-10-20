use kpower_app_lib::backend::{SimulatorBackend, UpsBackend};

#[test]
fn simulator_read_snapshot_is_connected() {
    let mut backend = SimulatorBackend::new(1);
    let snap = backend.read_snapshot();
    assert!(snap.connected);
    assert!(snap.input_voltage > 200.0 && snap.input_voltage < 260.0);
}
