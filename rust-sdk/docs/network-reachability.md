# Network Reachability Implementation Guide

## Overview

The Nuvio Rust SDK's HTTP networking layer **intentionally does not implement network reachability detection** in Rust. This document explains the rationale behind this decision and provides platform-specific implementation guidance for Android and iOS.

## Why No Rust Implementation?

### Technical Rationale

1. **No Mature Cross-Platform Solution**
   - There is no production-ready, cross-platform Rust library that provides reliable network reachability detection for mobile platforms (Android and iOS)
   - Existing Rust networking libraries are primarily designed for server-side or desktop applications
   - Mobile platforms have unique requirements (cellular vs Wi-Fi detection, VPN handling, etc.) that require platform-specific APIs

2. **Platform APIs Are Superior**
   - Both Android and iOS provide robust, battle-tested native APIs specifically designed for network reachability
   - These APIs integrate deeply with the OS networking stack and receive real-time updates
   - Platform APIs handle edge cases like VPNs, tethering, and cellular data restrictions correctly
   - Native implementations respect system-level network permissions and policies

3. **FFI Complexity Without Benefit**
   - Implementing a Rust wrapper around platform APIs would add unnecessary FFI complexity
   - The Rust layer would provide no additional value - it would just forward calls to platform code
   - Direct platform implementation is simpler, more maintainable, and more performant

4. **Development Best Practices**
   - Separation of concerns: Network reachability is a platform concern, not a transport layer concern
   - The Rust SDK provides the HTTP transport layer; applications integrate with platform services
   - Platform-specific code should live in platform-specific codebases, not in shared Rust code

### Recommended Approach

**Implement network reachability detection in your Kotlin (Android) and Swift (iOS) application code** using the native platform APIs demonstrated below.

---

## Android Implementation

### Using ConnectivityManager

Android provides the `ConnectivityManager` API for monitoring network connectivity state.

#### Modern Approach (API 24+)

For Android 7.0 (API 24) and higher, use `NetworkCallback` for real-time network monitoring:

```kotlin
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import androidx.annotation.RequiresApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Network reachability monitor for Android.
 *
 * Usage:
 * ```kotlin
 * val monitor = NetworkReachabilityMonitor(context)
 * monitor.start()
 *
 * // Observe network state
 * lifecycleScope.launch {
 *     monitor.isConnected.collect { isConnected ->
 *         if (isConnected) {
 *             // Network available - safe to make HTTP requests
 *         } else {
 *             // Network unavailable - show offline UI
 *         }
 *     }
 * }
 *
 * // Clean up when done
 * monitor.stop()
 * ```
 */
@RequiresApi(Build.VERSION_CODES.N)
class NetworkReachabilityMonitor(private val context: Context) {

    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()

    private val _networkType = MutableStateFlow<NetworkType>(NetworkType.NONE)
    val networkType: StateFlow<NetworkType> = _networkType.asStateFlow()

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            _isConnected.value = true
            updateNetworkType(network)
        }

        override fun onLost(network: Network) {
            _isConnected.value = false
            _networkType.value = NetworkType.NONE
        }

        override fun onCapabilitiesChanged(
            network: Network,
            networkCapabilities: NetworkCapabilities
        ) {
            updateNetworkType(network)
        }
    }

    /**
     * Start monitoring network connectivity.
     * Call this in your Activity/Fragment onCreate() or ViewModel init.
     */
    fun start() {
        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .addCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            .build()

        connectivityManager.registerNetworkCallback(networkRequest, networkCallback)

        // Initialize current state
        updateCurrentState()
    }

    /**
     * Stop monitoring network connectivity.
     * Call this in your Activity/Fragment onDestroy() or ViewModel onCleared().
     */
    fun stop() {
        connectivityManager.unregisterNetworkCallback(networkCallback)
    }

    /**
     * Check if network is currently available (one-time check).
     */
    fun isCurrentlyConnected(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false

        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
               capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    private fun updateCurrentState() {
        _isConnected.value = isCurrentlyConnected()
        connectivityManager.activeNetwork?.let { updateNetworkType(it) }
    }

    private fun updateNetworkType(network: Network) {
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return

        _networkType.value = when {
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> NetworkType.WIFI
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> NetworkType.CELLULAR
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> NetworkType.ETHERNET
            else -> NetworkType.OTHER
        }
    }

    enum class NetworkType {
        NONE,
        WIFI,
        CELLULAR,
        ETHERNET,
        OTHER
    }
}
```

