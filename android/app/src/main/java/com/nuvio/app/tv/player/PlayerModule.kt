package com.nuvio.app.tv.player

import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class PlayerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "PlayerModule"

    @ReactMethod
    fun playVideo(config: ReadableMap) {
        val intent = Intent(reactApplicationContext, PlayerActivity::class.java).apply {
            putExtra("url", config.getString("url"))
            putExtra("title", if (config.hasKey("title")) config.getString("title") else "Video")
            putExtra("mediaId", if (config.hasKey("mediaId")) config.getString("mediaId") else null)
            putExtra("posterUrl", if (config.hasKey("posterUrl")) config.getString("posterUrl") else null)
            putExtra("startPosition", if (config.hasKey("startPosition")) config.getDouble("startPosition").toLong() else 0L)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactApplicationContext.startActivity(intent)
    }
}
