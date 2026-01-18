# Notification System Migration

This directory contains the Rust implementation of the notification system, migrated from TypeScript.

## Overview

The notification system manages scheduling, storage, and delivery of notifications for TV show episodes and movie releases. It integrates with platform-specific notification APIs (iOS UserNotifications, Android NotificationManager) via UniFFI-generated bindings.

## Architecture

```
notifications/
├── mod.rs         - Module exports
├── models.rs      - Data types (NotificationItem, NotificationSettings, etc.)
├── storage.rs     - Persistence layer (in-memory + serialization support)
└── manager.rs     - Core notification logic
```

## Key Components

### 1. NotificationSettings

Controls notification behavior:
- `enabled`: Master toggle
- `new_episode_notifications`: Episode-specific toggle
- `reminder_notifications`: Reminder toggle
- `upcoming_shows_notifications`: Upcoming shows toggle
- `time_before_airing`: Hours before airing (default: 24)

### 2. NotificationItem

Represents a scheduled notification:
- Series and episode metadata
- Release date/time
- Notification status
- Optional poster artwork

### 3. NotificationStorage

Provides:
- Settings persistence (load/save as JSON)
- Scheduled notifications storage
- Download notification tracking

### 4. NotificationManager

Main API with methods:
- `schedule_episode_notification()` - Schedule single notification
- `schedule_multiple_notifications()` - Batch scheduling
- `cancel_notification()` / `cancel_all_notifications()` - Cancellation
- `cleanup_old_notifications()` - Remove expired notifications
- `get_notification_stats()` - Statistics for UI
- `notify_download_progress()` / `notify_download_complete()` - Download notifications

## Platform Integration

### iOS (Swift)

```swift
import NuvioCore

// Create storage and manager
let storage = NotificationStorage()
let manager = NotificationManager(storage: storage)

// Load settings from UserDefaults
if let json = UserDefaults.standard.string(forKey: "notification_settings") {
    try? storage.loadSettings(json: json)
}

// Schedule a notification
let params = ScheduleNotificationParams(
    seriesId: "tt1234567",
    seriesName: "Breaking Bad",
    episodeTitle: "Pilot",
    season: 1,
    episode: 1,
    releaseDate: "2024-01-15T20:00:00Z",
    poster: nil
)

if let item = try? manager.scheduleEpisodeNotification(params: params) {
    // Create native iOS notification
    let content = UNMutableNotificationContent()
    content.title = "New Episode: \(item.seriesName)"
    content.body = "S\(item.season):E\(item.episode) - \(item.episodeTitle) is airing soon!"
    content.sound = .default

    // Calculate trigger time (24h before air time by default)
    let trigger = UNTimeIntervalNotificationTrigger(
        timeInterval: calculateTriggerInterval(releaseDate: item.releaseDate),
        repeats: false
    )

    let request = UNNotificationRequest(
        identifier: item.id,
        content: content,
        trigger: trigger
    )

    UNUserNotificationCenter.current().add(request)
}

// Save settings
if let json = try? storage.saveSettings() {
    UserDefaults.standard.set(json, forKey: "notification_settings")
}
```

### Android (Kotlin)

```kotlin
import com.nuvio.sdk.core.*
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context

class NotificationService(private val context: Context) {
    private val storage = NotificationStorage()
    private val manager = NotificationManager(storage)

    fun initialize() {
        // Load settings from SharedPreferences
        val prefs = context.getSharedPreferences("notifications", Context.MODE_PRIVATE)
        val json = prefs.getString("settings", null)
        json?.let { storage.loadSettings(it) }

        // Create notification channel (Android 8.0+)
        createNotificationChannel()
    }

    fun scheduleEpisodeNotification(
        seriesId: String,
        seriesName: String,
        episodeTitle: String,
        season: Int,
        episode: Int,
        releaseDate: String,
        poster: String?
    ) {
        val params = ScheduleNotificationParams(
            seriesId = seriesId,
            seriesName = seriesName,
            episodeTitle = episodeTitle,
            season = season,
            episode = episode,
            releaseDate = releaseDate,
            poster = poster
        )

        val item = manager.scheduleEpisodeNotification(params) ?: return

        // Create Android notification
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle("New Episode: ${item.seriesName}")
            .setContentText("S${item.season}:E${item.episode} - ${item.episodeTitle} is airing soon!")
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()

        // Schedule with AlarmManager for exact time delivery
        scheduleWithAlarmManager(item.id, item.releaseDate, notification)
    }

    fun saveSettings() {
        val json = storage.saveSettings()
        val prefs = context.getSharedPreferences("notifications", Context.MODE_PRIVATE)
        prefs.edit().putString("settings", json).apply()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Episode Notifications",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "Notifications for upcoming TV episodes"
        }

        val notificationManager = context.getSystemService(NotificationManager::class.java)
        notificationManager.createNotificationChannel(channel)
    }

    companion object {
        private const val CHANNEL_ID = "episode_notifications"
    }
}
```

