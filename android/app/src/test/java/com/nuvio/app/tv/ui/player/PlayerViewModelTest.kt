package com.nuvio.app.tv.ui.player

import androidx.media3.common.Player
import app.cash.turbine.test
import com.nuvio.app.tv.player.AudioTrack
import com.nuvio.app.tv.player.ExoPlayerHolder
import com.nuvio.app.tv.player.PlayerViewModel
import com.nuvio.app.tv.player.QualityOption
import com.nuvio.app.tv.player.SubtitleTrack
import com.nuvio.app.tv.player.data.PlayerRepository
import com.nuvio.app.tv.util.MainDispatcherRule
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test

@ExperimentalCoroutinesApi
class PlayerViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var exoPlayerHolder: ExoPlayerHolder
    private lateinit var playerRepository: PlayerRepository
    private lateinit var player: Player
    private lateinit var viewModel: PlayerViewModel

    @Before
    fun setup() {
        exoPlayerHolder = mockk(relaxed = true)
        playerRepository = mockk(relaxed = true)
        player = mockk(relaxed = true)

        every { exoPlayerHolder.getPlayer() } returns player
        every { player.isPlaying } returns false
        every { player.currentPosition } returns 0L
        every { player.duration } returns 100000L

        coEvery { playerRepository.updateProgress(any(), any(), any(), any(), any()) } returns Unit
    }

    @Test
    fun `initializePlayer starts progress tracking`() = runTest {
        // Given
        viewModel = PlayerViewModel(exoPlayerHolder, playerRepository)

        // When
        viewModel.initializePlayer(
            url = "https://example.com/video.m3u8",
            mediaId = "movie-1",
            title = "Test Movie",
            posterUrl = "https://example.com/poster.jpg"
        )

        advanceTimeBy(2000) // Advance 2 seconds

        // Then
        coVerify(atLeast = 1) { playerRepository.updateProgress(any(), any(), any(), any(), any()) }
    }

    @Test
    fun `refreshAvailableTracks updates controls state`() = runTest {
        // Given
        val audioTracks = listOf(
            AudioTrack("track1", "English", true),
            AudioTrack("track2", "Spanish", false)
        )
        val subtitles = listOf(
            SubtitleTrack("sub1", "English", false),
            SubtitleTrack("sub2", "Spanish", false)
        )
        val qualities = listOf(QualityOption.Auto)

        every { exoPlayerHolder.getAvailableAudioTracks() } returns audioTracks
        every { exoPlayerHolder.getAvailableSubtitles() } returns subtitles
        every { exoPlayerHolder.getAvailableQualities() } returns qualities

        viewModel = PlayerViewModel(exoPlayerHolder, playerRepository)

        // When
        viewModel.refreshAvailableTracks()

        // Then
        viewModel.controlsState.test {
            val state = awaitItem()
            assertEquals(2, state.availableAudioTracks.size)
            assertEquals(2, state.availableSubtitles.size)
            assertEquals("track1", state.selectedAudioTrackId)
        }
    }

    @Test
    fun `selectAudioTrack updates state and calls player holder`() = runTest {
        // Given
        viewModel = PlayerViewModel(exoPlayerHolder, playerRepository)

        // When
        viewModel.selectAudioTrack("track2")

        // Then
        verify { exoPlayerHolder.selectAudioTrack("track2") }
        viewModel.controlsState.test {
            val state = awaitItem()
            assertEquals("track2", state.selectedAudioTrackId)
        }
    }

    @Test
    fun `selectSubtitleTrack updates state and calls player holder`() = runTest {
        // Given
        viewModel = PlayerViewModel(exoPlayerHolder, playerRepository)

        // When
        viewModel.selectSubtitleTrack("sub1")

        // Then
        verify { exoPlayerHolder.selectSubtitleTrack("sub1") }
        viewModel.controlsState.test {
            val state = awaitItem()
            assertEquals("sub1", state.selectedSubtitleTrackId)
        }
    }

    @Test
    fun `setPlaybackSpeed updates state and calls player holder`() = runTest {
        // Given
        viewModel = PlayerViewModel(exoPlayerHolder, playerRepository)

        // When
        viewModel.setPlaybackSpeed(1.5f)

        // Then
        verify { exoPlayerHolder.setPlaybackSpeed(1.5f) }
        viewModel.controlsState.test {
            val state = awaitItem()
            assertEquals(1.5f, state.playbackSpeed, 0.01f)
        }
    }

    @Test
    fun `skipIntro seeks to end of intro`() = runTest {
        // Given
        viewModel = PlayerViewModel(exoPlayerHolder, playerRepository)
        viewModel.initializePlayer(
            url = "https://example.com/video.m3u8",
            mediaId = "movie-1",
            title = "Test Movie",
            posterUrl = null
        )

        // When
        viewModel.skipIntro()

        // Then
        verify { player.seekTo(30000L) } // End of intro timestamp
        assertFalse(viewModel.showSkipButton.value)
    }

    @Test
    fun `showSkipButton is true when in intro range`() = runTest {
        // Given
        every { player.isPlaying } returns true
        every { player.currentPosition } returns 15000L // 15s - within intro (10s-30s)

        viewModel = PlayerViewModel(exoPlayerHolder, playerRepository)

        // When
        viewModel.initializePlayer(
            url = "https://example.com/video.m3u8",
            mediaId = "movie-1",
            title = "Test Movie",
            posterUrl = null
        )

        advanceTimeBy(1500) // Advance to trigger progress check

        // Then
        assertTrue(viewModel.showSkipButton.value)
    }

    @Test
    fun `showSkipButton is false when outside intro range`() = runTest {
        // Given
        every { player.isPlaying } returns true
        every { player.currentPosition } returns 35000L // 35s - after intro

        viewModel = PlayerViewModel(exoPlayerHolder, playerRepository)

        // When
        viewModel.initializePlayer(
            url = "https://example.com/video.m3u8",
            mediaId = "movie-1",
            title = "Test Movie",
            posterUrl = null
        )

        advanceTimeBy(1500)

        // Then
        assertFalse(viewModel.showSkipButton.value)
    }

    @Test
    fun `onCleared cancels progress tracking and releases player`() = runTest {
        // Given
        viewModel = PlayerViewModel(exoPlayerHolder, playerRepository)
        viewModel.initializePlayer(
            url = "https://example.com/video.m3u8",
            mediaId = "movie-1",
            title = "Test Movie",
            posterUrl = null
        )

        // When
        // Call onCleared through reflection (normally called by ViewModel lifecycle)
        viewModel.onCleared()

        // Then
        verify { exoPlayerHolder.releasePlayer() }
    }
}
