package com.nuvio.app.tv.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import uniffi.nuvio_core.CreateProfileInput
import uniffi.nuvio_core.Profile
import uniffi.nuvio_core.ProfilePreferences
import uniffi.nuvio_core.ProfileType
import uniffi.nuvio_core.UpdateProfileInput

@Composable
fun CreateProfileDialog(
    onDismiss: () -> Unit,
    onCreate: (CreateProfileInput) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var profileType by remember { mutableStateOf(ProfileType.STANDARD) }
    var selectedAvatarId by remember { mutableStateOf("avatar_1") }
    var pin by remember { mutableStateOf("") }
    var enablePin by remember { mutableStateOf(false) }
    var maxAgeRating by remember { mutableStateOf("R") }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.8f)
                .wrapContentHeight(),
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface
        ) {
            Column(
                modifier = Modifier.padding(24.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Create Profile",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = Color.White
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Avatar Selection
                Text(
                    text = "Choose Avatar",
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White,
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                AvatarSelector(
                    selectedAvatarId = selectedAvatarId,
                    onAvatarSelected = { selectedAvatarId = it }
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Name Input
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Profile Name") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = Color.Gray
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Profile Type Selection
                Text(
                    text = "Profile Type",
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White,
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    ProfileType.values().forEach { type ->
                        FilterChip(
                            selected = profileType == type,
                            onClick = { profileType = type },
                            label = {
                                Text(
                                    when (type) {
                                        ProfileType.ADMIN -> "Admin"
                                        ProfileType.STANDARD -> "Standard"
                                        ProfileType.KIDS -> "Kids"
                                    }
                                )
                            }
                        )
                    }
                }

                // Age Rating (for Kids mode)
                if (profileType == ProfileType.KIDS) {
                    Spacer(modifier = Modifier.height(16.dp))
                    AgeRatingSelector(
                        selectedRating = maxAgeRating,
                        onRatingSelected = { maxAgeRating = it }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // PIN Protection
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "PIN Protection",
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White
                    )
                    Switch(
                        checked = enablePin,
                        onCheckedChange = { enablePin = it }
                    )
                }

                if (enablePin) {
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = pin,
                        onValueChange = { if (it.length <= 4) pin = it },
                        label = { Text("4-digit PIN") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = MaterialTheme.colorScheme.primary,
                            unfocusedBorderColor = Color.Gray
                        )
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Cancel")
                    }
                    Button(
                        onClick = {
                            val input = CreateProfileInput(
                                name = name.ifBlank { "New Profile" },
                                profileType = profileType,
                                avatarId = selectedAvatarId,
                                maxAgeRating = if (profileType == ProfileType.KIDS) maxAgeRating else null,
                                pin = if (enablePin && pin.length == 4) pin else null
                            )
                            onCreate(input)
                        },
                        modifier = Modifier.weight(1f),
                        enabled = name.isNotBlank()
                    ) {
                        Text("Create")
                    }
                }
            }
        }
    }
}

@Composable
fun EditProfileDialog(
    profile: Profile,
    onDismiss: () -> Unit,
    onSave: (UpdateProfileInput) -> Unit,
    onDelete: () -> Unit
) {
    var name by remember { mutableStateOf(profile.name) }
    var selectedAvatarId by remember { mutableStateOf(profile.avatarId) }
    var maxAgeRating by remember { mutableStateOf(profile.maxAgeRating) }
    var showDeleteConfirm by remember { mutableStateOf(false) }

    if (showDeleteConfirm) {
        DeleteConfirmDialog(
            profileName = profile.name,
            onConfirm = {
                onDelete()
                showDeleteConfirm = false
            },
            onDismiss = { showDeleteConfirm = false }
        )
        return
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.8f)
                .wrapContentHeight(),
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface
        ) {
            Column(
                modifier = Modifier.padding(24.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Edit Profile",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Row {
                        if (!profile.isAdmin) {
                            IconButton(onClick = { showDeleteConfirm = true }) {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = "Delete",
                                    tint = MaterialTheme.colorScheme.error
                                )
                            }
                        }
                        IconButton(onClick = onDismiss) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Close",
                                tint = Color.White
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Avatar Selection
                Text(
                    text = "Choose Avatar",
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White,
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                AvatarSelector(
                    selectedAvatarId = selectedAvatarId,
                    onAvatarSelected = { selectedAvatarId = it }
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Name Input
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Profile Name") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = Color.Gray
                    )
                )

                // Age Rating (for Kids mode)
                if (profile.profileType == ProfileType.KIDS) {
                    Spacer(modifier = Modifier.height(16.dp))
                    AgeRatingSelector(
                        selectedRating = maxAgeRating,
                        onRatingSelected = { maxAgeRating = it }
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Cancel")
                    }
                    Button(
                        onClick = {
                            val input = UpdateProfileInput(
                                name = if (name != profile.name) name else null,
                                avatarId = if (selectedAvatarId != profile.avatarId) selectedAvatarId else null,
                                maxAgeRating = if (maxAgeRating != profile.maxAgeRating) maxAgeRating else null,
                                preferences = null
                            )
                            onSave(input)
                        },
                        modifier = Modifier.weight(1f),
                        enabled = name.isNotBlank()
                    ) {
                        Text("Save")
                    }
                }
            }
        }
    }
}

