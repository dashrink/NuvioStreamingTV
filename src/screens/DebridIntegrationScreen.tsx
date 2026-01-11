import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Platform,
    Linking,
    ScrollView,
    KeyboardAvoidingView,
    Image,
    Switch,
    ActivityIndicator,
    RefreshControl,
    Dimensions
} from 'react-native';
import CustomSwitch from '../components/common/CustomSwitch';
import Focusable from '../components/common/Focusable';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { triggerLight, triggerMedium, triggerHeavy } from '../hooks/useHaptics';
import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { stremioService } from '../services/stremioService';
import { logger } from '../utils/logger';
import CustomAlert from '../components/CustomAlert';
import { mmkvStorage } from '../services/mmkvStorage';
import axios from 'axios';

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;
const TORBOX_STORAGE_KEY = 'torbox_debrid_config';
const TORBOX_API_BASE = 'https://api.torbox.app/v1';
const TORRENTIO_CONFIG_KEY = 'torrentio_config';

interface TorboxConfig {
    apiKey: string;
    isConnected: boolean;
    isEnabled: boolean;
    addonId?: string;
}

interface TorboxUserData {
    id: number;
    email: string;
    plan: number;
    total_downloaded: number;
    is_subscribed: boolean;
    premium_expires_at: string | null;
    base_email: string;
}

// Torrentio Configuration Types
interface TorrentioConfig {
    providers: string[];
    sort: string;
    qualityFilter: string[];
    priorityLanguages: string[];
    maxResults: string;
    debridService: string;
    debridApiKey: string;
    noDownloadLinks: boolean;
    noCatalog: boolean;
    isInstalled: boolean;
    manifestUrl?: string;
}

// Torrentio Options Data
const TORRENTIO_PROVIDERS = [
    { id: 'yts', name: 'YTS' },
    { id: 'eztv', name: 'EZTV' },
    { id: 'rarbg', name: 'RARBG' },
    { id: '1337x', name: '1337x' },
    { id: 'thepiratebay', name: 'ThePirateBay' },
    { id: 'kickasstorrents', name: 'KickassTorrents' },
    { id: 'torrentgalaxy', name: 'TorrentGalaxy' },
    { id: 'magnetdl', name: 'MagnetDL' },
    { id: 'horriblesubs', name: 'HorribleSubs' },
    { id: 'nyaasi', name: 'NyaaSi' },
    { id: 'tokyotosho', name: 'TokyoTosho' },
    { id: 'anidex', name: 'AniDex' },
    { id: 'rutor', name: '🇷🇺 Rutor' },
    { id: 'rutracker', name: '🇷🇺 Rutracker' },
    { id: 'comando', name: '🇵🇹 Comando' },
    { id: 'bludv', name: '🇧🇷 BluDV' },
    { id: 'torrent9', name: '🇫🇷 Torrent9' },
    { id: 'ilcorsaronero', name: '🇮🇹 ilCorSaRoNeRo' },
    { id: 'mejortorrent', name: '🇪🇸 MejorTorrent' },
    { id: 'wolfmax4k', name: '🇪🇸 Wolfmax4k' },
    { id: 'cinecalidad', name: '🇲🇽 Cinecalidad' },
];

const TORRENTIO_SORT_OPTIONS = [
    { id: 'quality', name: 'By quality then seeders' },
    { id: 'qualitysize', name: 'By quality then size' },
    { id: 'seeders', name: 'By seeders' },
    { id: 'size', name: 'By size' },
];

const TORRENTIO_QUALITY_FILTERS = [
    { id: 'brremux', name: 'BluRay REMUX' },
    { id: 'hdrall', name: 'HDR/HDR10+/Dolby Vision' },
    { id: 'dolbyvision', name: 'Dolby Vision' },
    { id: '4k', name: '4K' },
    { id: '1080p', name: '1080p' },
    { id: '720p', name: '720p' },
    { id: '480p', name: '480p' },
    { id: 'scr', name: 'Screener' },
    { id: 'cam', name: 'CAM' },
    { id: 'unknown', name: 'Unknown' },
];

