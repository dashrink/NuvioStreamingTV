import SwiftUI

struct PlayerControls: View {
    @ObservedObject var viewModel: PlayerViewModel
    var onBack: () -> Void
    
    @State private var showSettings = false
    
    var body: some View {
        ZStack {
            // Dark overlay
            Color.black.opacity(0.4)
                .edgesIgnoringSafeArea(.all)
                .onTapGesture {
                    viewModel.toggleControls()
                }
            
            VStack {
                // Top Bar
                HStack {
                    Button(action: onBack) {
                        Image(systemName: "chevron.left")
                            .font(.title2)
                            .foregroundColor(.white)
                    }
                    .buttonStyle(.plain)
                    
                    VStack(alignment: .leading) {
                        Text(viewModel.title)
                            .font(.headline)
                            .foregroundColor(.white)
                        if !viewModel.subtitle.isEmpty {
                            Text(viewModel.subtitle)
                                .font(.subheadline)
                                .foregroundColor(.gray)
                        }
                    }
                    
                    Spacer()
                    
                    // Settings Button
                    Button(action: { showSettings = true }) {
                        Image(systemName: "gear")
                            .font(.title2)
                            .foregroundColor(.white)
                    }
                    .buttonStyle(.plain)
                }
                .padding()
                
                Spacer()
                
                // Center Controls (Play/Pause/Skip)
                HStack(spacing: 40) {
                    Button(action: viewModel.skipBackward) {
                        Image(systemName: "gobackward.10")
                            .font(.system(size: 30))
                            .foregroundColor(.white)
                    }
                    .buttonStyle(.plain)
                    
                    Button(action: viewModel.togglePlayPause) {
                        Image(systemName: viewModel.status == .playing ? "pause.fill" : "play.fill")
                            .font(.system(size: 50))
                            .foregroundColor(.white)
                    }
                    .buttonStyle(.plain)
                    
                    Button(action: viewModel.skipForward) {
                        Image(systemName: "goforward.10")
                            .font(.system(size: 30))
                            .foregroundColor(.white)
                    }
                    .buttonStyle(.plain)
                }
                
                Spacer()
                
                // Bottom Bar (Progress)
                VStack(spacing: 8) {
                    Slider(
                        value: Binding(
                            get: { viewModel.time.current },
                            set: { viewModel.seek(to: $0) }
                        ),
                        in: 0...max(1, viewModel.time.duration)
                    )
                    .accentColor(.red)
                    
                    HStack {
                        Text(PlayerTime.formatted(time: viewModel.time.current))
                        Spacer()
                        Text(PlayerTime.formatted(time: viewModel.time.duration))
                    }
                    .font(.caption)
                    .foregroundColor(.white)
                }
                .padding()
            }
        }
        .sheet(isPresented: $showSettings) {
            SettingsView(viewModel: viewModel)
        }
    }
}

struct SettingsView: View {
    @ObservedObject var viewModel: PlayerViewModel
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Audio")) {
                    ForEach(viewModel.audioTracks) { track in
                        Button(action: { viewModel.selectAudio(track) }) {
                            HStack {
                                Text(track.name)
                                Spacer()
                                if track.isSelected {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                }
                
                Section(header: Text("Subtitles")) {
                    ForEach(viewModel.subtitles) { track in
                        Button(action: { viewModel.selectSubtitle(track) }) {
                            HStack {
                                Text(track.name)
                                Spacer()
                                if track.isSelected {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                }
                
                Section(header: Text("Speed")) {
                    ForEach(PlaybackSpeed.allCases) { speed in
                        Button(action: { viewModel.setSpeed(speed) }) {
                            HStack {
                                Text(speed.label)
                                Spacer()
                                if viewModel.playbackSpeed == speed {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
            }
        }
    }
}
