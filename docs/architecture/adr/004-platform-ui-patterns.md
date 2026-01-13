# ADR-004: Platform UI Patterns

**Status:** Accepted
**Date:** 2026-01-13
**Decision Makers:** Architecture Team, UI/UX Team
**Technical Story:** [Migration from React Native to Native Platforms - UI Layer Architecture]

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

### Current React Native UI Architecture

NuvioStreamingTV's React Native application currently struggles with significant UI architectural challenges stemming from the need to support both mobile/tablet and TV platforms within a single codebase.

#### Platform Fragmentation Issues

**810+ Platform Conditionals:** The codebase is littered with `Platform.isTV` checks throughout UI components:
```typescript
// Current pattern (PROBLEMATIC)
const ItemWrapper = Platform.isTV ? Focusable : TouchableOpacity;
const fontSize = Platform.isTV ? 24 : 14;
const numColumns = Platform.isTV ? 6 : 3;

if (Platform.isTV) {
  // 50+ lines of TV-specific rendering logic
} else {
  // 50+ lines of mobile-specific rendering logic
}
```

**Problems:**
- **Mixed Concerns:** TV and mobile UI logic intertwined, making code difficult to understand and maintain
- **Poor Tree-Shaking:** Both platform code paths bundled even though only one is used at runtime
- **Testing Complexity:** Requires extensive mocking of `Platform.isTV` for unit tests
- **Cognitive Overhead:** Developers must understand both TV and mobile contexts simultaneously
- **Merge Conflicts:** Platform-specific changes in same file increase conflict probability

#### Navigation Architecture Mismatch

**React Navigation Limitations:**
- Mobile uses bottom tabs + stack navigation (gesture-based)
- TV requires custom D-pad focus management overlaid on React Navigation
- No built-in support for spatial navigation (up/down/left/right D-pad movement)
- TV remote back button conflicts with React Navigation's back gesture handling
- Focus management (`useTVEventHandler`) doesn't integrate cleanly with React Navigation lifecycle

**Current Workarounds:**
- Custom `TVNavigator` wrapper around React Navigation
- Manual focus state management in every screen
- `nextFocusUp/Down/Left/Right` props scattered throughout components
- Inconsistent focus behavior when navigating between screens

#### Component Composition Challenges

**Different Interaction Models:**
- **Mobile:** Touch-based interaction (gestures, scrolling, tapping)
- **TV:** D-pad/remote navigation (focus-based, spatial navigation, 10-foot UI)

**Current Component Issues:**
- Components try to support both interaction models, leading to complex conditional logic
- Focusable wrapper components (`Focusable.tsx`) contain 400+ lines of TV-specific animation code that mobile never uses
- Scroll behavior differs (touch scrolling vs D-pad focus-driven scrolling)
- Different layout requirements (grid columns: 3 mobile, 6 TV; font sizes: 14px mobile, 24px TV)

#### TV Support Strategy Deficiencies

**Current TV Implementation:**
- TV-specific components in `src/tv/` directory but inconsistently used
- Many screens don't use `src/tv/` components, instead using inline `Platform.isTV` checks
- Focus management state machine (idle → focused → pressed) embedded in generic components
- ExoPlayer (Android TV) and AVPlayer (iOS TV) integration requires native modules that add React Native bridge overhead
- 10-foot UI requirements (larger fonts, more spacing) implemented via runtime conditionals

**Performance Impact:**
- React Native bridge adds ~16-50ms latency to video player controls on TV
- JavaScript thread blocks during focus transitions with animations
- TV remote D-pad events batched unpredictably through React Native event system
- Memory pressure from loading both mobile and TV code paths

### Migration to Native UI Requirements

The tri-layer architecture (ADR-001) requires native platform UI implementations:

1. **Kotlin for Android/Android TV:** Jetpack Compose UI with ExoPlayer
2. **Swift for iOS/tvOS:** SwiftUI with AVFoundation AVPlayer
3. **Clean Separation:** No shared UI code between platforms
4. **Performance:** Native-level rendering and input handling
5. **Platform Idioms:** Follow platform-specific design patterns and best practices

### Key Challenges to Address

1. **How should we structure Kotlin and Swift UI codebases?** (component architecture, file organization)
2. **What navigation patterns should each platform use?** (Jetpack Compose Navigation vs SwiftUI NavigationStack)
3. **How do we compose reusable UI components?** (Composables vs SwiftUI Views)
4. **How do we cleanly separate mobile and TV UI within each platform?** (Android mobile vs Android TV; iOS mobile vs tvOS)
5. **What patterns ensure consistency between Kotlin and Swift implementations?** (shared design system, component contracts)

---

## Decision

We will adopt **platform-native UI architectures** with clear separation between mobile and TV variants, following each platform's idiomatic patterns and best practices.

### 1. Kotlin UI Architecture (Android/Android TV)

#### Component Structure: Jetpack Compose