const TORRENTIO_LANGUAGES = [
    { id: 'english', name: '🇬🇧 English' },
    { id: 'russian', name: '🇷🇺 Russian' },
    { id: 'italian', name: '🇮🇹 Italian' },
    { id: 'portuguese', name: '🇵🇹 Portuguese' },
    { id: 'spanish', name: '🇪🇸 Spanish' },
    { id: 'latino', name: '🇲🇽 Latino' },
    { id: 'korean', name: '🇰🇷 Korean' },
    { id: 'chinese', name: '🇨🇳 Chinese' },
    { id: 'french', name: '🇫🇷 French' },
    { id: 'german', name: '🇩🇪 German' },
    { id: 'dutch', name: '🇳🇱 Dutch' },
    { id: 'hindi', name: '🇮🇳 Hindi' },
    { id: 'japanese', name: '🇯🇵 Japanese' },
    { id: 'polish', name: '🇵🇱 Polish' },
    { id: 'arabic', name: '🇸🇦 Arabic' },
    { id: 'turkish', name: '🇹🇷 Turkish' },
];

const TORRENTIO_DEBRID_SERVICES = [
    { id: 'torbox', name: 'TorBox', keyParam: 'torbox' },
    { id: 'realdebrid', name: 'RealDebrid', keyParam: 'realdebrid' },
    { id: 'alldebrid', name: 'AllDebrid', keyParam: 'alldebrid' },
    { id: 'premiumize', name: 'Premiumize', keyParam: 'premiumize' },
    { id: 'debridlink', name: 'DebridLink', keyParam: 'debridlink' },
    { id: 'offcloud', name: 'Offcloud', keyParam: 'offcloud' },
];

const TORRENTIO_MAX_RESULTS = [
    { id: '', name: 'All results' },
    { id: '1', name: '1 per quality' },
    { id: '2', name: '2 per quality' },
    { id: '3', name: '3 per quality' },
    { id: '5', name: '5 per quality' },
    { id: '10', name: '10 per quality' },
];

const DEFAULT_TORRENTIO_CONFIG: TorrentioConfig = {
    providers: TORRENTIO_PROVIDERS.map(p => p.id), // All providers by default
    sort: 'quality',
    qualityFilter: ['scr', 'cam'],
    priorityLanguages: [],
    maxResults: '',
    debridService: 'torbox', // Default to TorBox
    debridApiKey: '',
    noDownloadLinks: false,
    noCatalog: false,
    isInstalled: false,
};

