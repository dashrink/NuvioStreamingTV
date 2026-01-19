//
//  CategoryRowView.swift
//  NuvioTV
//
//  Created by Claude Code
//  Category Row component for Home Screen
//

import SwiftUI

struct CategoryRowView: View {
    let title: String
    let items: [Meta]
    let onSelect: (Meta) -> Void
    
    var body: some View {
        VStack(alignment: .leading) {
            Text(title)
                #if os(tvOS)
                .font(.headline)
                #else
                .font(.title2)
                .bold()
                #endif
                .padding(.horizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 20) {
                    ForEach(items) { item in
                        PosterCard(meta: item) {
                            onSelect(item)
                        }
                    }
                }
                .padding(.horizontal)
                #if os(tvOS)
                .padding(.vertical, 30) // Add padding for focus expansion
                #else
                .padding(.vertical, 10)
                #endif
            }
        }
    }
}