**Composable Functions as UI Building Blocks:**
```kotlin
// Mobile version
@Composable
fun CatalogItem(
    item: CatalogItemData,
    onPress: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .clickable { onPress() }
            .padding(8.dp)
    ) {
        AsyncImage(
            model = item.posterUrl,
            contentDescription = item.name
        )
        Text(
            text = item.name,
            fontSize = 14.sp
        )
    }
}

// TV version (separate file or module)
@Composable
fun CatalogItemTV(
    item: CatalogItemData,
    onPress: () -> Unit,
    focusRequester: FocusRequester,
    modifier: Modifier = Modifier
) {
    var isFocused by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(if (isFocused) 1.08f else 1f)

    Card(
        modifier = modifier
            .scale(scale)
            .focusRequester(focusRequester)
            .onFocusChanged { isFocused = it.isFocused }
            .clickable { onPress() }
            .padding(16.dp)
    ) {
        AsyncImage(
            model = item.posterUrl,
            contentDescription = item.name
        )
        Text(
            text = item.name,
            fontSize = 24.sp
        )
    }
}
```

**File Organization:**
```
kotlin-app/
├── mobile/
│   ├── screens/
│   │   ├── CatalogScreen.kt
│   │   ├── MetadataScreen.kt
│   │   └── PlayerScreen.kt
│   ├── components/
│   │   ├── CatalogItem.kt
│   │   ├── CatalogGrid.kt
│   │   └── VideoPlayer.kt
│   └── navigation/
│       └── AppNavigation.kt
├── tv/
│   ├── screens/
│   │   ├── CatalogScreenTV.kt
│   │   ├── MetadataScreenTV.kt
│   │   └── PlayerScreenTV.kt
│   ├── components/
│   │   ├── CatalogItemTV.kt
│   │   ├── CatalogGridTV.kt
│   │   └── VideoPlayerTV.kt
│   └── navigation/
│       └── AppNavigationTV.kt
├── shared/
│   ├── viewmodels/
│   │   ├── CatalogViewModel.kt
│   │   ├── MetadataViewModel.kt
│   │   └── PlayerViewModel.kt
│   ├── models/
│   │   └── UiModels.kt
│   └── theme/
│       ├── Theme.kt
│       ├── Color.kt
│       └── Typography.kt
└── MainActivity.kt (mobile) / MainActivityTV.kt (TV)
```

**ViewModel Pattern for Business Logic:**
```kotlin
// Shared across mobile and TV
class CatalogViewModel(
    private val nuvioCore: NuvioCore // Rust FFI
) : ViewModel() {
    private val _items = MutableStateFlow<List<CatalogItemData>>(emptyList())
    val items: StateFlow<List<CatalogItemData>> = _items.asStateFlow()

    fun loadCatalog(catalogId: String) {
        viewModelScope.launch {
            val result = nuvioCore.getCatalogItems(catalogId)
            _items.value = result.map { it.toUiModel() }
        }
    }
}
```

**Benefits:**
- **Declarative UI:** Compose's declarative paradigm reduces boilerplate
- **State-Driven:** UI automatically updates when state changes (no manual imperative updates)
- **Recomposition Efficiency:** Fine-grained updates only re-render changed components
- **Kotlin Coroutines:** Seamless async/await with `viewModelScope` for Rust FFI calls
- **Type Safety:** Kotlin's strong type system catches errors at compile time

#### Navigation: Compose Navigation with TV Focus

**Mobile Navigation Pattern:**
```kotlin
@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Home, "Home") },
                    label = { Text("Home") },
                    selected = currentRoute == "home",
                    onClick = { navController.navigate("home") }
                )
                // More tabs...
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = "home",
            modifier = Modifier.padding(padding)
        ) {
            composable("home") { HomeScreen() }
            composable("catalog/{id}") { CatalogScreen() }
            composable("metadata/{id}") { MetadataScreen() }
            composable("player/{id}") { PlayerScreen() }
        }
    }
}
```

**TV Navigation Pattern:**
```kotlin
@Composable
fun AppNavigationTV() {
    val navController = rememberNavController()
    val focusManager = LocalFocusManager.current

    // Side navigation menu instead of bottom bar
    Row(modifier = Modifier.fillMaxSize()) {
        // Left sidebar with vertical focus
        TVSideNavigation(
            navController = navController,
            modifier = Modifier.width(200.dp)
        )

        // Content area
        NavHost(
            navController = navController,
            startDestination = "home"
        ) {
            composable("home") { HomeScreenTV() }
            composable("catalog/{id}") { CatalogScreenTV() }
            composable("metadata/{id}") { MetadataScreenTV() }
            composable("player/{id}") { PlayerScreenTV() }
        }
    }

    // Handle TV remote back button
    BackHandler {
        if (navController.previousBackStackEntry != null) {
            navController.popBackStack()
        } else {
            // Exit app
        }
    }
}

@Composable
fun TVSideNavigation(
    navController: NavController,
    modifier: Modifier = Modifier
) {
    var selectedIndex by remember { mutableStateOf(0) }

    LazyColumn(modifier = modifier) {
        itemsIndexed(navigationItems) { index, item ->
            val focusRequester = remember { FocusRequester() }

            NavigationItem(
                item = item,
                isSelected = selectedIndex == index,
                focusRequester = focusRequester,
                onFocus = { selectedIndex = index },
                onClick = {
                    navController.navigate(item.route)
                }
            )
        }
    }
}
```