#### Legacy Approach (API 21-23)

For older Android versions, use `getActiveNetworkInfo()` (deprecated but necessary for backward compatibility):

```kotlin
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkInfo

/**
 * Legacy network reachability check for older Android versions.
 * Use NetworkReachabilityMonitor for API 24+.
 */
@Suppress("DEPRECATION")
fun isNetworkAvailable(context: Context): Boolean {
    val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    val activeNetwork: NetworkInfo? = connectivityManager.activeNetworkInfo
    return activeNetwork?.isConnectedOrConnecting == true
}
```

#### Required Permissions

Add to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

---

## iOS Implementation

### Using Network Framework (iOS 12+)

For iOS 12 and later, use the modern `Network` framework with `NWPathMonitor`:

```swift
import Foundation
import Network
import Combine

/**
 * Network reachability monitor for iOS using the Network framework.
 *
 * Usage:
 * ```swift
 * let monitor = NetworkReachabilityMonitor()
 * monitor.start()
 *
 * // Observe network state
 * monitor.$isConnected
 *     .sink { isConnected in
 *         if isConnected {
 *             // Network available - safe to make HTTP requests
 *         } else {
 *             // Network unavailable - show offline UI
 *         }
 *     }
 *     .store(in: &cancellables)
 *
 * // Clean up when done
 * monitor.stop()
 * ```
 */
@available(iOS 12.0, *)
class NetworkReachabilityMonitor: ObservableObject {

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "com.nuvio.networkmonitor")

    @Published var isConnected: Bool = false
    @Published var connectionType: ConnectionType = .none
    @Published var isExpensive: Bool = false
    @Published var isConstrained: Bool = false

    /**
     * Start monitoring network connectivity.
     * Call this in your app initialization or view controller viewDidLoad.
     */
    func start() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.updateState(path: path)
            }
        }
        monitor.start(queue: queue)

        // Initialize current state
        updateState(path: monitor.currentPath)
    }

    /**
     * Stop monitoring network connectivity.
     * Call this when the monitor is no longer needed.
     */
    func stop() {
        monitor.cancel()
    }

    /**
     * Check if network is currently available (one-time check).
     */
    func isCurrentlyConnected() -> Bool {
        return monitor.currentPath.status == .satisfied
    }

    private func updateState(path: NWPath) {
        isConnected = (path.status == .satisfied)
        isExpensive = path.isExpensive
        isConstrained = path.isConstrained

        if path.usesInterfaceType(.wifi) {
            connectionType = .wifi
        } else if path.usesInterfaceType(.cellular) {
            connectionType = .cellular
        } else if path.usesInterfaceType(.wiredEthernet) {
            connectionType = .ethernet
        } else if path.usesInterfaceType(.other) {
            connectionType = .other
        } else {
            connectionType = .none
        }
    }

    enum ConnectionType {
        case none
        case wifi
        case cellular
        case ethernet
        case other
    }
}
```

### Using SCNetworkReachability (Legacy)

For iOS 11 and earlier, or when you need to target older versions, use `SCNetworkReachability`:

