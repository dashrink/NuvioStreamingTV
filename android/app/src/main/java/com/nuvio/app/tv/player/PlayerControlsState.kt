package com.nuvio.app.tv.player

data class PlayerControlsState(
    val availableAudioTracks: List<AudioTrack> = emptyList(),
    val availableSubtitles: List<SubtitleTrack> = emptyList(),
    val selectedAudioTrackId: String? = null,
    val selectedSubtitleTrackId: String? = "off",
    val playbackSpeed: Float = 1.0f,
    val subtitleSettings: SubtitleSettings = SubtitleSettings(),
    val availableQualities: List<QualityOption> = emptyList(),
    val selectedQuality: QualityOption = QualityOption.Auto
)

data class SubtitleSettings(
    val fontSize: SubtitleFontSize = SubtitleFontSize.MEDIUM,
    val backgroundColor: SubtitleBackgroundColor = SubtitleBackgroundColor.BLACK,
    val textColor: SubtitleTextColor = SubtitleTextColor.WHITE,
    val position: SubtitlePosition = SubtitlePosition.BOTTOM
)

enum class SubtitleFontSize(val label: String, val scale: Float) {
    SMALL("Small", 0.8f),
    MEDIUM("Medium", 1.0f),
    LARGE("Large", 1.2f),
    EXTRA_LARGE("Extra Large", 1.5f)
}

enum class SubtitleBackgroundColor(val label: String, val alpha: Float) {
    TRANSPARENT("Transparent", 0.0f),
    BLACK("Black", 0.8f),
    SEMI_TRANSPARENT("Semi-transparent", 0.5f)
}

enum class SubtitleTextColor(val label: String) {
    WHITE("White"),
    YELLOW("Yellow"),
    CYAN("Cyan")
}

enum class SubtitlePosition(val label: String) {
    TOP("Top"),
    MIDDLE("Middle"),
    BOTTOM("Bottom")
}

sealed class QualityOption {
    object Auto : QualityOption() {
        override fun toString() = "Auto"
    }
    data class Manual(val id: String, val height: Int, val bitrate: Int) : QualityOption() {
        override fun toString() = "${height}p"
    }
}