**Key Differences:**
- **Mobile:** Bottom tab navigation, touch gestures, swipe navigation
- **TV:** Side drawer navigation, D-pad focus management, no gestures
- **Back Handling:** Mobile uses gesture, TV uses remote back button via `BackHandler`

### 2. Swift UI Architecture (iOS/tvOS)

#### Component Structure: SwiftUI Views

**SwiftUI Views as UI Building Blocks:**
```swift
// Mobile version
struct CatalogItem: View {
    let item: CatalogItemData
    let onPress: () -> Void

    var body: some View {
        Button(action: onPress) {
            VStack(spacing: 8) {
                AsyncImage(url: URL(string: item.posterUrl)) { image in
                    image.resizable()
                        .aspectRatio(contentMode: .fit)
                } placeholder: {
                    ProgressView()
                }

                Text(item.name)
                    .font(.system(size: 14))
            }
            .padding(8)
        }
        .buttonStyle(.plain)
    }
}

// TV version (separate file or target)
struct CatalogItemTV: View {
    let item: CatalogItemData
    let onPress: () -> Void

    @FocusState private var isFocused: Bool
    @State private var scale: CGFloat = 1.0

    var body: some View {
        Button(action: onPress) {
            VStack(spacing: 16) {
                AsyncImage(url: URL(string: item.posterUrl)) { image in
                    image.resizable()
                        .aspectRatio(contentMode: .fit)
                } placeholder: {
                    ProgressView()
                }

                Text(item.name)
                    .font(.system(size: 24))
            }
            .padding(16)
            .scaleEffect(scale)
            .animation(.easeInOut(duration: 0.2), value: scale)
        }
        .buttonStyle(.card) // tvOS card button style
        .focused($isFocused)
        .onChange(of: isFocused) { focused in
            scale = focused ? 1.08 : 1.0
        }
    }
}
```

**File Organization:**
```
swift-app/
├── Mobile/
│   ├── Screens/
│   │   ├── CatalogScreen.swift
│   │   ├── MetadataScreen.swift
│   │   └── PlayerScreen.swift
│   ├── Components/
│   │   ├── CatalogItem.swift
│   │   ├── CatalogGrid.swift
│   │   └── VideoPlayer.swift
│   └── Navigation/
│       └── AppNavigation.swift
├── TV/
│   ├── Screens/
│   │   ├── CatalogScreenTV.swift
│   │   ├── MetadataScreenTV.swift
│   │   └── PlayerScreenTV.swift
│   ├── Components/
│   │   ├── CatalogItemTV.swift
│   │   ├── CatalogGridTV.swift
│   │   └── VideoPlayerTV.swift
│   └── Navigation/
│       └── AppNavigationTV.swift
├── Shared/
│   ├── ViewModels/
│   │   ├── CatalogViewModel.swift
│   │   ├── MetadataViewModel.swift
│   │   └── PlayerViewModel.swift
│   ├── Models/
│   │   └── UiModels.swift
│   └── Theme/
│       ├── Colors.swift
│       ├── Fonts.swift
│       └── Styles.swift
└── App.swift (mobile) / AppTV.swift (TV)
```

**ObservableObject Pattern for State Management:**
```swift
// Shared across iOS and tvOS
@MainActor
class CatalogViewModel: ObservableObject {
    @Published var items: [CatalogItemData] = []
    @Published var isLoading: Bool = false

    private let nuvioCore: NuvioCore // Rust FFI

    init(nuvioCore: NuvioCore) {
        self.nuvioCore = nuvioCore
    }

    func loadCatalog(catalogId: String) async {
        isLoading = true
        do {
            let result = try await nuvioCore.getCatalogItems(catalogId: catalogId)
            items = result.map { $0.toUiModel() }
        } catch {
            // Handle error
        }
        isLoading = false
    }
}
```

**Benefits:**
- **Declarative UI:** SwiftUI's declarative paradigm mirrors Jetpack Compose
- **State-Driven:** `@Published` properties automatically trigger view updates
- **Swift Concurrency:** Native async/await for Rust FFI calls
- **Type Safety:** Swift's strong type system with compile-time guarantees
- **UIKit Interop:** Can fallback to UIKit for complex player controls if needed

#### Navigation: NavigationStack with Focus Management

**Mobile Navigation Pattern:**
```swift
struct AppNavigation: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                HomeScreen()
            }
            .tabItem {
                Label("Home", systemImage: "house")
            }
            .tag(0)

            NavigationStack {
                LibraryScreen()
            }
            .tabItem {
                Label("Library", systemImage: "film")
            }
            .tag(1)

            NavigationStack {
                SettingsScreen()
            }
            .tabItem {
                Label("Settings", systemImage: "gear")
            }
            .tag(2)
        }
    }
}

struct CatalogScreen: View {
    @StateObject private var viewModel: CatalogViewModel

    var body: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(), GridItem(), GridItem()]) {
                ForEach(viewModel.items) { item in
                    NavigationLink(value: item) {
                        CatalogItem(item: item)
                    }
                }
            }
        }
        .navigationDestination(for: CatalogItemData.self) { item in
            MetadataScreen(item: item)
        }
    }
}
```