```swift
import Foundation
import SystemConfiguration

/**
 * Legacy network reachability monitor using SystemConfiguration.
 * Use NetworkReachabilityMonitor (Network framework) for iOS 12+.
 */
class LegacyNetworkReachability {

    private var reachability: SCNetworkReachability?
    private var callback: ((Bool) -> Void)?

    /**
     * Initialize with a hostname or address to monitor.
     * Use "www.apple.com" for general internet connectivity.
     */
    init?(hostname: String = "www.apple.com") {
        guard let reachability = SCNetworkReachabilityCreateWithName(nil, hostname) else {
            return nil
        }
        self.reachability = reachability
    }

    /**
     * Start monitoring network reachability.
     */
    func start(callback: @escaping (Bool) -> Void) {
        self.callback = callback

        guard let reachability = reachability else { return }

        var context = SCNetworkReachabilityContext(
            version: 0,
            info: Unmanaged.passUnretained(self).toOpaque(),
            retain: nil,
            release: nil,
            copyDescription: nil
        )

        let callbackFunction: SCNetworkReachabilityCallBack = { (reachability, flags, info) in
            guard let info = info else { return }
            let monitor = Unmanaged<LegacyNetworkReachability>.fromOpaque(info).takeUnretainedValue()
            monitor.reachabilityChanged(flags: flags)
        }

        SCNetworkReachabilitySetCallback(reachability, callbackFunction, &context)
        SCNetworkReachabilityScheduleWithRunLoop(reachability, CFRunLoopGetMain(), CFRunLoopMode.commonModes.rawValue)

        // Get initial state
        var flags = SCNetworkReachabilityFlags()
        if SCNetworkReachabilityGetFlags(reachability, &flags) {
            reachabilityChanged(flags: flags)
        }
    }

    /**
     * Stop monitoring network reachability.
     */
    func stop() {
        guard let reachability = reachability else { return }
        SCNetworkReachabilityUnscheduleFromRunLoop(reachability, CFRunLoopGetMain(), CFRunLoopMode.commonModes.rawValue)
    }

    /**
     * Check if network is currently reachable (one-time check).
     */
    func isReachable() -> Bool {
        guard let reachability = reachability else { return false }

        var flags = SCNetworkReachabilityFlags()
        guard SCNetworkReachabilityGetFlags(reachability, &flags) else {
            return false
        }

        return isReachable(flags: flags)
    }

    private func reachabilityChanged(flags: SCNetworkReachabilityFlags) {
        let isReachable = isReachable(flags: flags)
        DispatchQueue.main.async { [weak self] in
            self?.callback?(isReachable)
        }
    }

    private func isReachable(flags: SCNetworkReachabilityFlags) -> Bool {
        let isReachable = flags.contains(.reachable)
        let needsConnection = flags.contains(.connectionRequired)
        let canConnectAutomatically = flags.contains(.connectionOnDemand) || flags.contains(.connectionOnTraffic)
        let canConnectWithoutUserInteraction = canConnectAutomatically && !flags.contains(.interventionRequired)

        return isReachable && (!needsConnection || canConnectWithoutUserInteraction)
    }
}
```

---

## Integration with Rust SDK

### Strategy 1: Check Before Making Requests

The simplest approach is to check network reachability before calling the Rust SDK's HTTP functions:

**Kotlin:**
```kotlin
suspend fun fetchData(url: String): Result<HttpResponse> {
    // Check network first
    if (!networkMonitor.isConnected.value) {
        return Result.failure(NetworkUnavailableException("No network connection"))
    }

    // Network available - make request via Rust SDK
    return withContext(Dispatchers.IO) {
        try {
            Result.success(httpGet(url))
        } catch (e: HttpError.NetworkError) {
            Result.failure(e)
        }
    }
}
```

**Swift:**
```swift
func fetchData(url: String) async throws -> HttpResponse {
    // Check network first
    guard networkMonitor.isConnected else {
        throw NetworkError.unavailable
    }

    // Network available - make request via Rust SDK
    return try await Task {
        try httpGet(url: url)
    }.value
}
```

### Strategy 2: Retry with Reachability Awareness

Combine the Rust SDK's retry logic with platform reachability monitoring:

**Kotlin:**
```kotlin
suspend fun fetchDataWithRetry(url: String): HttpResponse {
    var lastError: Throwable? = null

    repeat(3) { attempt ->
        // Wait for network if unavailable
        networkMonitor.isConnected.first { it }

        try {
            return httpGet(url) // Rust SDK call
        } catch (e: HttpError.NetworkError) {
            lastError = e
            delay(1000L * (attempt + 1)) // Exponential backoff
        }
    }

    throw lastError ?: NetworkException("Failed after retries")
}
```

**Swift:**
```swift
func fetchDataWithRetry(url: String) async throws -> HttpResponse {
    var lastError: Error?

    for attempt in 0..<3 {
        // Wait for network if unavailable
        while !networkMonitor.isConnected {
            try await Task.sleep(nanoseconds: 500_000_000) // 500ms
        }

        do {
            return try httpGet(url: url) // Rust SDK call
        } catch let error as HttpError.NetworkError {
            lastError = error
            try await Task.sleep(nanoseconds: UInt64(1_000_000_000 * (attempt + 1)))
        }
    }

    throw lastError ?? NetworkError.retriesExhausted
}
```

### Strategy 3: Observable Pattern

Expose network state to your UI layer for reactive behavior:

**Kotlin with Compose:**
```kotlin
@Composable
fun DataScreen(viewModel: DataViewModel) {
    val isConnected by viewModel.networkMonitor.isConnected.collectAsState()

    if (!isConnected) {
        OfflineIndicator()
    }

    // Rest of UI...
}
```

