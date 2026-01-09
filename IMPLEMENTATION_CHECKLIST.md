# TV Refactoring Implementation Checklist

## Phase 1: Foundation ✅ COMPLETE

### Infrastructure Setup
- [x] Update metro.config.js with `.tv.tsx` and `.tv.ts` resolution
- [x] Create src/utils/moduleResolver.ts with platform utilities
- [x] Refactor tvStyles.ts into modular structure (9 files)
  - [x] deviceDetection.ts
  - [x] typography.ts
  - [x] spacing.ts
  - [x] focus.ts
  - [x] touchTargets.ts
  - [x] layout.ts
  - [x] animations.ts
  - [x] helpers.ts
  - [x] index.ts (main exports)
- [x] Update src/utils/tvStyles.ts as backward-compatibility wrapper

### Pattern Documentation
- [x] Create src/components/patterns/AbstractResponsiveComponent.ts
- [x] Create src/components/patterns/REFACTORING_GUIDE.md
- [x] Create TV_REFACTORING_SUMMARY.md
- [x] Create TV_REFACTORING_QUICKSTART.md
- [x] Create IMPLEMENTATION_CHECKLIST.md (this file)

### Code Quality
- [x] Verify TypeScript compilation
- [x] Ensure backward compatibility
- [x] Add JSDoc comments to utilities
- [x] Create comprehensive examples

---

## Phase 2: High-Impact Player Components (TODO)

### Player Modals (11 files)
#### Estimated effort: 8-10 hours
#### Impact: ~20% reduction in player code

**Modals to Extract:**
- [ ] EpisodesModal.tsx → EpisodesModal.tv.tsx
  - [ ] Create TV version
  - [ ] Remove TV code from standard
  - [ ] Verify props match
  - [ ] Test on TV emulator
  - [ ] Test on mobile
  - [ ] Code review

- [ ] EpisodeStreamsModal.tsx → EpisodeStreamsModal.tv.tsx
  - [ ] Create TV version
  - [ ] Remove TV code from standard
  - [ ] Verify props match
  - [ ] Test on TV emulator
  - [ ] Test on mobile
  - [ ] Code review

- [ ] SourcesModal.tsx → SourcesModal.tv.tsx
  - [ ] Create TV version
  - [ ] Remove TV code from standard
  - [ ] Verify props match
  - [ ] Test on TV emulator
  - [ ] Test on mobile
  - [ ] Code review

- [ ] SubtitleModals.tsx → SubtitleModals.tv.tsx
  - [ ] Create TV version
  - [ ] Remove TV code from standard
  - [ ] Verify props match
  - [ ] Test on TV emulator
  - [ ] Test on mobile
  - [ ] Code review

- [ ] ResumeOverlay.tsx → ResumeOverlay.tv.tsx
  - [ ] Create TV version
  - [ ] Remove TV code from standard
  - [ ] Verify props match
  - [ ] Test on TV emulator
  - [ ] Test on mobile
  - [ ] Code review

- [ ] SpeedModal.tsx → SpeedModal.tv.tsx
  - [ ] Create TV version
  - [ ] Remove TV code from standard
  - [ ] Verify props match
  - [ ] Test on TV emulator
  - [ ] Test on mobile
  - [ ] Code review

- [ ] LoadingOverlay.tsx → LoadingOverlay.tv.tsx
  - [ ] Create TV version
  - [ ] Remove TV code from standard
  - [ ] Verify props match
  - [ ] Test on TV emulator
  - [ ] Test on mobile
  - [ ] Code review

### Player Core Components
#### Estimated effort: 5-7 hours

- [ ] PlayerControls.tsx → PlayerControls.tv.tsx
  - [ ] Extract layout differences
  - [ ] Handle D-pad navigation
  - [ ] Update touch targets
  - [ ] Test control flow
  - [ ] Code review

- [ ] KSPlayerCore.tsx → KSPlayerCore.tv.tsx
  - [ ] Extract TV-specific behavior
  - [ ] Handle TV remote events
  - [ ] Code review

- [ ] AndroidVideoPlayer.tsx → AndroidVideoPlayer.tv.tsx
  - [ ] Extract TV-specific handling
  - [ ] Code review

### Player Utilities
#### Estimated effort: 2-3 hours

- [ ] playerStyles.ts → playerStyles.tv.ts
  - [ ] Extract TV sizing constants
  - [ ] Verify all values are correct
  - [ ] Update imports in dependent files
  - [ ] Test layout on TV