**TV Navigation Pattern:**
```swift
struct AppNavigationTV: View {
    @State private var selectedTab = 0
    @FocusState private var focusedTab: Int?

    var body: some View {
        HStack(spacing: 0) {
            // Side navigation menu
            TVSideNavigation(
                selectedTab: $selectedTab,
                focusedTab: $focusedTab
            )
            .frame(width: 300)

            // Content area
            NavigationStack {
                switch selectedTab {
                case 0: HomeScreenTV()
                case 1: LibraryScreenTV()
                case 2: SettingsScreenTV()
                default: EmptyView()
                }
            }
        }
    }
}

struct TVSideNavigation: View {
    @Binding var selectedTab: Int
    @FocusState.Binding var focusedTab: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            ForEach(0..<navigationItems.count, id: \.self) { index in
                Button(action: {
                    selectedTab = index
                }) {
                    Label(navigationItems[index].title,
                          systemImage: navigationItems[index].icon)
                        .font(.title2)
                        .padding()
                }
                .buttonStyle(.plain)
                .focused($focusedTab, equals: index)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(focusedTab == index ? Color.accentColor : Color.clear)
                )
            }
        }
        .padding()
    }
}

struct CatalogScreenTV: View {
    @StateObject private var viewModel: CatalogViewModel
    @Namespace private var focusNamespace

    var body: some View {
        ScrollView {
            LazyVGrid(columns: Array(repeating: GridItem(), count: 6)) {
                ForEach(viewModel.items) { item in
                    NavigationLink(value: item) {
                        CatalogItemTV(item: item)
                    }
                    .focusable() // Enable tvOS focus
                }
            }
            .focusSection() // Group focus area
        }
        .navigationDestination(for: CatalogItemData.self) { item in
            MetadataScreenTV(item: item)
        }
    }
}
```

**Key Differences:**
- **Mobile:** Bottom TabView, touch navigation, swipe gestures
- **TV:** Side menu navigation, D-pad focus via `@FocusState`, no gestures
- **Focus Management:** tvOS uses `UIFocusSystem` under the hood, SwiftUI provides `@FocusState` wrapper
- **Grid Layouts:** Mobile 3 columns, TV 6 columns

### 3. Component Composition Patterns

#### Shared Component Contracts

While Kotlin and Swift implementations are separate, they follow **parallel component structures** to maintain consistency:

**Catalog Item Component Contract:**
```
Component: CatalogItem / CatalogItemTV
├── Props:
│   ├── item: CatalogItemData
│   ├── onPress: () -> Void
│   └── [TV only] focusRequester / @FocusState
├── Layout:
│   ├── Poster image (AsyncImage)
│   ├── Title text
│   └── [Mobile] Rating badge
├── Interaction:
│   ├── [Mobile] Touch tap
│   └── [TV] D-pad focus + select button
└── Animation:
    ├── [Mobile] Subtle press scale (0.95)
    └── [TV] Focus scale (1.08) + shadow
```

Both Kotlin and Swift implementations follow this contract, ensuring feature parity.

#### Reusable Component Library

**Mobile Components:**
- `CatalogItem` / `CatalogItemTV`
- `CatalogGrid` / `CatalogGridTV`
- `VideoPlayer` / `VideoPlayerTV`
- `ContinueWatchingRow` / `ContinueWatchingRowTV`
- `MetadataHeader` / `MetadataHeaderTV`
- `SettingsList` / `SettingsListTV`

**Shared Components (No Platform Variance):**
- `LoadingSpinner`
- `ErrorView`
- `EmptyStateView`
- `ProgressBar`

**Composition Strategy:**
```kotlin
// Kotlin: Screen composes smaller components
@Composable
fun CatalogScreenTV() {
    val viewModel: CatalogViewModel = viewModel()
    val items by viewModel.items.collectAsState()

    Column(modifier = Modifier.fillMaxSize()) {
        // Toolbar
        AppBarTV(title = "Catalog")

        // Content
        CatalogGridTV(
            items = items,
            onItemClick = { item ->
                // Navigate to metadata
            }
        )
    }
}

@Composable
fun CatalogGridTV(
    items: List<CatalogItemData>,
    onItemClick: (CatalogItemData) -> Unit
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(6),
        contentPadding = PaddingValues(16.dp)
    ) {
        items(items) { item ->
            CatalogItemTV(
                item = item,
                onPress = { onItemClick(item) }
            )
        }
    }
}
```

