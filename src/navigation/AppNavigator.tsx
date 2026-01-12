import { mmkvStorage } from '../services/mmkvStorage';

import type { MD3Theme } from 'react-native-paper';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator, BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  NavigationContainer,
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
  Theme,
  NavigationProp,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';


import { PostHogProvider } from 'posthog-react-native';
import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  useColorScheme,
  Platform,
  Animated,
  StatusBar,
  TouchableOpacity,
  View,
  Text,
  AppState,
  Easing,
  Dimensions,
} from 'react-native';
import {
  PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
  adaptNavigationTheme,
} from 'react-native-paper';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import Focusable from '../components/common/Focusable';

// Optional iOS Glass effect (expo-glass-effect) with safe fallback
let GlassViewComp: any = null;
let liquidGlassAvailable = false;
if (Platform.OS === 'ios') {
  try {
    // Dynamically require so app still runs if the package isn't installed yet
    const glass = require('expo-glass-effect');
    GlassViewComp = glass.GlassView;
    liquidGlassAvailable =
      typeof glass.isLiquidGlassAvailable === 'function' ? glass.isLiquidGlassAvailable() : false;
  } catch {
    GlassViewComp = null;
    liquidGlassAvailable = false;
  }
}

// Import screens with their proper types
import AndroidVideoPlayer from '../components/player/AndroidVideoPlayer';
import CatalogScreen from '../screens/CatalogScreen';
import AddonsScreen from '../screens/AddonsScreen';
import SearchScreen from '../screens/SearchScreen';
import ShowRatingsScreen from '../screens/ShowRatingsScreen';
import CatalogSettingsScreen from '../screens/CatalogSettingsScreen';
import StreamsScreen from '../screens/StreamsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import MDBListSettingsScreen from '../screens/MDBListSettingsScreen';
import TMDBSettingsScreen from '../screens/TMDBSettingsScreen';
import HomeScreenSettings from '../screens/HomeScreenSettings';
import HeroCatalogsScreen from '../screens/HeroCatalogsScreen';
import TraktSettingsScreen from '../screens/TraktSettingsScreen';
import PlayerSettingsScreen from '../screens/PlayerSettingsScreen';
import ThemeScreen from '../screens/ThemeScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import ProfileSelectorScreen from '../screens/ProfileSelectorScreen';
import AuthScreen from '../screens/AuthScreen';
import AccountManageScreen from '../screens/AccountManageScreen';
import { useAccount } from '../contexts/AccountContext';
import { LoadingProvider, useLoading } from '../contexts/LoadingContext';
import PluginsScreen from '../screens/PluginsScreen';
import CastMoviesScreen from '../screens/CastMoviesScreen';
import UpdateScreen from '../screens/UpdateScreen';
import AISettingsScreen from '../screens/AISettingsScreen';
import AIChatScreen from '../screens/AIChatScreen';
import BackdropGalleryScreen from '../screens/BackdropGalleryScreen';
import BackupScreen from '../screens/BackupScreen';
import ContinueWatchingSettingsScreen from '../screens/ContinueWatchingSettingsScreen';
import ContributorsScreen from '../screens/ContributorsScreen';
import DebridIntegrationScreen from '../screens/DebridIntegrationScreen';
import Top10SettingsScreen from '../screens/Top10SettingsScreen';
import { ProfileProvider, useActiveProfile } from '../contexts/ProfileContext';
import ProfileSwitcherBottomSheet from '../components/profile/ProfileSwitcherBottomSheet';
import ProfileIcon from '../components/icons/ProfileIcon';
import KSPlayerCore from '../components/player/KSPlayerCore';
import { HeaderVisibility } from '../contexts/HeaderVisibility';
import { useTheme } from '../contexts/ThemeContext';
import DownloadsScreen from '../screens/DownloadsScreen';
import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import MetadataScreen from '../screens/MetadataScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { colors } from '../styles/colors';
import { Stream } from '../types/streams';

// Optional Android immersive mode module
let RNImmersiveMode: any = null;
if (Platform.OS === 'android') {
  try {
    RNImmersiveMode = require('react-native-immersive-mode').default;
  } catch {
    RNImmersiveMode = null;
  }
}