### Phase 2 Completion Criteria
- [ ] All 11 player files have .tv variants
- [ ] No `isTV` or `Platform.isTV` checks in player files
- [ ] All tests pass
- [ ] Player works on TV
- [ ] Player works on mobile
- [ ] Code review approved

---

## Phase 3: Home Components (TODO)

### Estimated effort: 6-8 hours
### Impact: Significant improvement in home screen responsiveness

- [ ] CatalogSection.tsx → CatalogSection.tv.tsx
  - [ ] Extract grid vs scroll layout
  - [ ] Handle TV spacing/sizing
  - [ ] D-pad navigation
  - [ ] Test on TV
  - [ ] Test on mobile
  - [ ] Code review

- [ ] HeroCarousel.tsx → HeroCarousel.tv.tsx
  - [ ] Extract parallax effects
  - [ ] Handle TV sizing
  - [ ] Code review

- [ ] ContinueWatchingSection.tsx → ContinueWatchingSection.tv.tsx
  - [ ] Consolidate existing TVContinueWatchingSection
  - [ ] Extract layout differences
  - [ ] Remove conditionals
  - [ ] Code review

- [ ] ContentItem.tsx → ContentItem.tv.tsx
  - [ ] Extract TV-specific sizing
  - [ ] Code review

- [ ] AppleTVHero.tsx → AppleTVHero.tv.tsx
  - [ ] Consolidate Apple TV hero
  - [ ] Extract TV-specific parallax
  - [ ] Code review

- [ ] HeroSection.tsx (metadata) → HeroSection.tv.tsx
  - [ ] Extract differences
  - [ ] Code review

### Phase 3 Completion Criteria
- [ ] All 6 home components have .tv variants
- [ ] TVContinueWatchingSection consolidated into .tv.tsx
- [ ] No `isTV` checks in home components
- [ ] All tests pass
- [ ] Home screen works on TV
- [ ] Home screen works on mobile

---

## Phase 4: Metadata & Screens (TODO)

### Estimated effort: 12-16 hours
### Impact: High - most complex components

**Metadata Components (7 files):**
- [ ] SeriesContent.tsx → SeriesContent.tv.tsx
- [ ] CommentsSection.tsx → CommentsSection.tv.tsx
- [ ] TrailersSection.tsx → TrailersSection.tv.tsx
- [ ] CastSection.tsx → CastSection.tv.tsx
- [ ] CollectionSection.tsx → CollectionSection.tv.tsx
- [ ] MoreLikeThisSection.tsx → MoreLikeThisSection.tv.tsx
- [ ] RatingsSection.tsx → RatingsSection.tv.tsx

**Screens (8+ files):**
- [ ] HomeScreen.tsx → HomeScreen.tv.tsx
- [ ] MetadataScreen.tsx → MetadataScreen.tv.tsx
- [ ] SearchScreen.tsx → SearchScreen.tv.tsx
- [ ] CatalogScreen.tsx → CatalogScreen.tv.tsx
- [ ] LibraryScreen.tsx → LibraryScreen.tv.tsx
- [ ] DownloadsScreen.tsx → DownloadsScreen.tv.tsx
- [ ] SettingsScreen.tsx → SettingsScreen.tv.tsx
- [ ] AppNavigator.tsx → AppNavigator.tv.tsx
- [ ] Additional screens as needed

**Other Components:**
- [ ] MetadataLoadingScreen.tsx → MetadataLoadingScreen.tv.tsx
- [ ] SearchResultItem.tsx → SearchResultItem.tv.tsx
- [ ] searchUtils.ts → searchUtils.tv.ts

### Phase 4 Completion Criteria
- [ ] All metadata components have .tv variants
- [ ] All screens have .tv variants
- [ ] No `isTV` checks throughout codebase
- [ ] Full regression testing completed
- [ ] Navigation works on both platforms
- [ ] Settings persist across platforms

---

## Phase 5: Utilities & Cleanup (TODO)

### Estimated effort: 4-6 hours

#### Hook Extraction
- [ ] useSpatialNavigation.ts → useSpatialNavigation.tv.ts (if needed)
- [ ] Verify useFocusGroup.ts is TV-complete
- [ ] Review useTVMode.ts for extraction opportunities

#### Final Cleanup
- [ ] Remove all redundant `Platform.isTV` checks
- [ ] Remove conditional ternary operators
- [ ] Clean up tvStyles imports (use new modular exports)
- [ ] Update all imports to use new module structure

#### Testing
- [ ] Run full test suite
- [ ] TV device testing
- [ ] Mobile device testing
- [ ] Performance profiling