**Swift with SwiftUI:**
```swift
struct DataView: View {
    @ObservedObject var networkMonitor: NetworkReachabilityMonitor

    var body: some View {
        VStack {
            if !networkMonitor.isConnected {
                OfflineIndicator()
            }

            // Rest of UI...
        }
    }
}
```

---

## Best Practices

### 1. **Don't Block the UI Thread**

Network reachability checks should be fast, but never perform them on the main thread:

```kotlin
// ❌ Bad - blocks UI thread
if (isNetworkAvailable(context)) {
    httpGet(url)
}

// ✅ Good - use coroutines
lifecycleScope.launch {
    if (networkMonitor.isConnected.first()) {
        httpGet(url)
    }
}
```

### 2. **Handle False Positives**

Network reachability indicates a connection exists, **not that a specific server is reachable**:

- DNS might be unavailable
- Corporate firewalls might block certain domains
- Server might be down

**Always handle HTTP errors even when network appears available.**

### 3. **Respect Metered Connections**

On cellular or metered Wi-Fi, consider deferring large downloads:

**Android:**
```kotlin
if (networkType.value == NetworkType.CELLULAR && !userAllowedCellularDownload) {
    // Defer download until Wi-Fi is available
    return
}
```

**iOS:**
```swift
if networkMonitor.isExpensive && !userAllowedExpensiveDownload {
    // Defer download until cheaper network is available
    return
}
```

### 4. **Battery Optimization**

Network monitoring can drain battery. Stop monitoring when not needed:

```kotlin
override fun onPause() {
    super.onPause()
    networkMonitor.stop() // Stop when app is in background
}

override fun onResume() {
    super.onResume()
    networkMonitor.start() // Resume when app is active
}
```

### 5. **VPN Considerations**

Both platform APIs correctly handle VPN connections:

- Android: `NetworkCapabilities` reflects VPN state
- iOS: `NWPathMonitor` automatically detects VPN interfaces

No special handling is needed in your code.

---

## Testing

### Android Testing

Use `TestConnectivityManager` or mock `ConnectivityManager`:

```kotlin
@Test
fun `should not make request when network unavailable`() = runTest {
    // Mock network monitor
    val networkMonitor = FakeNetworkMonitor(isConnected = false)
    val repository = DataRepository(networkMonitor)

    // Attempt to fetch data
    val result = repository.fetchData()

    // Verify no HTTP call was made
    assertTrue(result.isFailure)
}
```

### iOS Testing

Mock `NetworkReachabilityMonitor` in your tests:

```swift
class MockNetworkMonitor: NetworkReachabilityMonitor {
    var mockIsConnected: Bool = true

    override var isConnected: Bool {
        return mockIsConnected
    }
}

func testFetchDataWhenOffline() async {
    let monitor = MockNetworkMonitor()
    monitor.mockIsConnected = false

    let repository = DataRepository(networkMonitor: monitor)

    do {
        _ = try await repository.fetchData()
        XCTFail("Should throw network unavailable error")
    } catch {
        XCTAssertTrue(error is NetworkError)
    }
}
```

---

## Summary

### Key Takeaways

1. ✅ **Platform APIs are the correct choice** for network reachability detection
2. ✅ **No Rust implementation is needed** - it would add complexity without benefit
3. ✅ **Use Android's `ConnectivityManager` and `NetworkCallback`** for modern Android
4. ✅ **Use iOS's `NWPathMonitor` (Network framework)** for iOS 12+
5. ✅ **Check reachability before making HTTP requests** via the Rust SDK
6. ✅ **Always handle HTTP errors** even when network appears available
7. ✅ **Stop monitoring when not needed** to save battery

### Further Reading

- [Android ConnectivityManager Documentation](https://developer.android.com/reference/android/net/ConnectivityManager)
- [Android Network Connectivity Guide](https://developer.android.com/training/monitoring-device-state/connectivity-status-type)
- [iOS Network Framework Documentation](https://developer.apple.com/documentation/network)
- [Apple Reachability Sample Code](https://developer.apple.com/library/archive/samplecode/Reachability/Introduction/Intro.html)

---

**Need help?** Open an issue on the [GitHub repository](https://github.com/tapframe/NuvioStreaming/issues) with questions about network reachability integration.