## Migration Notes

### From TypeScript (notificationService.ts)

The Rust implementation provides equivalent functionality:

| TypeScript | Rust |
|------------|------|
| `NotificationService.getInstance()` | `NotificationManager::new(storage)` |
| `updateSettings()` | `update_settings()` |
| `scheduleEpisodeNotification()` | `schedule_episode_notification()` |
| `scheduleMultipleEpisodeNotifications()` | `schedule_multiple_notifications()` |
| `cancelNotification()` | `cancel_notification()` |
| `cancelAllNotifications()` | `cancel_all_notifications()` |
| `getScheduledNotifications()` | `get_scheduled_notifications()` |
| `getNotificationStats()` | `get_notification_stats()` |
| `notifyDownloadProgress()` | `notify_download_progress()` |
| `notifyDownloadComplete()` | `notify_download_complete()` |

### Key Differences

1. **No Singleton**: Rust uses dependency injection instead of singleton pattern
2. **Explicit Storage**: Platform must provide storage implementation (MMKV, SharedPreferences, UserDefaults)
3. **Platform Bridge**: Native notification scheduling happens in platform code, not Rust
4. **Thread Safety**: Rust uses `Arc<RwLock<T>>` for thread-safe access
5. **Error Handling**: Returns `Result<T, NuvioError>` instead of throwing exceptions

### Background Sync

The TypeScript version includes:
- 12-hour background sync interval
- Library integration subscriptions
- App state handling

In the Rust migration, these should be implemented in the platform layer:

**iOS**: Use `BackgroundTasks` framework
**Android**: Use `WorkManager` for periodic sync

```swift
// iOS Background Task
BGTaskScheduler.shared.register(
    forTaskWithIdentifier: "com.nuvio.notification-sync",
    using: nil
) { task in
    self.handleNotificationSync(task: task as! BGAppRefreshTask)
}
```

```kotlin
// Android WorkManager
val syncWork = PeriodicWorkRequestBuilder<NotificationSyncWorker>(
    12, TimeUnit.HOURS
).build()

WorkManager.getInstance(context).enqueue(syncWork)
```

## Testing

Run tests:
```bash
cd rust-sdk/nuvio-core
cargo test notifications
```

All notification modules have comprehensive unit tests covering:
- Settings management
- Notification scheduling and cancellation
- Storage persistence
- Download notification tracking
- Statistics calculation
- Date/time validation

## Building

Generate Kotlin and Swift bindings:
```bash
cd rust-sdk
./scripts/generate-bindings.sh
```

Output:
- `bindings/kotlin/nuvio_core.kt`
- `bindings/swift/NuvioCore.swift`
- `bindings/swift/nuvio_coreFFI.h`

## Integration Checklist

- [ ] Add notification permission requests to platform code
- [ ] Implement platform notification bridge (iOS/Android)
- [ ] Set up background sync workers
- [ ] Integrate with existing catalogService for library updates
- [ ] Integrate with traktService for Trakt sync
- [ ] Migrate MMKV storage calls
- [ ] Update UI to use new notification stats API
- [ ] Test notification delivery on both platforms
- [ ] Verify memory efficiency with large notification lists
- [ ] Test cleanup of old notifications

## Performance Considerations

The Rust implementation includes:
- Memory-efficient data structures (HashMap for O(1) lookups)
- Thread-safe concurrent access
- Batch operations support
- Automatic cleanup of expired notifications
- Rate limiting ready (integrate with existing Trakt rate limiter)

## Future Enhancements

Potential improvements:
- Remote notifications via FCM/APNs
- Custom notification sounds per series
- Notification grouping by series
- Smart scheduling based on viewing patterns
- Notification history tracking
