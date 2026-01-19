import Foundation

enum PlayerStatus {
    case idle
    case buffering
    case playing
    case paused
    case error(String)
    case ended
}

struct SubtitleTrack: Identifiable, Equatable {
    let id: String
    let name: String
    let language: String
    let isSelected: Bool
}

struct AudioTrack: Identifiable, Equatable {
    let id: String
    let name: String
    let language: String
    let isSelected: Bool
}

enum PlaybackSpeed: Float, CaseIterable, Identifiable {
    case quarter = 0.25
    case half = 0.5
    case normal = 1.0
    case oneAndHalf = 1.5
    case double = 2.0
    
    var id: Float { rawValue }
    
    var label: String {
        return "\(String(format: "%g", rawValue))x"
    }
}

enum QualityOption: Identifiable, Equatable {
    case auto
    case manual(resolution: String, bitrate: Int)
    
    var id: String {
        switch self {
        case .auto: return "auto"
        case .manual(let res, let bitrate): return "\(res)-\(bitrate)"
        }
    }
    
    var label: String {
        switch self {
        case .auto: return "Auto"
        case .manual(let res, _): return res
        }
    }
}

struct PlayerTime: Equatable {
    var current: Double = 0
    var duration: Double = 0
    
    var progress: Double {
        guard duration > 0 else { return 0 }
        return current / duration
    }
    
    var remaining: Double {
        return max(0, duration - current)
    }
    
    static func formatted(time: Double) -> String {
        let seconds = Int(time) % 60
        let minutes = (Int(time) / 60) % 60
        let hours = Int(time) / 3600
        
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%02d:%02d", minutes, seconds)
        }
    }
}
