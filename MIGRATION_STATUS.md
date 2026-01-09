# Platform Abstraction Migration Status

**Last Updated:** January 9, 2025
**Migration Goal:** Eliminate inline `Platform.isTV` checks by using `.tv.tsx` file pattern
**Documentation:** See `/src/PLATFORM_ABSTRACTION_PATTERN.md` for pattern guide

---

## Summary

| Metric | Count | Status |
|--------|-------|--------|
| **Total Platform.isTV checks remaining** | 84 | 🟡 In Progress |
| **Files with Platform.isTV checks** | ~40 | 🟡 In Progress |
| **Components refactored** | 1 | 🟢 Started |
| **Target completion** | 0 | 🎯 Goal |

---

## Completed Refactorings ✅

### Phase 1: Foundation (Completed)
- ✅ **moduleResolver.ts** - Enhanced with JSDoc, added `getResolvedPath()` helper
- ✅ **PLATFORM_ABSTRACTION_PATTERN.md** - Comprehensive pattern documentation
- ✅ **metro.config.js** - Verified correct configuration (already set up)

### Phase 2: Component Refactorings (In Progress)
- ✅ **Focusable Component** - Split into:
  - `Focusable.tsx` (mobile/tablet - simple Pressable)
  - `Focusable.tv.tsx` (TV - animations, spatial nav)
  - `Focusable.shared.ts` (shared types)
  - **Result:** Eliminated all Platform.isTV checks from this component

---

## Pending High-Impact Refactorings 🔄

### Priority 1: Large Screens
These files have the most Platform.isTV checks and would benefit most from refactoring:

1. **CatalogScreen.tsx** (13+ checks)
   - Status: ⏳ Pending
   - Impact: Very High
   - Lines: 1148
   - Strategy: Split into CatalogScreen.tsx + CatalogScreen.tv.tsx + CatalogScreen.shared.ts
   - Key differences:
     - TV: 6-column grid, Focusable items, spatial navigation
     - Mobile: 3-column grid, TouchableOpacity, scroll gestures

2. **MetadataScreen.tsx** (Multiple checks)
   - Status: ⏳ Pending
   - Impact: High
   - Strategy: Split for TV 10-foot UI vs mobile compact UI

3. **SettingsScreen.tsx** (Multiple checks)
   - Status: ⏳ Pending
   - Impact: Medium
   - Strategy: TV-specific settings layout vs mobile

4. **AppNavigator.tsx** (Platform checks)
   - Status: ⏳ Pending
   - Impact: High
   - Strategy: TV stack navigation vs mobile tab navigation

---

## Files Requiring Minimal or No Changes 📌

### TV-Only Components (Already Separated)
These are inherently TV-specific and don't need mobile versions:
- ✅ `/src/components/tv/TVLibraryGrid.tsx`
- ✅ `/src/components/tv/TVLibraryFolders.tsx`
- ✅ `/src/components/tv/TVContinueWatchingSection.tsx`
- ✅ `/src/contexts/TVNavigationContext.tsx`

### TV-Only Hooks (Already Separated)
These are TV-specific utilities:
- ✅ `/src/hooks/useTVMode.ts`
- ✅ `/src/hooks/useTVEventHandler.ts`
- ✅ `/src/hooks/useSpatialNavigation.ts`
- ✅ `/src/hooks/useFocusGroup.ts`

### Legacy Utilities (Documented, Will Remain)
These are utility layers for runtime detection:
- ✅ `/src/utils/tvStyles/deviceDetection.ts` - Runtime platform detection
- ✅ `/src/utils/moduleResolver.ts` - Runtime helpers (fallback pattern)

---

## Files with Platform.isTV Checks (Detailed)

### Player Components (Priority 2)
Files with minor Platform.isTV usage for focus preferences:

- `/src/components/player/modals/EpisodesModal.tsx` (2 checks)
- `/src/components/player/modals/SubtitleModals.tsx` (2 checks)
- `/src/components/player/modals/EpisodeStreamsModal.tsx` (1 check)
- `/src/components/player/modals/SourcesModal.tsx` (1 check)
- `/src/components/player/modals/ResumeOverlay.tsx` (1 check)
- `/src/components/player/modals/SpeedModal.tsx` (2 checks)
- `/src/components/player/modals/LoadingOverlay.tsx` (1 check)

**Strategy:** These mostly use `hasTVPreferredFocus={Platform.isTV}` pattern. Consider:
1. Small checks - may remain inline (low priority)
2. Or extract to helper function if pattern repeats

### Other Components
Additional files found with Platform.isTV checks:
- Various screens and components (see full scan results)

---

## Migration Strategy by Phase

