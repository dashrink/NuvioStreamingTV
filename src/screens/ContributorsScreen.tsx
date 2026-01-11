import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  Linking,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import Focusable from '../components/common/Focusable';
import { mmkvStorage } from '../services/mmkvStorage';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import FastImage from '@d11/react-native-fast-image';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchContributors, GitHubContributor } from '../services/githubReleaseService';
import { RootStackParamList } from '../navigation/AppNavigator';
import { triggerLight, triggerMedium } from '../hooks/useHaptics';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const isLargeTablet = width >= 1024;

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

// Discord API URL from environment
const DISCORD_USER_API = process.env.EXPO_PUBLIC_DISCORD_USER_API || 'https://pfpfinder.com/api/discord/user';

// Discord brand color
const DISCORD_BRAND_COLOR = '#5865F2';

// Special mentions - Discord community members (only store IDs and roles)
interface SpecialMentionConfig {
  discordId: string;
  role: string;
  description: string;
}

interface DiscordUserData {
  id: string;
  global_name: string | null;
  username: string;
  avatar: string | null;
}

interface SpecialMention extends SpecialMentionConfig {
  name: string;
  username: string;
  avatarUrl: string;
  isLoading: boolean;
}

const SPECIAL_MENTIONS_CONFIG: SpecialMentionConfig[] = [
  {
    discordId: '709281623866081300',
    role: 'Community Manager',
    description: 'Manages the Discord & Reddit communities for Nuvio',
  },
  {
    discordId: '777773947071758336',
    role: 'Server Sponsor',
    description: 'Sponsored the server infrastructure for Nuvio',
  },
  {
    discordId: '1395843374241546362',
    role: 'Discord Mod',
    description: 'Helps moderate the Nuvio Discord community',
  },
];

type TabType = 'contributors' | 'special';

interface ContributorCardProps {
  contributor: GitHubContributor;
  currentTheme: any;
  isTablet: boolean;
  isLargeTablet: boolean;
}

const ContributorCard: React.FC<ContributorCardProps> = ({ contributor, currentTheme, isTablet, isLargeTablet }) => {
  const handlePress = useCallback(() => {
    triggerLight();
    Linking.openURL(contributor.html_url);
  }, [contributor.html_url]);

  return (
    <Focusable
      style={[
        styles.contributorCard,
        { backgroundColor: currentTheme.colors.elevation1 },
        isTablet && styles.tabletContributorCard
      ]}
      onPress={handlePress}
    >
      <FastImage
        source={{ uri: contributor.avatar_url }}
        style={[
          styles.avatar,
          isTablet && styles.tabletAvatar
        ]}
        resizeMode={FastImage.resizeMode.cover}
      />
      <View style={styles.contributorInfo}>
        <Text style={[
          styles.username,
          { color: currentTheme.colors.highEmphasis },
          isTablet && styles.tabletUsername
        ]}>
          {contributor.login}
        </Text>
        <Text style={[
          styles.contributions,
          { color: currentTheme.colors.mediumEmphasis },
          isTablet && styles.tabletContributions
        ]}>
          {contributor.contributions} contributions
        </Text>
      </View>
      <Feather
        name="external-link"
        size={isTablet ? 20 : 16}
        color={currentTheme.colors.mediumEmphasis}
        style={styles.externalIcon}
      />
    </Focusable>
  );
};

// Special Mention Card Component - Same layout as ContributorCard
interface SpecialMentionCardProps {
  mention: SpecialMention;
  currentTheme: any;
  isTablet: boolean;
  isLargeTablet: boolean;
}

