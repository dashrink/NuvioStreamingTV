import Foundation

public protocol DIContainerProtocol {
    func register<T>(_ type: T.Type, service: Any)
    func resolve<T>(_ type: T.Type) -> T?
}

public final class DIContainer: DIContainerProtocol {
    public static let shared = DIContainer()
    private var services: [String: Any] = [:]
    
    private init() {}
    
    public func register<T>(_ type: T.Type, service: Any) {
        let key = String(describing: type)
        services[key] = service
    }
    
    public func resolve<T>(_ type: T.Type) -> T? {
        let key = String(describing: type)
        return services[key] as? T
    }
}