### ✅ Phase 1: Foundation (COMPLETED)
- [x] Enhanced moduleResolver.ts
- [x] Created PLATFORM_ABSTRACTION_PATTERN.md
- [x] Verified metro.config.js
- [x] Created MIGRATION_STATUS.md (this file)
- [x] Created TESTING_PLATFORM_ABSTRACTION.md

### 🔄 Phase 2: High-Impact Components (IN PROGRESS)
- [x] Focusable component refactored
- [ ] CatalogScreen refactoring
- [ ] MetadataScreen refactoring
- [ ] SettingsScreen refactoring
- [ ] AppNavigator refactoring

### ⏳ Phase 3: Player Components (PENDING)
- [ ] Review player modals for refactoring needs
- [ ] Consider `.tv.tsx` versions if UI differs significantly
- [ ] Keep inline checks if differences are minimal (e.g., just `hasTVPreferredFocus`)

### ⏳ Phase 4: Remaining Files (PENDING)
- [ ] Scan for remaining Platform.isTV checks
- [ ] Refactor files with 3+ checks
- [ ] Document decision for files with 1-2 checks (inline vs separate)

### ⏳ Phase 5: Verification & Documentation (PENDING)
- [ ] Run verification script to confirm zero inline checks (excluding utilities)
- [ ] Test TV build: `npm run start:tv`
- [ ] Test mobile build: `npm run start`
- [ ] Update documentation with lessons learned

---

## Verification Commands

### Count Remaining Checks
```bash
# Count Platform.isTV in non-.tv files (excluding utilities)
grep -r "Platform\.isTV" src/ --include="*.tsx" --include="*.ts" \
  | grep -v ".tv.tsx" \
  | grep -v ".tv.ts" \
  | grep -v "moduleResolver.ts" \
  | grep -v "deviceDetection.ts" \
  | wc -l
```

**Current Count:** 84 checks remaining

### List Files with Checks
```bash
# List files containing Platform.isTV
grep -r "Platform\.isTV" src/ --include="*.tsx" --include="*.ts" \
  | grep -v ".tv.tsx" \
  | grep -v ".tv.ts" \
  | grep -v "moduleResolver.ts" \
  | grep -v "deviceDetection.ts" \
  | cut -d: -f1 \
  | sort -u
```

### Verify Metro Resolution
```bash
# Start TV build with verbose logging
APP_VARIANT=tv npx expo start --clear --verbose

# Look for lines like:
# [Metro] Resolving module './components/Focusable'
# [Metro] Found: ./components/Focusable.tv.tsx
```

---

## Success Metrics

### Target Goals 🎯
- [ ] **Zero** inline `Platform.isTV` checks in component files
- [ ] **Zero** inline checks in screen files
- [ ] All high-impact files refactored (CatalogScreen, MetadataScreen, etc.)
- [ ] Both TV and mobile builds work correctly
- [ ] No regression in features or performance

### Acceptable Exceptions ✅
These are OK to keep:
- `deviceDetection.ts` - Purpose-built utility for platform detection
- `moduleResolver.ts` - Fallback helper for edge cases
- TV-only hooks (`useTVMode.ts`, etc.) - Already separated
- Small inline checks in low-impact files (1-2 checks per file)

---

## Testing Checklist

After each refactoring, verify:
- [ ] Mobile build starts: `npm run start`
- [ ] TV build starts: `npm run start:tv`
- [ ] Component renders correctly on mobile
- [ ] Component renders correctly on TV
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] Feature parity maintained (no regressions)

---

## Notes for Developers

### Best Practices
1. **Always create `.shared.ts` first** - Define interfaces before splitting
2. **Test both platforms** - Verify mobile and TV builds after changes
3. **Keep exports consistent** - Both versions must export same name
4. **Document decisions** - Update this file when refactoring or deciding to keep inline checks
5. **Progressive migration** - Don't refactor everything at once; test incrementally

### When to Use `.tv.tsx` Pattern
- ✅ Component has significantly different layouts
- ✅ Different interaction models (D-pad vs touch)
- ✅ File has 5+ Platform.isTV checks
- ✅ TV version has unique features (spatial nav, animations)

### When to Keep Inline Checks
- ✅ 1-2 small checks in the file
- ✅ Simple prop differences (`hasTVPreferredFocus`)
- ✅ Shared logic dominates (90%+ identical)
- ✅ Low-impact files

---

## Questions or Issues?

- See `/src/PLATFORM_ABSTRACTION_PATTERN.md` for pattern documentation
- See `/TESTING_PLATFORM_ABSTRACTION.md` for testing guide
- Check Metro bundler logs for resolution issues
- Use `getResolvedPath()` helper for debugging

---

**Migration Progress:** 🟡 In Progress (1/40+ files refactored)
**Next Priority:** CatalogScreen.tsx refactoring