#### Documentation
- [ ] Update README.md with refactoring info
- [ ] Add migration guide for developers
- [ ] Update component documentation
- [ ] Create development guide for future work

### Phase 5 Completion Criteria
- [ ] Zero `isTV` checks in main code
- [ ] All utils refactored
- [ ] Full test suite passes
- [ ] Bundle size verified
- [ ] Performance metrics collected
- [ ] Documentation complete

---

## Quality Assurance Checklist

### Code Quality
- [ ] All new files have JSDoc comments
- [ ] Consistent naming conventions used
- [ ] No console.logs left in code
- [ ] No unused imports
- [ ] TypeScript strict mode passes
- [ ] ESLint passes

### Testing
- [ ] Unit tests for all new utilities
- [ ] Integration tests for component pairs
- [ ] TV emulator testing
- [ ] Mobile device testing
- [ ] Regression testing
- [ ] Performance testing

### Documentation
- [ ] README.md updated
- [ ] Code comments added to complex sections
- [ ] Examples provided for new patterns
- [ ] Migration guide created
- [ ] All guides linked in root

### Performance
- [ ] Bundle size reduction verified
- [ ] No performance regressions
- [ ] Module resolution optimized
- [ ] Tree-shaking validated

---

## Metrics Tracking

### Before Refactoring (Baseline)
- Total TV conditional checks: 810+
- Files with TV code: 35+
- Average file size with conditionals: ~500 lines
- Bundle size: [BASELINE]
- Build time: [BASELINE]

### After Phase 1
- [x] Metro resolution: 100%
- [x] tvStyles modularization: Complete
- [x] Pattern documentation: Complete

### After Phase 2
- [ ] Player files refactored: 11/11
- [ ] Conditional checks removed: ~180
- [ ] Bundle reduction: [MEASURE]
- [ ] Build time: [MEASURE]

### After Phase 3
- [ ] Home components refactored: 6/6
- [ ] Conditional checks removed: ~110
- [ ] Total conditional checks remaining: ~520

### After Phase 4
- [ ] Metadata components refactored: 7/7
- [ ] Screen components refactored: 8+/8+
- [ ] Conditional checks removed: ~400
- [ ] Total conditional checks remaining: ~120

### After Phase 5 (FINAL)
- [ ] Remaining conditional checks: 0
- [ ] Bundle reduction: [MEASURE]
- [ ] Build time improvement: [MEASURE]
- [ ] Code quality score: [MEASURE]

---

## Sign-Off Criteria

### For Each Component
- [ ] `.tv.tsx` variant created
- [ ] Both versions have same props interface
- [ ] All TV conditionals removed
- [ ] Tests updated and passing
- [ ] Code reviewed and approved

### For Each Phase
- [ ] All components in phase complete
- [ ] All tests passing
- [ ] Performance metrics collected
- [ ] Code review completed
- [ ] Documentation updated

### Final Acceptance
- [ ] All 5 phases complete
- [ ] Zero TV conditional checks in main code
- [ ] Full test coverage
- [ ] Performance baseline established
- [ ] Team training completed
- [ ] Production ready

---

## Notes

### Important Reminders
- Always define shared props in both versions
- Both `.tsx` and `.tv.tsx` must export same component name
- Metro requires exact file names (not `.tv.tsx.ts`)
- Restart bundler with cache clear after file structure changes
- Update tsconfig paths if using them

### Common Pitfalls to Avoid
- ❌ Different prop interfaces between versions
- ❌ Forgetting to export component from both files
- ❌ Incorrect file naming
- ❌ Not testing on actual TV device
- ❌ Forgetting to remove conditional checks
- ❌ Circular imports between .tsx and .tv.tsx

### Resources
- Metro docs: https://facebook.github.io/metro/
- React Native docs: https://reactnative.dev/
- Refactoring guide: `src/components/patterns/REFACTORING_GUIDE.md`
- Full summary: `TV_REFACTORING_SUMMARY.md`
- Quick start: `TV_REFACTORING_QUICKSTART.md`

---

## Timeline Estimate

- **Phase 1**: ✅ Complete
- **Phase 2**: 1-2 weeks (high impact)
- **Phase 3**: 4-5 days
- **Phase 4**: 2-3 weeks (most components)
- **Phase 5**: 3-5 days

**Total**: 4-6 weeks for full refactoring with team of 1-2 developers

---

## Version History

- **v1.0** (Jan 9, 2026): Initial checklist created, Phase 1 complete
- Foundation ready for Phase 2 implementation

---

