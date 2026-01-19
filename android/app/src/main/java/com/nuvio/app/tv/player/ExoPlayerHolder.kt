package com.nuvio.app.tv.player

import android.content.Context
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ExoPlayerHolder @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private var player: ExoPlayer? = null
    private var trackSelector: DefaultTrackSelector? = null

    fun getPlayer(): ExoPlayer {
        if (player == null) {
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
                .build()

            trackSelector = DefaultTrackSelector(context).apply {
                parameters = buildUponParameters()
                    .setPreferredTextLanguage("en")
                    .build()
            }

            player = ExoPlayer.Builder(context)
                .setAudioAttributes(audioAttributes, true)
                .setHandleAudioBecomingNoisy(true)
                .setTrackSelector(trackSelector!!)
                .build()
        }
        return player!!
    }

    fun getTrackSelector(): DefaultTrackSelector? = trackSelector

    fun getAvailableAudioTracks(): List<AudioTrack> {
        val player = player ?: return emptyList()
        val tracks = player.currentTracks
        val audioTracks = mutableListOf<AudioTrack>()

        for (trackGroup in tracks.groups) {
            if (trackGroup.type == C.TRACK_TYPE_AUDIO) {
                val format = trackGroup.getTrackFormat(0)
                audioTracks.add(
                    AudioTrack(
                        id = format.id ?: "unknown",
                        language = format.language ?: "und",
                        label = format.label ?: format.language ?: "Unknown",
                        isSelected = trackGroup.isSelected
                    )
                )
            }
        }
        return audioTracks
    }

    fun getAvailableSubtitles(): List<SubtitleTrack> {
        val player = player ?: return emptyList()
        val tracks = player.currentTracks
        val subtitleTracks = mutableListOf<SubtitleTrack>()

        subtitleTracks.add(SubtitleTrack("off", "Off", "off", false))

        for (trackGroup in tracks.groups) {
            if (trackGroup.type == C.TRACK_TYPE_TEXT) {
                val format = trackGroup.getTrackFormat(0)
                subtitleTracks.add(
                    SubtitleTrack(
                        id = format.id ?: "unknown",
                        language = format.language ?: "und",
                        label = format.label ?: format.language ?: "Unknown",
                        isSelected = trackGroup.isSelected
                    )
                )
            }
        }
        return subtitleTracks
    }

    fun selectAudioTrack(trackId: String) {
        val player = player ?: return
        val trackSelector = trackSelector ?: return
        val tracks = player.currentTracks

        for (trackGroup in tracks.groups) {
            if (trackGroup.type == C.TRACK_TYPE_AUDIO) {
                val format = trackGroup.getTrackFormat(0)
                if (format.id == trackId) {
                    val override = TrackSelectionOverride(trackGroup.mediaTrackGroup, 0)
                    trackSelector.parameters = trackSelector.buildUponParameters()
                        .setOverrideForType(override)
                        .build()
                    break
                }
            }
        }
    }

    fun selectSubtitleTrack(trackId: String) {
        val player = player ?: return
        val trackSelector = trackSelector ?: return

        if (trackId == "off") {
            trackSelector.parameters = trackSelector.buildUponParameters()
                .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
                .build()
            return
        }

        val tracks = player.currentTracks
        for (trackGroup in tracks.groups) {
            if (trackGroup.type == C.TRACK_TYPE_TEXT) {
                val format = trackGroup.getTrackFormat(0)
                if (format.id == trackId) {
                    val override = TrackSelectionOverride(trackGroup.mediaTrackGroup, 0)
                    trackSelector.parameters = trackSelector.buildUponParameters()
                        .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
                        .setOverrideForType(override)
                        .build()
                    break
                }
            }
        }
    }

    fun setPlaybackSpeed(speed: Float) {
        player?.setPlaybackSpeed(speed)
    }

    fun getAvailableQualities(): List<QualityOption> {
        val player = player ?: return emptyList()
        val tracks = player.currentTracks
        val qualities = mutableListOf<QualityOption>()

        // Always add Auto option
        qualities.add(QualityOption.Auto)

        for (trackGroup in tracks.groups) {
            if (trackGroup.type == C.TRACK_TYPE_VIDEO) {
                for (i in 0 until trackGroup.length) {
                    val format = trackGroup.getTrackFormat(i)
                    if (format.height > 0) {
                        qualities.add(
                            QualityOption.Manual(
                                id = format.id ?: "unknown-$i",
                                height = format.height,
                                bitrate = format.bitrate
                            )
                        )
                    }
                }
            }
        }
        return qualities.distinctBy {
            when (it) {
                is QualityOption.Auto -> "auto"
                is QualityOption.Manual -> it.height
            }
        }.sortedByDescending {
            when (it) {
                is QualityOption.Auto -> Int.MAX_VALUE
                is QualityOption.Manual -> it.height
            }
        }
    }

    fun selectQuality(quality: QualityOption) {
        val player = player ?: return
        val trackSelector = trackSelector ?: return

        when (quality) {
            is QualityOption.Auto -> {
                // Reset to auto quality selection
                trackSelector.parameters = trackSelector.buildUponParameters()
                    .clearVideoSizeConstraints()
                    .setMaxVideoSize(Int.MAX_VALUE, Int.MAX_VALUE)
                    .build()
            }
            is QualityOption.Manual -> {
                val tracks = player.currentTracks
                for (trackGroup in tracks.groups) {
                    if (trackGroup.type == C.TRACK_TYPE_VIDEO) {
                        for (i in 0 until trackGroup.length) {
                            val format = trackGroup.getTrackFormat(i)
                            if (format.height == quality.height) {
                                val override = TrackSelectionOverride(trackGroup.mediaTrackGroup, i)
                                trackSelector.parameters = trackSelector.buildUponParameters()
                                    .setOverrideForType(override)
                                    .build()
                                return
                            }
                        }
                    }
                }
            }
        }
    }

    fun releasePlayer() {
        player?.release()
        player = null
        trackSelector = null
    }
}

data class AudioTrack(
    val id: String,
    val language: String,
    val label: String,
    val isSelected: Boolean
)

data class SubtitleTrack(
    val id: String,
    val language: String,
    val label: String,
    val isSelected: Boolean
)