// Stack navigator types
export type RootStackParamList = {
  Onboarding: undefined;
  ProfileSelector: undefined;
  MainTabs: undefined;
  Backup: undefined;
  Home: undefined;
  Library: undefined;
  Settings: undefined;
  Update: undefined;
  Search: undefined;
  Calendar: undefined;
  Metadata: {
    id: string;
    type: string;
    episodeId?: string;
    addonId?: string;
  };
  Streams: {
    id: string;
    type: string;
    title?: string;
    episodeId?: string;
    episodeThumbnail?: string;
    fromPlayer?: boolean;
    metadata?: {
      poster?: string;
      banner?: string;
      releaseInfo?: string;
      genres?: string[];
    };
    resumeTime?: number;
    duration?: number;
  };
  PlayerIOS: {
    uri: string;
    title?: string;
    season?: number;
    episode?: number;
    episodeTitle?: string;
    quality?: string;
    year?: number;
    streamProvider?: string;
    streamName?: string;
    headers?: { [key: string]: string };
    forceVlc?: boolean;
    id?: string;
    type?: string;
    episodeId?: string;
    imdbId?: string;
    availableStreams?: { [providerId: string]: { streams: any[]; addonName: string } };
    backdrop?: string;
    videoType?: string;
    groupedEpisodes?: { [seasonNumber: number]: any[] };
  };
  PlayerAndroid: {
    uri: string;
    title?: string;
    season?: number;
    episode?: number;
    episodeTitle?: string;
    quality?: string;
    year?: number;
    streamProvider?: string;
    streamName?: string;
    headers?: { [key: string]: string };
    forceVlc?: boolean;
    id?: string;
    type?: string;
    episodeId?: string;
    imdbId?: string;
    availableStreams?: { [providerId: string]: { streams: any[]; addonName: string } };
    backdrop?: string;
    videoType?: string;
    groupedEpisodes?: { [seasonNumber: number]: any[] };
  };
  Catalog: { id: string; type: string; addonId?: string; name?: string; genreFilter?: string };
  Credits: { mediaId: string; mediaType: string };
  ShowRatings: { showId: number };
  Account: undefined;
  AccountManage: undefined;
  Payment: undefined;
  PrivacyPolicy: undefined;
  About: undefined;
  Addons: undefined;
  CatalogSettings: undefined;
  NotificationSettings: undefined;
  MDBListSettings: undefined;
  TMDBSettings: undefined;
  HomeScreenSettings: undefined;
  HeroCatalogs: undefined;
  TraktSettings: undefined;
  PlayerSettings: undefined;
  ThemeSettings: undefined;
  ScraperSettings: undefined;
  CastMovies: {
    castMember: {
      id: number;
      name: string;
      profile_path: string | null;
      character?: string;
    };
  };
  AISettings: undefined;
  AIChat: {
    contentId: string;
    contentType: 'movie' | 'series';
    episodeId?: string;
    seasonNumber?: number;
    episodeNumber?: number;
    title: string;
  };
  BackdropGallery: {
    tmdbId: number;
    type: 'movie' | 'tv';
    title: string;
  };
  ContinueWatchingSettings: undefined;
  Contributors: undefined;
  DebridIntegration: undefined;
  Top10Settings: undefined;
};

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Tab navigator types
export type MainTabParamList = {
  Home: undefined;
  Library: undefined;
  Search: undefined;
  Downloads: undefined;
  Settings: undefined;
};

