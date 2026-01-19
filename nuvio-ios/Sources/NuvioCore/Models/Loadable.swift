import Foundation

public enum Loadable<T> {
    case idle
    case loading
    case loaded(T)
    case error(Error)
    
    public var value: T? {
        if case .loaded(let val) = self {
            return val
        }
        return nil
    }
}
