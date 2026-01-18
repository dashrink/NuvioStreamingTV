//! Comprehensive example demonstrating Stremio addon integration with the Nuvio SDK.
//!
//! This example shows how to:
//! - Initialize the StremioService with custom configuration
//! - Discover addons from manifest URLs
//! - Fetch catalog content with pagination
//! - Resolve streams from multiple addons in parallel
//! - Aggregate metadata with priority-based merging
//! - Handle errors gracefully
//!
//! Run this example with:
//! ```bash
//! cargo run --example stremio_addon_usage
//! ```

use nuvio_core::init_tracing;
use nuvio_core::stremio_service::{ServiceConfig, StremioService};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing for logging
    init_tracing();
    tracing::info!("Starting Stremio addon usage example");

    // ========================================================================
    // SECTION 1: Service Initialization
    // ========================================================================
    println!("\n=== Section 1: Service Initialization ===");

    // Create a service with custom configuration
    let config = ServiceConfig {
        default_timeout: 15,                 // 15 seconds timeout per request
        max_concurrent_requests: 20,         // Allow up to 20 parallel requests
        max_response_size: 10 * 1024 * 1024, // 10MB max response size
        max_retries: 3,                      // Retry failed requests up to 3 times
    };

    let service = StremioService::with_config(config);
    println!("✓ Created StremioService with custom configuration");
    println!("  - Timeout: 15 seconds");
    println!("  - Max concurrent requests: 20");
    println!("  - Max response size: 10MB");
    println!("  - Max retries: 3");

    // ========================================================================
    // SECTION 2: Addon Discovery
    // ========================================================================
    println!("\n=== Section 2: Addon Discovery ===");

    // For this example, we'll create mock addons since we can't rely on external services
    // In a real application, you would use actual addon URLs:
    // let addon = service.discover("https://addon.example.com/manifest.json").await?;

    // Create example addons manually
    use nuvio_core::stremio_service::types::Addon;

    let mut addon1 = Addon::new(
        "com.example.movies".to_string(),
        "https://movies.example.com/manifest.json".to_string(),
        "Example Movies Addon".to_string(),
        "1.0.0".to_string(),
    );
    addon1.priority = 10; // Higher priority
    addon1.enabled = true;

    let mut addon2 = Addon::new(
        "com.example.streams".to_string(),
        "https://streams.example.com/manifest.json".to_string(),
        "Example Streams Addon".to_string(),
        "2.0.0".to_string(),
    );
    addon2.priority = 5; // Lower priority
    addon2.enabled = true;

    service.add_addon(addon1.clone());
    service.add_addon(addon2.clone());

    println!("✓ Added {} addons to the service", service.addon_count());
    println!(
        "  - {}: {} (priority: {})",
        addon1.id, addon1.name, addon1.priority
    );
    println!(
        "  - {}: {} (priority: {})",
        addon2.id, addon2.name, addon2.priority
    );

    // ========================================================================
    // SECTION 3: Thread Safety Demonstration
    // ========================================================================
    println!("\n=== Section 3: Thread Safety ===");

    // The service can be cloned and shared across threads
    let service_clone = service.clone();

    // Spawn a thread to demonstrate thread-safe access
    let handle = std::thread::spawn(move || {
        let count = service_clone.addon_count();
        format!("Thread reports {} addons", count)
    });

    let thread_result = handle.join().expect("Thread panicked");
    println!("✓ {}", thread_result);
    println!("✓ Service is thread-safe and can be shared across threads");

    // ========================================================================
    // SECTION 4: Catalog Fetching (with mock data)
    // ========================================================================
    println!("\n=== Section 4: Catalog Fetching ===");

    // In a real application, you would fetch catalogs like this:
    // let catalog = service.get_catalog(&addon1.id, "movie", "top", 1).await?;

    println!("Note: Catalog fetching requires live addon endpoints.");
    println!("In production, you would:");
    println!("  1. Call service.get_catalog(addon_id, content_type, catalog_id, page)");
    println!("  2. Handle pagination by incrementing the page number");
    println!("  3. Process the returned Meta objects for display");

    // Example of what catalog fetching looks like (commented out):
    /*
    match service.get_catalog(&addon1.id, "movie", "top", 1).await {
        Ok(metas) => {
            println!("✓ Fetched {} catalog items", metas.len());
            for (i, meta) in metas.iter().take(5).enumerate() {
                println!("  {}. {} ({})", i + 1, meta.name, meta.id);
            }
        }
        Err(e) => {
            eprintln!("✗ Failed to fetch catalog: {}", e);
        }
    }
    */

    // ========================================================================
    // SECTION 5: Stream Resolution
    // ========================================================================
    println!("\n=== Section 5: Stream Resolution ===");

    // Resolve streams for a movie using IMDb ID
    // Note: This will return empty results without live addons
    let imdb_id = "tt1234567"; // Example IMDb ID
    println!("Resolving streams for IMDb ID: {}", imdb_id);

    let streams = service.resolve_streams("movie", imdb_id).await;

    if streams.is_empty() {
        println!("Note: No streams found (requires live addon endpoints).");
        println!("In production, resolve_streams would:");
        println!("  1. Query all enabled addons in parallel");
        println!("  2. Aggregate streams with addon metadata");
        println!("  3. Sort by addon priority");
        println!("  4. Return deduplicated results");
    } else {
        println!("✓ Resolved {} streams", streams.len());
        for (i, stream) in streams.iter().take(5).enumerate() {
            let addon_name = stream.addon_id.as_deref().unwrap_or("Unknown");
            let stream_name = stream.name.as_deref().unwrap_or("Unnamed");
            println!("  {}. {} from {}", i + 1, stream_name, addon_name);
        }
    }

    // ========================================================================
    // SECTION 6: Metadata Aggregation
    // ========================================================================
    println!("\n=== Section 6: Metadata Aggregation ===");

    // Aggregate metadata from all addons with priority-based merging
    println!("Aggregating metadata for IMDb ID: {}", imdb_id);

    let meta = service.aggregate_meta("movie", imdb_id).await;

    if let Some(meta) = meta {
        println!("✓ Aggregated metadata:");
        println!("  - Title: {}", meta.name);
        println!("  - ID: {}", meta.id);

        if let Some(year) = meta.year {
            println!("  - Year: {}", year);
        }

        if let Some(poster) = meta.poster {
            println!("  - Poster: {}", poster);
        }

        if let Some(background) = meta.background {
            println!("  - Background: {}", background);
        }

        if let Some(description) = meta.description {
            println!("  - Description: {}", description);
        }

        println!("\nNote: Priority-based merging ensures:");
        println!("  - Higher priority addon data takes precedence for conflicts");
        println!("  - Non-conflicting data from all addons is merged");
        println!("  - Result is a rich, comprehensive metadata object");
    } else {
        println!("Note: No metadata found (requires live addon endpoints).");
        println!("In production, aggregate_meta would:");
        println!("  1. Fetch metadata from all enabled addons in parallel");
        println!("  2. Merge results using priority-based conflict resolution");
        println!("  3. Return enriched metadata with data from all sources");
    }

    // ========================================================================
    // SECTION 7: Error Handling
    // ========================================================================
    println!("\n=== Section 7: Error Handling ===");

    // Demonstrate error handling when addon is not found
    match service
        .get_catalog("nonexistent.addon", "movie", "top", 1)
        .await
    {
        Ok(_) => println!("Unexpected success"),
        Err(e) => {
            println!("✓ Proper error handling demonstrated:");
            println!("  - Error: {}", e);
            println!("  - Errors are NuvioError instances");
            println!("  - All errors are FFI-compatible for Kotlin/Swift");
        }
    }

    // ========================================================================
    // SECTION 8: Service State Management
    // ========================================================================
    println!("\n=== Section 8: Service State Management ===");

    println!("Current service state:");
    println!("  - Total addons: {}", service.addon_count());

    let addons = service.get_addons();
    println!(
        "  - Enabled addons: {}",
        addons.iter().filter(|a| a.enabled).count()
    );
    println!(
        "  - Disabled addons: {}",
        addons.iter().filter(|a| !a.enabled).count()
    );

    // Clear all addons
    println!("\nClearing all addons...");
    service.clear_addons();
    println!("✓ All addons cleared");
    println!("  - Total addons: {}", service.addon_count());

    // ========================================================================
    // SECTION 9: Best Practices Summary
    // ========================================================================
    println!("\n=== Section 9: Best Practices ===");
    println!("When using StremioService:");
    println!("  1. Configure timeouts and retries based on network conditions");
    println!("  2. Use addon priorities to control data source precedence");
    println!("  3. Handle partial failures gracefully (some addons may fail)");
    println!("  4. Clone the service for use across threads (it's thread-safe)");
    println!("  5. Monitor addon health and disable problematic sources");
    println!("  6. Cache results when appropriate to reduce network load");
    println!("  7. Use proper error handling for all async operations");
    println!("  8. Validate and sanitize all responses from external addons");

    // ========================================================================
    // Conclusion
    // ========================================================================
    println!("\n=== Example Complete ===");
    println!("This example demonstrated the core functionality of the Stremio service.");
    println!("For production use, connect to real Stremio addon endpoints and");
    println!("implement proper error handling, caching, and monitoring.");

    Ok(())
}
