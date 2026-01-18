package com.nuvio.app.tv.di

import com.nuvio.sdk.core.StremioService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
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
}
