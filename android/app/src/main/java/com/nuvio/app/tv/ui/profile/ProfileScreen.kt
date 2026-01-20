package com.nuvio.app.tv.ui.profile

import android.content.res.Configuration
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import uniffi.nuvio_core.CreateProfileInput
import uniffi.nuvio_core.Profile
import uniffi.nuvio_core.ProfileType

@Composable
fun ProfileScreen(
    onProfileSelected: (Profile) -> Unit,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val configuration = LocalConfiguration.current
    val isTv = (configuration.uiMode and Configuration.UI_MODE_TYPE_MASK) == Configuration.UI_MODE_TYPE_TELEVISION

    var showCreateDialog by remember { mutableStateOf(false) }
    var showEditDialog by remember { mutableStateOf<Profile?>(null) }
    var showPinDialog by remember { mutableStateOf<Profile?>(null) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(if (isTv) 48.dp else 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Who's Watching?",
                style = if (isTv) MaterialTheme.typography.displayMedium else MaterialTheme.typography.headlineLarge,
                color = Color.White,
                modifier = Modifier.padding(bottom = if (isTv) 48.dp else 32.dp)
            )

            if (uiState.isLoading) {
                CircularProgressIndicator(
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(32.dp)
                )
            } else if (uiState.error != null) {
                ErrorState(
                    error = uiState.error!!,
                    onRetry = { viewModel.loadProfiles() }
                )
            } else {
                ProfileGrid(
                    profiles = uiState.profiles,
                    activeProfile = uiState.activeProfile,
                    isTv = isTv,
                    onProfileClick = { profile ->
                        if (profile.isPinProtected) {
                            showPinDialog = profile
                        } else {
                            viewModel.switchProfile(profile.id)
                            onProfileSelected(profile)
                        }
                    },
                    onEditClick = { profile ->
                        showEditDialog = profile
                    },
                    onAddClick = { showCreateDialog = true }
                )

                // Manage Profiles button
                TextButton(
                    onClick = { /* Navigate to profile management */ },
                    modifier = Modifier.padding(top = 24.dp)
                ) {
                    Text(
                        text = "Manage Profiles",
                        color = Color.White.copy(alpha = 0.7f)
                    )
                }
            }
        }
    }

    // Create Profile Dialog
    if (showCreateDialog) {
        CreateProfileDialog(
            onDismiss = { showCreateDialog = false },
            onCreate = { input ->
                viewModel.createProfile(input)
                showCreateDialog = false
            }
        )
    }

    // Edit Profile Dialog
    showEditDialog?.let { profile ->
        EditProfileDialog(
            profile = profile,
            onDismiss = { showEditDialog = null },
            onSave = { input ->
                viewModel.updateProfile(profile.id, input)
                showEditDialog = null
            },
            onDelete = {
                viewModel.deleteProfile(profile.id)
                showEditDialog = null
            }
        )
    }

    // PIN Dialog
    showPinDialog?.let { profile ->
        PinDialog(
            profile = profile,
            onDismiss = { showPinDialog = null },
            onVerify = { pin ->
                viewModel.verifyPin(profile.id, pin) { isValid ->
                    if (isValid) {
                        viewModel.switchProfile(profile.id)
                        onProfileSelected(profile)
                        showPinDialog = null
                    }
                }
            }
        )
    }
}

