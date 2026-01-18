package com.nuvio.app.tv.player

import android.app.PictureInPictureParams
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.Rational
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.nuvio.app.tv.player.ui.VideoPlayerScreen
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class PlayerActivity : ComponentActivity() {

    private val viewModel: PlayerViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val url = intent.getStringExtra("url") ?: return finish()
        val title = intent.getStringExtra("title") ?: "Video"
        val mediaId = intent.getStringExtra("mediaId")
        val posterUrl = intent.getStringExtra("posterUrl")

        viewModel.initializePlayer(url, mediaId, title, posterUrl)
        
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    VideoPlayerScreen(
                        url = url,
                        title = title,
                        exoPlayerHolder = viewModel.exoPlayerHolder,
                        showSkipButton = viewModel.showSkipButton.value,
                        onSkipIntro = viewModel::skipIntro,
                        onBackPressed = { finish() }
                    )
                }
            }
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val params = PictureInPictureParams.Builder()
                .setAspectRatio(Rational(16, 9))
                .build()
            enterPictureInPictureMode(params)
        }
    }

    override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        // VideoPlayerScreen handles UI hiding via checking checking config or we can pass a state
        // Currently Mobile/TvControls auto-hide logic might interact here, 
        // ideally we should hide controls immediately entering PiP.
    }
}
