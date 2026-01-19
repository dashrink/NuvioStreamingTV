import SwiftUI

public struct LibraryView: View {
    @StateObject private var viewModel: LibraryViewModel
    
    public init(viewModel: LibraryViewModel = LibraryViewModel()) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }
    
    public var body: some View {
        NavigationView {
            VStack {
                // Controls
                HStack {
                    Picker("Sort", selection: $viewModel.sortOption) {
                        ForEach(LibraryViewModel.SortOption.allCases) { option in
                            Text(option.rawValue).tag(option)
                        }
                    }
                    .pickerStyle(MenuPickerStyle())
                    
                    Picker("Group", selection: $viewModel.groupOption) {
                        ForEach(LibraryViewModel.GroupOption.allCases) { option in
                            Text(option.rawValue).tag(option)
                        }
                    }
                    .pickerStyle(MenuPickerStyle())
                    
                    Spacer()
                }
                .padding()
                
                ScrollView {
                    ForEach(viewModel.sortedAndGroupedItems.keys.sorted(), id: \.self) { group in
                        if viewModel.groupOption != .none {
                            Text(group.capitalized)
                                .font(.title2)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal)
                        }
                        
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 16) {
                            ForEach(viewModel.sortedAndGroupedItems[group] ?? [], id: \.id) { item in
                                VStack {
                                    AsyncImage(url: URL(string: item.poster ?? "")) { image in
                                        image.resizable()
                                    } placeholder: {
                                        Color.gray
                                    }
                                    .aspectRatio(2/3, contentMode: .fit)
                                    .cornerRadius(8)
                                    
                                    Text(item.name)
                                        .font(.caption)
                                        .lineLimit(1)
                                }
                            }
                        }
                        .padding(.horizontal)
                        .padding(.bottom)
                    }
                }
            }
            .navigationTitle("Library")
        }
    }
}