const SpecialMentionCard: React.FC<SpecialMentionCardProps> = ({ mention, currentTheme, isTablet, isLargeTablet }) => {
  const handlePress = useCallback(() => {
    triggerLight();
    // Try to open Discord profile
    const discordUrl = `discord://-/users/${mention.discordId}`;
    Linking.canOpenURL(discordUrl).then((supported) => {
      if (supported) {
        Linking.openURL(discordUrl);
      } else {
        // Fallback: show alert with Discord info
        Alert.alert(
          mention.name,
          `Discord: @${mention.username}\n\nOpen Discord and search for this user to connect with them.`,
          [{ text: 'OK' }]
        );
      }
    });
  }, [mention.discordId, mention.name, mention.username]);

  // Default avatar fallback
  const defaultAvatar = `https://cdn.discordapp.com/embed/avatars/0.png`;

  return (
    <Focusable
      style={[
        styles.contributorCard,
        { backgroundColor: currentTheme.colors.elevation1 },
        isTablet && styles.tabletContributorCard
      ]}
      onPress={handlePress}
    >
      {/* Avatar with Discord badge */}
      <View style={styles.specialAvatarContainer}>
        {mention.isLoading ? (
          <View style={[
            styles.avatar,
            isTablet && styles.tabletAvatar,
            { backgroundColor: currentTheme.colors.elevation2, justifyContent: 'center', alignItems: 'center' }
          ]}>
            <ActivityIndicator size="small" color={currentTheme.colors.primary} />
          </View>
        ) : (
          <FastImage
            source={{ uri: mention.avatarUrl || defaultAvatar }}
            style={[
              styles.avatar,
              isTablet && styles.tabletAvatar
            ]}
            resizeMode={FastImage.resizeMode.cover}
          />
        )}
        <View style={[styles.discordBadgeSmall, { backgroundColor: DISCORD_BRAND_COLOR }]}>
          <FontAwesome5 name="discord" size={10} color="#FFFFFF" />
        </View>
      </View>

      {/* User info */}
      <View style={styles.contributorInfo}>
        <Text style={[
          styles.username,
          { color: currentTheme.colors.highEmphasis },
          isTablet && styles.tabletUsername
        ]}>
          {mention.isLoading ? 'Loading...' : mention.name}
        </Text>
        {!mention.isLoading && mention.username && (
          <Text style={[
            styles.contributions,
            { color: currentTheme.colors.mediumEmphasis },
            isTablet && styles.tabletContributions
          ]}>
            @{mention.username}
          </Text>
        )}
        <View style={[styles.roleBadgeSmall, { backgroundColor: currentTheme.colors.primary + '20' }]}>
          <Text style={[styles.roleBadgeText, { color: currentTheme.colors.primary }]}>
            {mention.role}
          </Text>
        </View>
      </View>

      {/* Discord icon on right */}
      <FontAwesome5
        name="discord"
        size={isTablet ? 20 : 16}
        color={currentTheme.colors.mediumEmphasis}
        style={styles.externalIcon}
      />
    </Focusable>
  );
};

const ContributorsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabType>('contributors');
  const [contributors, setContributors] = useState<GitHubContributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specialMentions, setSpecialMentions] = useState<SpecialMention[]>([]);
  const [specialMentionsLoading, setSpecialMentionsLoading] = useState(true);

  // Fetch Discord user data for special mentions
  const loadSpecialMentions = useCallback(async () => {
    setSpecialMentionsLoading(true);

    // Initialize with loading state
    const initialMentions: SpecialMention[] = SPECIAL_MENTIONS_CONFIG.map(config => ({
      ...config,
      name: 'Loading...',
      username: '',
      avatarUrl: '',
      isLoading: true,
    }));
    setSpecialMentions(initialMentions);

    // Fetch each user's data from Discord API
    const fetchedMentions = await Promise.all(
      SPECIAL_MENTIONS_CONFIG.map(async (config): Promise<SpecialMention> => {
        try {
          const response = await fetch(`${DISCORD_USER_API}/${config.discordId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch Discord user');
          }
          const userData: DiscordUserData = await response.json();

          return {
            ...config,
            name: userData.global_name || userData.username,
            username: userData.username,
            avatarUrl: userData.avatar || '',
            isLoading: false,
          };
        } catch (error) {
          if (__DEV__) console.error(`Error fetching Discord user ${config.discordId}:`, error);
          // Return fallback data
          return {
            ...config,
            name: 'Discord User',
            username: config.discordId,
            avatarUrl: '',
            isLoading: false,
          };
        }
      })
    );

    setSpecialMentions(fetchedMentions);
    setSpecialMentionsLoading(false);
  }, []);

  // Load special mentions when switching to that tab
  useEffect(() => {
    if (activeTab === 'special' && specialMentions.length === 0) {
      loadSpecialMentions();
    }
  }, [activeTab, specialMentions.length, loadSpecialMentions]);

  const loadContributors = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Check cache first (unless refreshing)
      if (!isRefresh) {
        try {
          const cachedData = await mmkvStorage.getItem('github_contributors');
          const cacheTimestamp = await mmkvStorage.getItem('github_contributors_timestamp');
          const now = Date.now();
          const ONE_HOUR = 60 * 60 * 1000; // 1 hour cache

          if (cachedData && cacheTimestamp) {
            const timestamp = parseInt(cacheTimestamp, 10);
            if (now - timestamp < ONE_HOUR) {
              const parsedData = JSON.parse(cachedData);
              // Only use cache if it has actual contributors data
              if (parsedData && Array.isArray(parsedData) && parsedData.length > 0) {
                setContributors(parsedData);
                setLoading(false);
                return;
              } else {
                // Remove invalid cache
                await mmkvStorage.removeItem('github_contributors');
                await mmkvStorage.removeItem('github_contributors_timestamp');
                if (__DEV__) console.log('Removed invalid contributors cache');
              }
            }
          }
        } catch (cacheError) {
          if (__DEV__) console.error('Cache read error:', cacheError);
          // Remove corrupted cache
          try {
            await mmkvStorage.removeItem('github_contributors');
            await mmkvStorage.removeItem('github_contributors_timestamp');
          } catch { }
        }
      }

      const data = await fetchContributors();
      if (data && Array.isArray(data) && data.length > 0) {
        setContributors(data);
        // Only cache valid data
        try {
          await mmkvStorage.setItem('github_contributors', JSON.stringify(data));
          await mmkvStorage.setItem('github_contributors_timestamp', Date.now().toString());
        } catch (cacheError) {
          if (__DEV__) console.error('Cache write error:', cacheError);
        }
      } else {
        // Clear any existing cache if we get invalid data
        try {
          await mmkvStorage.removeItem('github_contributors');
          await mmkvStorage.removeItem('github_contributors_timestamp');
        } catch { }
        setError('Unable to load contributors. This might be due to GitHub API rate limits.');
      }
    } catch (err) {
      setError('Failed to load contributors. Please check your internet connection.');
      if (__DEV__) console.error('Error loading contributors:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Clear any invalid cache on mount
    const clearInvalidCache = async () => {
      try {
        const cachedData = await mmkvStorage.getItem('github_contributors');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          if (!parsedData || !Array.isArray(parsedData) || parsedData.length === 0) {
            await mmkvStorage.removeItem('github_contributors');
            await mmkvStorage.removeItem('github_contributors_timestamp');
            if (__DEV__) console.log('Cleared invalid cache on mount');
          }
        }
      } catch (error) {
        if (__DEV__) console.error('Error checking cache on mount:', error);
      }
    };

    clearInvalidCache();
    loadContributors();
  }, [loadContributors]);

  const handleRefresh = useCallback(() => {
    loadContributors(true);
  }, [loadContributors]);

  const renderContributor = useCallback(({ item }: { item: GitHubContributor }) => (
    <ContributorCard
      contributor={item}
      currentTheme={currentTheme}
      isTablet={isTablet}
      isLargeTablet={isLargeTablet}
    />
  ), [currentTheme]);

  const keyExtractor = useCallback((item: GitHubContributor) => item.id.toString(), []);

  const topSpacing = (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : insets.top);

  if (loading && !refreshing) {
    return (
      <View style={[
        styles.container,
        { backgroundColor: currentTheme.colors.darkBackground }
      ]}>
        <StatusBar barStyle={'light-content'} />
        <View style={[styles.headerContainer, { paddingTop: topSpacing }]}>
          <View style={styles.header}>
            <Focusable
              style={styles.backButton}
              onPress={() => {
                triggerLight();
                navigation.goBack();
              }}
            >
              <Feather name="chevron-left" size={24} color={currentTheme.colors.primary} />
              <Text style={[styles.backText, { color: currentTheme.colors.primary }]}>Settings</Text>
            </Focusable>
          </View>
          <Text style={[
            styles.headerTitle,
            { color: currentTheme.colors.text },
            isTablet && styles.tabletHeaderTitle
          ]}>
            Contributors
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentTheme.colors.primary} />
          <Text style={[styles.loadingText, { color: currentTheme.colors.mediumEmphasis }]}>
            Loading contributors...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      { backgroundColor: currentTheme.colors.darkBackground }
    ]}>
      <StatusBar barStyle={'light-content'} />
      <View style={[styles.headerContainer, { paddingTop: topSpacing }]}>
        <View style={styles.header}>
          <Focusable
            style={styles.backButton}
            onPress={() => {
              triggerLight();
              navigation.goBack();
            }}
          >
            <Feather name="chevron-left" size={24} color={currentTheme.colors.primary} />
            <Text style={[styles.backText, { color: currentTheme.colors.primary }]}>Settings</Text>
          </Focusable>
        </View>
        <Text style={[
          styles.headerTitle,
          { color: currentTheme.colors.text },
          isTablet && styles.tabletHeaderTitle
        ]}>
          Contributors
        </Text>
      </View>

      {/* Tab Buttons */}
      <View style={[
        styles.tabContainer,
        { borderBottomColor: currentTheme.colors.elevation2 }
      ]}>
        <Focusable
          style={[
            styles.tabButton,
            activeTab === 'contributors' && [
              styles.tabButtonActive,
              { borderBottomColor: currentTheme.colors.primary }
            ]
          ]}
          onPress={() => setActiveTab('contributors')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'contributors' ? currentTheme.colors.primary : currentTheme.colors.mediumEmphasis }
          ]}>
            Contributors ({contributors.length})
          </Text>
        </Focusable>

        <Focusable
          style={[
            styles.tabButton,
            activeTab === 'special' && [
              styles.tabButtonActive,
              { borderBottomColor: currentTheme.colors.primary }
            ]
          ]}
          onPress={() => setActiveTab('special')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'special' ? currentTheme.colors.primary : currentTheme.colors.mediumEmphasis }
          ]}>
            Special Mentions ({specialMentions.length})
          </Text>
        </Focusable>
      </View>

      {/* Contributors List */}
      {activeTab === 'contributors' && (
        <>
          {error && (
            <View style={[
              styles.errorContainer,
              { backgroundColor: currentTheme.colors.elevation2 }
            ]}>
              <Feather
                name="alert-circle"
                size={20}
                color={currentTheme.colors.error}
                style={{ marginRight: 12 }}
              />
              <Text style={[
                styles.errorText,
                { color: currentTheme.colors.error }
              ]}>
                {error}
              </Text>
            </View>
          )}
          <FlatList
            data={contributors}
            renderItem={renderContributor}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[currentTheme.colors.primary]}
                tintColor={currentTheme.colors.primary}
              />
            }
            ListEmptyComponent={
              !error ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: currentTheme.colors.mediumEmphasis }]}>
                    No contributors found
                  </Text>
                </View>
              ) : null
            }
          />
        </>
      )}

      {/* Special Mentions List */}
      {activeTab === 'special' && (
        <>
          {specialMentionsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={currentTheme.colors.primary} />
              <Text style={[styles.loadingText, { color: currentTheme.colors.mediumEmphasis }]}>
                Loading special mentions...
              </Text>
            </View>
          ) : (
            <FlatList
              data={specialMentions}
              renderItem={({ item }) => (
                <SpecialMentionCard
                  mention={item}
                  currentTheme={currentTheme}
                  isTablet={isTablet}
                  isLargeTablet={isLargeTablet}
                />
              )}
              keyExtractor={(item) => item.discordId}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: currentTheme.colors.mediumEmphasis }]}>
                    No special mentions configured
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 12,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  tabletHeaderTitle: {
    fontSize: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {},
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contributorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  tabletContributorCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  tabletAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  contributorInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tabletUsername: {
    fontSize: 18,
  },
  contributions: {
    fontSize: 13,
    marginBottom: 4,
  },
  tabletContributions: {
    fontSize: 14,
  },
  externalIcon: {
    marginLeft: 12,
  },
  // Special mention styles
  specialAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  discordBadgeSmall: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  roleBadgeSmall: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ContributorsScreen;