```swift
// Swift: Screen composes smaller views
struct CatalogScreenTV: View {
    @StateObject private var viewModel: CatalogViewModel

    var body: some View {
        VStack(spacing: 0) {
            // Toolbar
            AppBarTV(title: "Catalog")

            // Content
            CatalogGridTV(
                items: viewModel.items,
                onItemTap: { item in
                    // Navigate to metadata
                }
            )
        }
    }
}

struct CatalogGridTV: View {
    let items: [CatalogItemData]
    let onItemTap: (CatalogItemData) -> Void

    var body: some View {
        ScrollView {
            LazyVGrid(columns: Array(repeating: GridItem(), count: 6)) {
                ForEach(items) { item in
                    CatalogItemTV(
                        item: item,
                        onPress: { onItemTap(item) }
                    )
                }
            }
            .padding(16)
        }
    }
}
```

### 4. TV Support Strategy

#### Dedicated TV Modules

**Android TV:** Separate `tv/` module in Kotlin codebase
- Uses Jetpack Compose for TV (Compose TV library)
- `androidx.leanback` library for TV-optimized components (if needed for backward compatibility)
- D-pad focus management with `FocusRequester` and `Modifier.focusable()`
- ExoPlayer integration for video playback (TV-optimized build)
- Separate `MainActivityTV` entry point

**tvOS:** Separate Xcode target in Swift codebase
- Uses SwiftUI with tvOS-specific APIs (`@FocusState`, `.focusable()`, `.focusSection()`)
- `UIFocusSystem` integration for advanced focus scenarios
- AVFoundation AVPlayer with tvOS optimizations
- Separate `AppTV.swift` entry point

#### TV-Specific UI Patterns

**10-Foot UI Design:**
```kotlin
// Kotlin TV theme
object TVTheme {
    val typography = Typography(
        displayLarge = TextStyle(fontSize = 48.sp),
        headlineLarge = TextStyle(fontSize = 32.sp),
        bodyLarge = TextStyle(fontSize = 24.sp),
        labelLarge = TextStyle(fontSize = 20.sp)
    )

    val spacing = TVSpacing(
        small = 16.dp,
        medium = 24.dp,
        large = 32.dp,
        itemPadding = 16.dp
    )
}
```

```swift
// Swift TV theme
struct TVTheme {
    static let typography = TVTypography(
        displayLarge: Font.system(size: 48),
        headlineLarge: Font.system(size: 32),
        bodyLarge: Font.system(size: 24),
        labelLarge: Font.system(size: 20)
    )

    static let spacing = TVSpacing(
        small: 16,
        medium: 24,
        large: 32,
        itemPadding: 16
    )
}
```

**Focus Animations:**
```kotlin
// Kotlin TV focus animation
@Composable
fun TVFocusableCard(
    content: @Composable () -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isFocused by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (isFocused) 1.08f else 1f,
        animationSpec = tween(durationMillis = 200)
    )
    val elevation by animateDpAsState(
        targetValue = if (isFocused) 12.dp else 4.dp,
        animationSpec = tween(durationMillis = 200)
    )

    Card(
        modifier = modifier
            .scale(scale)
            .onFocusChanged { isFocused = it.isFocused }
            .clickable { onClick() },
        elevation = CardDefaults.cardElevation(defaultElevation = elevation)
    ) {
        content()
    }
}
```

```swift
// Swift TV focus animation
struct TVFocusableCard<Content: View>: View {
    let content: Content
    let onPress: () -> Void

    @FocusState private var isFocused: Bool

    init(onPress: @escaping () -> Void, @ViewBuilder content: () -> Content) {
        self.onPress = onPress
        self.content = content()
    }

    var body: some View {
        Button(action: onPress) {
            content
                .scaleEffect(isFocused ? 1.08 : 1.0)
                .shadow(radius: isFocused ? 12 : 4)
                .animation(.easeInOut(duration: 0.2), value: isFocused)
        }
        .buttonStyle(.card)
        .focused($isFocused)
    }
}
```

#### Video Player Integration

**Android TV: ExoPlayer**
```kotlin
@Composable
fun VideoPlayerTV(
    mediaItem: MediaItem,
    onControlsVisibilityChange: (Boolean) -> Unit
) {
    val context = LocalContext.current
    val exoPlayer = remember {
        ExoPlayer.Builder(context)
            .setSeekBackIncrementMs(10_000)
            .setSeekForwardIncrementMs(10_000)
            .build()
            .apply {
                setMediaItem(mediaItem)
                prepare()
            }
    }

    DisposableEffect(Unit) {
        onDispose {
            exoPlayer.release()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            factory = { PlayerView(context).apply { player = exoPlayer } },
            modifier = Modifier.fillMaxSize()
        )

        // TV playback controls overlay
        TVPlaybackControls(
            player = exoPlayer,
            onControlsVisibilityChange = onControlsVisibilityChange
        )
    }
}
```

**tvOS: AVPlayer**
```swift
struct VideoPlayerTV: View {
    let url: URL
    @StateObject private var playerController: AVPlayerViewController
    @State private var showControls = false

    var body: some View {
        ZStack {
            VideoPlayer(player: playerController.player)
                .ignoresSafeArea()

            // tvOS playback controls overlay
            if showControls {
                TVPlaybackControls(
                    player: playerController.player,
                    onDismiss: { showControls = false }
                )
            }
        }
        .onAppear {
            playerController.player?.play()
        }
        .onDisappear {
            playerController.player?.pause()
        }
    }
}
```