// Custom fonts that satisfy both theme types
const fonts = {
  regular: {
    fontFamily: 'sans-serif',
    fontWeight: '400' as const,
  },
  medium: {
    fontFamily: 'sans-serif-medium',
    fontWeight: '500' as const,
  },
  bold: {
    fontFamily: 'sans-serif',
    fontWeight: '700' as const,
  },
  heavy: {
    fontFamily: 'sans-serif',
    fontWeight: '900' as const,
  },
  // MD3 specific fonts
  displayLarge: {
    fontFamily: 'sans-serif',
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 64,
    fontSize: 57,
  },
  displayMedium: {
    fontFamily: 'sans-serif',
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 52,
    fontSize: 45,
  },
  displaySmall: {
    fontFamily: 'sans-serif',
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 44,
    fontSize: 36,
  },
  headlineLarge: {
    fontFamily: 'sans-serif',
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 40,
    fontSize: 32,
  },
  headlineMedium: {
    fontFamily: 'sans-serif',
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 36,
    fontSize: 28,
  },
  headlineSmall: {
    fontFamily: 'sans-serif',
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 32,
    fontSize: 24,
  },
  titleLarge: {
    fontFamily: 'sans-serif',
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 28,
    fontSize: 22,
  },
  titleMedium: {
    fontFamily: 'sans-serif-medium',
    fontWeight: '500' as const,
    letterSpacing: 0.15,
    lineHeight: 24,
    fontSize: 16,
  },
  titleSmall: {
    fontFamily: 'sans-serif-medium',
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
    fontSize: 14,
  },
  labelLarge: {
    fontFamily: 'sans-serif-medium',
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
    fontSize: 14,
  },
  labelMedium: {
    fontFamily: 'sans-serif-medium',
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
    fontSize: 12,
  },
  labelSmall: {
    fontFamily: 'sans-serif-medium',
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
    fontSize: 11,
  },
  bodyLarge: {
    fontFamily: 'sans-serif',
    fontWeight: '400' as const,
    letterSpacing: 0.15,
    lineHeight: 24,
    fontSize: 16,
  },
  bodyMedium: {
    fontFamily: 'sans-serif',
    fontWeight: '400' as const,
    letterSpacing: 0.25,
    lineHeight: 20,
    fontSize: 14,
  },
  bodySmall: {
    fontFamily: 'sans-serif',
    fontWeight: '400' as const,
    letterSpacing: 0.4,
    lineHeight: 16,
    fontSize: 12,
  },
} as const;

// Create navigators
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Create custom paper themes
export const CustomLightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
  },
  fonts: MD3LightTheme.fonts,
};

export const CustomDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
  },
  fonts: MD3DarkTheme.fonts,
};

// Create custom navigation theme
const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});

// Add fonts to navigation themes
export const CustomNavigationLightTheme: Theme = {
  ...LightTheme,
  colors: {
    ...LightTheme.colors,
    background: colors.white,
    card: colors.white,
    text: colors.textDark,
    border: colors.border,
  },
  fonts,
};

export const CustomNavigationDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.darkBackground,
    card: colors.darkBackground,
    text: colors.text,
    border: colors.border,
  },
  fonts,
};

type IconNameType = string;

// Add TabIcon component
const TabIcon = React.memo(
  ({
    focused,
    color,
    iconName,
    iconLibrary = 'material',
  }: {
    focused: boolean;
    color: string;
    iconName: IconNameType;
    iconLibrary?: 'material' | 'feather' | 'ionicons';
  }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.1 : 1,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }).start();
    }, [focused]);

    // Use outline variant when available for Material icons; Feather has single-form icons
    const finalIconName = (() => {
      if (iconLibrary === 'feather') {
        return iconName;
      }
      if (iconName === 'magnify') return 'magnify';
      return focused ? iconName : (`${iconName}-outline` as IconNameType);
    })();

    return (
      <Animated.View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: scaleAnim }],
        }}
      >
        {iconLibrary === 'feather' ? (
          <Feather name={finalIconName as any} size={24} color={color} />
        ) : iconLibrary === 'ionicons' ? (
          <Ionicons name={finalIconName as any} size={24} color={color} />
        ) : (
          <MaterialCommunityIcons name={finalIconName as any} size={24} color={color} />
        )}
      </Animated.View>
    );
  }
);

