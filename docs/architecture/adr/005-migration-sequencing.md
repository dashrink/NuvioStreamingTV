# ADR-005: Migration Sequencing Strategy

**Status:** Accepted
**Date:** 2026-01-13
**Decision Makers:** Architecture Team, Engineering Leadership
**Technical Story:** [Phased Migration from React Native to Tri-Layer Native Architecture]

---

## Table of Contents

1. [Context](#context)
2. [Decision](#decision)
3. [Alternatives Considered](#alternatives-considered)
4. [Consequences](#consequences)
5. [Implementation Strategy](#implementation-strategy)
6. [References](#references)

---

## Context

### Migration Complexity and Risk

The migration from React Native to a tri-layer native architecture (ADR-001) represents a fundamental transformation affecting every layer of the application:

**Scope of Change:**
- **~15,000 lines of business logic** to extract from TypeScript to Rust
- **170+ React components** to rewrite in Jetpack Compose (Kotlin) and SwiftUI (Swift)
- **50+ screens** with distinct mobile and TV variants
- **29 service modules** migrating to Rust core
- **15 React Context providers** replaced by Rust state management + native ViewModels
- **25+ native modules** requiring FFI bridge integration
- **11 external API integrations** (TMDB, Trakt, Stremio, etc.) to move to Rust HTTP clients

**Critical Constraints:**
1. **Zero-downtime requirement:** Existing users must continue using the app during migration
2. **Feature parity:** New architecture must match 100% of React Native functionality before full cutover
3. **No regression tolerance:** Performance, stability, and user experience cannot degrade
4. **Team velocity:** Must maintain feature development during 6-12 month migration
5. **Rollback capability:** Must be able to revert to React Native if critical issues discovered

### Why "Big Bang" Migration is Unacceptable

**A single-cutover "big bang" migration would pose unacceptable risks:**

1. **Extended Code Freeze (6+ months)**
   - No new features shipped during entire migration period
   - Competitive disadvantage in streaming market
   - Team morale impact from lack of user-facing progress

2. **Massive Integration Risk**
   - All Rust modules, FFI boundaries, and native UI integrated simultaneously
   - Debugging complex interactions across 3 languages + FFI extremely difficult
   - Single point of failure: if any critical module has issues, entire migration fails

3. **Testing Burden**
   - Must regression test entire application at once
   - Edge cases and integration bugs only discovered late in process
   - High probability of production incidents post-launch

4. **Rollback Complexity**
   - After 6 months of migration work, React Native codebase likely unmaintained/broken
   - Returning to React Native means discarding months of engineering effort
   - Difficult to identify which specific component caused failure

5. **Team Coordination Overhead**
   - Kotlin, Swift, and Rust engineers must coordinate constantly
   - Blocked dependencies cascade across entire team
   - Difficult to parallelize work effectively

### Requirements for Sequencing Strategy

The migration sequencing strategy must:

1. **Enable Incremental Progress:** Ship working code every 2-4 weeks
2. **Minimize Risk:** Isolate failures to small, manageable units
3. **Support Parallel Operation:** React Native and native code coexist during transition
4. **Provide Rollback Safety:** Each phase independently rollback-able
5. **Maintain Feature Velocity:** Allow continued feature development alongside migration
6. **Validate Assumptions Early:** Test critical technical risks (FFI performance, memory safety) in Phase 1
7. **Build Team Confidence:** Early wins with low-risk modules before tackling complex features
8. **Support A/B Testing:** Gradual user rollout to validate performance and stability

---

## Decision

We will adopt a **5-phase incremental migration strategy** with parallel operation of React Native and native architectures, feature flags for progressive rollout, and per-phase rollback capabilities.

### Migration Phases Overview

```
Phase 1: Foundation & Proof-of-Concept (Months 1-2)
├─ Goal: Validate FFI feasibility, build tooling, low-risk modules
├─ Scope: Rust SDK infrastructure, Settings module, basic UI scaffolding
└─ Outcome: FFI proven viable, build pipeline working, 1 end-to-end feature migrated

Phase 2: Core Business Logic (Months 3-5)
├─ Goal: Migrate platform-agnostic business logic to Rust
├─ Scope: Account, Catalog, Metadata, Stream resolution modules
└─ Outcome: React Native consumes Rust SDK via FFI, performance improvements measurable

Phase 3: Native UI Framework (Months 6-8)
├─ Goal: Build native UI layers, migrate high-traffic screens
├─ Scope: Kotlin/Swift UI frameworks, navigation, Home/Catalog/Metadata screens
└─ Outcome: 3-5 core screens running natively, A/B test with 10% users

Phase 4: Advanced Features (Months 9-10)
├─ Goal: Migrate complex, high-risk features
├─ Scope: Download management, video playback, watch progress, Trakt sync
└─ Outcome: Feature parity approaching 90%, performance targets met

Phase 5: Rollout & Deprecation (Months 11-12)
├─ Goal: Complete migration, deprecate React Native
├─ Scope: Remaining screens, edge cases, 100% user rollout, React Native removal
└─ Outcome: 100% feature parity, React Native codebase archived
```

### Parallel Operation Strategy

During Phases 1-4, **React Native and native code coexist** using a hybrid architecture:

```
┌───────────────────────────────────────────────────────────────────┐
│                       USER-FACING APPLICATION                      │
│                                                                    │
│  ┌────────────────────┐              ┌────────────────────┐      │
│  │  React Native App  │              │   Native Apps      │      │
│  │  (Gradual sunset)  │              │   (Growing scope)  │      │
│  ├────────────────────┤              ├────────────────────┤      │
│  │ • Legacy screens   │◄────────────►│ • Migrated screens │      │
│  │ • TypeScript UI    │ Deep linking │ • Compose/SwiftUI  │      │
│  │ • React Context    │              │ • Native ViewModels│      │
│  └────────┬───────────┘              └─────────┬──────────┘      │
│           │                                     │                 │
│           │  Phase 2-4: React Native calls     │                 │
│           │  Rust SDK via FFI for migrated     │                 │
│           │  business logic modules             │                 │
│           │                                     │                 │
│           └─────────────┬───────────────────────┘                 │
│                         │                                         │
└─────────────────────────┼─────────────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────────┐
         │       Rust SDK Core (nuvio-core)   │
         ├────────────────────────────────────┤
         │ • Account, Profile, Catalog        │
         │ • Metadata, Stream, Download       │
         │ • External API clients (TMDB, etc.)│
         │ • State management, caching        │
         └────────────────────────────────────┘
```

**Key Mechanisms:**

1. **Module-Level Feature Flags:** Each migrated Rust module gated by feature flag
   ```rust
   // Rust SDK feature flags
   #[cfg(feature = "rust_account")]  // Enabled in Phase 2
   pub mod account;

   #[cfg(feature = "rust_catalog")]  // Enabled in Phase 2
   pub mod catalog;

   #[cfg(feature = "rust_download")]  // Enabled in Phase 4
   pub mod download;
   ```

2. **Screen-Level Routing:** Native screens replace React Native screens incrementally
   ```typescript
   // React Native navigation with native screen integration
   const HomeScreen = Platform.isTV && USE_NATIVE_HOME
     ? NativeHomeScreen  // Kotlin/Swift screen via native module
     : ReactNativeHomeScreen;  // Legacy React Native screen
   ```

3. **FFI Bridge Layer:** React Native calls Rust SDK for migrated business logic
   ```typescript
   // Phase 2-4: React Native uses Rust SDK via NativeModules
   import { NuvioCore } from './NativeModules';

   // If Rust module available, use it; otherwise fallback to TypeScript
   const catalogService = USE_RUST_CATALOG
     ? new RustCatalogService(NuvioCore)
     : new TypeScriptCatalogService();
   ```

4. **Data Synchronization:** Shared MMKV storage ensures state consistency
   - React Native writes state to MMKV
   - Rust SDK reads from MMKV via FFI storage trait
   - Native apps read/write via platform-specific MMKV bindings
   - Eventual consistency model: last-write-wins for conflicts

### Feature Flags Approach

**Three Levels of Feature Flags:**

#### 1. Build-Time Feature Flags (Rust Cargo Features)
Control which Rust modules are compiled and exposed via FFI:

```toml
# rust-sdk/nuvio-core/Cargo.toml
[features]
default = ["rust_settings"]  # Phase 1: Only settings enabled

# Phase 2: Core business logic
rust_account = []
rust_catalog = []
rust_metadata = []
rust_stream = []

# Phase 3: No new Rust modules (UI migration focus)

# Phase 4: Advanced features
rust_download = ["tokio/fs"]
rust_watch = []
rust_trakt = ["oauth2"]

# Phase 5: All features enabled
full_migration = [
  "rust_account", "rust_catalog", "rust_metadata",
  "rust_stream", "rust_download", "rust_watch", "rust_trakt"
]
```

**Benefits:**
- Reduces FFI surface area (faster builds, smaller binaries)
- Clear dependencies between modules
- Easy to disable broken modules without full rollback

#### 2. Runtime Feature Flags (Remote Config)
Control whether React Native uses Rust SDK or legacy TypeScript code:

```typescript
// React Native runtime flags via Firebase Remote Config
const FeatureFlags = {
  USE_RUST_ACCOUNT: true,      // Phase 2: 100% rollout
  USE_RUST_CATALOG: true,      // Phase 2: 100% rollout
  USE_RUST_METADATA: false,    // Phase 3: 0% rollout (testing)
  USE_RUST_DOWNLOAD: false,    // Phase 4: Not yet implemented
};

// Usage in code
const accountService = FeatureFlags.USE_RUST_ACCOUNT
  ? new RustAccountService(NuvioCore)
  : new TypeScriptAccountService();
```

**A/B Testing Support:**
```typescript
// Phase 3: Test Rust catalog with 10% of users
const USE_RUST_CATALOG = remoteConfig.getBoolean('rust_catalog_enabled');
const USE_RUST_CATALOG_PERCENTAGE = remoteConfig.getNumber('rust_catalog_rollout'); // 10

if (USE_RUST_CATALOG && Math.random() * 100 < USE_RUST_CATALOG_PERCENTAGE) {
  // Use Rust catalog for this user
  return new RustCatalogService(NuvioCore);
} else {
  // Use TypeScript catalog (control group)
  return new TypeScriptCatalogService();
}
```

#### 3. Native Screen Routing Flags
Control whether users see React Native or native screens:

```typescript
// AppNavigator.tsx
const NATIVE_SCREENS = {
  Home: remoteConfig.getBoolean('native_home_screen'),       // Phase 3: 10% → 50% → 100%
  Catalog: remoteConfig.getBoolean('native_catalog_screen'), // Phase 3: 0% → 10% → 50% → 100%
  Metadata: remoteConfig.getBoolean('native_metadata_screen'), // Phase 3: Testing
};

// Conditional routing
<Stack.Screen
  name="Home"
  component={NATIVE_SCREENS.Home ? NativeHomeScreen : ReactHomeScreen}
/>
```

**Rollout Strategy:**
- **Phase 3 Week 1:** Native screens at 0% (internal testing only)
- **Phase 3 Week 2:** 10% rollout (monitor crash rates, performance)
- **Phase 3 Week 4:** 50% rollout (validate at scale)
- **Phase 3 Week 6:** 100% rollout (native becomes default)

### Rollback Plans

Each phase has **independent rollback capability** without affecting other phases:

#### Phase-Specific Rollback Mechanisms

**Phase 1 Rollback (Foundation):**
- **Trigger:** FFI performance <2x speedup, or memory leaks detected
- **Action:** Disable Rust Settings module via build flag
  ```toml
  # Cargo.toml
  [features]
  default = []  # Disable rust_settings
  ```
- **Impact:** Settings revert to TypeScript implementation
- **Timeline:** <1 hour (rebuild + redeploy)

**Phase 2 Rollback (Core Business Logic):**
- **Trigger:** Crash rate >1%, or data corruption in Rust state
- **Action:** Flip runtime feature flags to disable Rust modules
  ```typescript
  // Firebase Remote Config
  USE_RUST_ACCOUNT: false   // Revert to TypeScript
  USE_RUST_CATALOG: false
  USE_RUST_METADATA: false
  ```
- **Impact:** React Native uses legacy TypeScript services
- **Timeline:** <15 minutes (remote config update)

**Phase 3 Rollback (Native UI):**
- **Trigger:** Native screen crash rate >1%, or UI regression
- **Action:** Disable native screen routing flags
  ```typescript
  // Firebase Remote Config
  native_home_screen: false
  native_catalog_screen: false
  ```
- **Impact:** Users see React Native screens instead
- **Timeline:** <15 minutes (remote config update)
- **Partial Rollback:** Can disable individual screens (e.g., keep Home native, rollback Catalog)

**Phase 4 Rollback (Advanced Features):**
- **Trigger:** Download corruption, playback failures, or Trakt sync issues
- **Action:** Disable specific feature modules
  ```typescript
  // Firebase Remote Config
  USE_RUST_DOWNLOAD: false  // Revert downloads to TypeScript
  USE_RUST_WATCH: false     // Revert watch progress
  ```
- **Impact:** Individual features revert while others remain migrated
- **Timeline:** <15 minutes per feature

**Phase 5 Rollback (Full Native):**
- **Trigger:** Critical production incident requiring React Native
- **Action:** **Emergency fallback:** Redeploy previous React Native build from artifact storage
- **Impact:** Complete revert to React Native (lose all migration progress)
- **Timeline:** ~2 hours (build + submit to app stores + review)
- **Note:** Should be **extremely rare** (only if Phase 4 rollbacks insufficient)

#### Rollback Safety Checklist

Before each phase rollout, verify:
- [ ] Previous React Native implementation still functional (tested weekly)
- [ ] Feature flags configured and tested in staging
- [ ] Remote config rollback procedure documented and rehearsed
- [ ] Monitoring alerts configured (crash rate, performance, errors)
- [ ] Rollback decision tree defined (who approves, under what conditions)
- [ ] Communication plan for user-facing rollbacks
- [ ] Database migrations reversible (or forward-compatible)

### Migration Decision Framework

**When to proceed to next phase:**
- ✅ Current phase 100% feature parity with React Native
- ✅ Performance targets met (detailed in Phase sections below)
- ✅ Crash-free rate ≥99.5% (same or better than React Native baseline)
- ✅ Zero critical bugs (P0/P1) outstanding
- ✅ Test coverage ≥80% for Rust core, ≥70% for native UI
- ✅ 100 beta users tested for ≥2 weeks with <5% critical feedback
- ✅ Engineering team confident in stability

**When to trigger rollback:**
- ❌ Crash rate >1% (vs React Native baseline <0.5%)
- ❌ P0/P1 bug discovered affecting core functionality
- ❌ Data corruption or user data loss
- ❌ Performance regression >20% vs React Native
- ❌ Memory leak >50MB/hour
- ❌ User feedback indicates critical UX regression

**Decision Makers:**
- **Phase rollback (runtime flag):** Engineering Lead (immediate, no approval)
- **Build rollback (disable Rust module):** CTO approval (within 24 hours)
- **Emergency React Native revert:** CEO + CTO approval (requires incident postmortem)

---

## Alternatives Considered

### Alternative 1: "Big Bang" Migration (All-at-Once Cutover)

**Description:** Complete entire migration (Rust core + Kotlin/Swift UI) before switching any users to native apps.

**Pros:**
- Simpler architecture (no hybrid React Native + Native)
- No feature flag complexity
- Clean cutover (no parallel codebases)

**Cons:**
- **6-12 month code freeze** (no new features shipped)
- **Massive integration risk** (all modules tested together for first time at end)
- **No incremental validation** (discover FFI performance issues late)
- **Difficult rollback** (React Native codebase unmaintained for 6+ months)
- **Team morale impact** (no visible progress for users)

**Why Rejected:** Unacceptable risk and business impact. Competitors would ship 2-3 major features while we're in code freeze. Integration risks too high (debugging FFI issues across 3 languages extremely difficult).

### Alternative 2: "Strangler Fig" Pattern (Screen-by-Screen)

**Description:** Migrate one screen at a time to native (Kotlin/Swift), while keeping business logic in TypeScript/React Native. No Rust SDK.

**Pros:**
- Incremental progress (ship 1 native screen per sprint)
- Low risk (failures isolated to single screen)
- Easier testing (smaller units)

**Cons:**
- **Doesn't achieve core goal** (extracting business logic to Rust)
- **Duplicated business logic** (TypeScript services remain, duplicated in Kotlin/Swift)
- **No performance improvement** (JavaScript bottleneck remains)
- **Complex FFI** (Kotlin/Swift must call TypeScript via React Native bridge)
- **Migration takes 2-3 years** (50+ screens, 2-4 weeks per screen)

**Why Rejected:** Doesn't address root problem (JavaScript performance ceiling, business logic duplication). Would require re-migration to extract TypeScript logic to Rust later (double migration effort).

### Alternative 3: "Bottom-Up" Migration (Rust First, UI Last)

**Description:** Migrate ALL business logic to Rust first (Phases 1-2 only), then migrate UI to Kotlin/Swift (Phases 3-4). No parallel operation of partial migration.

**Approach:**
1. **Months 1-6:** Migrate all TypeScript services to Rust
2. **Months 7-12:** Migrate all React Native screens to Kotlin/Swift
3. React Native consumes Rust SDK during Months 1-6, then deprecated

**Pros:**
- Clear separation (business logic → UI)
- Rust validated before UI migration starts
- Less complex than parallel operation

**Cons:**
- **Delayed UI benefits** (no native UI until Month 7)
- **Longer time to value** (performance improvements from native UI not realized until end)
- **Risk of scope creep** (Rust migration takes longer than estimated, UI migration delayed)
- **Team blocking** (Kotlin/Swift engineers idle during Months 1-6, or must learn Rust)

**Why Rejected:** Delays native UI benefits (better TV focus, ExoPlayer/AVPlayer performance) by 6 months. Doesn't leverage Kotlin/Swift team members during critical first 6 months.

### Alternative 4: "Vertical Slice" Migration (End-to-End per Feature)

**Description:** Migrate one complete feature (Rust core + Kotlin UI + Swift UI) at a time, fully replacing React Native implementation.

**Example:** Migrate "Settings" completely (Rust settings module + Kotlin SettingsScreen + Swift SettingsScreen), then "Catalog", then "Metadata", etc.

**Pros:**
- Each feature fully migrated before moving to next
- Clear progress tracking (% of features migrated)
- Early validation of end-to-end flow

**Cons:**
- **Duplicate infrastructure work** (build FFI bindings 12 times, once per feature)
- **Context switching overhead** (team jumps between Rust, Kotlin, Swift constantly)
- **Difficult parallelization** (Rust/Kotlin/Swift engineers block each other)
- **Complex dependency management** (Catalog depends on Account; must migrate in strict order)

**Why Rejected:** Too much overhead from switching contexts (Rust → Kotlin → Swift → Rust). Better to batch Rust work (Phase 2) and UI work (Phase 3) to minimize context switching and enable parallel teams.

### Alternative 5: "Platform-First" Migration (iOS First, Then Android)

**Description:** Migrate iOS to tri-layer architecture first (Rust + Swift), validate for 3-6 months, then migrate Android (Rust + Kotlin).

**Approach:**
1. **Months 1-8:** Rust SDK + Swift iOS/tvOS
2. **Months 9-16:** Rust SDK (already done) + Kotlin Android/TV

**Pros:**
- Lower risk (half the platforms at a time)
- iOS-first matches Apple TV priority
- Lessons learned from iOS applied to Android

**Cons:**
- **Doubled timeline** (16 months vs 12 months)
- **Fragmented codebase** (iOS native + Android React Native for 8 months)
- **Rust API instability** (iOS migration may require Rust API changes that break Android React Native integration)
- **Team utilization** (Android team idle or blocked during Months 1-8)

**Why Rejected:** Timeline too long (16 months unacceptable for business). Better to migrate both platforms in parallel with shared Rust core (achieves platform parity faster).

### Why 5-Phase Incremental is Best

**Selected Approach Benefits:**
- **Risk Mitigation:** Each phase independently validated and rollback-able
- **Continuous Delivery:** Ship improvements every 2-4 weeks
- **Parallel Teams:** Rust, Kotlin, Swift engineers work concurrently after Phase 1
- **Early Validation:** FFI performance tested in Phase 1 (low-risk Settings module)
- **Business Value:** Users see performance improvements starting Phase 2 (not waiting until end)
- **Flexibility:** Can adjust priorities between phases based on learnings

---

## Consequences

### Positive Consequences

#### 1. **Risk Reduction**
- **Isolated Failures:** Each phase scoped to 2-4 weeks; failures don't cascade
- **Fast Rollback:** Runtime feature flags enable <15 minute rollback
- **Incremental Testing:** 80%+ test coverage achieved per phase (not deferred to end)
- **Early Signal:** Phase 1 validates FFI viability before investing 6+ months

#### 2. **Business Continuity**
- **Feature Development:** Team continues shipping features during migration (via React Native)
- **User Impact Minimized:** A/B testing in Phase 3+ ensures smooth user transition
- **Competitive Advantage:** Ship native improvements incrementally (not waiting 12 months)

#### 3. **Team Productivity**
- **Parallel Work:** After Phase 1, Rust/Kotlin/Swift teams work independently
- **Reduced Blocking:** Clear phase dependencies minimize cross-team blocking
- **Skill Building:** Team learns Rust/FFI gradually (not overwhelming)
- **Morale:** Regular shipped milestones maintain team momentum

#### 4. **Technical Validation**
- **FFI Performance:** Validated in Phase 1 with Settings module (2-3x speedup target)
- **Memory Safety:** Rust ownership model tested in production early
- **Build Tooling:** Cross-compilation pipeline proven before scaling to all modules
- **State Synchronization:** MMKV consistency model validated with low-risk data

#### 5. **Flexibility**
- **Priority Adjustment:** Can reprioritize Phase 4 features based on user feedback
- **Scope Reduction:** Can defer low-priority modules to post-launch if timeline slips
- **Technology Swaps:** Can replace UniFFI with cbindgen if issues found (Phase 1-2 only)

### Negative Consequences

#### 1. **Increased Complexity (Temporary)**
- **Hybrid Codebase:** React Native + Rust SDK + Native apps coexist for 8-10 months
- **Feature Flag Overhead:** ~30 feature flags to manage during Phases 2-4
- **Data Synchronization:** MMKV state shared across React Native + Rust + Native (consistency challenges)
- **Testing Burden:** Must test both React Native (legacy) and Native (new) code paths

**Mitigation:**
- Comprehensive feature flag documentation and ownership
- Automated testing for all flag combinations (via CI/CD matrix builds)
- Clear sunset timeline for React Native (Phase 5 Month 12)

#### 2. **Maintenance Burden**
- **Dual Codebases:** Must fix bugs in both React Native and migrated modules (Phases 2-4)
- **Dependency Updates:** React Native dependencies must be kept updated during migration
- **Security Patches:** Must patch both architectures if vulnerabilities discovered

**Mitigation:**
- Bug fixes prioritized in migrated code (backport to React Native only if critical)
- Automated dependency scanning (Dependabot) for both React Native and Rust
- Accelerated Phase 5 timeline to minimize dual-maintenance period

#### 3. **User Experience Inconsistency (Transient)**
- **Mixed UI:** Users may see React Native screens + Native screens in same session (Phase 3)
- **Performance Variance:** Some features fast (Rust), others slow (TypeScript) during Phases 2-3
- **Visual Differences:** Native screens may have subtle UI differences vs React Native

**Mitigation:**
- Design system ensures visual parity (shared Figma tokens)
- A/B testing identifies UX regressions before wide rollout
- Feature flags enable quick revert if user feedback negative

#### 4. **Coordination Overhead**
- **Cross-Team Dependencies:** Rust SDK changes require Kotlin/Swift native layer updates
- **FFI Contract Management:** Breaking changes in Rust require versioning strategy
- **Communication Burden:** Weekly sync meetings required across Rust/Kotlin/Swift teams

**Mitigation:**
- Versioned FFI contracts (UniFFI .udl files in git)
- Automated integration tests detect FFI breaking changes
- Clear ownership matrix (Rust SDK: Team A, Kotlin: Team B, Swift: Team C)

#### 5. **Timeline Risk**
- **Phase Delays Cascade:** If Phase 2 takes 4 months instead of 3, Phase 3 delayed
- **Scope Creep:** Temptation to add features during migration (extends timeline)
- **Unforeseen Technical Issues:** FFI memory leak discovered late (requires rearchitecture)

**Mitigation:**
- 20% timeline buffer built into each phase
- Strict scope control (no new features during migration)
- Phase 1 proof-of-concept validates critical technical assumptions early

### Migration Impact on Existing Systems

**During Migration (Phases 1-4):**
- ✅ React Native app continues to function normally
- ✅ App store releases continue (weekly beta, monthly production)
- ✅ User data migrates automatically (MMKV storage compatible)
- ⚠️ Bundle size increases ~5-10MB temporarily (React Native + Rust libs coexist)
- ⚠️ Slightly longer build times (~2-3 minutes additional for Rust cross-compilation)

**After Migration (Phase 5):**
- ✅ Bundle size decreases ~10-15MB (React Native removed, offset by Rust libs)
- ✅ Build times improve ~30% (no JavaScript bundling)
- ✅ App performance improves 2-5x (see performance targets below)
- ✅ Memory usage decreases 30-40% (no JavaScript VM)

---

## Implementation Strategy

### Phase 1: Foundation & Proof-of-Concept (Months 1-2, 8 weeks)

**Goal:** Validate FFI technical feasibility, build tooling, and migrate a low-risk module end-to-end.

#### Scope

**Rust SDK Infrastructure:**
- [ ] Set up Cargo workspace structure (`nuvio-core`, `nuvio-ffi`, `nuvio-uniffi`)
- [ ] Configure UniFFI for Kotlin/Swift binding generation
- [ ] Implement platform abstraction traits (Storage, HTTP, Logger)
- [ ] Create error handling framework (NuvioError enum, FFI-safe representation)
- [ ] Set up Rust unit test framework (mockall for mocking)

**Build Toolchain:**
- [ ] Install rustup with all target architectures:
  - Android: `aarch64-linux-android`, `armv7-linux-androideabi`, `x86_64-linux-android`
  - iOS: `aarch64-apple-ios`, `aarch64-apple-ios-sim`
  - tvOS: `aarch64-apple-tvos`, `aarch64-apple-tvos-sim`
- [ ] Configure cargo-ndk for Android multi-arch builds
- [ ] Create Gradle task to compile Rust before Android build
- [ ] Create Xcode build phase script to compile Rust before iOS/tvOS build
- [ ] Set up CI/CD (GitHub Actions) for cross-compilation

**Low-Risk Module Migration (Settings):**
- [ ] Migrate `SettingsService.ts` → Rust `settings` module
  - Theme settings (dark mode, accent color)
  - Playback preferences (autoplay, quality)
  - Subtitle defaults (language, size, color)
  - Parental controls (ratings, PIN)
- [ ] Implement FFI boundary (`settings_get_theme()`, `settings_set_theme()`, etc.)
- [ ] Create Kotlin wrapper (`SettingsRepository.kt` calling FFI)
- [ ] Create Swift wrapper (`SettingsRepository.swift` calling FFI)
- [ ] Integrate into React Native via NativeModules (optional: test FFI from RN)

**Basic UI Scaffolding:**
- [ ] Create Kotlin project structure (`kotlin-app/mobile`, `kotlin-app/tv`)
- [ ] Create Swift project structure (`swift-app/Mobile`, `swift-app/TV`)
- [ ] Implement basic Settings screen in Jetpack Compose (Kotlin)
- [ ] Implement basic Settings screen in SwiftUI (Swift)
- [ ] Wire up Settings screen to Rust SDK via FFI

#### Success Criteria

- ✅ Rust Settings module achieves 2-3x faster read/write vs TypeScript MMKV
- ✅ FFI call overhead <1ms (measured via performance benchmarks)
- ✅ Zero memory leaks detected (Valgrind on Rust, LeakCanary on Android, Instruments on iOS)
- ✅ Settings screen functional in Kotlin and Swift apps
- ✅ Build pipeline compiles Rust for all 7 targets without errors
- ✅ 80%+ unit test coverage for Rust Settings module
- ✅ FFI integration tests pass on Android and iOS

#### Performance Targets

| Metric | React Native Baseline | Phase 1 Target | Measurement |
|--------|----------------------|----------------|-------------|
| Settings read (cold) | 15ms | <5ms (3x faster) | FFI benchmark |
| Settings write | 20ms | <7ms (3x faster) | FFI benchmark |
| Memory overhead | 2MB (TypeScript + MMKV) | <1MB (Rust) | Profiler |
| FFI call latency | N/A | <1ms | Average of 1000 calls |

#### Deliverables

- ✅ Rust SDK foundation (error handling, traits, build config)
- ✅ UniFFI bindings generated for Kotlin and Swift
- ✅ Build toolchain fully automated (Gradle + Xcode scripts)
- ✅ Settings module migrated end-to-end (Rust + Kotlin + Swift)
- ✅ Performance benchmarks demonstrate 2-3x improvement
- ✅ Documentation: "Getting Started with Rust SDK" guide

#### Rollback Plan

- **Trigger:** FFI performance <1.5x speedup, or memory leak >10MB/hour
- **Action:** Disable `rust_settings` feature flag in Cargo.toml
- **Impact:** Settings revert to TypeScript SettingsService
- **Timeline:** <4 hours (rebuild Rust libs, redeploy to staging)

---

### Phase 2: Core Business Logic (Months 3-5, 12 weeks)

**Goal:** Migrate platform-agnostic business logic to Rust, integrate into React Native via FFI.

#### Scope

**Rust Modules to Migrate:**
1. **Account & Profile (3 weeks)**
   - Account authentication (local mode)
   - Profile management (create, switch, delete, PIN validation)
   - Session state (current user, current profile)
   - Storage: User data in MMKV (@user:{userId}:profile:{profileId}:*)

2. **Catalog & Library (4 weeks)**
   - Catalog loading (query Stremio addons, deduplicate, sort)
   - Library management (add to library, remove, organize)
   - Cache management (7-day TTL, LRU eviction)
   - Storage: Catalog items, user library

3. **Metadata Enrichment (3 weeks)**
   - TMDB API client (search, movie/show details, credits, images)
   - Trakt API client (watchlist, watched, ratings)
   - MDBList API client (aggregated ratings)
   - Metadata merging (combine TMDB + Trakt + MDBList)
   - Cache: 7-day TTL for TMDB data

4. **Stream Resolution (2 weeks)**
   - Query Stremio addons for streams
   - Filter by quality, seeders, availability
   - Debrid service integration (Real-Debrid, Premiumize)
   - Return sorted stream list

#### Integration into React Native

**React Native calls Rust SDK via NativeModules:**

```typescript
// Example: Catalog service using Rust SDK
import { NuvioCore } from './NativeModules';

export class RustCatalogService {
  async loadCatalog(catalogId: string): Promise<CatalogItem[]> {
    // Call Rust SDK via FFI
    const items = await NuvioCore.catalogLoad(catalogId);
    return items.map(item => ({
      id: item.id,
      name: item.name,
      poster: item.poster_url,
      type: item.content_type,
    }));
  }
}

// Feature flag controls which implementation to use
const catalogService = FeatureFlags.USE_RUST_CATALOG
  ? new RustCatalogService()
  : new TypeScriptCatalogService();
```

#### Success Criteria

- ✅ Account operations (login, profile switch) 4-5x faster than TypeScript
- ✅ Catalog load (cold cache) 5-6x faster than TypeScript
- ✅ Metadata enrichment 8-10x faster (parallel HTTP requests in Rust)
- ✅ Stream resolution 3-4x faster than TypeScript
- ✅ React Native app functions identically with Rust SDK vs TypeScript services
- ✅ FFI call count <10 per user interaction (batching applied)
- ✅ 80%+ unit test coverage for all Rust modules
- ✅ Integration tests validate FFI contracts

#### Performance Targets

| Operation | React Native Baseline | Phase 2 Target | Improvement |
|-----------|----------------------|----------------|-------------|
| App startup (cold) | 3-5s | 1.5-2s | 2-3x faster |
| Profile switch | 800-1200ms | 150-250ms | 4-5x faster |
| Catalog load (cold) | 2-3s | 350-500ms | 5-6x faster |
| Catalog load (cache hit) | 200ms | 50ms | 4x faster |
| Metadata fetch (TMDB) | 800ms | 100ms | 8x faster |
| Stream resolution | 1.5-2s | 400-600ms | 3-4x faster |
| Memory usage | 150-250MB | 100-160MB | 30-40% reduction |

#### Deliverables

- ✅ 4 core Rust modules (Account, Catalog, Metadata, Stream)
- ✅ FFI bindings for all modules
- ✅ React Native integration (NativeModules wrappers)
- ✅ Feature flags for gradual rollout
- ✅ Performance benchmarks showing 3-8x improvements
- ✅ Migration guide: "Integrating Rust SDK into React Native"

#### Rollback Plan

- **Trigger:** Crash rate >1%, or data corruption in Rust state
- **Action:** Flip runtime feature flags via Firebase Remote Config
  ```typescript
  USE_RUST_ACCOUNT: false
  USE_RUST_CATALOG: false
  USE_RUST_METADATA: false
  USE_RUST_STREAM: false
  ```
- **Impact:** React Native reverts to TypeScript services
- **Timeline:** <15 minutes (remote config propagation)

---

### Phase 3: Native UI Framework (Months 6-8, 12 weeks)

**Goal:** Build native UI layers in Kotlin/Swift, migrate high-traffic screens, A/B test with users.

#### Scope

**Native UI Foundation:**
1. **Kotlin (Android/TV) - 4 weeks**
   - Jetpack Compose UI framework setup
   - Navigation (Compose Navigation for mobile, Fragment stack for TV)
   - ExoPlayer video player integration
   - TV focus management (FocusRequester, D-pad handling)
   - Design system (theme, colors, typography from Figma tokens)
   - ViewModel architecture (integrate with Rust SDK via FFI)

2. **Swift (iOS/tvOS) - 4 weeks**
   - SwiftUI UI framework setup
   - Navigation (NavigationStack for iOS, hybrid UIKit for tvOS)
   - AVPlayer video player integration
   - tvOS focus management (@FocusState, UIFocusGuide)
   - Design system (shared tokens with Kotlin)
   - ObservableObject ViewModels (integrate with Rust SDK)

**Core Screens Migration (4 weeks, parallel Kotlin + Swift):**
1. **Home Screen**
   - Continue watching section
   - Recommended content
   - Recent library additions
   - TV: 6-column grid, mobile: 3-column grid

2. **Catalog Screen**
   - Grid of catalog items
   - Filter/sort controls
   - Infinite scroll/pagination
   - TV: Focusable grid, mobile: ScrollView

3. **Metadata Screen**
   - Poster, title, rating, description
   - Cast & crew
   - Stream sources
   - Play button, add to library
   - TV: 10-foot UI, mobile: compact layout

#### A/B Testing Strategy

**Week 1-2 (Internal Testing):**
- Native screens at 0% (internal dogfooding only)
- QA team validates feature parity
- Fix critical bugs before user rollout

**Week 3 (10% Rollout):**
- Enable native Home screen for 10% of users
  ```typescript
  remoteConfig.set('native_home_screen_rollout', 10);
  ```
- Monitor metrics:
  - Crash-free rate (target: ≥99.5%)
  - Screen load time (target: <500ms)
  - User engagement (session duration, clicks)

**Week 4-5 (50% Rollout):**
- Expand to 50% if metrics positive
- Add Catalog and Metadata screens at 10%

**Week 6+ (100% Rollout):**
- Full rollout to all users
- Native screens become default
- React Native screens deprecated

#### Success Criteria

- ✅ 3 core screens (Home, Catalog, Metadata) functional in Kotlin and Swift
- ✅ 100% feature parity with React Native screens
- ✅ Screen load time <500ms (vs React Native 800-1200ms)
- ✅ Crash-free rate ≥99.5% in A/B test
- ✅ User engagement metrics neutral or positive vs React Native
- ✅ TV focus navigation smooth (<16ms per frame, 60fps)
- ✅ Design QA passes (visual parity with Figma)

#### Performance Targets

| Metric | React Native | Native (Kotlin/Swift) | Improvement |
|--------|--------------|----------------------|-------------|
| Home screen render | 800-1200ms | 300-500ms | 2-3x faster |
| Catalog scroll (60fps) | Drops to 45fps | Solid 60fps | Smoother |
| Metadata screen render | 600-900ms | 200-400ms | 2-3x faster |
| TV focus latency | 50-100ms | <16ms | 3-6x faster |
| Memory (per screen) | 40-60MB | 20-30MB | 40-50% reduction |

#### Deliverables

- ✅ Kotlin mobile + TV app with 3 core screens
- ✅ Swift iOS + tvOS app with 3 core screens
- ✅ A/B testing framework with Firebase Remote Config
- ✅ Performance monitoring dashboard
- ✅ User feedback collection mechanism
- ✅ Design QA report (visual parity validation)

#### Rollback Plan

- **Trigger:** Crash rate >1%, or user feedback indicates major UX regression
- **Action:** Disable native screen routing flags
  ```typescript
  remoteConfig.set('native_home_screen', false);
  remoteConfig.set('native_catalog_screen', false);
  remoteConfig.set('native_metadata_screen', false);
  ```
- **Impact:** Users revert to React Native screens
- **Timeline:** <15 minutes (remote config propagation)
- **Partial Rollback:** Can disable individual screens independently

---

### Phase 4: Advanced Features (Months 9-10, 8 weeks)

**Goal:** Migrate complex, high-risk features to Rust + native UI.

#### Scope

**Rust Modules:**
1. **Download Management (3 weeks)**
   - Download state machine (queued → downloading → paused → completed → failed)
   - expo-file-system integration (FFI to platform file APIs)
   - Progress tracking (bytes downloaded, speed, ETA)
   - Pause/resume/cancel operations
   - Storage: Download metadata in MMKV + SQLite

2. **Watch Progress Tracking (2 weeks)**
   - Session tracking (start, pause, resume, stop)
   - Progress sync to Trakt (scrobble at 80% watched)
   - Continue watching position (stored in MMKV)
   - Multi-device sync

3. **Trakt Synchronization (3 weeks)**
   - OAuth 2.0 flow (deep linking for auth callback)
   - Watchlist sync (background polling every 5 minutes)
   - Collection sync
   - Ratings sync
   - Optimistic updates (update UI immediately, sync in background)

**Native UI:**
1. **Downloads Screen (Kotlin + Swift)**
   - List of active/completed downloads
   - Pause/resume/cancel controls
   - Progress bars
   - Storage usage indicator

2. **Player Screen (Kotlin + Swift)**
   - ExoPlayer (Android) / AVPlayer (iOS) integration
   - Playback controls overlay
   - Subtitle selection
   - Quality selection
   - Watch progress tracking

#### Success Criteria

- ✅ Download management 10x faster than TypeScript (state updates in Rust, no JS thread blocking)
- ✅ Watch progress sync latency <200ms (Rust → Trakt API)
- ✅ Trakt OAuth flow works on all platforms (deep linking functional)
- ✅ Video playback start time <100ms (ExoPlayer/AVPlayer direct integration)
- ✅ Zero download corruption (file integrity validated)
- ✅ Crash-free rate ≥99.5%

#### Performance Targets

| Operation | React Native | Native + Rust | Improvement |
|-----------|--------------|---------------|-------------|
| Download start | 500ms | 50ms | 10x faster |
| Download pause/resume | 300ms | 30ms | 10x faster |
| Watch progress update | 100ms | 10ms | 10x faster |
| Video playback start | 300-500ms | 50-100ms | 3-5x faster |
| Trakt sync (100 items) | 5-8s | 1-2s | 4-5x faster |

#### Deliverables

- ✅ Download management module (Rust + Kotlin + Swift)
- ✅ Watch progress module (Rust + Kotlin + Swift)
- ✅ Trakt sync module with OAuth (Rust + Kotlin + Swift)
- ✅ Downloads screen and Player screen native implementations
- ✅ Performance benchmarks showing 3-10x improvements
- ✅ Integration tests for OAuth flow and file downloads

#### Rollback Plan

- **Trigger:** Download corruption, playback failures, or Trakt OAuth broken
- **Action:** Disable feature flags per module
  ```typescript
  USE_RUST_DOWNLOAD: false   // Revert downloads
  USE_RUST_WATCH: false       // Revert watch progress
  USE_RUST_TRAKT: false       // Revert Trakt sync
  native_downloads_screen: false
  native_player_screen: false
  ```
- **Impact:** Individual features revert to React Native
- **Timeline:** <15 minutes per feature

---

### Phase 5: Rollout & Deprecation (Months 11-12, 8 weeks)

**Goal:** Complete migration, achieve 100% feature parity, deprecate React Native.

#### Scope

**Remaining Screens (4 weeks):**
- [ ] Search screen (Kotlin + Swift)
- [ ] Library screen (Kotlin + Swift)
- [ ] Profile management screen
- [ ] Settings screen (complete migration from Phase 1 PoC)
- [ ] Minor screens (about, help, licenses)

**Edge Cases & Polish (2 weeks):**
- [ ] Error handling for all failure modes
- [ ] Accessibility (TalkBack, VoiceOver)
- [ ] Deep linking for all screens
- [ ] Notification handling (download complete, etc.)
- [ ] Widget support (iOS 14+, Android 12+)

**User Rollout (2 weeks):**
- **Week 1:** 100% of users on native screens (via feature flags)
- **Week 2:** Monitor for regressions, fix critical bugs

**React Native Deprecation:**
- [ ] Remove React Native dependency from `package.json`
- [ ] Archive `react-native-app/` code to `archive/react-native-legacy/`
- [ ] Update build pipeline to only build Kotlin/Swift apps
- [ ] Remove JavaScript bundler (Metro) from CI/CD
- [ ] Update app store listings (remove "React Native" from tech stack)

#### Success Criteria

- ✅ 100% feature parity with React Native app
- ✅ All 50+ screens migrated to native
- ✅ Crash-free rate ≥99.5% across all platforms
- ✅ Performance targets met (see table below)
- ✅ Zero critical bugs (P0/P1) outstanding
- ✅ React Native codebase fully deprecated

#### Final Performance Targets

| Metric | React Native Baseline | Native (Final) | Improvement |
|--------|----------------------|----------------|-------------|
| App startup (cold) | 3-5s | 1-2s | 2-3x faster |
| Screen transitions | 300-500ms | 100-200ms | 2-3x faster |
| Memory usage | 150-250MB | 100-160MB | 30-40% reduction |
| APK/IPA size | 80-100MB | 70-85MB | 10-15MB smaller |
| Battery drain | Baseline | 10-15% improvement | User testing |
| Crash-free rate | 99.3% | ≥99.5% | More stable |

#### Deliverables

- ✅ 100% native apps (Kotlin + Swift)
- ✅ React Native codebase archived
- ✅ Post-migration performance report
- ✅ Migration retrospective document (lessons learned)
- ✅ Updated developer onboarding guide

#### Rollback Plan (Emergency Only)

- **Trigger:** Critical production incident requiring React Native (extremely rare)
- **Action:** Redeploy previous React Native build from artifact storage
- **Impact:** Complete revert to React Native (lose all migration progress)
- **Timeline:** ~2 hours (build + app store submission)
- **Approval:** Requires CEO + CTO sign-off + incident postmortem

---

## Timeline Summary

```
Month 1-2:   Phase 1 - Foundation & Proof-of-Concept
             ├─ Rust SDK setup
             ├─ Build toolchain
             ├─ Settings module migration
             └─ FFI validation

Month 3-5:   Phase 2 - Core Business Logic
             ├─ Account & Profile (Rust)
             ├─ Catalog & Library (Rust)
             ├─ Metadata Enrichment (Rust)
             ├─ Stream Resolution (Rust)
             └─ React Native integration

Month 6-8:   Phase 3 - Native UI Framework
             ├─ Kotlin/Swift frameworks
             ├─ Home, Catalog, Metadata screens
             └─ A/B testing (10% → 50% → 100%)

Month 9-10:  Phase 4 - Advanced Features
             ├─ Download management
             ├─ Watch progress
             ├─ Trakt sync
             └─ Player screen

Month 11-12: Phase 5 - Rollout & Deprecation
             ├─ Remaining screens
             ├─ Edge cases & polish
             ├─ 100% user rollout
             └─ React Native deprecation

Total: 12 months
```

### Parallel Team Structure

**Phase 1 (All hands on deck):**
- Rust Team: 2 engineers (SDK foundation)
- Kotlin Team: 1 engineer (Android setup)
- Swift Team: 1 engineer (iOS setup)
- DevOps: 1 engineer (build toolchain)

**Phase 2 (Rust focus):**
- Rust Team: 3 engineers (4 modules in parallel)
- Kotlin Team: 1 engineer (FFI wrappers)
- Swift Team: 1 engineer (FFI wrappers)

**Phase 3 (UI focus):**
- Rust Team: 1 engineer (maintenance + new modules)
- Kotlin Team: 2 engineers (3 screens)
- Swift Team: 2 engineers (3 screens)

**Phase 4 (Balanced):**
- Rust Team: 2 engineers (3 modules)
- Kotlin Team: 2 engineers (2 screens)
- Swift Team: 2 engineers (2 screens)

**Phase 5 (All hands):**
- Rust Team: 1 engineer (bug fixes)
- Kotlin Team: 2 engineers (remaining screens)
- Swift Team: 2 engineers (remaining screens)
- QA: 2 engineers (full regression testing)

---

## References

### Internal Documentation
- **ADR-001:** Tri-Layer Architecture (overall architecture decision)
- **ADR-002:** FFI Binding Strategy (UniFFI implementation)
- **ADR-003:** State Management Strategy (Rust vs native state split)
- **ADR-004:** Platform UI Patterns (Kotlin/Swift UI architecture)
- **Rust SDK Design:** Module structure and API contracts
- **FFI Boundary Design:** C-compatible interfaces and memory management
- **Kotlin Native Design:** Android/TV architecture with JNI
- **Swift Native Design:** iOS/tvOS architecture with C bridging
- **Module Boundaries:** Clear layer responsibility definitions
- **Migration Roadmap:** Detailed phase breakdown and timelines
- **Risk Assessment:** Migration risks and mitigation strategies
- **Migration Status (Platform Abstraction):** Existing `.tv.tsx` migration progress

### External Resources
- **Strangler Fig Pattern:** [Martin Fowler's article](https://martinfowler.com/bliki/StranglerFigApplication.html)
- **Feature Toggles:** [Feature Toggle best practices](https://www.martinfowler.com/articles/feature-toggles.html)
- **Incremental Migration:** [Google's large-scale refactoring guide](https://testing.googleblog.com/2017/06/code-health-to-comment-or-not-to-comment.html)
- **A/B Testing:** [Firebase Remote Config documentation](https://firebase.google.com/docs/remote-config)
- **UniFFI Migration Examples:** [Mozilla's migration guides](https://mozilla.github.io/uniffi-rs/)

### Migration Case Studies
- **Dropbox:** [C++ to Rust migration for sync engine](https://dropbox.tech/infrastructure/rewriting-the-heart-of-our-sync-engine)
- **Discord:** [Rust in mobile apps for performance](https://discord.com/blog/why-discord-is-switching-from-go-to-rust)
- **1Password:** [Rust core shared across platforms](https://blog.1password.com/1password-8-the-story-so-far/)

---

**Revision History:**
- 2026-01-13: Initial version (v1.0) - Migration sequencing strategy defined

---

**End of ADR-005**
