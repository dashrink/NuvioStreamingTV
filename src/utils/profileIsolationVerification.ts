/**
 * Profile Isolation Verification Utility
 *
 * This utility provides functions to verify that profile isolation
 * is working correctly in the application. It can be used for:
 *
 * 1. Development testing
 * 2. QA verification
 * 3. Production health checks
 *
 * @module ProfileIsolationVerification
 */

import { mmkvStorage } from '../services/mmkvStorage';
import { storageService } from '../services/storageService';
import { logger } from './logger';

const PROFILE_STORAGE_KEY = 'user_profiles';

export interface Profile {
  id: string;
  name: string;
  avatar?: string;
  isActive: boolean;
  createdAt: number;
}

export interface IsolationCheckResult {
  isIsolated: boolean;
  issues: string[];
  profileWatchProgressCount: Record<string, number>;
  storageKeyAnalysis: {
    totalWatchProgressKeys: number;
    profileScopedKeys: number;
    legacyKeys: number;
  };
}

/**
 * Quick verification that profile isolation is working
 * Returns true if no obvious isolation issues are detected
 */
export async function verifyProfileIsolation(): Promise<IsolationCheckResult> {
  const issues: string[] = [];
  const profileWatchProgressCount: Record<string, number> = {};

  try {
    // Get all profiles
    const profilesJson = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
    const profiles: Profile[] = profilesJson ? JSON.parse(profilesJson) : [];

    if (profiles.length === 0) {
      return {
        isIsolated: true,
        issues: ['No profiles found - isolation not applicable'],
        profileWatchProgressCount: {},
        storageKeyAnalysis: {
          totalWatchProgressKeys: 0,
          profileScopedKeys: 0,
          legacyKeys: 0,
        },
      };
    }

    // Get all storage keys
    const allKeys = await mmkvStorage.getAllKeys();

    // Analyze watch progress keys
    const watchProgressKeys = allKeys.filter(key => key.includes('@watch_progress:'));
    const profileScopedKeys = watchProgressKeys.filter(key => key.includes(':profile:'));
    const legacyKeys = watchProgressKeys.filter(key => !key.includes(':profile:'));

    // Count watch progress per profile
    for (const profile of profiles) {
      const profileKeys = profileScopedKeys.filter(key => key.includes(`:profile:${profile.id}:`));
      profileWatchProgressCount[profile.name] = profileKeys.length;
    }

    // Check for potential isolation issues
    if (legacyKeys.length > 0 && profileScopedKeys.length > 0) {
      issues.push(
        `Found ${legacyKeys.length} legacy (non-profile-scoped) watch progress keys alongside ${profileScopedKeys.length} profile-scoped keys. Consider migrating legacy data.`
      );
    }

    // Check if active profile has reasonable isolation
    const activeProfile = profiles.find(p => p.isActive);
    if (activeProfile) {
      const activeProfileKeys = profileScopedKeys.filter(key =>
        key.includes(`:profile:${activeProfile.id}:`)
      );

      const otherProfileKeys = profileScopedKeys.filter(key =>
        !key.includes(`:profile:${activeProfile.id}:`)
      );

      logger.log('[ProfileIsolation] Active profile:', activeProfile.name);
      logger.log('[ProfileIsolation] Active profile watch progress items:', activeProfileKeys.length);
      logger.log('[ProfileIsolation] Other profiles watch progress items:', otherProfileKeys.length);
    }

    return {
      isIsolated: issues.length === 0,
      issues,
      profileWatchProgressCount,
      storageKeyAnalysis: {
        totalWatchProgressKeys: watchProgressKeys.length,
        profileScopedKeys: profileScopedKeys.length,
        legacyKeys: legacyKeys.length,
      },
    };
  } catch (error: any) {
    return {
      isIsolated: false,
      issues: [`Error during verification: ${error.message}`],
      profileWatchProgressCount: {},
      storageKeyAnalysis: {
        totalWatchProgressKeys: 0,
        profileScopedKeys: 0,
        legacyKeys: 0,
      },
    };
  }
}

/**
 * Get a detailed breakdown of watch progress by profile
 */
