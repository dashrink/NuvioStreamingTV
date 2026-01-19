#!/bin/bash
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

BASE_DIR="/home/dashrink/Desktop/NuvioStreamingTV/nuvio-ios"
NAV_DIR="$BASE_DIR/Sources/NuvioCore/Navigation"
FEAT_DIR="$BASE_DIR/Sources/NuvioFeatures/Common"
APPS_DIR="$BASE_DIR/Apps"

echo "Verifying Navigation Implementation..."

declare -A files=(
    ["$NAV_DIR/AppRoute.swift"]="AppRoute Enum"
    ["$NAV_DIR/NavigationManager.swift"]="Navigation Manager"
    ["$FEAT_DIR/NavigationDestinations.swift"]="Destination Resolver"
    ["$APPS_DIR/NuvioApp/NuvioApp.swift"]="iOS App Entry"
    ["$APPS_DIR/NuvioTVApp/NuvioTVApp.swift"]="tvOS App Entry"
)

SUCCESS=0
FAILED=0

for file in "${!files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} Found ${files[$file]}"
        SUCCESS=$((SUCCESS + 1))
    else
        echo -e "${RED}✗${NC} Missing ${files[$file]} at $file"
        FAILED=$((FAILED + 1))
    fi
done

# Check Content
if grep -q "NavigationStack" "$APPS_DIR/NuvioApp/NuvioApp.swift"; then
     echo -e "${GREEN}✓${NC} iOS App uses NavigationStack"
else
     echo -e "${RED}✗${NC} iOS App missing NavigationStack"
     FAILED=$((FAILED + 1))
fi

if grep -q "NavigationSplitView" "$APPS_DIR/NuvioApp/NuvioApp.swift"; then
     echo -e "${GREEN}✓${NC} iOS App uses NavigationSplitView"
else
     echo -e "${RED}✗${NC} iOS App missing NavigationSplitView"
     FAILED=$((FAILED + 1))
fi

if grep -q "TabView" "$APPS_DIR/NuvioTVApp/NuvioTVApp.swift"; then
     echo -e "${GREEN}✓${NC} tvOS App uses TabView"
else
     echo -e "${RED}✗${NC} tvOS App missing TabView"
     FAILED=$((FAILED + 1))
fi

if grep -q "AppRoute" "$NAV_DIR/AppRoute.swift"; then
     echo -e "${GREEN}✓${NC} AppRoute defined"
else
     echo -e "${RED}✗${NC} AppRoute missing"
     FAILED=$((FAILED + 1))
fi

if [ $FAILED -eq 0 ]; then
    echo "Verification Passed!"
    exit 0
else
    echo "Verification Failed!"
    exit 1
fi