// Update the TabScreenWrapper component with fixed layout dimensions
const TabScreenWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const isTablet = useMemo(() => {
    const { width, height } = dimensions;
    const smallestDimension = Math.min(width, height);
    return Platform.OS === 'ios' ? (Platform as any).isPad === true : smallestDimension >= 768;
  }, [dimensions]);
  const insets = useSafeAreaInsets();
  // Force consistent status bar settings
  useEffect(() => {
    const applyStatusBarConfig = () => {
      StatusBar.setBarStyle('light-content');
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
    };

    applyStatusBarConfig();

    // Apply status bar config on every focus
    const subscription =
      Platform.OS === 'android'
        ? AppState.addEventListener('change', state => {
            if (state === 'active') {
              applyStatusBarConfig();
            }
          })
        : { remove: () => {} };

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.darkBackground,
        // Lock the layout to prevent shifts
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Reserve consistent space for the header area on all screens */}
      <View
        style={{
          height: isTablet ? 0 : 0,
        }}
      />
      {children}
    </View>
  );
};

type CustomTabBarProps = BottomTabBarProps & {
  tabBarHeight: number;
  safeAreaInsets: ReturnType<typeof useSafeAreaInsets>;
  isTablet: boolean;
};

const CustomTabBar = React.memo(
  ({
    state,
    descriptors,
    navigation,
    tabBarHeight,
    safeAreaInsets,
    isTablet,
  }: CustomTabBarProps) => {
    const scrollViewRef = useRef<any>(null);
    const currentScreenName = state.routes[state.index]?.name;

    useEffect(() => {
      // Auto-scroll to the focused tab
      const routeLength = state.routes.length;
      const currentIndex = Math.max(
        0,
        state.routes.findIndex(r => r.key === state.routes[state.index]?.key)
      );

      if (scrollViewRef.current) {
        const scrollToIndex = Math.max(0, currentIndex - 1);
        setTimeout(() => {
          scrollViewRef.current?.scrollToIndex({
            index: scrollToIndex,
            animated: true,
            viewPosition: 0.5,
          });
        }, 0);
      }
    }, [state.index, state.routes]);

    const insets = useSafeAreaInsets();

    return (
      <View
        style={{
          paddingBottom: 0,
          backgroundColor: colors.darkBackground,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            height: tabBarHeight,
            paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0,
            paddingHorizontal: 0,
          }}
        >
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                  ? options.title
                  : route.name;

            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                preventDefault: false,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            const icon = options.tabBarIcon;

            return (
              <Focusable key={route.key} onSelect={onPress}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: isFocused }}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarTestID}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                >
                  {icon &&
                    icon({
                      focused: isFocused,
                      color: isFocused ? colors.primary : colors.textMuted,
                      size: 24,
                    })}
                  {typeof label === 'string' && (
                    <Text
                      style={{
                        color: isFocused ? colors.primary : colors.textMuted,
                        fontSize: 10,
                        marginTop: 4,
                        fontFamily: 'sans-serif-medium',
                      }}
                    >
                      {label}
                    </Text>
                  )}
                </TouchableOpacity>
              </Focusable>
            );
          })}
        </View>
      </View>
    );
  }
);

