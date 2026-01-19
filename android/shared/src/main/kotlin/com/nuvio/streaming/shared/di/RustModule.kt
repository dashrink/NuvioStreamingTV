package com.nuvio.streaming.shared.di

import android.content.Context
import com.nuvio.streaming.shared.rust.RustBridge
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import uniffi.nuvio_core.ApiClient
import uniffi.nuvio_core.ProfileManager
import uniffi.nuvio_core.SearchManager
import uniffi.nuvio_core.StremioService
import uniffi.nuvio_core.SyncManager
import javax.inject.Singleton
import java.io.File

/**
 * Hilt module providing Rust SDK dependencies.
 *
 * This module provides singleton instances of Rust SDK components:
 * - ApiClient: Rate-limited HTTP client for Trakt API calls
 * - SearchManager: Search functionality for movies, shows, and people
 * - SyncManager: Sync operations for watchlist, history, and collections
 * - ProfileManager: User profile management
 * - StremioService: Stremio addon integration
 */
@Module
@InstallIn(SingletonComponent::class)
object RustModule {

    @Provides
    @Singleton
    fun provideApiClient(): ApiClient {
        if (!RustBridge.isInitialized()) {
            RustBridge.initialize()
        }
        return ApiClient()
    }

    @Provides
    @Singleton
    fun provideSearchManager(apiClient: ApiClient): SearchManager {
        return SearchManager(apiClient)
    }

    @Provides
    @Singleton
    fun provideSyncManager(apiClient: ApiClient): SyncManager {
        return SyncManager(apiClient)
    }

    @Provides
    @Singleton
    fun provideProfileManager(@ApplicationContext context: Context): ProfileManager {
        if (!RustBridge.isInitialized()) {
            RustBridge.initialize()
        }
        val baseDir = File(context.filesDir, "profiles")
        if (!baseDir.exists()) {
            baseDir.mkdirs()
        }
        return ProfileManager(baseDir.absolutePath)
    }

    @Provides
    @Singleton
    fun provideStremioService(): StremioService {
        if (!RustBridge.isInitialized()) {
            RustBridge.initialize()
        }
        return StremioService()
    }
}
