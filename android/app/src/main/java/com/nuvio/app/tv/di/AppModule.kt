package com.nuvio.app.tv.di

import com.nuvio.app.tv.data.repository.CatalogRepository
import com.nuvio.app.tv.data.repository.RustCatalogRepository
import dagger.Binds
import dagger.Module
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
}
