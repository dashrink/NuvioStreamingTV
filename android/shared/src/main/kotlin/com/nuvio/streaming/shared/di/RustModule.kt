package com.nuvio.streaming.shared.di

import android.content.Context
import com.nuvio.streaming.shared.rust.RustBridge
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import uniffi.nuvio_core.ProfileManager
import uniffi.nuvio_core.Trakt
import javax.inject.Singleton
import java.io.File

@Module
@InstallIn(SingletonComponent::class)
object RustModule {

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
    fun provideTrakt(): Trakt {
        if (!RustBridge.isInitialized()) {
            RustBridge.initialize()
        }
        // TODO: Replace with real credentials from BuildConfig or secure storage
        return Trakt(
            clientId = "placeholder_client_id",
            clientSecret = "placeholder_client_secret",
            redirectUri = "urn:ietf:wg:oauth:2.0:oob",
            tokenCallback = null
        )
    }
}
