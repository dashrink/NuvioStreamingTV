package com.nuvio.app.tv.di

import com.nuvio.app.tv.data.repository.CatalogRepository
import com.nuvio.app.tv.data.repository.ProfileRepository
import com.nuvio.app.tv.data.repository.RustCatalogRepository
import com.nuvio.app.tv.data.repository.RustProfileRepository
import com.nuvio.app.tv.data.repository.WatchlistRepository
import com.nuvio.app.tv.data.repository.RustWatchlistRepository
import com.nuvio.app.tv.ui.search.SearchHistoryManager
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class AppModule {

    @Binds
    @Singleton
    abstract fun bindCatalogRepository(
        rustCatalogRepository: RustCatalogRepository
    ): CatalogRepository

    @Binds
    @Singleton
    abstract fun bindProfileRepository(
        rustProfileRepository: RustProfileRepository
    ): ProfileRepository

    @Binds
    @Singleton
    abstract fun bindWatchlistRepository(
        rustWatchlistRepository: RustWatchlistRepository
    ): WatchlistRepository

    companion object {
        @Provides
        @Singleton
        fun provideSearchHistoryManager(): SearchHistoryManager {
            return SearchHistoryManager()
        }
    }
}
