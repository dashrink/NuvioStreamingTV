import Foundation
import Combine

open class BaseViewModel<State>: ObservableObject {
    @Published public var state: State
    public var cancellables = Set<AnyCancellable>()
    
    public init(initialState: State) {
        self.state = initialState
    }
}