// Create the main navigation structure
const RootNavigator = () => {
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const { isAuthenticated, isOnboarded } = useAccount();
  const { activeProfile } = useActiveProfile();

  const navigationTheme =
    colorScheme === 'dark' ? CustomNavigationDarkTheme : CustomNavigationLightTheme;

  const screenOptions: NativeStackNavigationOptions = {
    animationEnabled: true,
    headerShown: true,
    headerStyle: {
      backgroundColor: colorScheme === 'dark' ? colors.darkBackground : colors.white,
    },
    headerTintColor: colorScheme === 'dark' ? colors.text : colors.textDark,
    headerTitleStyle: {
      fontFamily: 'sans-serif-medium',
      fontWeight: '600',
      fontSize: 18,
    },
    headerShadowVisible: false,
  };

  if (!isOnboarded) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: false }}>
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  if (!activeProfile) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: false }}>
        <Stack.Screen
          name="ProfileSelector"
          component={ProfileSelectorScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="Backup"
        component={BackupScreen}
        options={{
          title: 'Backup',
        }}
      />
      <Stack.Screen
        name="Metadata"
        component={MetadataScreen}
        options={{
          title: 'Details',
          animationEnabled: true,
        }}
      />
      <Stack.Screen
        name="Streams"
        component={StreamsScreen}
        options={{
          title: 'Streams',
          animationEnabled: true,
        }}
      />
      <Stack.Screen
        name="PlayerIOS"
        component={KSPlayerCore}
        options={{
          headerShown: false,
          animationEnabled: false,
        }}
      />
      <Stack.Screen
        name="PlayerAndroid"
        component={AndroidVideoPlayer}
        options={{
          headerShown: false,
          animationEnabled: false,
        }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Search',
          animationEnabled: true,
        }}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: 'Calendar',
          animationEnabled: true,
        }}
      />
      <Stack.Screen
        name="Catalog"
        component={CatalogScreen}
        options={{
          title: 'Catalog',
          animationEnabled: true,
        }}
      />
      <Stack.Screen
        name="Credits"
        component={CastMoviesScreen}
        options={{
          title: 'Credits',
          animationEnabled: true,
        }}
      />
      <Stack.Screen
        name="ShowRatings"
        component={ShowRatingsScreen}
        options={{
          title: 'Ratings',
          animationEnabled: true,
        }}
      />
      <Stack.Screen
        name="CastMovies"
        component={CastMoviesScreen}
        options={{
          title: 'Movies',
          animationEnabled: true,
        }}
      />
      <Stack.Screen
        name="Update"
        component={UpdateScreen}
        options={{
          title: 'Update',
          animationEnabled: true,
        }}
      />
      <Stack.Screen
        name="AIChat"
        component={AIChatScreen}
        options={{
          title: 'AI Chat',
          animationEnabled: true,
        }}
      />
      <Stack.Screen
        name="BackdropGallery"
        component={BackdropGalleryScreen}
        options={{
          title: 'Backdrop Gallery',
          animationEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
};

const TabNavigator = () => {
  const dimensions = Dimensions.get('window');
  const isTablet = useMemo(() => {
    const { width, height } = dimensions;
    const smallestDimension = Math.min(width, height);
    return Platform.OS === 'ios' ? (Platform as any).isPad === true : smallestDimension >= 768;
  }, [dimensions]);

  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const tabBarHeight = 70;

  const screenOptions: NativeStackNavigationOptions = {
    animationEnabled: true,
    headerShown: true,
    headerStyle: {
      backgroundColor: colorScheme === 'dark' ? colors.darkBackground : colors.white,
    },
    headerTintColor: colorScheme === 'dark' ? colors.text : colors.textDark,
    headerTitleStyle: {
      fontFamily: 'sans-serif-medium',
      fontWeight: '600',
      fontSize: 18,
    },
    headerShadowVisible: false,
  };

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarHideOnKeyboard: true,
        ...screenOptions,
      }}
      tabBar={(props: BottomTabBarProps) => (
        <CustomTabBar
          {...(props as CustomTabBarProps)}
          tabBarHeight={tabBarHeight}
          safeAreaInsets={insets}
          isTablet={isTablet}
        />
      )}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarAccessibilityLabel: 'Home',
          tabBarIcon: ({ color }) => (
            <TabIcon focused={true} color={color} iconName="home" iconLibrary="material" />
          ),
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          title: 'Library',
          tabBarLabel: 'Library',
          tabBarAccessibilityLabel: 'Library',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} iconName="bookmark" iconLibrary="material" />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Search',
          tabBarLabel: 'Search',
          tabBarAccessibilityLabel: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} iconName="magnify" iconLibrary="material" />
          ),
        }}
      />
      <Tab.Screen
        name="Downloads"
        component={DownloadsScreen}
        options={{
          title: 'Downloads',
          tabBarLabel: 'Downloads',
          tabBarAccessibilityLabel: 'Downloads',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} iconName="download" iconLibrary="material" />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarAccessibilityLabel: 'Settings',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} iconName="cog" iconLibrary="material" />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const SettingsStack = createNativeStackNavigator();