export async function getProfileWatchProgressBreakdown(): Promise<
  Record<string, { contentId: string; type: string; progress: number }[]>
> {
  const breakdown: Record<string, { contentId: string; type: string; progress: number }[]> = {};

  try {
    const profilesJson = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
    const profiles: Profile[] = profilesJson ? JSON.parse(profilesJson) : [];

    const allKeys = await mmkvStorage.getAllKeys();
    const watchProgressKeys = allKeys.filter(key =>
      key.includes('@watch_progress:') && key.includes(':profile:')
    );

    for (const profile of profiles) {
      breakdown[profile.name] = [];

      const profileKeys = watchProgressKeys.filter(key =>
        key.includes(`:profile:${profile.id}:`)
      );

      for (const key of profileKeys) {
        try {
          const value = await mmkvStorage.getItem(key);
          if (value) {
            const progress = JSON.parse(value);

            // Extract content info from key
            // Key format: @user:scope:profile:id:@watch_progress:type:contentId
            const parts = key.split(':');
            const typeIndex = parts.indexOf('@watch_progress') + 1;
            const type = parts[typeIndex] || 'unknown';
            const contentId = parts[typeIndex + 1] || 'unknown';

            const progressPercent = progress.duration > 0
              ? (progress.currentTime / progress.duration) * 100
              : 0;

            breakdown[profile.name].push({
              contentId,
              type,
              progress: Math.round(progressPercent),
            });
          }
        } catch {
          // Skip malformed entries
        }
      }
    }

    return breakdown;
  } catch (error) {
    logger.error('[ProfileIsolation] Error getting breakdown:', error);
    return {};
  }
}

/**
 * Verify that a specific content item is only visible to the expected profile
 */
export async function verifyContentIsolation(
  contentId: string,
  contentType: 'movie' | 'series',
  expectedProfileId: string
): Promise<{ isolated: boolean; visibleToProfiles: string[] }> {
  const visibleToProfiles: string[] = [];

  try {
    const profilesJson = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
    const profiles: Profile[] = profilesJson ? JSON.parse(profilesJson) : [];

    for (const profile of profiles) {
      const progress = await storageService.getWatchProgress(
        contentId,
        contentType,
        undefined,
        profile.id
      );

      if (progress && progress.currentTime > 0) {
        visibleToProfiles.push(profile.id);
      }
    }

    return {
      isolated: visibleToProfiles.length <= 1 &&
                (visibleToProfiles.length === 0 || visibleToProfiles[0] === expectedProfileId),
      visibleToProfiles,
    };
  } catch (error) {
    logger.error('[ProfileIsolation] Error verifying content isolation:', error);
    return { isolated: false, visibleToProfiles: [] };
  }
}

/**
 * Log a summary of profile isolation status to console
 */
export async function logProfileIsolationStatus(): Promise<void> {
  const result = await verifyProfileIsolation();
  const breakdown = await getProfileWatchProgressBreakdown();

  logger.log('=== Profile Isolation Status ===');
  logger.log('Isolated:', result.isIsolated);

  if (result.issues.length > 0) {
    logger.log('Issues:');
    result.issues.forEach(issue => logger.log(`  - ${issue}`));
  }

  logger.log('Storage Key Analysis:');
  logger.log(`  Total watch progress keys: ${result.storageKeyAnalysis.totalWatchProgressKeys}`);
  logger.log(`  Profile-scoped keys: ${result.storageKeyAnalysis.profileScopedKeys}`);
  logger.log(`  Legacy keys: ${result.storageKeyAnalysis.legacyKeys}`);

  logger.log('Watch Progress by Profile:');
  Object.entries(result.profileWatchProgressCount).forEach(([name, count]) => {
    logger.log(`  ${name}: ${count} items`);
  });

  logger.log('Detailed Breakdown:');
  Object.entries(breakdown).forEach(([profileName, items]) => {
    logger.log(`  ${profileName}:`);
    items.forEach(item => {
      logger.log(`    - ${item.type}:${item.contentId} (${item.progress}%)`);
    });
  });

  logger.log('================================');
}

export default {
  verifyProfileIsolation,
  getProfileWatchProgressBreakdown,
  verifyContentIsolation,
  logProfileIsolationStatus,
};
