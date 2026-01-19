package com.nuvio.app.tv.di

import android.content.Context
import com.nuvio.sdk.core.ProfileManager
import com.nuvio.sdk.core.StremioService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object RustModule {

    @Provides
    @Singleton
    fun provideStremioService(): StremioService {
        return StremioService()
    }

    @Provides
    @Singleton
    fun provideProfileManager(
        @ApplicationContext context: Context
    ): ProfileManager {
        val baseDir = context.filesDir.absolutePath
        return ProfileManager(baseDir)
    }
}
