import SwiftUI
import AVKit

struct PlayerView: View {
    @StateObject private var viewModel = PlayerViewModel()
    let url: URL
    let title: String
    let subtitle: String
    var onBack: () -> Void
    
    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            VideoPlayerSurface(player: viewModel.getPlayer())
                .edgesIgnoringSafeArea(.all)
                .onTapGesture(count: 2) {
                    // Double tap logic (iOS)
                    // Determine left or right side?
                    // Simplified: toggle play/pause for now, or implement side detection
                }
                .onTapGesture {
                    viewModel.toggleControls()
                }
            
            if viewModel.showControls {
                PlayerControls(viewModel: viewModel, onBack: onBack)
                    .transition(.opacity)
            }
            
            if case .buffering = viewModel.status {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .scaleEffect(2)
            }
        }
        .onAppear {
            viewModel.load(url: url, title: title, subtitle: subtitle)
        }
        .onDisappear {
            viewModel.pause()
        }
        .statusBar(hidden: !viewModel.showControls)
        #if os(tvOS)
        .ignoresSafeArea()
        #endif
    }
}

// Wrapper for AVPlayerLayer
struct VideoPlayerSurface: UIViewControllerRepresentable {
    let player: AVPlayer?
    
    func makeUIViewController(context: Context) -> AVPlayerViewController {
        let controller = AVPlayerViewController()
        controller.player = player
        controller.showsPlaybackControls = false // Disable native controls
        
        #if os(iOS)
        controller.entersFullScreenWhenPlaybackBegins = true
        #endif
        
        return controller
    }
    
    func updateUIViewController(_ uiViewController: AVPlayerViewController, context: Context) {
        if uiViewController.player != player {
            uiViewController.player = player
        }
    }
}