const getPlanName = (plan: number): string => {
    switch (plan) {
        case 0: return 'Free';
        case 1: return 'Essential ($3/mo)';
        case 2: return 'Pro ($10/mo)';
        case 3: return 'Standard ($5/mo)';
        default: return 'Unknown';
    }
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.darkBackground,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? ANDROID_STATUSBAR_HEIGHT + 8 : 8,
        paddingBottom: 8,
    },
    backButton: {
        padding: 8,
        marginRight: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.white,
        letterSpacing: 0.3,
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: colors.elevation1,
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.mediumEmphasis,
    },
    activeTabText: {
        color: colors.white,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    description: {
        fontSize: 14,
        color: colors.mediumEmphasis,
        marginBottom: 12,
        lineHeight: 20,
    },
    statusCard: {
        backgroundColor: colors.elevation2,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.mediumEmphasis,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statusValue: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.white,
    },
    statusConnected: {
        color: colors.success || '#4CAF50',
    },
    statusDisconnected: {
        color: colors.error || '#F44336',
    },
    divider: {
        height: 1,
        backgroundColor: colors.elevation3,
        marginVertical: 10,
    },
    actionButton: {
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    primaryButton: {
        backgroundColor: colors.primary,
    },
    dangerButton: {
        backgroundColor: colors.error || '#F44336',
    },
    buttonText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.white,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: colors.elevation2,
        borderRadius: 10,
        padding: 12,
        color: colors.white,
        fontSize: 14,
        borderWidth: 1,
        borderColor: colors.elevation3,
    },
    connectButton: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    connectButtonText: {
        color: colors.white,
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    disabledButton: {
        opacity: 0.5,
    },
    section: {
        marginTop: 16,
        backgroundColor: colors.elevation1,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.white,
        marginBottom: 6,
        letterSpacing: 0.3,
    },
    sectionText: {
        fontSize: 13,
        color: colors.mediumEmphasis,
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 18,
        opacity: 0.9,
    },
    subscribeButton: {
        backgroundColor: colors.elevation3,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    subscribeButtonText: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: 13,
        letterSpacing: 0.3,
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 'auto',
        paddingBottom: 16,
        paddingTop: 16,
    },
    poweredBy: {
        fontSize: 10,
        color: colors.mediumGray,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 1,
        opacity: 0.6,
    },
    logo: {
        width: 48,
        height: 48,
        marginBottom: 4,
    },
    logoRow: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    logoText: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.white,
        letterSpacing: 0.5,
    },
    userDataCard: {
        backgroundColor: colors.elevation2,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    userDataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    userDataLabel: {
        fontSize: 13,
        color: colors.mediumEmphasis,
        flex: 1,
        letterSpacing: 0.2,
    },
    userDataValue: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
        flex: 1,
        textAlign: 'right',
        letterSpacing: 0.2,
    },
    planBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    planBadgeFree: {
        backgroundColor: colors.elevation3,
    },
    planBadgePaid: {
        backgroundColor: colors.primary + '20',
    },
    planBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    planBadgeTextFree: {
        color: colors.mediumEmphasis,
    },
    planBadgeTextPaid: {
        color: colors.primary,
    },
    userDataHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.elevation3,
    },
    userDataTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.white,
        letterSpacing: 0.3,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    guideLink: {
        marginBottom: 16,
        alignSelf: 'flex-start',
    },
    guideLinkText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    disclaimer: {
        fontSize: 10,
        color: colors.mediumGray,
        textAlign: 'center',
        marginTop: 8,
        opacity: 0.6,
    },
    // Torrentio specific styles
    configSection: {
        backgroundColor: colors.elevation2,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    configSectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.white,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.elevation3,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    chipSelected: {
        backgroundColor: colors.primary + '30',
        borderColor: colors.primary,
    },
    chipText: {
        fontSize: 13,
        color: colors.mediumEmphasis,
    },
    chipTextSelected: {
        color: colors.primary,
        fontWeight: '600',
    },
    pickerContainer: {
        backgroundColor: colors.elevation3,
        borderRadius: 10,
        overflow: 'hidden',
    },
    pickerItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.elevation2,
    },
    pickerItemSelected: {
        backgroundColor: colors.primary + '20',
    },
    pickerItemText: {
        fontSize: 14,
        color: colors.white,
    },
    pickerItemTextSelected: {
        color: colors.primary,
        fontWeight: '600',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    switchLabel: {
        fontSize: 14,
        color: colors.white,
        flex: 1,
    },
    warningCard: {
        backgroundColor: colors.warning + '20',
        borderRadius: 10,
        padding: 12,
        borderLeftWidth: 4,
        borderLeftColor: colors.warning,
    },
    warningText: {
        fontSize: 12,
        color: colors.warning,
        lineHeight: 16,
    },
});

type DebridIntegrationScreenProps = {
    navigation: NavigationProp<RootStackParamList>;
};

