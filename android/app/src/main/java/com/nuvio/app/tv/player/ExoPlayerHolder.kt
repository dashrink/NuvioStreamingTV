package com.nuvio.app.tv.player

import android.content.Context
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.exoplayer.ExoPlayer
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ExoPlayerHolder @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private var player: ExoPlayer? = null

    fun getPlayer(): ExoPlayer {
        if (player == null) {
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
                .build()

            player = ExoPlayer.Builder(context)
                .setAudioAttributes(audioAttributes, true)
                .setHandleAudioBecomingNoisy(true)
                .build()
        }
        return player!!
    }

    fun releasePlayer() {
        player?.release()
        player = null
    }
}
