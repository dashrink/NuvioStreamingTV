// Core domain types module
//
// This module contains the foundational domain types for the Nuvio Streaming TV SDK.
// All types are designed to be FFI-compatible using UniFFI and support serialization via serde.

// Domain type modules
pub mod meta;

// Re-export domain types here as they are implemented
pub use meta::Meta;
// pub use stream::Stream;
// pub use catalog::Catalog;
// pub use profile::Profile;