@Composable
private fun ProfileGrid(
    profiles: List<Profile>,
    activeProfile: Profile?,
    isTv: Boolean,
    onProfileClick: (Profile) -> Unit,
    onEditClick: (Profile) -> Unit,
    onAddClick: () -> Unit
) {
    val columns = if (isTv) 5 else 3
    val itemSize = if (isTv) 180.dp else 100.dp

    LazyVerticalGrid(
        columns = GridCells.Fixed(columns),
        horizontalArrangement = Arrangement.spacedBy(if (isTv) 24.dp else 16.dp),
        verticalArrangement = Arrangement.spacedBy(if (isTv) 24.dp else 16.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        items(profiles) { profile ->
            ProfileItem(
                profile = profile,
                isActive = profile.id == activeProfile?.id,
                isTv = isTv,
                itemSize = itemSize,
                onClick = { onProfileClick(profile) },
                onEditClick = { onEditClick(profile) }
            )
        }

        // Add Profile button
        item {
            AddProfileItem(
                isTv = isTv,
                itemSize = itemSize,
                onClick = onAddClick
            )
        }
    }
}

@Composable
private fun ProfileItem(
    profile: Profile,
    isActive: Boolean,
    isTv: Boolean,
    itemSize: androidx.compose.ui.unit.Dp,
    onClick: () -> Unit,
    onEditClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }

    val avatarColor = getAvatarColor(profile.avatarId)
    val borderColor = when {
        isActive -> MaterialTheme.colorScheme.primary
        isFocused -> Color.White
        else -> Color.Transparent
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .focusRequester(focusRequester)
            .onFocusChanged { isFocused = it.isFocused }
            .clickable { onClick() }
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(itemSize)
                .clip(RoundedCornerShape(8.dp))
                .background(avatarColor)
                .border(
                    width = if (isActive || isFocused) 3.dp else 0.dp,
                    color = borderColor,
                    shape = RoundedCornerShape(8.dp)
                )
        ) {
            when {
                profile.profileType == ProfileType.KIDS -> {
                    Text(
                        text = "👶",
                        style = MaterialTheme.typography.displayMedium
                    )
                }
                else -> {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(itemSize / 2)
                    )
                }
            }

            // PIN indicator
            if (profile.isPinProtected) {
                Icon(
                    imageVector = Icons.Default.Lock,
                    contentDescription = "PIN protected",
                    tint = Color.White,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                        .size(20.dp)
                )
            }

            // Active indicator
            if (isActive) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = "Active",
                    tint = Color.White,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(8.dp)
                        .size(24.dp)
                        .background(MaterialTheme.colorScheme.primary, CircleShape)
                        .padding(4.dp)
                )
            }

            // Edit button (shown on hover/focus for TV)
            if (isFocused && isTv) {
                IconButton(
                    onClick = onEditClick,
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = "Edit",
                        tint = Color.White
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = profile.name,
            style = if (isTv) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            color = if (isActive || isFocused) Color.White else Color.White.copy(alpha = 0.7f),
            textAlign = TextAlign.Center,
            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal
        )

        // Profile type badge
        if (profile.profileType != ProfileType.STANDARD) {
            Text(
                text = when (profile.profileType) {
                    ProfileType.ADMIN -> "Admin"
                    ProfileType.KIDS -> "Kids"
                    else -> ""
                },
                style = MaterialTheme.typography.labelSmall,
                color = when (profile.profileType) {
                    ProfileType.ADMIN -> MaterialTheme.colorScheme.primary
                    ProfileType.KIDS -> Color(0xFF4CAF50)
                    else -> Color.Gray
                },
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}

@Composable
private fun AddProfileItem(
    isTv: Boolean,
    itemSize: androidx.compose.ui.unit.Dp,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .onFocusChanged { isFocused = it.isFocused }
            .clickable { onClick() }
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(itemSize)
                .clip(RoundedCornerShape(8.dp))
                .background(
                    if (isFocused) Color.White.copy(alpha = 0.2f)
                    else Color.White.copy(alpha = 0.1f)
                )
                .border(
                    width = if (isFocused) 3.dp else 1.dp,
                    color = if (isFocused) Color.White else Color.White.copy(alpha = 0.3f),
                    shape = RoundedCornerShape(8.dp)
                )
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = "Add Profile",
                tint = Color.White,
                modifier = Modifier.size(itemSize / 2)
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Add Profile",
            style = if (isTv) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            color = if (isFocused) Color.White else Color.White.copy(alpha = 0.7f),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun ErrorState(
    error: String,
    onRetry: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Error loading profiles",
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.error
        )
        Text(
            text = error,
            style = MaterialTheme.typography.bodyMedium,
            color = Color.White.copy(alpha = 0.7f)
        )
        Button(onClick = onRetry) {
            Text("Retry")
        }
    }
}

private fun getAvatarColor(avatarId: String): Color {
    return when (avatarId.hashCode() % 8) {
        0 -> Color(0xFF2196F3) // Blue
        1 -> Color(0xFFE91E63) // Pink
        2 -> Color(0xFF4CAF50) // Green
        3 -> Color(0xFFFF9800) // Orange
        4 -> Color(0xFF9C27B0) // Purple
        5 -> Color(0xFF00BCD4) // Cyan
        6 -> Color(0xFFFF5722) // Deep Orange
        else -> Color(0xFF607D8B) // Blue Grey
    }
}