#### Spatial Navigation

**Kotlin: Focus Management**
```kotlin
@Composable
fun CatalogGridTV(items: List<CatalogItemData>) {
    val focusRequesters = remember {
        List(items.size) { FocusRequester() }
    }

    LazyVerticalGrid(
        columns = GridCells.Fixed(6)
    ) {
        itemsIndexed(items) { index, item ->
            CatalogItemTV(
                item = item,
                focusRequester = focusRequesters[index],
                onFocus = {
                    // Handle focus change
                }
            )
        }
    }

    LaunchedEffect(Unit) {
        // Set initial focus
        focusRequesters.firstOrNull()?.requestFocus()
    }
}
```

**Swift: Focus Sections**
```swift
struct CatalogGridTV: View {
    let items: [CatalogItemData]
    @Namespace private var focusNamespace

    var body: some View {
        ScrollView {
            LazyVGrid(columns: Array(repeating: GridItem(), count: 6)) {
                ForEach(items) { item in
                    CatalogItemTV(item: item)
                        .focusable()
                }
            }
            .focusSection() // Group focus area for better navigation
        }
        .prefersDefaultFocus(in: focusNamespace)
    }
}
```

### 5. Cross-Platform Consistency

#### Design System Tokens

Both platforms reference the same design tokens (exported from Figma or design tool):

**Shared Design Tokens (JSON or similar format):**
```json
{
  "colors": {
    "primary": "#1E88E5",
    "secondary": "#FF6F00",
    "background": {
      "mobile": "#FFFFFF",
      "tv": "#121212"
    }
  },
  "typography": {
    "mobile": {
      "body": 14,
      "headline": 20,
      "display": 28
    },
    "tv": {
      "body": 24,
      "headline": 32,
      "display": 48
    }
  },
  "spacing": {
    "mobile": { "small": 4, "medium": 8, "large": 16 },
    "tv": { "small": 8, "medium": 16, "large": 32 }
  }
}
```

Both Kotlin and Swift codebases import these tokens and generate type-safe code:
- Kotlin: Code generation during Gradle build
- Swift: Code generation during Xcode build

#### Component Parity Checklist

For every screen/component implemented:
- [ ] Kotlin mobile implementation
- [ ] Kotlin TV implementation
- [ ] Swift iOS implementation
- [ ] Swift tvOS implementation
- [ ] Design QA review (matches Figma)
- [ ] Functional QA review (Rust FFI integration works)
- [ ] Accessibility review (screen readers, focus order)

#### ViewModel Contracts

ViewModels in both platforms expose identical state and methods:

**Kotlin ViewModel:**
```kotlin
interface CatalogViewModelProtocol {
    val items: StateFlow<List<CatalogItemData>>
    val isLoading: StateFlow<Boolean>
    val error: StateFlow<String?>

    fun loadCatalog(catalogId: String)
    fun refresh()
}

class CatalogViewModel(
    private val nuvioCore: NuvioCore
) : ViewModel(), CatalogViewModelProtocol {
    // Implementation
}
```

**Swift ViewModel:**
```swift
protocol CatalogViewModelProtocol: ObservableObject {
    var items: [CatalogItemData] { get }
    var isLoading: Bool { get }
    var error: String? { get }

    func loadCatalog(catalogId: String) async
    func refresh() async
}

@MainActor
class CatalogViewModel: CatalogViewModelProtocol {
    @Published var items: [CatalogItemData] = []
    @Published var isLoading: Bool = false
    @Published var error: String? = nil

    private let nuvioCore: NuvioCore

    // Implementation
}
```

This ensures both platforms expose identical functionality to their UI layers.

---

## Alternatives Considered

### Alternative 1: Shared UI Framework (React Native Continued)

**Description:** Keep React Native as the UI layer, only migrate business logic to Rust.

**Pros:**
- Less migration work
- Single UI codebase
- Existing React Native expertise

**Cons:**
- Doesn't solve 810+ platform conditionals problem
- React Native bridge performance overhead remains
- TV focus management still awkward
- Doesn't leverage platform-native performance
- **Rejected:** Doesn't address core UI fragmentation issues

### Alternative 2: Shared UI via KMP + Compose Multiplatform

**Description:** Use Kotlin Multiplatform with Compose Multiplatform for shared UI across Android and iOS.

**Pros:**
- Single Compose UI codebase for mobile platforms
- Kotlin Multiplatform shares business logic
- Good performance

**Cons:**
- Compose Multiplatform iOS support still beta (as of 2026)
- TV support unclear (Android TV works, tvOS via UIKit/SwiftUI interop)
- Adds another layer of abstraction
- iOS/tvOS devs must learn Kotlin
- **Rejected:** Adds complexity, TV support uncertain, Swift is more idiomatic for Apple platforms