const SettingsStackNavigator = () => {
  const colorScheme = useColorScheme();

  const screenOptions: NativeStackNavigationOptions = {
    headerStyle: {
      backgroundColor: colorScheme === 'dark' ? colors.darkBackground : colors.white,
    },
    headerTintColor: colorScheme === 'dark' ? colors.text : colors.textDark,
    headerTitleStyle: {
      fontFamily: 'sans-serif-medium',
      fontWeight: '600',
      fontSize: 18,
    },
    headerShadowVisible: false,
  };

  return (
    <SettingsStack.Navigator screenOptions={screenOptions}>
      <SettingsStack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerShown: true,
        }}
      />
      <SettingsStack.Screen
        name="Account"
        component={AccountManageScreen}
        options={{
          title: 'Account',
        }}
      />
      <SettingsStack.Screen
        name="AccountManage"
        component={AccountManageScreen}
        options={{
          title: 'Manage Account',
        }}
      />
      <SettingsStack.Screen
        name="Addons"
        component={AddonsScreen}
        options={{
          title: 'Add-ons',
        }}
      />
      <SettingsStack.Screen
        name="CatalogSettings"
        component={CatalogSettingsScreen}
        options={{
          title: 'Catalog',
        }}
      />
      <SettingsStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          title: 'Notifications',
        }}
      />
      <SettingsStack.Screen
        name="MDBListSettings"
        component={MDBListSettingsScreen}
        options={{
          title: 'MDBList',
        }}
      />
      <SettingsStack.Screen
        name="TMDBSettings"
        component={TMDBSettingsScreen}
        options={{
          title: 'TMDB',
        }}
      />
      <SettingsStack.Screen
        name="HomeScreenSettings"
        component={HomeScreenSettings}
        options={{
          title: 'Home Screen',
        }}
      />
      <SettingsStack.Screen
        name="HeroCatalogs"
        component={HeroCatalogsScreen}
        options={{
          title: 'Hero Catalogs',
        }}
      />
      <SettingsStack.Screen
        name="TraktSettings"
        component={TraktSettingsScreen}
        options={{
          title: 'Trakt',
        }}
      />
      <SettingsStack.Screen
        name="PlayerSettings"
        component={PlayerSettingsScreen}
        options={{
          title: 'Player Settings',
        }}
      />
      <SettingsStack.Screen
        name="ThemeSettings"
        component={ThemeScreen}
        options={{
          title: 'Theme',
        }}
      />
      <SettingsStack.Screen
        name="AISettings"
        component={AISettingsScreen}
        options={{
          title: 'AI Settings',
        }}
      />
      <SettingsStack.Screen
        name="ContinueWatchingSettings"
        component={ContinueWatchingSettingsScreen}
        options={{
          title: 'Continue Watching',
        }}
      />
      <SettingsStack.Screen
        name="Contributors"
        component={ContributorsScreen}
        options={{
          title: 'Contributors',
        }}
      />
      <SettingsStack.Screen
        name="DebridIntegration"
        component={DebridIntegrationScreen}
        options={{
          title: 'Debrid Integration',
        }}
      />
      <SettingsStack.Screen
        name="Top10Settings"
        component={Top10SettingsScreen}
        options={{
          title: 'Top 10 Settings',
        }}
      />
      <SettingsStack.Screen
        name="Plugins"
        component={PluginsScreen}
        options={{
          title: 'Plugins',
        }}
      />
    </SettingsStack.Navigator>
  );
};

interface AppNavigatorProps {}

export const AppNavigator: React.FC<AppNavigatorProps> = () => {
  const colorScheme = useColorScheme();
  const [appState, setAppState] = useState(AppState.currentState);
  const [isReady, setIsReady] = useState(false);

  const navigationTheme =
    colorScheme === 'dark' ? CustomNavigationDarkTheme : CustomNavigationLightTheme;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setAppState(state);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Small delay to allow app to fully initialize
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <PaperProvider theme={colorScheme === 'dark' ? CustomDarkTheme : CustomLightTheme}>
      <SafeAreaProvider>
        <NavigationContainer theme={navigationTheme} fallback={null}>
          <PostHogProvider
            apiKey="phc_v0K0K0K0K0K0K0K0K0K0K0K0K0K0K0K0"
            options={{
              host: 'https://eu.posthog.com',
            }}
            autocapture={{
              captureLifecycles: true,
              captureScreens: true,
            }}
          >
            <LoadingProvider>
              <ProfileProvider>
                <RootNavigator />
              </ProfileProvider>
            </LoadingProvider>
          </PostHogProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </PaperProvider>
  );
};

export default AppNavigator;
