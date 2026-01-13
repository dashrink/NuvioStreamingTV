# Risk Assessment: Tri-Layer Native Architecture Migration

**Document Version:** 1.0
**Date:** 2026-01-14
**Status:** Active Planning
**Project:** NuvioStreamingTV Architecture Migration

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Risk Matrix Overview](#risk-matrix-overview)
3. [Technical Risks](#technical-risks)
4. [Performance Risks](#performance-risks)
5. [Platform Risks](#platform-risks)
6. [Team & Process Risks](#team--process-risks)
7. [Application-Level Edge Cases](#application-level-edge-cases)
8. [FFI Technical Constraints](#ffi-technical-constraints)
9. [Mitigation Strategies Summary](#mitigation-strategies-summary)
10. [Contingency Planning](#contingency-planning)
11. [Risk Monitoring & Reporting](#risk-monitoring--reporting)
12. [References](#references)

---

## Executive Summary

This document provides a comprehensive risk assessment for migrating NuvioStreamingTV from React Native to a tri-layer native architecture (Rust SDK core + Kotlin/Swift UI). The assessment covers **14 critical edge cases** (5 application-level + 9 FFI technical constraints) identified in the architecture analysis, along with detailed mitigation strategies for each risk.

### Critical Risk Areas

| Risk Category | Total Risks | Critical | High | Medium | Low |
|---------------|-------------|----------|------|--------|-----|
| Technical Risks | 12 | 3 | 5 | 3 | 1 |
| Performance Risks | 8 | 2 | 4 | 2 | 0 |
| Platform Risks | 7 | 1 | 4 | 2 | 0 |
| Team & Process Risks | 6 | 0 | 2 | 3 | 1 |
| **Total** | **33** | **6** | **15** | **10** | **2** |

### Top 5 Critical Risks

1. **Data Migration from MMKV** (Technical) - Risk of user data loss during storage migration
2. **FFI Memory Leaks** (Technical) - Memory allocated across FFI boundary not properly freed
3. **Video Playback Regressions** (Performance) - DRM, subtitles, or streaming breaks in native players
4. **TV Focus Navigation Breaks** (Platform) - D-pad navigation becomes unusable on Android TV/tvOS
5. **FFI Panic Propagation** (Technical) - Rust panics cause undefined behavior across FFI boundary

### Risk Mitigation Investment

- **Phase 1 (Foundation):** 40% of effort dedicated to risk mitigation (FFI validation, memory testing)
- **Phase 2 (Core Logic):** 30% of effort (data migration testing, performance benchmarking)
- **Phase 3 (Native UI):** 35% of effort (TV focus testing, platform-specific validation)
- **Phase 4 (Advanced):** 25% of effort (video playback matrix testing)
- **Phase 5 (Rollout):** 20% of effort (monitoring, rollback procedures)

---

## Risk Matrix Overview

### Risk Scoring Methodology

**Probability:**
- **VERY HIGH:** >75% likelihood
- **HIGH:** 50-75% likelihood
- **MEDIUM:** 25-50% likelihood
- **LOW:** 10-25% likelihood
- **VERY LOW:** <10% likelihood

**Impact:**
- **CRITICAL:** App unusable, data loss, security breach
- **HIGH:** Core functionality broken, major UX degradation
- **MEDIUM:** Feature degradation, minor UX issues
- **LOW:** Cosmetic issues, non-critical features affected

**Severity Calculation:** `Severity = Probability × Impact`

### Master Risk Matrix

| Risk ID | Risk Name | Probability | Impact | Severity | Phase | Mitigation Status |
|---------|-----------|-------------|--------|----------|-------|-------------------|
| **TECH-01** | Data Migration Data Loss | MEDIUM | CRITICAL | **CRITICAL** | 1-2 | Planned |
| **TECH-02** | FFI Memory Leaks | MEDIUM-HIGH | HIGH | **HIGH** | 1-4 | Planned |
| **TECH-03** | FFI Panic Propagation | MEDIUM | CRITICAL | **HIGH** | 1-4 | Planned |
| **TECH-04** | Rust ABI Instability | LOW | HIGH | **MEDIUM** | 1 | Planned |
| **TECH-05** | String Memory Management | MEDIUM-HIGH | MEDIUM | **MEDIUM** | 1-4 | Planned |
| **TECH-06** | JNI Conversion Errors | MEDIUM | MEDIUM | **MEDIUM** | 1-4 | Planned |
| **TECH-07** | Android Two-Layer Overhead | HIGH | MEDIUM | **MEDIUM** | 1-4 | Planned |
| **TECH-08** | Async Operation Deadlocks | MEDIUM | HIGH | **HIGH** | 2-4 | Planned |
| **TECH-09** | Error Propagation Gaps | MEDIUM | HIGH | **MEDIUM** | 1-4 | Planned |
| **TECH-10** | Build Toolchain Complexity | HIGH | MEDIUM | **MEDIUM** | 1 | Planned |
| **TECH-11** | Circular Dependencies | LOW | MEDIUM | **LOW** | 2 | Planned |
| **TECH-12** | State Synchronization | MEDIUM | HIGH | **HIGH** | 2-3 | Planned |
| **PERF-01** | Video Playback Regression | MEDIUM | CRITICAL | **CRITICAL** | 4 | Planned |
| **PERF-02** | FFI Call Overhead | MEDIUM-HIGH | HIGH | **HIGH** | 1-4 | Planned |
| **PERF-03** | JNI Marshalling Cost | HIGH | MEDIUM | **MEDIUM** | 1-4 | Planned |
| **PERF-04** | Cold Start Regression | MEDIUM | HIGH | **MEDIUM** | 2-3 | Planned |
| **PERF-05** | Stream Resolution Latency | MEDIUM | HIGH | **MEDIUM** | 2 | Planned |
| **PERF-06** | Cache Thrashing | LOW | MEDIUM | **LOW** | 2 | Planned |
| **PERF-07** | Memory Footprint Increase | MEDIUM | MEDIUM | **MEDIUM** | 2-4 | Planned |
| **PERF-08** | Battery Drain | LOW | MEDIUM | **LOW** | 3-4 | Planned |
| **PLAT-01** | TV Focus Navigation Breaks | MEDIUM-HIGH | CRITICAL | **HIGH** | 3 | Planned |
| **PLAT-02** | Google Cast Integration | MEDIUM | HIGH | **HIGH** | 4 | Planned |
| **PLAT-03** | Offline Content Access | MEDIUM | HIGH | **MEDIUM** | 4 | Planned |
| **PLAT-04** | Platform API Incompatibility | MEDIUM | HIGH | **MEDIUM** | 3-4 | Planned |
| **PLAT-05** | App Store Rejection | LOW | HIGH | **MEDIUM** | 5 | Planned |
| **PLAT-06** | Deep Linking Breaks | MEDIUM | MEDIUM | **MEDIUM** | 3 | Planned |
| **PLAT-07** | Push Notifications | LOW | MEDIUM | **LOW** | 5 | Planned |
| **TEAM-01** | Rust Learning Curve | HIGH | MEDIUM | **MEDIUM** | 1-2 | Planned |
| **TEAM-02** | Kotlin/Swift Learning Curve | MEDIUM-HIGH | MEDIUM | **MEDIUM** | 3 | Planned |
| **TEAM-03** | Scope Creep | HIGH | HIGH | **HIGH** | 1-5 | Planned |
| **TEAM-04** | Resource Constraints | MEDIUM | HIGH | **HIGH** | 1-5 | Planned |
| **TEAM-05** | Knowledge Silos | MEDIUM | MEDIUM | **MEDIUM** | 1-5 | Planned |
| **TEAM-06** | Burnout | MEDIUM | MEDIUM | **MEDIUM** | 1-5 | Planned |

---

## Technical Risks

### TECH-01: Data Migration Data Loss

**Severity:** CRITICAL (Probability: MEDIUM × Impact: CRITICAL)

#### Description

User data stored in MMKV (150+ keys including profiles, watch history, settings, downloads) could be corrupted or lost during migration to Rust SDK storage layer.

#### Root Causes
- Complex data migration logic with edge cases
- MMKV → Rust storage format incompatibility
- Concurrent reads/writes during migration
- Schema evolution mismatches
- Missing data validation

#### Impact Analysis
- **User Impact:** Loss of profiles, watch history, settings, download queue
- **Business Impact:** User churn, negative reviews, support burden
- **Technical Impact:** Data corruption requiring app reinstall
- **Estimated Affected Users:** 10-30% if not properly tested

#### Mitigation Strategy

**Phase 1-2 (Foundation & Core Logic):**

1. **Parallel Storage Pattern:**
   ```rust
   // Rust SDK reads from MMKV, writes to both MMKV + Rust storage
   pub struct HybridStorage {
       mmkv: MmkvAdapter,
       rust_storage: SqliteStorage,
       mode: StorageMode, // ReadMMKV, WriteBoth, ReadRust
   }
   ```

2. **Gradual Migration Timeline:**
   - **Month 1-4:** Write to both MMKV + Rust storage, read from MMKV
   - **Month 5-8:** Write to both, read from Rust (MMKV fallback)
   - **Month 9-12:** Read/write Rust only, MMKV deprecated

3. **Data Validation:**
   - Checksum verification for migrated data
   - Schema validation before write
   - Automated data integrity tests (100+ test cases)
   - Production data sampling (1% users for 2 weeks)

4. **Export/Import Tooling:**
   ```bash
   # User-facing data export
   ./nuvio-cli export-user-data --output backup.json
   # Validation and import
   ./nuvio-cli validate-backup backup.json
   ./nuvio-cli import-user-data backup.json
   ```

5. **Rollback Capability:**
   - Keep MMKV data intact during migration
   - Feature flag: `RUST_STORAGE_ENABLED`
   - Instant rollback to MMKV if corruption detected

#### Detection Mechanisms

- **Automated Monitoring:**
  - Data consistency checks on app startup
  - Compare MMKV vs Rust storage on every write (Phase 2)
  - Sentry alerts for data access errors

- **User Reporting:**
  - In-app feedback: "Is your data missing?"
  - Analytics: Profile count, watch history length tracking

#### Success Criteria

- ✅ Zero user-reported data loss
- ✅ 100% data parity between MMKV and Rust storage in Phase 2
- ✅ <0.1% data migration errors in production
- ✅ Rollback test successful in staging

#### Contingency Plan

**Trigger:** >1% users report data loss OR >0.5% data integrity check failures

**Actions:**
1. Immediate rollback via `RUST_STORAGE_ENABLED=false`
2. Force MMKV read mode for all users
3. Pause migration, investigate root cause
4. Implement fix, re-test in staging
5. Gradual re-rollout starting at 1% users

**Timeline:** <1 hour for rollback, 1-2 weeks for fix

---

### TECH-02: FFI Memory Leaks

**Severity:** HIGH (Probability: MEDIUM-HIGH × Impact: HIGH)

#### Description

Memory allocated by Rust and passed to Kotlin/Swift may not be properly freed, causing memory leaks that degrade performance over time and eventually crash the app on memory-constrained TV devices.

#### Root Causes
- Missing `_free()` functions for FFI types
- Kotlin/Swift code not calling free functions
- Circular references preventing deallocation
- UniFFI-generated code bugs
- Rust `Arc<T>` clones not properly dropped

#### Impact Analysis
- **User Impact:** App slowdown, crashes after 30-60 minutes of use
- **Device Impact:** TV devices (512MB-2GB RAM) crash faster than phones
- **Technical Impact:** Memory usage grows unbounded
- **Estimated Affected Users:** 60-80% on TV devices if not detected early

#### Mitigation Strategy

**Phase 1 (Foundation):**

1. **Explicit Free Functions:**
   ```rust
   #[no_mangle]
   pub extern "C" fn nuvio_profile_free(ptr: *mut Profile) {
       if !ptr.is_null() {
           unsafe { drop(Box::from_raw(ptr)) };
       }
   }
   ```

2. **Memory Ownership Rules (Documented):**
   ```
   RULE 1: Rust allocates → Rust frees (always)
   RULE 2: Kotlin/Swift must call *_free() when done
   RULE 3: Strings: Use CString::into_raw() + nuvio_string_free()
   RULE 4: Arrays: Use Vec::into_raw_parts() + nuvio_array_free()
   RULE 5: Arc clones: Use Arc::into_raw() + nuvio_arc_free()
   ```

3. **RAII Wrappers (Kotlin/Swift):**
   ```kotlin
   // Kotlin: AutoCloseable pattern
   class ProfileWrapper(private val ptr: Long) : AutoCloseable {
       override fun close() {
           NuvioFFI.nuvio_profile_free(ptr)
       }
   }

   // Usage:
   ProfileWrapper(profilePtr).use { profile ->
       // Automatically freed when scope exits
   }
   ```

   ```swift
   // Swift: deinit pattern
   class ProfileWrapper {
       private var ptr: OpaquePointer?

       deinit {
           if let ptr = ptr {
               nuvio_profile_free(ptr)
           }
       }
   }
   ```

4. **Memory Leak Detection Tools:**
   - **Rust:** Valgrind on Linux, `cargo-valgrind`
   - **Android:** LeakCanary integration in debug builds
   - **iOS:** Instruments → Leaks/Allocations profiling

5. **Automated Memory Testing:**
   ```bash
   # CI/CD: Memory leak tests
   ./scripts/memory-leak-test.sh
   # Runs 1000 FFI operations, monitors memory growth
   # Fails if memory increases >10% over baseline
   ```

#### Detection Mechanisms

- **Development:**
  - LeakCanary in debug builds (Android)
  - Xcode Memory Graph Debugger (iOS)
  - Valgrind on Rust unit tests

- **Production:**
  - Memory usage telemetry (Firebase Performance)
  - Crash analytics (Sentry) for OOM crashes
  - User reports: "App is slow/crashing"

#### Success Criteria

- ✅ Zero memory leaks detected by Valgrind in Rust tests
- ✅ Zero leaks detected by LeakCanary in Android debug builds
- ✅ Zero leaks detected by Instruments in iOS profiling
- ✅ Memory usage stable after 2 hours of use (<5% growth)

#### Contingency Plan

**Trigger:** Memory usage grows >20% per hour OR OOM crash rate >0.5%

**Actions:**
1. Profile with LeakCanary/Instruments to identify leak source
2. Implement missing free functions
3. Add RAII wrappers for problematic types
4. Hotfix release within 48 hours
5. If unfixable quickly, rollback feature flag

**Timeline:** 1-2 days for identification, 2-3 days for fix

---

### TECH-03: FFI Panic Propagation (Critical Constraint #7)

**Severity:** HIGH (Probability: MEDIUM × Impact: CRITICAL)

#### Description

Rust `panic!` propagating across the FFI boundary causes **undefined behavior** (UB) in C/Kotlin/Swift, leading to crashes, data corruption, or security vulnerabilities. This is a **critical FFI technical constraint**.

#### Root Causes
- Rust code panics without `catch_unwind` wrapper
- `unwrap()` or `expect()` on FFI functions
- Assertion failures in FFI code paths
- Out-of-bounds array access
- Integer overflow (in debug mode)

#### Impact Analysis
- **User Impact:** Instant app crash, no error message
- **Technical Impact:** Undefined behavior, possible memory corruption
- **Security Impact:** Potential exploit vector
- **Estimated Affected Users:** 100% if panic occurs in common code path

#### Mitigation Strategy

**Phase 1 (Foundation):**

1. **Mandatory catch_unwind Wrapper:**
   ```rust
   use std::panic::catch_unwind;
   use std::os::raw::c_char;

   #[no_mangle]
   pub extern "C" fn nuvio_profile_create(
       name_ptr: *const c_char,
       pin_ptr: *const c_char,
       out_error: *mut FFIError,
   ) -> *mut Profile {
       let result = catch_unwind(|| {
           // All FFI logic here
           let name = unsafe { CStr::from_ptr(name_ptr) }.to_str()?;
           let pin = unsafe { CStr::from_ptr(pin_ptr) }.to_str()?;
           ProfileManager::create_profile(name, pin)
       });

       match result {
           Ok(Ok(profile)) => Box::into_raw(Box::new(profile)),
           Ok(Err(e)) => {
               unsafe { *out_error = e.to_ffi_error(); }
               std::ptr::null_mut()
           },
           Err(panic) => {
               unsafe { *out_error = FFIError::panic(); }
               std::ptr::null_mut()
           }
       }
   }
   ```

2. **Ban Panic-Inducing Functions (Clippy Lint):**
   ```toml
   # .cargo/config.toml
   [lints.clippy]
   unwrap_used = "deny"
   expect_used = "deny"
   indexing_slicing = "deny"
   panic = "deny"
   ```

3. **Result-Based Error Handling:**
   ```rust
   // GOOD: Return Result
   pub fn get_profile(id: &str) -> Result<Profile, NuvioError> {
       storage.get(id).ok_or(NuvioError::NotFound)
   }

   // BAD: Panic
   pub fn get_profile(id: &str) -> Profile {
       storage.get(id).unwrap() // ❌ BANNED
   }
   ```

4. **Panic Hook (Last Resort):**
   ```rust
   use std::panic;

   pub fn initialize_sdk() {
       panic::set_hook(Box::new(|panic_info| {
           error!("PANIC ACROSS FFI: {:?}", panic_info);
           // Log to Sentry, but DO NOT propagate
       }));
   }
   ```

5. **Automated Panic Testing:**
   ```rust
   #[test]
   fn test_ffi_no_panic() {
       let result = std::panic::catch_unwind(|| {
           nuvio_profile_create(
               std::ptr::null(), // Invalid input
               std::ptr::null(),
               &mut FFIError::default(),
           )
       });
       assert!(result.is_ok(), "FFI function panicked!");
   }
   ```

#### Detection Mechanisms

- **Development:**
  - Clippy lints catch `unwrap()` at compile time
  - Unit tests with `catch_unwind` verify no panics
  - Code review checklist: "All FFI functions have catch_unwind?"

- **Production:**
  - Sentry crash reports
  - Custom panic hook logging
  - User reports: "App crashed"

#### Success Criteria

- ✅ Zero `unwrap()` or `expect()` in FFI code paths (enforced by Clippy)
- ✅ 100% of FFI functions wrapped in `catch_unwind`
- ✅ All FFI functions tested with invalid inputs (null pointers, invalid UTF-8)
- ✅ Zero panic-related crashes in production

#### Contingency Plan

**Trigger:** Crash attributed to panic across FFI

**Actions:**
1. Identify panic source from Sentry stack trace
2. Add `catch_unwind` wrapper
3. Add regression test for the panic scenario
4. Hotfix release within 24 hours
5. Audit all FFI functions for similar issues

**Timeline:** <24 hours for fix

---

### TECH-04: Rust ABI Instability (Critical Constraint #6)

**Severity:** MEDIUM (Probability: LOW × Impact: HIGH)

#### Description

Rust does NOT have a stable ABI. Using `extern "Rust"` or Rust types directly across FFI will cause crashes if Rust compiler version changes. **Must use `extern "C"` with C ABI for all FFI boundaries**.

#### Root Causes
- Developer accidentally uses `extern "Rust"`
- Passing Rust-specific types (Vec, String, Result) directly
- Relying on Rust struct layout across FFI
- Mixing Rust compiler versions

#### Impact Analysis
- **User Impact:** App crashes on startup after Rust upgrade
- **Technical Impact:** All FFI functions break simultaneously
- **Build Impact:** Silent ABI breakage, difficult to debug

#### Mitigation Strategy

**Phase 1 (Foundation):**

1. **Mandatory extern "C":**
   ```rust
   // GOOD: C ABI
   #[no_mangle]
   pub extern "C" fn nuvio_init() -> bool { ... }

   // BAD: Rust ABI (unstable)
   #[no_mangle]
   pub extern "Rust" fn nuvio_init() -> bool { ... } // ❌ BANNED
   ```

2. **C-Compatible Types Only:**
   ```rust
   // GOOD: C types
   #[repr(C)]
   pub struct Profile {
       id_ptr: *const c_char,
       name_ptr: *const c_char,
       age: u32,
   }

   // BAD: Rust types
   pub struct Profile {
       id: String,  // ❌ Not C-compatible
       name: Vec<u8>, // ❌ Not C-compatible
   }
   ```

3. **#[repr(C)] for All FFI Structs:**
   ```rust
   #[repr(C)]
   pub struct FFIError {
       code: u32,
       message_ptr: *const c_char,
   }
   ```

4. **UniFFI Handles This Automatically:**
   - UniFFI always generates `extern "C"` functions
   - UniFFI uses `#[repr(C)]` for FFI types
   - Validates ABI compatibility at build time

5. **CI/CD ABI Validation:**
   ```bash
   # Check all FFI functions use extern "C"
   grep -r 'pub extern "Rust"' rust-sdk/src/ && exit 1
   # Check all FFI structs use #[repr(C)]
   grep -r '^pub struct' rust-sdk/src/ffi/ | \
     grep -v '#\[repr(C)\]' && exit 1
   ```

#### Detection Mechanisms

- **Development:**
  - Compiler warnings for ABI issues
  - UniFFI validation during build
  - Code review checklist

- **Production:**
  - App crashes on startup after Rust upgrade
  - Sentry: "Illegal instruction" or segfault

#### Success Criteria

- ✅ 100% of FFI functions use `extern "C"`
- ✅ 100% of FFI structs use `#[repr(C)]`
- ✅ UniFFI validation passes in CI/CD
- ✅ Zero ABI-related crashes after Rust upgrades

#### Contingency Plan

**Trigger:** App crashes after Rust compiler upgrade

**Actions:**
1. Rollback Rust compiler version
2. Audit all FFI code for non-C ABI usage
3. Add CI/CD validation to prevent recurrence
4. Re-upgrade Rust with proper validation

**Timeline:** <2 hours for rollback, 1-2 days for fix

---

### TECH-05: String Memory Management (Critical Constraint #11)

**Severity:** MEDIUM (Probability: MEDIUM-HIGH × Impact: MEDIUM)

#### Description

Strings crossing the FFI boundary require explicit memory management using `CString::into_raw()` and corresponding free functions. Improper handling causes memory leaks or use-after-free bugs.

#### Root Causes
- Forgetting to call `nuvio_string_free()`
- Double-free errors
- Using String after it's been freed
- Incorrect UTF-8 validation

#### Mitigation Strategy

**Phase 1 (Foundation):**

1. **String Ownership Pattern:**
   ```rust
   // Rust allocates string, returns raw pointer
   #[no_mangle]
   pub extern "C" fn nuvio_get_profile_name(profile_id: *const c_char) -> *mut c_char {
       let result = catch_unwind(|| {
           let id = unsafe { CStr::from_ptr(profile_id) }.to_str()?;
           let name = ProfileManager::get_name(id)?;
           CString::new(name)?.into_raw()
       });

       match result {
           Ok(Ok(ptr)) => ptr,
           _ => std::ptr::null_mut(),
       }
   }

   // Kotlin/Swift MUST call this when done
   #[no_mangle]
   pub extern "C" fn nuvio_string_free(ptr: *mut c_char) {
       if !ptr.is_null() {
           unsafe { drop(CString::from_raw(ptr)) };
       }
   }
   ```

2. **Kotlin Wrapper:**
   ```kotlin
   fun getProfileName(profileId: String): String? {
       val cProfileId = profileId.toCString()
       val resultPtr = NuvioFFI.nuvio_get_profile_name(cProfileId)
       cProfileId.free() // Free input string

       if (resultPtr == null) return null

       val result = resultPtr.toKString()
       NuvioFFI.nuvio_string_free(resultPtr) // Free output string
       return result
   }
   ```

3. **Swift Wrapper:**
   ```swift
   func getProfileName(profileId: String) -> String? {
       let cProfileId = (profileId as NSString).utf8String
       let resultPtr = nuvio_get_profile_name(cProfileId)

       guard let resultPtr = resultPtr else { return nil }
       defer { nuvio_string_free(resultPtr) } // Auto-free on scope exit

       return String(cString: resultPtr)
   }
   ```

4. **UTF-8 Validation:**
   ```rust
   let name = unsafe { CStr::from_ptr(name_ptr) }
       .to_str()
       .map_err(|_| NuvioError::InvalidInput("Invalid UTF-8"))?;
   ```

#### Success Criteria

- ✅ All string allocations have matching free functions
- ✅ Kotlin/Swift wrappers always call free
- ✅ Zero use-after-free detected by AddressSanitizer
- ✅ Zero string-related memory leaks

---

### TECH-06: JNI Conversion Errors (Critical Constraint #10)

**Severity:** MEDIUM (Probability: MEDIUM × Impact: MEDIUM)

#### Description

Android's JNI layer requires manual conversion between Java/Kotlin types and C types. Incorrect conversion causes data corruption or crashes.

#### Mitigation Strategy

**Phase 1 (Foundation):**

1. **UniFFI Auto-Generated JNI:**
   - UniFFI generates JNI wrapper code automatically
   - Handles type conversion (String, List, Map, etc.)
   - Validates data at JNI boundary

2. **Manual JNI Validation (If Needed):**
   ```kotlin
   // Example: String conversion
   val jString: String = "Hello"
   val cString: ByteArray = jString.toByteArray(Charsets.UTF_8)
   val cStringPtr: Long = NuvioFFI.allocateCString(cString)

   // Use cStringPtr...

   NuvioFFI.freeCString(cStringPtr)
   ```

3. **JNI Error Checking:**
   ```cpp
   // C++ JNI wrapper
   jstring Java_com_nuvio_FFI_getProfileName(JNIEnv *env, jobject, jlong profileId) {
       const char* result = nuvio_get_profile_name(profileId);
       if (result == nullptr) {
           return nullptr; // Error handled by Kotlin
       }
       jstring jResult = env->NewStringUTF(result);
       nuvio_string_free((char*)result);
       return jResult;
   }
   ```

#### Success Criteria

- ✅ UniFFI handles 100% of JNI conversions
- ✅ Manual JNI code (if any) has null checks
- ✅ Zero JNI-related crashes in production

---

### TECH-07: Android Two-Layer Binding Overhead (Critical Constraint #9)

**Severity:** MEDIUM (Probability: HIGH × Impact: MEDIUM)

#### Description

Android requires Rust → C ABI → JNI → Kotlin (two-layer binding), causing 50-100μs overhead per FFI call vs iOS's 20-50μs single-layer FFI.

#### Mitigation Strategy

**Phase 1-4 (All Phases):**

1. **Batch FFI Operations:**
   ```kotlin
   // BAD: 100 FFI calls
   for (profile in profiles) {
       NuvioFFI.getProfileName(profile.id) // 100 × 50μs = 5ms
   }

   // GOOD: 1 FFI call
   val names = NuvioFFI.getProfileNamesBatch(profiles.map { it.id }) // 50μs total
   ```

2. **Coarse-Grained APIs:**
   ```rust
   // GOOD: Single FFI call returns all data
   pub fn get_profile_full(id: &str) -> Result<ProfileFull, NuvioError> {
       Ok(ProfileFull {
           profile: get_profile(id)?,
           stats: get_stats(id)?,
           preferences: get_preferences(id)?,
       })
   }
   ```

3. **Cache Frequently Accessed Data:**
   ```kotlin
   class ProfileRepository {
       private val profileCache = LruCache<String, Profile>(100)

       suspend fun getProfile(id: String): Profile {
           return profileCache.get(id) ?: run {
               val profile = NuvioFFI.getProfile(id)
               profileCache.put(id, profile)
               profile
           }
       }
   }
   ```

4. **Performance Target:**
   - Target: <10 FFI calls per user interaction
   - Measure with Android Profiler

#### Success Criteria

- ✅ <10 FFI calls per user interaction
- ✅ Batch APIs available for all high-frequency operations
- ✅ 50%+ reduction in FFI call count vs naive implementation

---

**(Continuing with remaining technical risks...)**

### TECH-08: Async Operation Deadlocks

**Severity:** HIGH (Probability: MEDIUM × Impact: HIGH)

#### Description

Asynchronous operations across FFI boundary can deadlock if Rust async runtime (Tokio) and Kotlin/Swift async systems (coroutines/async-await) are not properly coordinated.

#### Mitigation Strategy

**Phase 2-4 (Core Logic & Advanced Features):**

1. **Tokio Runtime Setup:**
   ```rust
   lazy_static! {
       static ref TOKIO_RT: Runtime = Runtime::new().unwrap();
   }

   #[no_mangle]
   pub extern "C" fn nuvio_init_async() {
       TOKIO_RT.spawn(async {
           // Background tasks
       });
   }
   ```

2. **FFI Callback Pattern:**
   ```rust
   type ProgressCallback = extern "C" fn(progress: f32);

   #[no_mangle]
   pub extern "C" fn nuvio_download_content(
       content_id: *const c_char,
       callback: ProgressCallback,
   ) {
       TOKIO_RT.spawn(async move {
           for progress in download_stream(content_id).await {
               callback(progress); // Call Kotlin/Swift
           }
       });
   }
   ```

3. **Kotlin Coroutine Bridge:**
   ```kotlin
   suspend fun downloadContent(contentId: String): Flow<Float> = callbackFlow {
       val callback: (Float) -> Unit = { progress ->
           trySend(progress)
       }
       NuvioFFI.nuvio_download_content(contentId, callback)
       awaitClose()
   }
   ```

4. **Deadlock Prevention:**
   - Never block Tokio runtime waiting for FFI callback
   - Use separate thread pool for FFI callbacks
   - Timeout all async operations (30s default)

#### Success Criteria

- ✅ Zero deadlocks in async operations
- ✅ All async FFI calls have timeouts
- ✅ Stress test: 100 concurrent async operations

---

### TECH-09: Error Propagation Gaps (Critical Constraint #14)

**Severity:** MEDIUM (Probability: MEDIUM × Impact: HIGH)

#### Description

Errors cannot be directly propagated across FFI (no Rust Result → Kotlin/Swift exceptions). Missing error handling causes silent failures.

#### Mitigation Strategy

**Phase 1 (Foundation):**

1. **FFI Error Enum:**
   ```rust
   #[repr(C)]
   pub struct FFIError {
       code: u32,
       message_ptr: *const c_char,
   }

   impl NuvioError {
       pub fn to_ffi_error(&self) -> FFIError {
           FFIError {
               code: self.error_code(),
               message_ptr: CString::new(self.to_string())
                   .unwrap()
                   .into_raw(),
           }
       }
   }
   ```

2. **Kotlin Exception Mapping:**
   ```kotlin
   sealed class NuvioException(message: String) : Exception(message) {
       class StorageError(message: String) : NuvioException(message)
       class NetworkError(message: String) : NuvioException(message)
       class AuthError(message: String) : NuvioException(message)
       class NotFound(message: String) : NuvioException(message)
   }

   fun FFIError.toException(): NuvioException {
       val message = NuvioFFI.ffi_error_message(this)
       return when (code) {
           1 -> NuvioException.StorageError(message)
           2 -> NuvioException.NetworkError(message)
           3 -> NuvioException.AuthError(message)
           4 -> NuvioException.NotFound(message)
           else -> NuvioException(message)
       }
   }
   ```

3. **Swift Error Mapping:**
   ```swift
   enum NuvioSDKError: Error {
       case storage(String)
       case network(String)
       case auth(String)
       case notFound(String)
   }

   func checkFFIError(_ error: FFIError) throws {
       if error.code != 0 {
           let message = String(cString: error.message_ptr)
           nuvio_string_free(error.message_ptr)

           switch error.code {
           case 1: throw NuvioSDKError.storage(message)
           case 2: throw NuvioSDKError.network(message)
           case 3: throw NuvioSDKError.auth(message)
           case 4: throw NuvioSDKError.notFound(message)
           default: throw NuvioSDKError.storage(message)
           }
       }
   }
   ```

#### Success Criteria

- ✅ All Rust errors map to platform exceptions
- ✅ Zero silent failures in error handling
- ✅ Error messages preserved across FFI

---

### TECH-10: Build Toolchain Complexity

**Severity:** MEDIUM (Probability: HIGH × Impact: MEDIUM)

#### Description

Tri-layer architecture requires complex build toolchain: Rust (cargo), Android (Gradle + NDK), iOS (Xcode), UniFFI bindings. Build failures block development.

#### Mitigation Strategy

**Phase 1 (Foundation):**

1. **Makefile Orchestration:**
   ```makefile
   .PHONY: build-android build-ios

   build-android:
   	cd rust-sdk && cargo ndk -t arm64-v8a build --release
   	./gradlew assembleRelease

   build-ios:
   	cd rust-sdk && ./build-ios.sh
   	xcodebuild -workspace NuvioTV.xcworkspace -scheme NuvioTV build
   ```

2. **Docker Build Environment:**
   ```dockerfile
   FROM rust:1.75
   RUN rustup target add aarch64-linux-android
   RUN cargo install cargo-ndk uniffi_bindgen
   # Android NDK, Gradle, Xcode tools...
   ```

3. **CI/CD Caching:**
   - Cache Cargo dependencies (target/)
   - Cache Gradle dependencies (.gradle/)
   - Cache CocoaPods (.pods/)

4. **Build Time Targets:**
   - Android: <8 minutes
   - iOS: <10 minutes
   - Total: <15 minutes with parallelization

#### Success Criteria

- ✅ Clean build completes in <15 minutes
- ✅ Incremental build <3 minutes
- ✅ CI/CD build success rate >95%
- ✅ Zero build environment setup issues for new developers

---

### TECH-11: Circular Dependencies

**Severity:** LOW (Probability: LOW × Impact: MEDIUM)

#### Description

Circular dependencies between Rust modules or between Rust and native layers can prevent compilation or cause initialization deadlocks.

#### Current Status

Per `dependency-graph.md` analysis:
- **Zero critical circular dependencies found in current codebase**
- React Context providers have some circular references but are manageable
- Service layer dependencies are acyclic

#### Mitigation Strategy

**Phase 2 (Core Logic):**

1. **Dependency Graph Validation:**
   ```bash
   # Run on every PR
   cargo depgraph --workspace | dot -Tpng > deps.png
   # Fail if cycles detected
   ```

2. **Module Dependency Rules:**
   - Core modules (account, profile, etc.) are independent
   - Integration modules depend on core, never the reverse
   - FFI layer depends on all, no module depends on FFI

3. **Break Cycles with Traits:**
   ```rust
   // Instead of: catalog depends on metadata, metadata depends on catalog

   // Use trait abstraction:
   pub trait MetadataProvider {
       async fn enrich(&self, content: &ContentItem) -> Result<Metadata>;
   }

   pub struct CatalogManager<M: MetadataProvider> {
       metadata: M,
   }
   ```

#### Success Criteria

- ✅ Zero circular dependencies in Rust workspace
- ✅ Cargo depgraph shows acyclic graph
- ✅ Module initialization order is deterministic

---

### TECH-12: State Synchronization

**Severity:** HIGH (Probability: MEDIUM × Impact: HIGH)

#### Description

Concurrent state updates across FFI boundary can cause race conditions, stale reads, or data inconsistency.

#### Mitigation Strategy

**Phase 2-3 (Core Logic & Native UI):**

1. **Single Source of Truth (Rust):**
   - All business state lives in Rust SDK
   - Native layers are stateless (UI state only)
   - Pull-based state queries + push-based updates

2. **Event Bus Pattern:**
   ```rust
   pub struct EventBus {
       subscribers: Arc<Mutex<Vec<Box<dyn Fn(Event) + Send>>>>,
   }

   impl EventBus {
       pub fn publish(&self, event: Event) {
           for callback in self.subscribers.lock().unwrap().iter() {
               callback(event.clone());
           }
       }
   }
   ```

3. **Kotlin StateFlow:**
   ```kotlin
   class ProfileRepository {
       private val _currentProfile = MutableStateFlow<Profile?>(null)
       val currentProfile: StateFlow<Profile?> = _currentProfile

       init {
           // Subscribe to Rust SDK events
           NuvioFFI.subscribeProfileChanges { profileJson ->
               val profile = Json.decodeFromString<Profile>(profileJson)
               _currentProfile.value = profile
           }
       }
   }
   ```

4. **Optimistic Updates:**
   ```kotlin
   suspend fun switchProfile(profileId: String) {
       // Optimistic UI update
       _currentProfile.value = Profile(profileId, "Loading...")

       try {
           // Rust SDK call
           val profile = NuvioFFI.switchProfile(profileId)
           _currentProfile.value = profile
       } catch (e: Exception) {
           // Rollback optimistic update
           _currentProfile.value = previousProfile
           throw e
       }
   }
   ```

#### Success Criteria

- ✅ Zero race conditions in state updates
- ✅ UI always reflects Rust SDK state
- ✅ Stress test: 100 concurrent state updates

---

## Performance Risks

### PERF-01: Video Playback Regression

**Severity:** CRITICAL (Probability: MEDIUM × Impact: CRITICAL)

#### Description

Native video players (ExoPlayer, AVPlayer) integration could introduce regressions in DRM, subtitles, quality switching, or Google Cast functionality, making the app unusable for streaming.

#### Application-Level Edge Case #4: Video Playback Performance

This is one of the 5 application-level edge cases identified in the spec. Native video player integration must not introduce latency compared to React Native implementation.

#### Impact Analysis

- **User Impact:** Cannot watch content, app unusable
- **Business Impact:** Critical feature broken, user churn
- **Platform Impact:** TV platforms more affected (primary use case)

#### Mitigation Strategy

**Phase 4 (Advanced Features):**

1. **Comprehensive Video Testing Matrix:**

   | Format | Resolution | DRM | Subtitles | Cast | iOS | Android | tvOS | Android TV |
   |--------|-----------|-----|-----------|------|-----|---------|------|------------|
   | MP4 | 1080p | None | None | No | ✅ | ✅ | ✅ | ✅ |
   | MP4 | 4K | None | SRT | No | ✅ | ✅ | ✅ | ✅ |
   | HLS | 1080p | FairPlay | WebVTT | Yes | ✅ | - | ✅ | - |
   | HLS | 4K | Widevine | WebVTT | Yes | - | ✅ | - | ✅ |
   | DASH | 1080p | Widevine | WebVTT | Yes | - | ✅ | - | ✅ |

   **Test Coverage:** 50+ video scenarios

2. **Fallback to React Native Video:**
   ```kotlin
   object VideoPlayerFactory {
       fun create(): VideoPlayer {
           return if (FeatureFlags.useNativePlayer) {
               ExoPlayerWrapper() // Native
           } else {
               ReactNativeVideoPlayer() // Fallback
           }
       }
   }
   ```

3. **Performance Benchmarks:**
   - **Playback start time:** <100ms (target)
   - **Quality switch time:** <200ms
   - **Subtitle rendering:** <16ms per frame
   - **Cast latency:** <500ms

4. **Staged Rollout:**
   - Week 1: Non-DRM content only
   - Week 2-3: Add DRM support
   - Week 4: Add Cast support
   - Week 5+: Full rollout

5. **Video Expert on Team:**
   - Hire or consult ExoPlayer/AVPlayer expert
   - Review all video code
   - Handle escalations

#### Detection Mechanisms

- **Automated Testing:**
  - Video playback integration tests (50+ scenarios)
  - DRM test suite with test certificates
  - Cast integration tests

- **Production Monitoring:**
  - Video error rate (Sentry)
  - Playback start latency (Firebase Performance)
  - User reports: "Video won't play"

#### Success Criteria

- ✅ 100% video format parity with React Native
- ✅ DRM playback works on all platforms
- ✅ Google Cast works without regression
- ✅ Playback start time ≤100ms
- ✅ Zero video-related P0 bugs in production

#### Contingency Plan

**Trigger:** Video error rate >5% OR Cast broken for >1% users

**Actions:**
1. Immediate rollback via `USE_NATIVE_VIDEO_PLAYER=false`
2. Investigate root cause (DRM keys, Cast SDK version, etc.)
3. Fix in staging, re-test video matrix
4. Gradual re-rollout starting at 1% users

**Timeline:** <30 minutes for rollback, 3-5 days for fix

---

### PERF-02: FFI Call Overhead (Critical Constraint #10)

**Severity:** HIGH (Probability: MEDIUM-HIGH × Impact: HIGH)

#### Description

FFI boundary crossings have inherent overhead (20-50μs on iOS, 50-100μs on Android). Excessive FFI calls degrade performance below React Native baseline.

#### Mitigation Strategy

**Phase 1-4 (All Phases):**

1. **Performance Target:**
   - <1ms total FFI overhead per user interaction
   - <10 FFI calls per user interaction
   - Batch operations to reduce call count

2. **Coarse-Grained APIs:**
   - Return complete data structures, not individual fields
   - Example: `getProfileFull()` instead of `getName() + getAge() + getPreferences()`

3. **FFI Call Profiling:**
   ```kotlin
   class FFIProfiler {
       private val callCounts = mutableMapOf<String, Int>()

       fun trackFFICall(function: String) {
           callCounts[function] = (callCounts[function] ?: 0) + 1
       }

       fun report() {
           callCounts.toList()
               .sortedByDescending { it.second }
               .take(10)
               .forEach { (fn, count) ->
                   Log.d("FFI", "$fn: $count calls")
               }
       }
   }
   ```

4. **Caching:**
   - Cache frequently accessed data in native layer
   - LRU cache with 100-item limit
   - TTL: 30-60 seconds

#### Success Criteria

- ✅ <10 FFI calls per user interaction
- ✅ <1ms total FFI overhead
- ✅ 2-5x performance improvement vs React Native

---

### PERF-03: JNI Marshalling Cost (Critical Constraint #10)

**Severity:** MEDIUM (Probability: HIGH × Impact: MEDIUM)

#### Description

Android's JNI layer adds 50-100μs marshalling overhead per FFI call, 2x slower than iOS's direct C FFI.

#### Mitigation Strategy

Same as PERF-02 (FFI Call Overhead), plus:

1. **Android-Specific Optimizations:**
   - Use `ByteBuffer` for large data transfers (zero-copy)
   - Minimize String conversions (UTF-8 → Java String)
   - Batch operations even more aggressively on Android

2. **Performance Comparison:**
   - Benchmark Android vs iOS FFI overhead
   - Target: Android ≤2x iOS overhead

#### Success Criteria

- ✅ Android FFI overhead ≤2x iOS
- ✅ Large data transfers use zero-copy ByteBuffer
- ✅ No user-perceivable performance difference Android vs iOS

---

### PERF-04: Cold Start Regression

**Severity:** MEDIUM (Probability: MEDIUM × Impact: HIGH)

#### Description

App startup time could increase if Rust SDK initialization is slow or FFI setup adds overhead.

#### Target Improvement

Per migration roadmap: **2-3x faster cold start** (React Native 3-5s → Native 1-2s)

#### Mitigation Strategy

**Phase 2 (Core Logic):**

1. **Lazy Initialization:**
   ```rust
   lazy_static! {
       static ref ACCOUNT_MANAGER: AccountManager = AccountManager::new();
   }

   // Initialize on first use, not at startup
   ```

2. **Parallel Initialization:**
   ```kotlin
   suspend fun initializeApp() = coroutineScope {
       async { NuvioFFI.initAccountManager() }
       async { NuvioFFI.initCatalogManager() }
       async { NuvioFFI.initMetadataManager() }
   }.awaitAll()
   ```

3. **Startup Time Budget:**
   - Rust SDK init: <200ms
   - FFI bindings init: <50ms
   - Native UI inflation: <500ms
   - **Total target: 1.5-2s**

4. **Cold Start Monitoring:**
   - Firebase Performance: App Start trace
   - Sentry: App startup time metric
   - Target: <2s (95th percentile)

#### Success Criteria

- ✅ Cold start time ≤2s (95th percentile)
- ✅ 2-3x faster than React Native baseline
- ✅ Zero startup crashes

---

### PERF-05: Stream Resolution Latency

**Severity:** MEDIUM (Probability: MEDIUM × Impact: HIGH)

#### Description

Stream resolution (querying Stremio addons) could be slower than React Native if Rust implementation is inefficient.

#### Target Improvement

Per migration roadmap: **3-4x faster stream resolution** (React Native 1.5-2s → Rust 400-600ms)

#### Mitigation Strategy

**Phase 2 (Core Logic):**

1. **Parallel Addon Queries:**
   ```rust
   let streams = tokio::join!(
       query_addon_1(),
       query_addon_2(),
       query_addon_3(),
   );
   ```

2. **Timeout per Addon:**
   - 5s timeout per addon (vs 10s in React Native)
   - Fail fast on slow addons

3. **Stream Ranking Algorithm:**
   - Rank by: quality + seeds + debrid availability
   - Cache top 10 streams for 5 minutes

#### Success Criteria

- ✅ Stream resolution ≤600ms (median)
- ✅ 3-4x faster than React Native

---

### PERF-06: Cache Thrashing

**Severity:** LOW (Probability: LOW × Impact: MEDIUM)

#### Description

Frequent cache evictions due to small cache size or incorrect TTL cause excessive API requests.

#### Mitigation Strategy

**Phase 2 (Core Logic):**

1. **Multi-Layer Cache:**
   - L1: In-memory LRU (100 items, 30s TTL)
   - L2: SQLite (10,000 items, 7-day TTL)

2. **Cache Hit Rate Target:**
   - ≥80% for metadata (TMDB)
   - ≥90% for catalog items

3. **Cache Monitoring:**
   - Track cache hit/miss rates
   - Alert if hit rate <70%

#### Success Criteria

- ✅ Cache hit rate ≥80%
- ✅ <10% API requests vs React Native

---

### PERF-07: Memory Footprint Increase

**Severity:** MEDIUM (Probability: MEDIUM × Impact: MEDIUM)

#### Description

Rust SDK + native UI layers could consume more memory than React Native, especially on TV devices.

#### Target Improvement

Per migration roadmap: **30-40% memory reduction** (React Native 150-250MB → Native 100-160MB)

#### Mitigation Strategy

**Phase 2-4 (All Phases):**

1. **Memory Budget:**
   - Rust SDK: <40MB
   - Native UI: <80MB
   - System overhead: <40MB
   - **Total: <160MB**

2. **Memory Leak Detection:**
   - LeakCanary (Android)
   - Instruments (iOS)
   - Valgrind (Rust)

3. **Memory Optimization:**
   - Use `Arc` for shared data
   - Lazy-load large resources
   - Clear caches on memory pressure

#### Success Criteria

- ✅ Memory usage ≤160MB (median)
- ✅ 30-40% reduction vs React Native
- ✅ Zero OOM crashes on TV devices

---

### PERF-08: Battery Drain

**Severity:** LOW (Probability: LOW × Impact: MEDIUM)

#### Description

Inefficient native code or excessive background tasks could drain battery faster than React Native.

#### Target Improvement

Per migration roadmap: **10-15% battery improvement**

#### Mitigation Strategy

**Phase 3-4 (Native UI & Advanced):**

1. **Background Task Limits:**
   - No polling in background (use push notifications)
   - Batch network requests
   - Suspend Tokio runtime when idle

2. **Battery Testing:**
   - Android Battery Historian
   - iOS Energy Log
   - Target: <5% battery per hour of video playback

#### Success Criteria

- ✅ Battery usage ≤95% of React Native baseline
- ✅ 10-15% improvement in battery efficiency
- ✅ Zero user complaints about battery drain

---

## Platform Risks

### PLAT-01: TV Focus Navigation Breaks (Application Edge Case #1)

**Severity:** HIGH (Probability: MEDIUM-HIGH × Impact: CRITICAL)

#### Description

TV platform D-pad navigation could break with native UI, making the app unusable on Android TV and tvOS (primary deployment targets).

#### Application-Level Edge Case #1: TV Platform Compatibility

This is the #1 application-level edge case identified in the spec. Migration plan must account for TV-specific requirements and limitations.

#### Impact Analysis

- **User Impact:** App unusable on TV (primary platform)
- **Business Impact:** Loss of TV user base
- **Platform Impact:** Android TV + tvOS (70%+ of users)

#### Mitigation Strategy

**Phase 3 (Native UI Framework):**

1. **TV-Specific Focus System:**

   **Android TV:**
   ```kotlin
   @Composable
   fun FocusableCard(
       content: @Composable () -> Unit,
       onFocus: () -> Unit = {},
   ) {
       val focusRequester = remember { FocusRequester() }
       val isFocused = remember { mutableStateOf(false) }

       Box(
           modifier = Modifier
               .focusRequester(focusRequester)
               .onFocusChanged { isFocused.value = it.isFocused }
               .focusable()
               .border(
                   width = if (isFocused.value) 4.dp else 0.dp,
                   color = Color.White,
               )
       ) {
           content()
       }
   }
   ```

   **tvOS:**
   ```swift
   struct FocusableCard: View {
       @FocusState private var isFocused: Bool

       var body: some View {
           Button(action: {}) {
               content
           }
           .focused($isFocused)
           .scaleEffect(isFocused ? 1.1 : 1.0)
           .shadow(radius: isFocused ? 10 : 0)
       }
   }
   ```

2. **TV Focus Testing Matrix:**

   | Screen | D-Pad Up | D-Pad Down | D-Pad Left | D-Pad Right | Select | Back |
   |--------|----------|-----------|-----------|-------------|--------|------|
   | Home | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
   | Player | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
   | Settings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

   **Coverage:** 30+ screens × 6 actions = 180 test cases

3. **TV QA Engineer:**
   - Dedicated TV testing specialist
   - Physical TV devices (Fire TV, Apple TV, Android TV box)
   - Daily smoke tests on TV

4. **Focus Debugging Tools:**
   ```kotlin
   object FocusDebugger {
       fun logFocusTree(view: View) {
           // Print focus hierarchy
           // Highlight focusable elements
           // Show focus order
       }
   }
   ```

5. **Fallback Strategy:**
   - Keep React Native TV screens as fallback
   - Feature flag: `USE_NATIVE_TV_UI`
   - Gradual rollout: Mobile → iOS TV → Android TV

#### Detection Mechanisms

- **Automated Testing:**
  - Espresso UI tests with D-pad simulation (Android TV)
  - XCUITest with Apple TV remote simulation (tvOS)

- **Production Monitoring:**
  - Analytics: "TV navigation error" events
  - User reports: "Can't navigate"

- **Manual QA:**
  - Daily TV smoke tests
  - Weekly comprehensive TV regression suite

#### Success Criteria

- ✅ 100% TV screens support D-pad navigation
- ✅ Focus order is logical and intuitive
- ✅ No focus traps (unable to navigate away)
- ✅ Back button always works
- ✅ Zero TV navigation P0/P1 bugs in production

#### Contingency Plan

**Trigger:** TV navigation broken for >10% users OR P0 bug

**Actions:**
1. Immediate rollback via `USE_NATIVE_TV_UI=false`
2. Keep TV on React Native, mobile on native
3. Fix TV focus issues in staging
4. Re-test with TV QA engineer
5. Gradual re-rollout to TV users

**Timeline:** <15 minutes for rollback, 1-2 weeks for fix

---

### PLAT-02: Google Cast Integration (Application Edge Case #2)

**Severity:** HIGH (Probability: MEDIUM × Impact: HIGH)

#### Description

Google Cast functionality could break during migration, preventing users from casting content to Chromecast or Google TV.

#### Application-Level Edge Case #2: Google Cast Integration

This is the #2 application-level edge case identified in the spec. Migration plan must maintain cast functionality during and after migration.

#### Mitigation Strategy

**Phase 4 (Advanced Features):**

1. **Cast SDK Integration:**
   - **Android:** Google Cast SDK (native Kotlin)
   - **iOS:** Google Cast SDK (native Swift)

2. **Cast Testing Matrix:**
   - Chromecast (Gen 2, Gen 3, Ultra)
   - Google TV
   - Android TV (built-in Cast)

3. **Cast Feature Parity:**
   - Discovery and connection
   - Media casting (video + subtitles)
   - Remote control (play/pause/seek)
   - Queue management
   - Session persistence

#### Success Criteria

- ✅ Cast works on all Chromecast devices
- ✅ 100% feature parity with React Native
- ✅ Zero cast-related P0/P1 bugs

#### Contingency Plan

**Trigger:** Cast broken for >5% users

**Actions:**
1. Rollback via `USE_NATIVE_CAST=false`
2. Fix cast integration
3. Re-test on all devices

**Timeline:** <30 minutes for rollback, 3-5 days for fix

---

### PLAT-03: Offline Content Access (Application Edge Case #3)

**Severity:** MEDIUM (Probability: MEDIUM × Impact: HIGH)

#### Description

Offline download functionality could break, preventing users from accessing downloaded content.

#### Application-Level Edge Case #3: Offline Content Access

This is the #3 application-level edge case identified in the spec. Migration must design data persistence strategy for offline mode in new architecture.

#### Mitigation Strategy

**Phase 4 (Advanced Features):**

1. **Download State Machine (Rust SDK):**
   ```rust
   pub enum DownloadState {
       Pending,
       Downloading { progress: f32 },
       Paused,
       Completed,
       Failed { error: String },
   }
   ```

2. **Local File Storage:**
   - Android: `Context.getExternalFilesDir()`
   - iOS: `FileManager.default.urls(for: .documentDirectory)`

3. **Download Encryption:**
   - AES-256 encryption for downloaded files
   - Key stored in secure storage (Keychain/KeyStore)

4. **Offline Playback:**
   - ExoPlayer: Support for local file URIs
   - AVPlayer: Support for local file URLs

#### Success Criteria

- ✅ Download/pause/resume works correctly
- ✅ Offline playback works without network
- ✅ Downloaded content encrypted
- ✅ Zero download P0/P1 bugs

---

### PLAT-04: Platform API Incompatibility

**Severity:** MEDIUM (Probability: MEDIUM × Impact: HIGH)

#### Description

Native platform APIs (Android SDK, iOS SDK) could have breaking changes or incompatibilities with Rust SDK.

#### Mitigation Strategy

**Phase 3-4 (Native UI & Advanced):**

1. **Platform Abstraction Traits (Rust SDK):**
   ```rust
   pub trait StorageProvider {
       async fn get(&self, key: &str) -> Result<Vec<u8>, StorageError>;
       async fn set(&self, key: &str, value: &[u8]) -> Result<(), StorageError>;
   }

   // Implemented by Kotlin/Swift
   ```

2. **Minimum Platform Versions:**
   - Android API 24+ (Android 7.0)
   - iOS 14+
   - tvOS 14+

3. **Platform API Testing:**
   - Test on minimum supported versions
   - Test on latest versions

#### Success Criteria

- ✅ Works on minimum platform versions
- ✅ Works on latest platform versions
- ✅ Zero platform API crashes

---

### PLAT-05: App Store Rejection

**Severity:** MEDIUM (Probability: LOW × Impact: HIGH)

#### Description

App Store (iOS/tvOS) or Play Store could reject the app due to policy violations or technical issues introduced by native migration.

#### Mitigation Strategy

**Phase 5 (Rollout):**

1. **Pre-Submission Checklist:**
   - Review App Store guidelines
   - Test on all required devices
   - Ensure privacy policy updated
   - Verify data encryption

2. **Staged Release:**
   - Internal testing (TestFlight/Internal Testing)
   - Beta testing (100 users)
   - Phased rollout (10% → 50% → 100%)

3. **Rejection Response Plan:**
   - Address rejection reasons within 48 hours
   - Hotfix release if needed

#### Success Criteria

- ✅ App approved on first submission
- ✅ Zero policy violations

---

### PLAT-06: Deep Linking Breaks

**Severity:** MEDIUM (Probability: MEDIUM × Impact: MEDIUM)

#### Description

Deep links (nuvio://profile/123) could break with native navigation.

#### Mitigation Strategy

**Phase 3 (Native UI):**

1. **Deep Link Handling:**
   - Android: Intent filters + Compose Navigation
   - iOS: URL schemes + NavigationStack

2. **Deep Link Testing:**
   - Test all deep link patterns
   - Verify navigation to correct screens

#### Success Criteria

- ✅ All deep links work correctly
- ✅ Zero deep link P0/P1 bugs

---

### PLAT-07: Push Notifications

**Severity:** LOW (Probability: LOW × Impact: MEDIUM)

#### Description

Push notifications could break with native implementation.

#### Mitigation Strategy

**Phase 5 (Rollout):**

1. **FCM Integration:**
   - Android: Firebase Cloud Messaging
   - iOS: APNs via Firebase

2. **Notification Testing:**
   - Test all notification types
   - Verify deep links from notifications

#### Success Criteria

- ✅ Push notifications work
- ✅ Deep links from notifications work

---

## Team & Process Risks

### TEAM-01: Rust Learning Curve

**Severity:** MEDIUM (Probability: HIGH × Impact: MEDIUM)

#### Description

Team members unfamiliar with Rust may struggle with ownership/borrowing, async/await, and FFI patterns, slowing development.

#### Impact Analysis

- **Development Velocity:** 30-50% slower initially
- **Code Quality:** More bugs due to Rust inexperience
- **Timeline Impact:** Phase 1-2 could extend 2-4 weeks

#### Mitigation Strategy

**Pre-Phase 1 (Training):**

1. **Rust Training Program:**
   - Week 1-2: Rust fundamentals (ownership, borrowing, lifetimes)
   - Week 3-4: Async Rust (Tokio, futures, async/await)
   - Week 5-6: FFI patterns (UniFFI, memory safety, panic handling)

2. **Learning Resources:**
   - Official Rust Book
   - Rust by Example
   - Tokio tutorial
   - UniFFI book

3. **Pair Programming:**
   - Junior devs pair with Rust expert
   - Code reviews focused on learning

4. **Hire Rust Consultant:**
   - 3-6 month contract for Phase 1-2
   - Mentorship + code reviews

#### Success Criteria

- ✅ All team members complete Rust training
- ✅ Code review feedback cycles <2 rounds
- ✅ Rust bugs <10% of total bugs

#### Contingency Plan

**Trigger:** Rust development 50%+ slower than expected

**Actions:**
1. Extend Phase 1-2 timeline by 2-4 weeks
2. Hire additional Rust consultant
3. Reduce Phase 1-2 scope if needed

**Timeline:** Ongoing adjustment

---

### TEAM-02: Kotlin/Swift Learning Curve

**Severity:** MEDIUM (Probability: MEDIUM-HIGH × Impact: MEDIUM)

#### Description

Team members unfamiliar with Jetpack Compose (Kotlin) or SwiftUI may struggle with declarative UI, slowing Phase 3.

#### Mitigation Strategy

**Pre-Phase 3 (Training):**

1. **Kotlin/Swift Training:**
   - Jetpack Compose bootcamp (2 weeks)
   - SwiftUI bootcamp (2 weeks)
   - TV-specific patterns (1 week)

2. **Hire Native Experts:**
   - Android/Kotlin expert (full-time)
   - iOS/Swift expert (full-time)

3. **UI Component Library:**
   - Build reusable components first
   - Reduce learning curve for screens

#### Success Criteria

- ✅ All team members complete native UI training
- ✅ Compose/SwiftUI code quality high
- ✅ Phase 3 on schedule

---

### TEAM-03: Scope Creep

**Severity:** HIGH (Probability: HIGH × Impact: HIGH)

#### Description

Stakeholders request new features during migration, extending timeline and diluting focus.

#### Impact Analysis

- **Timeline Impact:** 4-8 week delay
- **Team Impact:** Context switching, burnout
- **Quality Impact:** Migration quality suffers

#### Mitigation Strategy

**Phase 1-5 (All Phases):**

1. **Scope Freeze:**
   - No new features during migration (12 months)
   - All feature requests deferred to post-migration backlog

2. **Change Request Process:**
   - Formal approval required for scope changes
   - Impact analysis: timeline, resources, risks

3. **Stakeholder Alignment:**
   - Monthly progress reviews
   - Communicate migration priority

4. **Emergency Scope Changes:**
   - Only for critical business needs
   - Requires executive approval

#### Success Criteria

- ✅ Zero scope changes during migration
- ✅ Migration stays on 12-month timeline

#### Contingency Plan

**Trigger:** Scope change request approved

**Actions:**
1. Re-baseline timeline (add 2-4 weeks)
2. Assess resource needs
3. Communicate new timeline to stakeholders

**Timeline:** 1-2 weeks for re-baseline

---

### TEAM-04: Resource Constraints

**Severity:** HIGH (Probability: MEDIUM × Impact: HIGH)

#### Description

Team members leave, get sick, or are pulled to other projects, reducing capacity.

#### Impact Analysis

- **Timeline Impact:** 2-8 week delay per person
- **Knowledge Loss:** Critical knowledge gaps

#### Mitigation Strategy

**Phase 1-5 (All Phases):**

1. **Team Redundancy:**
   - 2+ people per role (Rust, Kotlin, Swift)
   - Cross-training within roles

2. **Documentation:**
   - All architectural decisions documented (ADRs)
   - Code commented thoroughly
   - Onboarding guide for new team members

3. **Knowledge Sharing:**
   - Weekly tech talks
   - Pair programming
   - Code reviews involve multiple people

4. **Contractor Buffer:**
   - Budget for 1-2 contractors if needed
   - Pre-vetted contractor list

#### Success Criteria

- ✅ All roles have 2+ people
- ✅ Documentation up to date
- ✅ Knowledge loss <10% if person leaves

#### Contingency Plan

**Trigger:** Key team member leaves

**Actions:**
1. Promote from within or hire replacement
2. Onboard new person (2-4 weeks)
3. Adjust timeline if needed (+2-4 weeks)

**Timeline:** 2-4 weeks for replacement

---

### TEAM-05: Knowledge Silos

**Severity:** MEDIUM (Probability: MEDIUM × Impact: MEDIUM)

#### Description

Knowledge concentrated in 1-2 people per area, creating bottlenecks and risk.

#### Mitigation Strategy

**Phase 1-5 (All Phases):**

1. **Pair Programming:**
   - Rotate pairs weekly
   - Spread knowledge across team

2. **Code Reviews:**
   - 2+ reviewers per PR
   - Cross-functional reviews (Rust → Kotlin → Swift)

3. **Tech Talks:**
   - Weekly lightning talks (15 min)
   - Topics: FFI patterns, TV focus, video playback, etc.

4. **Documentation:**
   - Document all non-obvious patterns
   - Maintain decision log

#### Success Criteria

- ✅ All team members can work in 2+ areas
- ✅ No single point of failure
- ✅ Knowledge spread evenly

---

### TEAM-06: Burnout

**Severity:** MEDIUM (Probability: MEDIUM × Impact: MEDIUM)

#### Description

12-month migration is demanding; team members may experience burnout, reducing productivity and increasing errors.

#### Mitigation Strategy

**Phase 1-5 (All Phases):**

1. **Sustainable Pace:**
   - No mandatory overtime
   - 40-hour work weeks (strict)
   - PTO encouraged

2. **Milestones & Celebrations:**
   - Celebrate phase completions
   - Team lunches/outings

3. **Mental Health Support:**
   - Mental health days (unlimited)
   - EAP (Employee Assistance Program)

4. **Burnout Early Detection:**
   - Weekly 1:1s with manager
   - Anonymous burnout surveys

#### Success Criteria

- ✅ Zero burnout-related departures
- ✅ Team morale high (surveys)
- ✅ Sustainable pace maintained

---

## Application-Level Edge Cases

### Summary of 5 Application-Level Edge Cases

All 5 application-level edge cases identified in the spec are addressed above:

1. **TV Platform Compatibility** → PLAT-01 (HIGH severity)
2. **Google Cast Integration** → PLAT-02 (HIGH severity)
3. **Offline Content Access** → PLAT-03 (MEDIUM severity)
4. **Video Playback Performance** → PERF-01 (CRITICAL severity)
5. **State Synchronization** → TECH-12 (HIGH severity)

---

## FFI Technical Constraints

### Summary of 9 FFI Technical Constraints

All 9 FFI technical constraints identified in the spec are addressed above:

6. **Rust ABI Instability** → TECH-04 (MEDIUM severity)
7. **Panic Across FFI Boundary** → TECH-03 (HIGH severity)
8. **Memory Ownership** → TECH-02 (HIGH severity)
9. **Android Two-Layer Binding** → TECH-07 (MEDIUM severity)
10. **JNI Conversion Overhead** → PERF-02 (HIGH severity), PERF-03 (MEDIUM severity)
11. **String Memory Management** → TECH-05 (MEDIUM severity)
12. **React Native Architecture Detection** → TECH-11 (LOW severity) - N/A for native migration
13. **Asynchronous Operations** → TECH-08 (HIGH severity)
14. **Error Propagation** → TECH-09 (MEDIUM severity)

**Note:** Constraint #12 (React Native Architecture Detection) is not applicable to the native migration since we are replacing React Native entirely with native Kotlin/Swift UI.

---

## Mitigation Strategies Summary

### Top 10 Mitigation Strategies

| # | Strategy | Applies To | Impact |
|---|----------|------------|--------|
| 1 | Feature flags for instant rollback | All risks | HIGH |
| 2 | Parallel operation (RN + Native) | TECH-01, PERF-04 | HIGH |
| 3 | Comprehensive testing (FFI, memory, video) | TECH-02, TECH-03, PERF-01 | HIGH |
| 4 | Batch FFI operations | PERF-02, PERF-03 | HIGH |
| 5 | TV-specific QA engineer | PLAT-01 | HIGH |
| 6 | Rust/Kotlin/Swift training program | TEAM-01, TEAM-02 | MEDIUM |
| 7 | UniFFI for automated bindings | TECH-04, TECH-05, TECH-06 | HIGH |
| 8 | Memory leak detection tools | TECH-02 | HIGH |
| 9 | catch_unwind for all FFI functions | TECH-03 | CRITICAL |
| 10 | Scope freeze during migration | TEAM-03 | HIGH |

### Mitigation Investment by Phase

| Phase | Risk Mitigation Effort | Total Effort | Mitigation % |
|-------|------------------------|--------------|--------------|
| Phase 1: Foundation | 3 weeks | 8 weeks | 40% |
| Phase 2: Core Logic | 4 weeks | 12 weeks | 30% |
| Phase 3: Native UI | 4 weeks | 12 weeks | 35% |
| Phase 4: Advanced | 2 weeks | 8 weeks | 25% |
| Phase 5: Rollout | 2 weeks | 8 weeks | 20% |
| **Total** | **15 weeks** | **48 weeks** | **31%** |

**Interpretation:** 31% of total migration effort is dedicated to risk mitigation, which is appropriate for a high-risk architecture change.

---

## Contingency Planning

### Rollback Decision Matrix

| Trigger Condition | Rollback Scope | Timeline | Decision Maker |
|-------------------|----------------|----------|----------------|
| Crash rate >1% | Full rollback (all features) | <15 min | Tech Lead |
| Data loss >0.5% | Full rollback | <15 min | CTO |
| Video error rate >5% | Video feature rollback | <30 min | Tech Lead |
| TV navigation broken (>10% users) | TV UI rollback | <15 min | Product Manager |
| Memory leak (OOM rate >0.5%) | Module rollback | <1 hour | Tech Lead |
| FFI deadlock | Module rollback | <30 min | Tech Lead |
| P0 bug (app unusable) | Full rollback | <15 min | CTO |

### Rollback Mechanisms

1. **Runtime Feature Flags (Firebase Remote Config):**
   - Instant rollback (<15 minutes)
   - No app update required
   - User-level targeting (rollback 1% first)

2. **Build-Time Feature Flags:**
   - Requires app update (1-3 days)
   - Complete removal of native code
   - Clean rollback to React Native

3. **Partial Rollback:**
   - Rollback specific features (video, TV, etc.)
   - Keep other native features enabled
   - Minimize user disruption

### Emergency Response Team

| Role | Team Member | Responsibility |
|------|------------|----------------|
| Incident Commander | Tech Lead | Decision making, coordination |
| Rust Engineer | Rust Expert | FFI/memory debugging |
| Android Engineer | Kotlin Expert | Android-specific issues |
| iOS Engineer | Swift Expert | iOS-specific issues |
| QA Lead | QA Manager | Verification, testing |
| DevOps | DevOps Engineer | Rollback execution |

### Communication Plan

**Internal Communication:**
- Slack: #migration-incidents
- PagerDuty: Alert on-call engineer
- Status updates every 30 minutes

**External Communication:**
- Status page: status.nuvio.app
- In-app message: "We're experiencing technical issues"
- Social media: Twitter, Facebook

---

## Risk Monitoring & Reporting

### Key Metrics Dashboard

**Technical Metrics:**
- Crash rate (Sentry)
- Memory usage (Firebase Performance)
- FFI call count (custom telemetry)
- Video error rate (Sentry)
- App startup time (Firebase Performance)

**User Metrics:**
- Active users (Firebase Analytics)
- Session duration (Firebase Analytics)
- Feature usage (Mixpanel)
- User feedback (in-app surveys)

**Team Metrics:**
- Velocity (story points per sprint)
- Bug count (Jira)
- Code review time (GitHub)
- Team morale (weekly surveys)

### Weekly Risk Review

**Agenda:**
1. Review risk dashboard
2. Discuss new risks
3. Update risk mitigation status
4. Adjust mitigation strategies if needed
5. Escalate critical risks

**Attendees:**
- Tech Lead
- Product Manager
- Rust/Kotlin/Swift Leads
- QA Lead

### Monthly Executive Report

**Contents:**
1. Risk status summary
2. Top 5 risks
3. Mitigation progress
4. Timeline impact
5. Budget impact
6. Recommendations

**Recipients:**
- CTO
- VP Engineering
- Product Director

---

## References

### Internal Documentation

1. [ADR-001: Tri-Layer Architecture](./adr/001-tri-layer-architecture.md)
2. [ADR-002: FFI Binding Strategy](./adr/002-ffi-binding-strategy.md)
3. [ADR-003: State Management Strategy](./adr/003-state-management-strategy.md)
4. [ADR-005: Migration Sequencing](./adr/005-migration-sequencing.md)
5. [Migration Roadmap](./migration-roadmap.md)
6. [FFI Boundary Design](./ffi-boundary-design.md)
7. [Rust SDK Design](./rust-sdk-design.md)
8. [Kotlin Native Design](./kotlin-native-design.md)
9. [Swift Native Design](./swift-native-design.md)
10. [Build Toolchain Requirements](./build-toolchain-requirements.md)
11. [FFI Testing Strategy](./ffi-testing-strategy.md) - To be created

### External Resources

1. [UniFFI User Guide](https://mozilla.github.io/uniffi-rs/)
2. [Rust FFI Guide](https://doc.rust-lang.org/nomicon/ffi.html)
3. [Android NDK Developer Guide](https://developer.android.com/ndk/guides)
4. [iOS C Interoperability](https://developer.apple.com/documentation/swift/c-interoperability)
5. [Jetpack Compose for TV](https://developer.android.com/training/tv/compose)
6. [tvOS Focus Engine](https://developer.apple.com/documentation/uikit/focus-based-navigation)

---

**Document End**

**Next Steps:**
1. Review this risk assessment with stakeholders
2. Prioritize mitigation strategies
3. Allocate budget for risk mitigation (31% of total effort)
4. Establish risk monitoring dashboard
5. Create FFI Testing Strategy document
6. Begin Phase 1 with risk mitigation focus
