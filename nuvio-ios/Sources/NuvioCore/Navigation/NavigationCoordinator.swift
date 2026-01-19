import Foundation

public protocol NavigationCoordinator: AnyObject {
    func goBack()
    func navigate(to route: String) // Simplified string-based routing for now
}
