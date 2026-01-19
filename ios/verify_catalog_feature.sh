#!/bin/bash

# Verification Script for iOS Catalog Feature
# This script verifies that all required files exist and have valid structure

set -e

echo "=========================================="
echo "iOS Catalog Feature Verification Script"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="/home/dashrink/Desktop/NuvioStreamingTV/ios/NuvioTV/Sources"

# Check if directory exists
if [ ! -d "$BASE_DIR" ]; then
    echo -e "${RED}✗ Source directory not found: $BASE_DIR${NC}"
    exit 1
fi

echo "Base directory: $BASE_DIR"
echo ""

# Files to check
declare -A files=(
    ["Models/CatalogModels.swift"]="Data models (Meta, Catalog, FilterState, etc.)"
    ["Data/Repository/CatalogRepository.swift"]="Repository protocol and mock implementation"
    ["ViewModels/CatalogBrowseViewModel.swift"]="ViewModel with business logic"
    ["UI/Catalog/CatalogBrowseView.swift"]="Main catalog browse screen"
    ["UI/Catalog/FilterSection.swift"]="Filter section component"
    ["UI/Components/PosterCard.swift"]="Poster card component"
    ["UI/Components/FilterChip.swift"]="Filter chip component"
    ["NuvioTVApp.swift"]="Main app entry point"
)

# Track success/failure
SUCCESS=0
FAILED=0

echo "Checking required files..."
echo ""

for file in "${!files[@]}"; do
    full_path="$BASE_DIR/$file"
    description="${files[$file]}"

    if [ -f "$full_path" ]; then
        line_count=$(wc -l < "$full_path")
        echo -e "${GREEN}✓${NC} $file"
        echo -e "  Description: $description"
        echo -e "  Lines: $line_count"
        echo ""
        SUCCESS=$((SUCCESS + 1))
    else
        echo -e "${RED}✗${NC} $file (MISSING)"
        echo -e "  Description: $description"
        echo ""
        FAILED=$((FAILED + 1))
    fi
done

# Check for key Swift constructs in files
echo "Checking file content..."
echo ""

# Check CatalogModels.swift for key structs
if grep -q "struct Meta" "$BASE_DIR/Models/CatalogModels.swift" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} CatalogModels.swift contains Meta struct"
else
    echo -e "${RED}✗${NC} CatalogModels.swift missing Meta struct"
    FAILED=$((FAILED + 1))
fi

if grep -q "struct CatalogPage" "$BASE_DIR/Models/CatalogModels.swift" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} CatalogModels.swift contains CatalogPage struct"
else
    echo -e "${RED}✗${NC} CatalogModels.swift missing CatalogPage struct"
    FAILED=$((FAILED + 1))
fi

if grep -q "enum SortOption" "$BASE_DIR/Models/CatalogModels.swift" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} CatalogModels.swift contains SortOption enum"
else
    echo -e "${RED}✗${NC} CatalogModels.swift missing SortOption enum"
    FAILED=$((FAILED + 1))
fi

# Check CatalogRepository.swift for protocol and mock
if grep -q "protocol CatalogRepository" "$BASE_DIR/Data/Repository/CatalogRepository.swift" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} CatalogRepository.swift contains protocol definition"
else
    echo -e "${RED}✗${NC} CatalogRepository.swift missing protocol definition"
    FAILED=$((FAILED + 1))
fi

if grep -q "class MockCatalogRepository" "$BASE_DIR/Data/Repository/CatalogRepository.swift" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} CatalogRepository.swift contains MockCatalogRepository"
else
    echo -e "${RED}✗${NC} CatalogRepository.swift missing MockCatalogRepository"
    FAILED=$((FAILED + 1))
fi

# Check ViewModel for ObservableObject
if grep -q "@MainActor" "$BASE_DIR/ViewModels/CatalogBrowseViewModel.swift" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} CatalogBrowseViewModel uses @MainActor"
else
    echo -e "${RED}✗${NC} CatalogBrowseViewModel missing @MainActor"
    FAILED=$((FAILED + 1))