@Composable
fun PinDialog(
    profile: Profile,
    onDismiss: () -> Unit,
    onVerify: (String) -> Unit
) {
    var pin by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    Dialog(
        onDismissRequest = onDismiss
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.6f)
                .wrapContentHeight(),
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface
        ) {
            Column(
                modifier = Modifier.padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Default.Lock,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(48.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Enter PIN for ${profile.name}",
                    style = MaterialTheme.typography.titleLarge,
                    color = Color.White,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(24.dp))

                // PIN Input
                OutlinedTextField(
                    value = pin,
                    onValueChange = {
                        if (it.length <= 4) {
                            pin = it
                            error = null
                        }
                        if (it.length == 4) {
                            onVerify(it)
                        }
                    },
                    label = { Text("4-digit PIN") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .focusRequester(focusRequester),
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    isError = error != null,
                    supportingText = error?.let { { Text(it, color = MaterialTheme.colorScheme.error) } },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = Color.Gray
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))

                // PIN entry indicators
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    repeat(4) { index ->
                        Box(
                            modifier = Modifier
                                .size(16.dp)
                                .clip(CircleShape)
                                .background(
                                    if (index < pin.length) MaterialTheme.colorScheme.primary
                                    else Color.Gray.copy(alpha = 0.5f)
                                )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Cancel")
                    }
                    Button(
                        onClick = { onVerify(pin) },
                        modifier = Modifier.weight(1f),
                        enabled = pin.length == 4
                    ) {
                        Text("Verify")
                    }
                }
            }
        }
    }
}

@Composable
private fun DeleteConfirmDialog(
    profileName: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Delete Profile?") },
        text = {
            Text(
                "Are you sure you want to delete \"$profileName\"? This action cannot be undone."
            )
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error
                )
            ) {
                Text("Delete")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
private fun AvatarSelector(
    selectedAvatarId: String,
    onAvatarSelected: (String) -> Unit
) {
    val avatars = listOf(
        "avatar_1" to Color(0xFF2196F3),
        "avatar_2" to Color(0xFFE91E63),
        "avatar_3" to Color(0xFF4CAF50),
        "avatar_4" to Color(0xFFFF9800),
        "avatar_5" to Color(0xFF9C27B0),
        "avatar_6" to Color(0xFF00BCD4),
        "avatar_7" to Color(0xFFFF5722),
        "avatar_8" to Color(0xFF607D8B)
    )

    LazyVerticalGrid(
        columns = GridCells.Fixed(4),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.height(140.dp)
    ) {
        items(avatars) { (id, color) ->
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(60.dp)
                    .clip(CircleShape)
                    .background(color)
                    .border(
                        width = if (selectedAvatarId == id) 3.dp else 0.dp,
                        color = if (selectedAvatarId == id) Color.White else Color.Transparent,
                        shape = CircleShape
                    )
                    .clickable { onAvatarSelected(id) }
            ) {
                if (selectedAvatarId == id) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = "Selected",
                        tint = Color.White
                    )
                }
            }
        }
    }
}

@Composable
private fun AgeRatingSelector(
    selectedRating: String,
    onRatingSelected: (String) -> Unit
) {
    val ratings = listOf("G", "PG", "PG-13", "R")

    Column {
        Text(
            text = "Maximum Age Rating",
            style = MaterialTheme.typography.titleMedium,
            color = Color.White,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            ratings.forEach { rating ->
                FilterChip(
                    selected = selectedRating == rating,
                    onClick = { onRatingSelected(rating) },
                    label = { Text(rating) }
                )
            }
        }
    }
}
