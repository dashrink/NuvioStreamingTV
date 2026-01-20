package com.nuvio.app.tv.sdk

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import uniffi.nuvio_core.CreateProfileInput
import uniffi.nuvio_core.ProfileManager
import uniffi.nuvio_core.ProfileType
import uniffi.nuvio_core.UpdateProfileInput
import uniffi.nuvio_core.WatchedItem
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Integration tests for ProfileManager Rust SDK bindings.
 * Tests profile CRUD operations, watch history, PIN management, and data persistence.
 */
@RunWith(AndroidJUnit4::class)
class ProfileManagerIntegrationTest {

    private lateinit var profileManager: ProfileManager
    private val createdProfileIds = mutableListOf<String>()

    @Before
    fun setup() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val dataDir = context.filesDir.absolutePath

        try {
            profileManager = ProfileManager(dataDir)
        } catch (e: Exception) {
            fail("Failed to initialize ProfileManager: ${e.message}")
        }
    }

    @After
    fun teardown() {
        // Clean up created profiles
        createdProfileIds.forEach { id ->
            try {
                profileManager.deleteProfile(id)
            } catch (e: Exception) {
                // Ignore cleanup errors
            }
        }

        try {
            profileManager.close()
        } catch (e: Exception) {
            // Ignore cleanup errors
        }
    }

    @Test
    fun testCreateProfile() {
        // Given
        val input = CreateProfileInput(
            name = "Test User",
            avatar = null,
            type = ProfileType.STANDARD
        )

        // When
        val profile = profileManager.createProfile(input)

        // Then
        assertNotNull(profile)
        assertEquals("Test User", profile.name)
        assertEquals(ProfileType.STANDARD, profile.type)
        assertFalse(profile.hasPin)

        createdProfileIds.add(profile.id)
    }

    @Test
    fun testGetProfiles() {
        // Given - Create a test profile
        val input = CreateProfileInput(
            name = "Test User",
            avatar = null,
            type = ProfileType.STANDARD
        )
        val createdProfile = profileManager.createProfile(input)
        createdProfileIds.add(createdProfile.id)

        // When
        val profiles = profileManager.getProfiles()

        // Then
        assertNotNull(profiles)
        assertTrue(profiles.isNotEmpty())
        assertTrue(profiles.any { it.id == createdProfile.id })
    }

    @Test
    fun testSwitchProfile() {
        // Given
        val input = CreateProfileInput(
            name = "Test User",
            avatar = null,
            type = ProfileType.STANDARD
        )
        val profile = profileManager.createProfile(input)
        createdProfileIds.add(profile.id)

        // When
        profileManager.switchProfile(profile.id)
        val activeProfile = profileManager.getActiveProfile()

        // Then
        assertNotNull(activeProfile)
        assertEquals(profile.id, activeProfile?.id)
    }

    @Test
    fun testUpdateProfile() {
        // Given
        val createInput = CreateProfileInput(
            name = "Original Name",
            avatar = null,
            type = ProfileType.STANDARD
        )
        val profile = profileManager.createProfile(createInput)
        createdProfileIds.add(profile.id)

        val updateInput = UpdateProfileInput(
            name = "Updated Name",
            avatar = "new-avatar.png"
        )

        // When
        val updatedProfile = profileManager.updateProfile(profile.id, updateInput)

        // Then
        assertNotNull(updatedProfile)
        assertEquals("Updated Name", updatedProfile.name)
        assertEquals("new-avatar.png", updatedProfile.avatar)
    }

    @Test
    fun testDeleteProfile() {
        // Given
        val input = CreateProfileInput(
            name = "To Delete",
            avatar = null,
            type = ProfileType.STANDARD
        )
        val profile = profileManager.createProfile(input)

        // When
        profileManager.deleteProfile(profile.id)
        val profiles = profileManager.getProfiles()

        // Then
        assertFalse(profiles.any { it.id == profile.id })
    }

    @Test
    fun testWatchHistoryTracking() {
        // Given
        val input = CreateProfileInput(
            name = "Test User",
            avatar = null,
            type = ProfileType.STANDARD
        )
        val profile = profileManager.createProfile(input)
        createdProfileIds.add(profile.id)

        val watchedItem = WatchedItem(
            id = "movie:tt0133093",
            title = "The Matrix",
            totalDuration = 8160.0,
            watchedDuration = 4080.0,
            lastWatchedAt = System.currentTimeMillis() / 1000
        )

        // When
        profileManager.updateWatchedItem(profile.id, watchedItem)
        val history = profileManager.getWatchedHistory(profile.id)

        // Then
        assertNotNull(history)
        assertTrue(history.isNotEmpty())
        assertTrue(history.any { it.id == watchedItem.id })
    }

    @Test
    fun testWatchHistoryUpdate() {
        // Given
        val input = CreateProfileInput(
            name = "Test User",
            avatar = null,
            type = ProfileType.STANDARD
        )
        val profile = profileManager.createProfile(input)
        createdProfileIds.add(profile.id)

        val watchedItem1 = WatchedItem(
            id = "movie:tt0133093",
            title = "The Matrix",
            totalDuration = 8160.0,
            watchedDuration = 2000.0,
            lastWatchedAt = System.currentTimeMillis() / 1000
        )

        val watchedItem2 = WatchedItem(
            id = "movie:tt0133093",
            title = "The Matrix",
            totalDuration = 8160.0,
            watchedDuration = 4080.0,
            lastWatchedAt = System.currentTimeMillis() / 1000 + 100
        )

        // When
        profileManager.updateWatchedItem(profile.id, watchedItem1)
        profileManager.updateWatchedItem(profile.id, watchedItem2)
        val history = profileManager.getWatchedHistory(profile.id)

        // Then
        val item = history.find { it.id == watchedItem2.id }
        assertNotNull(item)
        assertEquals(4080.0, item?.watchedDuration, 0.01)
    }

    @Test
    fun testSetAndVerifyPin() {
        // Given
        val input = CreateProfileInput(
            name = "Test User",
            avatar = null,
            type = ProfileType.STANDARD
        )
        val profile = profileManager.createProfile(input)
        createdProfileIds.add(profile.id)

        val pin = "1234"

        // When
        profileManager.setPin(profile.id, pin)
        val updatedProfile = profileManager.getProfiles().find { it.id == profile.id }
        val correctPin = profileManager.verifyPin(profile.id, pin)
        val incorrectPin = profileManager.verifyPin(profile.id, "9999")

        // Then
        assertNotNull(updatedProfile)
        assertTrue(updatedProfile?.hasPin == true)
        assertTrue(correctPin)
        assertFalse(incorrectPin)
    }

    @Test
    fun testExportAndImportProfiles() {
        // Given
        val input = CreateProfileInput(
            name = "Export Test",
            avatar = null,
            type = ProfileType.STANDARD
        )
        val profile = profileManager.createProfile(input)
        createdProfileIds.add(profile.id)

        // When
        val exportedJson = profileManager.exportProfiles()
        assertNotNull(exportedJson)
        assertTrue(exportedJson.isNotEmpty())

        // Delete profile
        profileManager.deleteProfile(profile.id)

        // Import back
        profileManager.importProfiles(exportedJson)

        // Then
        val profiles = profileManager.getProfiles()
        assertTrue(profiles.any { it.name == "Export Test" })
    }

    @Test
    fun testKidsProfileCreation() {
        // Given
        val input = CreateProfileInput(
            name = "Kids Profile",
            avatar = "kid-avatar.png",
            type = ProfileType.KIDS
        )

        // When
        val profile = profileManager.createProfile(input)
        createdProfileIds.add(profile.id)

        // Then
        assertNotNull(profile)
        assertEquals(ProfileType.KIDS, profile.type)
    }

    @Test
    fun testConcurrentProfileAccess() {
        // Given
        val input = CreateProfileInput(
            name = "Concurrent Test",
            avatar = null,
            type = ProfileType.STANDARD
        )
        val profile = profileManager.createProfile(input)
        createdProfileIds.add(profile.id)

        // When - Multiple concurrent operations
        val threads = List(5) { index ->
            Thread {
                val watchedItem = WatchedItem(
                    id = "movie:test-$index",
                    title = "Test Movie $index",
                    totalDuration = 1000.0,
                    watchedDuration = 500.0,
                    lastWatchedAt = System.currentTimeMillis() / 1000
                )
                profileManager.updateWatchedItem(profile.id, watchedItem)
            }
        }

        threads.forEach { it.start() }
        threads.forEach { it.join() }

        // Then
        val history = profileManager.getWatchedHistory(profile.id)
        assertTrue(history.size >= 5)
    }

    @Test
    fun testProfilePersistence() {
        // Given
        val input = CreateProfileInput(
            name = "Persistence Test",
            avatar = null,
            type = ProfileType.STANDARD
        )
        val profile = profileManager.createProfile(input)
        val profileId = profile.id
        createdProfileIds.add(profileId)

        // When - Close and reopen profile manager
        profileManager.close()

        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val dataDir = context.filesDir.absolutePath
        profileManager = ProfileManager(dataDir)

        // Then
        val profiles = profileManager.getProfiles()
        assertTrue(profiles.any { it.id == profileId })
    }
}