### Alternative 3: Flutter with Platform Channels

**Description:** Use Flutter for UI, Rust for business logic via FFI, platform channels for native APIs.

**Pros:**
- Single UI codebase (Dart)
- Good performance (Skia rendering)
- Dart FFI to Rust possible

**Cons:**
- TV support limited (no official Flutter TV SDK)
- Focus management would require custom implementation
- Doesn't leverage Jetpack Compose or SwiftUI
- Team would need to learn Dart
- **Rejected:** TV support insufficient, not platform-native

### Alternative 4: Single Codebase with Build Variants

**Description:** Single Kotlin or Swift codebase with build variants/targets for mobile vs TV.

**Pros:**
- Less code duplication
- Easier to keep platforms in sync

**Cons:**
- Doesn't solve platform fragmentation (Android vs iOS)
- Still requires conditionals for mobile vs TV differences
- Both teams would need to know Kotlin or Swift (pick one)
- **Rejected:** Doesn't address Android/iOS platform differences

### Why Platform-Native UI is Best

**Selected Approach Benefits:**
- **Performance:** Native rendering, no abstraction layer
- **Platform Idioms:** Jetpack Compose and SwiftUI are idiomatic for each platform
- **TV Support:** First-class Android TV and tvOS support
- **Separation:** Clear mobile/TV separation per platform
- **Expertise:** Leverage existing Kotlin/Android and Swift/iOS expertise
- **Future-Proof:** Both platforms investing heavily in declarative UI (Compose, SwiftUI)

---

## Consequences

### Positive Consequences

1. **Elimination of Platform Conditionals**
   - 810+ `Platform.isTV` checks removed
   - Each platform has clean, single-purpose code
   - No cognitive overhead from mixed concerns

2. **Native Performance**
   - No JavaScript bridge overhead
   - Direct ExoPlayer/AVPlayer integration
   - Native rendering pipeline
   - Optimized for each platform's strengths

3. **Improved Developer Experience**
   - Kotlin developers work in Kotlin ecosystem (Android Studio, Gradle)
   - Swift developers work in Swift ecosystem (Xcode, SwiftPM)
   - No context switching between JavaScript and native code
   - Platform-specific tooling and debugging

4. **Better Testing**
   - Unit test components in isolation per platform
   - UI testing with Compose Testing / XCTest
   - No mocking of `Platform.isTV`
   - Integration testing with Rust FFI in native test frameworks

5. **Maintainability**
   - Clear boundaries: Rust business logic, native UI
   - Each platform independently evolvable
   - Easier onboarding (learn one platform at a time)
   - Parallel development (Kotlin and Swift teams work independently)

6. **TV-First Experience**
   - D-pad navigation built-in, not bolted-on
   - Focus management native to platform
   - 10-foot UI patterns idiomatic
   - TV remote handling native

7. **Scalability**
   - Add new platforms (web, desktop) without affecting existing native apps
   - Rust core reusable across all platforms
   - Design system ensures consistency

### Negative Consequences

1. **Code Duplication (Mitigated)**
   - UI code duplicated across Kotlin and Swift
   - **Mitigation:** Shared design tokens, component contracts, parallel structure
   - **Mitigation:** Business logic in Rust (shared), only UI duplicated
   - **Acceptable trade-off:** UI duplication less problematic than mixed platform logic

2. **Team Specialization Required**
   - Need Kotlin/Android expertise
   - Need Swift/iOS expertise
   - Cross-platform work requires coordination
   - **Mitigation:** Clear API contracts between platforms, shared Rust core ensures functional parity

3. **Longer Initial Development Time**
   - Must implement each screen twice (Kotlin + Swift) × 2 (mobile + TV) = 4 implementations
   - **Mitigation:** Phased migration, shared Rust logic reduces work
   - **Long-term benefit:** Maintainability gains outweigh initial cost

4. **Design Drift Risk**
   - Kotlin and Swift implementations may diverge visually
   - **Mitigation:** Shared design system, component parity checklist, cross-platform design QA

5. **Coordination Overhead**
   - Rust SDK changes require coordinated native layer updates
   - **Mitigation:** Versioned FFI contracts (UniFFI), clear communication, shared planning

### Migration Impact

**During Migration:**
- React Native app continues to run
- New native apps built in parallel
- Gradual feature migration (screen by screen)
- Once feature parity reached, switch to native apps

**After Migration:**
- React Native codebase deprecated
- Native apps become primary deployment artifacts
- Simplified CI/CD (no React Native bridge complexity)

---

## Implementation Strategy

### Phase 1: Foundation Setup (Weeks 1-2)

**Kotlin Setup:**
1. Create `kotlin-app/` project structure with `mobile/` and `tv/` modules
2. Set up Gradle multi-module build
3. Configure Jetpack Compose dependencies
4. Set up ExoPlayer integration
5. Create basic navigation scaffolding

**Swift Setup:**
1. Create `swift-app/` Xcode workspace with iOS and tvOS targets
2. Configure SwiftUI for both targets
3. Set up AVFoundation integration
4. Create basic navigation scaffolding

