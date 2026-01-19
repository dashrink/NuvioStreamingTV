package com.nuvio.app.tv

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.nuvio.app.tv.ui.home.HomeScreen
import com.nuvio.app.tv.ui.discovery.DiscoveryScreen
import com.nuvio.app.tv.ui.search.SearchScreen
import com.nuvio.app.tv.ui.library.LibraryScreen
import com.nuvio.app.tv.ui.profile.ProfileScreen
import com.nuvio.app.tv.ui.theme.NuvioTheme
import com.nuvio.app.tv.player.ExoPlayerHolder
import com.nuvio.app.tv.player.PlayerViewModel
import com.nuvio.app.tv.player.ui.VideoPlayerScreen
import dagger.hilt.android.AndroidEntryPoint
import androidx.hilt.navigation.compose.hiltViewModel
import javax.inject.Inject
import java.net.URLEncoder
import java.net.URLDecoder
import java.nio.charset.StandardCharsets

@AndroidEntryPoint
class MainComposeActivity : ComponentActivity() {
    
    @Inject
    lateinit var exoPlayerHolder: ExoPlayerHolder

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            NuvioTheme {
                AppNavigation(exoPlayerHolder)
            }
        }
    }
}


@Composable
fun AppNavigation(exoPlayerHolder: ExoPlayerHolder) {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = "home") {
        composable("home") {
            HomeScreen(
                onContentClick = { id ->
                    navController.navigate("details/$id")
                }
            )
            // Temporary Overlay for navigation to Search (would be a real Nav Drawer in prod)
            /*
            Button(onClick = { navController.navigate("discovery") }) { Text("Search") }
            */
        }
        composable("discovery") {
             DiscoveryScreen(
                onContentClick = { id ->
                    navController.navigate("details/$id")
                }
             )
        }
        composable("search") {
            SearchScreen(
                onContentClick = { id ->
                    navController.navigate("details/$id")
                },
                onBack = { navController.popBackStack() }
            )
        }
        composable("library") {
            LibraryScreen(
                onContentClick = { id ->
                    navController.navigate("details/$id")
                },
                onBack = { navController.popBackStack() }
            )
        }
        composable("profiles") {
            ProfileScreen(
                onProfileSelected = { profile ->
                    // After profile selection, navigate back to home
                    navController.navigate("home") {
                        popUpTo("profiles") { inclusive = true }
                    }
                }
            )
        }
        composable("catalog") {
            com.nuvio.app.tv.ui.catalog.CatalogBrowseScreen(
                onContentClick = { id ->
                    navController.navigate("details/$id")
                }
            )
        }
        composable(
            "details/{id}",
            arguments = listOf(navArgument("id") { type = NavType.StringType })
        ) { backStackEntry ->
            val id = backStackEntry.arguments?.getString("id") ?: ""
            com.nuvio.app.tv.ui.details.DetailsScreen(
                id = id,
                onPlayClick = { url ->
                    val encodedUrl = URLEncoder.encode(url, StandardCharsets.UTF_8.toString())
                    // For now, using a placeholder title or we could pass it from DetailScreen
                    val encodedTitle = URLEncoder.encode("Video", StandardCharsets.UTF_8.toString())
                    navController.navigate("player/$encodedUrl/$encodedTitle")
                },
                onBack = { navController.popBackStack() }
            )
        }
        composable(
            "player/{url}/{title}",
            arguments = listOf(
                navArgument("url") { type = NavType.StringType },
                navArgument("title") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val url = URLDecoder.decode(backStackEntry.arguments?.getString("url") ?: "", StandardCharsets.UTF_8.toString())
            val title = URLDecoder.decode(backStackEntry.arguments?.getString("title") ?: "", StandardCharsets.UTF_8.toString())

            val viewModel: PlayerViewModel = hiltViewModel()
            androidx.compose.runtime.LaunchedEffect(url) {
                viewModel.initializePlayer(url, null, title, null)
            }

            VideoPlayerScreen(
                url = url,
                title = title,
                exoPlayerHolder = exoPlayerHolder,
                viewModel = viewModel,
                showSkipButton = viewModel.showSkipButton.value,
                onSkipIntro = { viewModel.skipIntro() },
                onBackPressed = { navController.popBackStack() }
            )
        }
    }
}
