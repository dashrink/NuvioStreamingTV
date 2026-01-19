package com.nuvio.app.tv

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class MainApplication : Application() {

  override fun onCreate() {
    super.onCreate()
    // Pure Kotlin/Compose application initialization
  }
}
