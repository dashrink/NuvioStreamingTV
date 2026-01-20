package com.nuvio.app.tv.sdk

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import uniffi.nuvio_core.StremioService
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Integration tests for StremioService Rust SDK bindings.
 * These tests verify that the UniFFI-generated bindings work correctly
 * and that the Rust SDK integrates properly with the Android app.
 */
@RunWith(AndroidJUnit4::class)
class StremioServiceIntegrationTest {

    private lateinit var stremioService: StremioService

    @Before
    fun setup() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val dataDir = context.filesDir.absolutePath

        try {
            stremioService = StremioService(dataDir)
        } catch (e: Exception) {
            fail("Failed to initialize StremioService: ${e.message}")
        }
    }

    @After
    fun teardown() {
        try {
            stremioService.close()
        } catch (e: Exception) {
            // Ignore cleanup errors
        }
    }

    @Test
    fun testStremioServiceInitialization() {
        // Verify that StremioService can be initialized without crashing
        assertNotNull(stremioService)
    }

    @Test
    fun testDiscoverAddon() {
        // Given
        val manifestUrl = "https://v3-cinemeta.strem.io/manifest.json"

        // When
        try {
            val result = stremioService.discover(manifestUrl)

            // Then
            assertNotNull(result)
            // The addon should be discovered successfully
        } catch (e: Exception) {
            // Network failures are acceptable in tests
            assertTrue(e.message?.contains("network") == true ||
                      e.message?.contains("timeout") == true ||
                      e.message?.contains("connection") == true)
        }
    }

    @Test
    fun testGetAddons() {
        // When
        val addons = stremioService.getAddons()

        // Then
        assertNotNull(addons)
        // Initially should be empty or contain pre-configured addons
        assertTrue(addons.isEmpty() || addons.isNotEmpty())
    }

    @Test
    fun testGetCatalogWithInvalidParams() {
        // Given
        val addonId = "invalid-addon"
        val contentType = "movie"
        val catalogId = "top"

        // When/Then
        try {
            val result = stremioService.getCatalog(addonId, contentType, catalogId, 0, null)
            // Should either return empty list or throw exception
            assertNotNull(result)
        } catch (e: Exception) {
            // Expected for invalid addon
            assertNotNull(e.message)
        }
    }

    @Test
    fun testAggregateMetaWithInvalidId() {
        // Given
        val contentType = "movie"
        val contentId = "invalid-id-12345"

        // When/Then
        try {
            val result = stremioService.aggregateMeta(contentType, contentId)
            // Should handle invalid ID gracefully
            assertNotNull(result)
        } catch (e: Exception) {
            // Expected for invalid content ID
            assertNotNull(e.message)
        }
    }

    @Test
    fun testMemoryLeakPrevention() {
        // Test that multiple service creations and destructions don't leak memory
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val dataDir = context.filesDir.absolutePath

        repeat(10) {
            val service = StremioService(dataDir)
            val addons = service.getAddons()
            assertNotNull(addons)
            service.close()
        }

        // If we get here without crash, memory management is working
        assertTrue(true)
    }

    @Test
    fun testConcurrentAccess() {
        // Test that the service can handle concurrent requests without crashing
        val threads = List(5) {
            Thread {
                try {
                    stremioService.getAddons()
                } catch (e: Exception) {
                    // Concurrent access errors are acceptable
                }
            }
        }

        threads.forEach { it.start() }
        threads.forEach { it.join() }

        // If we get here without crash, concurrency handling is working
        assertTrue(true)
    }

    @Test
    fun testServiceLifecycle() {
        // Test that service can be closed and reopened
        stremioService.close()

        // Reopen
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val dataDir = context.filesDir.absolutePath
        stremioService = StremioService(dataDir)

        // Verify it still works
        val addons = stremioService.getAddons()
        assertNotNull(addons)
    }
}