**Shared:**
1. Export design tokens from Figma
2. Generate Kotlin and Swift theme code from tokens
3. Set up FFI integration (UniFFI) for both platforms (see ADR-002)

### Phase 2: Core Component Library (Weeks 3-4)

**Implement Core Components (Mobile + TV per platform):**
1. `CatalogItem` / `CatalogItemTV`
2. `CatalogGrid` / `CatalogGridTV`
3. `VideoPlayer` / `VideoPlayerTV`
4. `MetadataHeader` / `MetadataHeaderTV`
5. `LoadingSpinner`, `ErrorView`, `EmptyStateView`

**Testing:**
- Compose UI tests (Kotlin)
- XCTest UI tests (Swift)
- Visual regression tests (snapshot testing)

### Phase 3: ViewModels + FFI Integration (Weeks 5-6)

**Kotlin:**
1. Implement ViewModels for each screen
2. Integrate Rust FFI via UniFFI Kotlin bindings
3. Map Rust types to Kotlin UI models
4. Handle async via Kotlin Coroutines

**Swift:**
1. Implement ViewModels for each screen
2. Integrate Rust FFI via UniFFI Swift bindings
3. Map Rust types to Swift UI models
4. Handle async via Swift async/await

**Testing:**
- Unit tests for ViewModels
- Integration tests with mocked Rust FFI

### Phase 4: Screen Implementation (Weeks 7-12)

**Priority 1 Screens (Weeks 7-8):**
- Home screen (mobile + TV, Kotlin + Swift)
- Catalog screen
- Metadata screen

**Priority 2 Screens (Weeks 9-10):**
- Player screen
- Library screen
- Search screen

**Priority 3 Screens (Weeks 11-12):**
- Settings screen
- Profile management
- Download manager

**Per Screen Checklist:**
1. Implement Kotlin mobile version
2. Implement Kotlin TV version
3. Implement Swift iOS version
4. Implement Swift tvOS version
5. Connect to Rust FFI via ViewModel
6. UI tests + integration tests
7. Design QA review
8. Functional QA review

### Phase 5: Navigation + Deep Linking (Weeks 13-14)

**Kotlin:**
- Compose Navigation setup
- Deep link handling (mobile + TV)
- Back stack management

**Swift:**
- NavigationStack setup
- URL scheme handling (iOS + tvOS)
- State restoration

### Phase 6: Polish + Performance (Weeks 15-16)

1. Accessibility testing (TalkBack, VoiceOver)
2. Performance profiling (Kotlin: Android Profiler; Swift: Instruments)
3. Memory leak detection
4. Focus navigation refinement (TV)
5. Animation polish
6. Error state handling

### Phase 7: Beta Testing + Rollout (Weeks 17-20)

1. Internal beta (dogfooding)
2. External beta (TestFlight, Google Play Beta)
3. A/B test with React Native version
4. Gradual rollout (10% → 50% → 100%)
5. Monitor crash rates, performance metrics
6. Deprecate React Native version

---

## References

### Internal Documents
- **ADR-001:** Tri-Layer Architecture (defines overall architecture)
- **ADR-002:** FFI Binding Strategy (UniFFI integration)
- **ADR-003:** State Management Strategy (ViewModels + Rust core)
- **Design System:** Figma design tokens, component library
- **Platform Abstraction Pattern Guide:** React Native `.tv.tsx` pattern (for comparison/migration)

### External Documentation

**Jetpack Compose:**
- [Jetpack Compose Official Docs](https://developer.android.com/jetpack/compose)
- [Compose Navigation](https://developer.android.com/jetpack/compose/navigation)
- [Compose for TV](https://developer.android.com/training/tv/playback/compose)
- [ExoPlayer Documentation](https://exoplayer.dev/)

**SwiftUI:**
- [SwiftUI Official Docs](https://developer.apple.com/documentation/swiftui)
- [NavigationStack](https://developer.apple.com/documentation/swiftui/navigationstack)
- [Focus Management (tvOS)](https://developer.apple.com/documentation/swiftui/focus-management)
- [AVFoundation](https://developer.apple.com/documentation/avfoundation)

**Android TV:**
- [Android TV Developer Guide](https://developer.android.com/training/tv)
- [D-pad Navigation](https://developer.android.com/training/tv/start/navigation)
- [Leanback Library](https://developer.android.com/jetpack/androidx/releases/leanback)

**tvOS:**
- [tvOS Developer Guide](https://developer.apple.com/tvos/)
- [UIFocusSystem](https://developer.apple.com/documentation/uikit/uifocussystem)
- [Top Shelf Extensions](https://developer.apple.com/documentation/tvservices)

**UniFFI:**
- [UniFFI Documentation](https://mozilla.github.io/uniffi-rs/)
- [Kotlin Bindings](https://mozilla.github.io/uniffi-rs/kotlin/overview.html)
- [Swift Bindings](https://mozilla.github.io/uniffi-rs/swift/overview.html)

---

**End of ADR-004**
