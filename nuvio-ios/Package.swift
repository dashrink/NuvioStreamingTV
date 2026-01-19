// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "NuvioCore",
    platforms: [
        .iOS(.v15),
        .tvOS(.v15)
    ],
    products: [
        // Products define the executables and libraries a package produces, making them visible to other packages.
        .library(
            name: "NuvioCore",
            targets: ["NuvioCore"]),
        .library(
            name: "NuvioFeatures",
            targets: ["NuvioFeatures"]),
    ],
    dependencies: [
        // Dependencies declare other packages that this package depends on.
        // .package(url: /* package url */, from: "1.0.0"),
    ],
    targets: [
        // Targets are the basic building blocks of a package, defining a module or a test suite.
        // Targets can depend on other targets in this package and products from dependencies.
        .target(
            name: "NuvioCore",
            dependencies: [] // Dependencies like Rust SDK bindings will go here
        ),
        .target(
            name: "NuvioFeatures",
            dependencies: ["NuvioCore"]
        ),
        .testTarget(
            name: "NuvioCoreTests",
            dependencies: ["NuvioCore"]),
    ]
)