export default function DebridIntegrationScreen({
    navigation,
}: DebridIntegrationScreenProps) {
    const colors = useTheme();
    const styles = createStyles(colors);
    const [activeTab, setActiveTab] = useState<'torbox' | 'torrentio'>('torbox');
    const [torboxApiKey, setTorboxApiKey] = useState('');
    const [torboxConnected, setTorboxConnected] = useState(false);
    const [torboxUserData, setTorboxUserData] = useState<TorboxUserData | null>(null);
    const [torrentioConfig, setTorrentioConfig] = useState<TorrentioConfig>(
        DEFAULT_TORRENTIO_CONFIG
    );
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [showTorrentioSettings, setShowTorrentioSettings] = useState(false);
    const [selectedProviders, setSelectedProviders] = useState<string[]>(
        DEFAULT_TORRENTIO_CONFIG.providers
    );
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [selectedSort, setSelectedSort] = useState('quality');
    const [selectedMaxResults, setSelectedMaxResults] = useState('');

    useFocusEffect(
        useCallback(() => {
            loadConfig();
        }, [])
    );

    const loadConfig = async () => {
        try {
            const torboxConfig = await mmkvStorage.getItem<TorboxConfig>(TORBOX_STORAGE_KEY);
            if (torboxConfig) {
                setTorboxApiKey(torboxConfig.apiKey);
                setTorboxConnected(torboxConfig.isConnected);
            }

            const torrentioConfigData = await mmkvStorage.getItem<TorrentioConfig>(
                TORRENTIO_CONFIG_KEY
            );
            if (torrentioConfigData) {
                setTorrentioConfig(torrentioConfigData);
                setSelectedProviders(torrentioConfigData.providers);
                setSelectedLanguages(torrentioConfigData.priorityLanguages);
                setSelectedSort(torrentioConfigData.sort);
                setSelectedMaxResults(torrentioConfigData.maxResults);
            }
        } catch (error) {
            logger.error('Error loading config:', error);
        }
    };

    const verifyTorboxConnection = async () => {
        if (!torboxApiKey.trim()) {
            setAlertTitle('Invalid API Key');
            setAlertMessage('Please enter a valid TorBox API key');
            setAlertVisible(true);
            return;
        }

        setLoading(true);
        try {
            triggerLight();
            const response = await axios.get(`${TORBOX_API_BASE}/api/user/profile`, {
                headers: {
                    Authorization: `Bearer ${torboxApiKey}`,
                },
            });

            if (response.data && response.data.success) {
                const userData = response.data.data;
                setTorboxUserData(userData);
                setTorboxConnected(true);

                const torboxConfig: TorboxConfig = {
                    apiKey: torboxApiKey,
                    isConnected: true,
                    isEnabled: true,
                };

                await mmkvStorage.setItem(TORBOX_STORAGE_KEY, torboxConfig);
                triggerMedium();

                setAlertTitle('Success');
                setAlertMessage('Successfully connected to TorBox!');
                setAlertVisible(true);
            }
        } catch (error: any) {
            logger.error('Error verifying TorBox connection:', error);
            triggerHeavy();
            setAlertTitle('Connection Failed');
            setAlertMessage(
                error.response?.data?.message || 'Failed to connect to TorBox. Please check your API key.'
            );
            setAlertVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const disconnectTorbox = async () => {
        setLoading(true);
        try {
            triggerMedium();
            await mmkvStorage.removeItem(TORBOX_STORAGE_KEY);
            setTorboxApiKey('');
            setTorboxConnected(false);
            setTorboxUserData(null);

            setAlertTitle('Disconnected');
            setAlertMessage('Successfully disconnected from TorBox');
            setAlertVisible(true);
        } catch (error) {
            logger.error('Error disconnecting TorBox:', error);
            triggerHeavy();
        } finally {
            setLoading(false);
        }
    };

    const refreshTorboxData = async () => {
        if (!torboxConnected || !torboxApiKey) return;

        setRefreshing(true);
        try {
            triggerLight();
            const response = await axios.get(`${TORBOX_API_BASE}/api/user/profile`, {
                headers: {
                    Authorization: `Bearer ${torboxApiKey}`,
                },
            });

            if (response.data && response.data.success) {
                const userData = response.data.data;
                setTorboxUserData(userData);
                triggerMedium();
            }
        } catch (error) {
            logger.error('Error refreshing TorBox data:', error);
            triggerHeavy();
        } finally {
            setRefreshing(false);
        }
    };

    const handleTabPress = (tab: 'torbox' | 'torrentio') => {
        triggerLight();
        setActiveTab(tab);
    };

    const handleProviderToggle = (providerId: string) => {
        triggerLight();
        setSelectedProviders((prev) =>
            prev.includes(providerId)
                ? prev.filter((id) => id !== providerId)
                : [...prev, providerId]
        );
    };

    const handleLanguageToggle = (languageId: string) => {
        triggerLight();
        setSelectedLanguages((prev) =>
            prev.includes(languageId)
                ? prev.filter((id) => id !== languageId)
                : [...prev, languageId]
        );
    };

    const handleSortChange = (sortId: string) => {
        triggerLight();
        setSelectedSort(sortId);
    };

    const handleMaxResultsChange = (maxResultsId: string) => {
        triggerLight();
        setSelectedMaxResults(maxResultsId);
    };

    const saveTorrentioConfig = async () => {
        setLoading(true);
        try {
            triggerMedium();
            const configToSave: TorrentioConfig = {
                ...torrentioConfig,
                providers: selectedProviders,
                priorityLanguages: selectedLanguages,
                sort: selectedSort,
                maxResults: selectedMaxResults,
            };

            await mmkvStorage.setItem(TORRENTIO_CONFIG_KEY, configToSave);
            setTorrentioConfig(configToSave);

            setAlertTitle('Success');
            setAlertMessage('Torrentio configuration saved!');
            setAlertVisible(true);
        } catch (error) {
            logger.error('Error saving Torrentio config:', error);
            triggerHeavy();
            setAlertTitle('Error');
            setAlertMessage('Failed to save configuration');
            setAlertVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const renderTorboxTab = () => (
        <ScrollView
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={refreshTorboxData}
                    tintColor={colors.primary}
                />
            }
        >
            <Text style={styles.description}>
                Connect your TorBox account to view statistics and manage your debrid service.
            </Text>

            {torboxConnected && torboxUserData && (
                <View style={styles.userDataCard}>
                    <View style={styles.userDataHeader}>
                        <Text style={styles.userDataTitle}>Account Information</Text>
                        <View style={styles.planBadge} style={torboxUserData.plan === 0 ? styles.planBadgeFree : styles.planBadgePaid}>
                            <Text
                                style={[
                                    styles.planBadgeText,
                                    torboxUserData.plan === 0
                                        ? styles.planBadgeTextFree
                                        : styles.planBadgeTextPaid,
                                ]}
                            >
                                {getPlanName(torboxUserData.plan)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.userDataRow}>
                        <Text style={styles.userDataLabel}>Email</Text>
                        <Text style={styles.userDataValue}>{torboxUserData.email}</Text>
                    </View>

                    <View style={styles.userDataRow}>
                        <Text style={styles.userDataLabel}>Total Downloaded</Text>
                        <Text style={styles.userDataValue}>
                            {(torboxUserData.total_downloaded / 1024 / 1024 / 1024).toFixed(2)} GB
                        </Text>
                    </View>

                    {torboxUserData.premium_expires_at && (
                        <View style={styles.userDataRow}>
                            <Text style={styles.userDataLabel}>Premium Expires</Text>
                            <Text style={styles.userDataValue}>
                                {new Date(torboxUserData.premium_expires_at).toLocaleDateString()}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {!torboxConnected && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Connect TorBox Account</Text>
                    <Text style={styles.sectionText}>
                        Get your API key from{' '}
                        <Text
                            style={styles.guideLinkText}
                            onPress={() => Linking.openURL('https://torbox.app/settings')}
                        >
                            TorBox Settings
                        </Text>
                    </Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>API Key</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your TorBox API key"
                            placeholderTextColor={colors.mediumEmphasis}
                            value={torboxApiKey}
                            onChangeText={setTorboxApiKey}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.connectButton,
                            loading && styles.disabledButton,
                        ]}
                        onPress={verifyTorboxConnection}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <Text style={styles.connectButtonText}>Connect TorBox Account</Text>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.disclaimer}>
                        Your API key is stored locally on your device and never shared with external servers.
                    </Text>
                </View>
            )}

            {torboxConnected && (
                <TouchableOpacity
                    style={[styles.actionButton, styles.dangerButton]}
                    onPress={disconnectTorbox}
                >
                    <Text style={styles.buttonText}>Disconnect TorBox</Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );

    const renderTorrentioTab = () => (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.description}>
                Configure Torrentio settings for content discovery and streaming preferences.
            </Text>

            <View style={styles.configSection}>
                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Enable Torrentio Integration</Text>
                    <CustomSwitch
                        value={torrentioConfig.isInstalled}
                        onValueChange={(value) =>
                            setTorrentioConfig({ ...torrentioConfig, isInstalled: value })
                        }
                    />
                </View>
            </View>

            {torrentioConfig.isInstalled && (
                <>
                    <View style={styles.configSection}>
                        <Text style={styles.configSectionTitle}>Torrent Providers</Text>
                        <View style={styles.chipContainer}>
                            {TORRENTIO_PROVIDERS.map((provider) => (
                                <Focusable
                                    key={provider.id}
                                    onPress={() => handleProviderToggle(provider.id)}
                                >
                                    <View
                                        style={[
                                            styles.chip,
                                            selectedProviders.includes(provider.id) &&
                                                styles.chipSelected,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                selectedProviders.includes(provider.id) &&
                                                    styles.chipTextSelected,
                                            ]}
                                        >
                                            {provider.name}
                                        </Text>
                                    </View>
                                </Focusable>
                            ))}
                        </View>
                    </View>

                    <View style={styles.configSection}>
                        <Text style={styles.configSectionTitle}>Sort By</Text>
                        <View style={styles.pickerContainer}>
                            {TORRENTIO_SORT_OPTIONS.map((option) => (
                                <Focusable
                                    key={option.id}
                                    onPress={() => handleSortChange(option.id)}
                                >
                                    <View
                                        style={[
                                            styles.pickerItem,
                                            selectedSort === option.id &&
                                                styles.pickerItemSelected,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.pickerItemText,
                                                selectedSort === option.id &&
                                                    styles.pickerItemTextSelected,
                                            ]}
                                        >
                                            {option.name}
                                        </Text>
                                    </View>
                                </Focusable>
                            ))}
                        </View>
                    </View>

                    <View style={styles.configSection}>
                        <Text style={styles.configSectionTitle}>Max Results Per Quality</Text>
                        <View style={styles.pickerContainer}>
                            {TORRENTIO_MAX_RESULTS.map((option) => (
                                <Focusable
                                    key={option.id}
                                    onPress={() => handleMaxResultsChange(option.id)}
                                >
                                    <View
                                        style={[
                                            styles.pickerItem,
                                            selectedMaxResults === option.id &&
                                                styles.pickerItemSelected,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.pickerItemText,
                                                selectedMaxResults === option.id &&
                                                    styles.pickerItemTextSelected,
                                            ]}
                                        >
                                            {option.name}
                                        </Text>
                                    </View>
                                </Focusable>
                            ))}
                        </View>
                    </View>

                    <View style={styles.configSection}>
                        <Text style={styles.configSectionTitle}>Priority Languages</Text>
                        <View style={styles.chipContainer}>
                            {TORRENTIO_LANGUAGES.map((language) => (
                                <Focusable
                                    key={language.id}
                                    onPress={() => handleLanguageToggle(language.id)}
                                >
                                    <View
                                        style={[
                                            styles.chip,
                                            selectedLanguages.includes(language.id) &&
                                                styles.chipSelected,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                selectedLanguages.includes(language.id) &&
                                                    styles.chipTextSelected,
                                            ]}
                                        >
                                            {language.name}
                                        </Text>
                                    </View>
                                </Focusable>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.connectButton,
                            loading && styles.disabledButton,
                        ]}
                        onPress={saveTorrentioConfig}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <Text style={styles.connectButtonText}>Save Configuration</Text>
                        )}
                    </TouchableOpacity>
                </>
            )}
        </ScrollView>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.darkBackground} />

            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        triggerLight();
                        navigation.goBack();
                    }}
                >
                    <Feather name="chevron-left" size={28} color={colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Debrid Integration</Text>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'torbox' && styles.activeTab]}
                    onPress={() => handleTabPress('torbox')}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'torbox' && styles.activeTabText,
                        ]}
                    >
                        TorBox
                    </Text>
</TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'torrentio' && styles.activeTab]}
                    onPress={() => handleTabPress('torrentio')}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'torrentio' && styles.activeTabText,
                        ]}
                    >
                        Torrentio
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {activeTab === 'torbox' ? renderTorboxTab() : renderTorrentioTab()}
            </View>

            <CustomAlert
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                onClose={() => setAlertVisible(false)}
            />
        </SafeAreaView>
    );
}