import Foundation
import AVFoundation
import Combine
import SwiftUI

@MainActor
class PlayerViewModel: ObservableObject {
    @Published var status: PlayerStatus = .idle
    @Published var time: PlayerTime = PlayerTime()
    @Published var subtitles: [SubtitleTrack] = []
    @Published var audioTracks: [AudioTrack] = []
    @Published var playbackSpeed: PlaybackSpeed = .normal
    @Published var qualities: [QualityOption] = [.auto]
    @Published var currentQuality: QualityOption = .auto
    @Published var showControls: Bool = true
    @Published var title: String = ""
    @Published var subtitle: String = ""
    
    private var player: AVPlayer?
    private var playerItem: AVPlayerItem?
    private var timeObserver: Any?
    private var cancellables = Set<AnyCancellable>()
    
    deinit {
        cleanUp()
    }
    
    func load(url: URL, title: String, subtitle: String) {
        self.title = title
        self.subtitle = subtitle
        self.status = .buffering
        
        let asset = AVURLAsset(url: url)
        let item = AVPlayerItem(asset: asset)
        
        self.playerItem = item
        self.player = AVPlayer(playerItem: item)
        
        setupObservers(item: item)
        
        player?.play()
    }
    
    private func setupObservers(item: AVPlayerItem) {
        // Status observer
        item.publisher(for: \.status)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] status in
                guard let self = self else { return }
                switch status {
                case .readyToPlay:
                    self.status = .playing
                    self.loadTracks()
                case .failed:
                    self.status = .error(item.error?.localizedDescription ?? "Unknown error")
                default:
                    break
                }
            }
            .store(in: &cancellables)
            
        // Time observer
        let interval = CMTime(seconds: 0.5, preferredTimescale: 600)
        timeObserver = player?.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
            guard let self = self, let duration = self.player?.currentItem?.duration.seconds, !duration.isNaN else { return }
            self.time = PlayerTime(current: time.seconds, duration: duration)
            
            if self.time.remaining < 0.5 && self.status != .ended {
                self.status = .ended
            }
        }
        
        // Buffer empty/full
        item.publisher(for: \.isPlaybackBufferEmpty)
            .sink { [weak self] isEmpty in
                if isEmpty { self?.status = .buffering }
            }
            .store(in: &cancellables)
            
        item.publisher(for: \.isPlaybackLikelyToKeepUp)
            .sink { [weak self] isLikely in
                if isLikely && self?.status == .buffering {
                    self?.status = .playing
                    self?.player?.play()
                }
            }
            .store(in: &cancellables)
    }
    
    func play() {
        if status == .ended {
            seek(to: 0)
        }
        player?.play()
        player?.rate = playbackSpeed.rawValue
        status = .playing
        showControls = true
        scheduleControlsHide()
    }
    
    func pause() {
        player?.pause()
        status = .paused
        showControls = true
    }
    
    func togglePlayPause() {
        if status == .playing {
            pause()
        } else {
            play()
        }
    }
    
    func seek(to seconds: Double) {
        let time = CMTime(seconds: seconds, preferredTimescale: 600)
        player?.seek(to: time)
    }
    
    func skipForward() {
        let newTime = min(time.current + 10, time.duration)
        seek(to: newTime)
        showControls = true
        scheduleControlsHide()
    }
    
    func skipBackward() {
        let newTime = max(time.current - 10, 0)
        seek(to: newTime)
        showControls = true
        scheduleControlsHide()
    }
    
    func setSpeed(_ speed: PlaybackSpeed) {
        playbackSpeed = speed
        if status == .playing {
            player?.rate = speed.rawValue
        }
    }
    
    func selectSubtitle(_ track: SubtitleTrack) {
        // Implementation for AVMediaSelection
        guard let group = playerItem?.asset.mediaSelectionGroup(forMediaCharacteristic: .legible) else { return }
        
        if track.id == "off" {
            playerItem?.select(nil, in: group)
        } else {
            // Find option with matching ID/Name - simplified logic
            let options = group.options
            if let option = options.first(where: { $0.displayName == track.name }) {
                playerItem?.select(option, in: group)
            }
        }
        
        // Update UI state
        subtitles = subtitles.map { t in
            var copy = t
            copy.isSelected = (t.id == track.id)
            return copy
        }
    }
    
    func selectAudio(_ track: AudioTrack) {
        guard let group = playerItem?.asset.mediaSelectionGroup(forMediaCharacteristic: .audible) else { return }
        
        let options = group.options
        if let option = options.first(where: { $0.displayName == track.name }) {
            playerItem?.select(option, in: group)
        }
        
        audioTracks = audioTracks.map { t in
            var copy = t
            copy.isSelected = (t.id == track.id)
            return copy
        }
    }
    
    private func loadTracks() {
        guard let asset = playerItem?.asset else { return }
        
        // Subtitles
        if let group = asset.mediaSelectionGroup(forMediaCharacteristic: .legible) {
            var tracks = group.options.map { option in
                SubtitleTrack(
                    id: option.displayName,
                    name: option.displayName,
                    language: option.extendedLanguageTag ?? "unk",
                    isSelected: false
                )
            }
            tracks.insert(SubtitleTrack(id: "off", name: "Off", language: "", isSelected: true), at: 0)
            self.subtitles = tracks
        }
        
        // Audio
        if let group = asset.mediaSelectionGroup(forMediaCharacteristic: .audible) {
            self.audioTracks = group.options.map { option in
                AudioTrack(
                    id: option.displayName,
                    name: option.displayName,
                    language: option.extendedLanguageTag ?? "unk",
                    isSelected: false // Logic to determine currently selected is needed
                )
            }
            // Mark first as selected if none (simplified)
            if !audioTracks.isEmpty {
                audioTracks[0] = AudioTrack(id: audioTracks[0].id, name: audioTracks[0].name, language: audioTracks[0].language, isSelected: true)
            }
        }
    }
    
    private var controlsHideTimer: Timer?
    
    func scheduleControlsHide() {
        controlsHideTimer?.invalidate()
        controlsHideTimer = Timer.scheduledTimer(withTimeInterval: 4.0, repeats: false) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self = self else { return }
                if self.status == .playing {
                    withAnimation {
                        self.showControls = false
                    }
                }
            }
        }
    }
    
    func toggleControls() {
        withAnimation {
            showControls.toggle()
        }
        if showControls {
            scheduleControlsHide()
        }
    }
    
    private func cleanUp() {
        if let observer = timeObserver {
            player?.removeTimeObserver(observer)
        }
        player?.pause()
        player = nil
        playerItem = nil
    }
    
    // Helper to get player instance for AVPlayerLayer
    func getPlayer() -> AVPlayer? {
        return player
    }
}
