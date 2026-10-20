use crate::model::UpsSnapshot;

pub trait UpsBackend: Send {
    fn read_snapshot(&mut self) -> UpsSnapshot;
}