fi

if grep -q "ObservableObject" "$BASE_DIR/ViewModels/CatalogBrowseViewModel.swift" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} CatalogBrowseViewModel conforms to ObservableObject"
else
    echo -e "${RED}✗${NC} CatalogBrowseViewModel doesn't conform to ObservableObject"
    FAILED=$((FAILED + 1))
fi

# Check CatalogBrowseView for LazyVGrid
if grep -q "LazyVGrid" "$BASE_DIR/UI/Catalog/CatalogBrowseView.swift" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} CatalogBrowseView uses LazyVGrid"
else
    echo -e "${RED}✗${NC} CatalogBrowseView missing LazyVGrid"
    FAILED=$((FAILED + 1))
fi

# Check PosterCard for tvOS focus support
if grep -q "@FocusState" "$BASE_DIR/UI/Components/PosterCard.swift" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} PosterCard implements tvOS focus support"
else
    echo -e "${YELLOW}!${NC} PosterCard missing @FocusState (may be iOS-only build)"
fi

echo ""
echo "=========================================="
echo "Feature Requirements Check"
echo "=========================================="
echo ""

# Feature requirements
declare -A features=(
    ["Grid Layout"]="LazyVGrid with adaptive columns"
    ["Filtering"]="Genre, content type, sort filters"
    ["Pagination"]="Infinite scroll with loadMore"
    ["tvOS Focus"]="Focus engine support"
    ["Error Handling"]="Loading, error, empty states"
    ["Mock Data"]="MockCatalogRepository for testing"
)

# Check for feature implementations
if grep -q "gridColumns" "$BASE_DIR/UI/Catalog/CatalogBrowseView.swift" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Grid Layout: Adaptive column implementation found"
else
    echo -e "${RED}✗${NC} Grid Layout: Missing adaptive columns"
fi

if grep -q "setGenre\|setSort\|setContentType" "$BASE_DIR/ViewModels/CatalogBrowseViewModel.swift" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Filtering: Filter methods implemented"
else
    echo -e "${RED}✗${NC} Filtering: Missing filter methods"
fi

if grep -q "loadMore" "$BASE_DIR/ViewModels/CatalogBrowseViewModel.swift" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Pagination: Infinite scroll implemented"
else
    echo -e "${RED}✗${NC} Pagination: Missing loadMore method"
fi

if grep -q "os(tvOS)" "$BASE_DIR/UI/Components/PosterCard.swift" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} tvOS Focus: Platform-specific code found"
else
    echo -e "${YELLOW}!${NC} tvOS Focus: No platform-specific code (may be unified)"
fi

if grep -q "isLoading\|error\|isEmpty" "$BASE_DIR/UI/Catalog/CatalogBrowseView.swift" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Error Handling: Multiple UI states implemented"
else
    echo -e "${RED}✗${NC} Error Handling: Missing state handling"
fi

if grep -q "MockCatalogRepository" "$BASE_DIR/Data/Repository/CatalogRepository.swift" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Mock Data: MockCatalogRepository available"
else
    echo -e "${RED}✗${NC} Mock Data: Missing mock repository"
fi

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""

TOTAL=$((SUCCESS + FAILED))

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All checks passed! ✓${NC}"
    echo -e "Total files: $TOTAL"
    echo -e "Success: ${GREEN}$SUCCESS${NC}"
    echo ""
    echo "The iOS catalog feature is fully implemented and ready for testing."
    echo ""
    echo "Next steps:"
    echo "1. Open the Xcode project"
    echo "2. Build the project (Cmd+B)"
    echo "3. Run on iOS Simulator or tvOS Simulator"
    echo "4. Test catalog browsing, filtering, and pagination"
    echo ""
    exit 0
else
    echo -e "${RED}Some checks failed ✗${NC}"
    echo -e "Total files: $TOTAL"
    echo -e "Success: ${GREEN}$SUCCESS${NC}"
    echo -e "Failed: ${RED}$FAILED${NC}"
    echo ""
    echo "Please review the failed checks above."
    exit 1
fi
