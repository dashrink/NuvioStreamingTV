/**
 * E2E Profile Isolation Verification Tests
 *
 * This module provides programmatic verification of profile isolation
 * to ensure watch history, continue watching, and recommendations
 * are properly scoped to individual profiles.
 *
 * @module ProfileIsolationTests
 */

import { mmkvStorage } from '../../services/mmkvStorage';
import { storageService } from '../../services/storageService';
import { logger } from '../../utils/logger';

// Storage keys used for profiles
const PROFILE_STORAGE_KEY = 'user_profiles';

// Test content IDs (mock action and documentary content)
const TEST_ACTION_CONTENT = {
  id: 'tt0468569', // The Dark Knight (action)
  type: 'movie' as const,
  name: 'The Dark Knight',
  genre: 'action'
};

const TEST_DOCUMENTARY_CONTENT = {
  id: 'tt1663662', // Planet Earth II (documentary)
  type: 'series' as const,
  name: 'Planet Earth II',
  genre: 'documentary'
};

export interface Profile {
  id: string;
  name: string;
  avatar?: string;
  isActive: boolean;
  createdAt: number;
}

export interface ProfileIsolationTestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

export interface ProfileIsolationTestSuite {
  allPassed: boolean;
  results: ProfileIsolationTestResult[];
  timestamp: number;
}

/**
 * ProfileIsolationTester class provides methods to verify profile isolation
 */
export class ProfileIsolationTester {
  private profileA: Profile | null = null;
  private profileB: Profile | null = null;

  /**
   * Create test profiles for isolation testing
   */
  async createTestProfiles(): Promise<{ profileA: Profile; profileB: Profile }> {
    const timestamp = Date.now();

    this.profileA = {
      id: `test-profile-a-${timestamp}`,
      name: 'Test Profile A (Action)',
      avatar: 'action-avatar',
      isActive: false,
      createdAt: timestamp
    };

    this.profileB = {
      id: `test-profile-b-${timestamp}`,
      name: 'Test Profile B (Documentary)',
      avatar: 'documentary-avatar',
      isActive: false,
      createdAt: timestamp + 1
    };

    // Load existing profiles and add test profiles
    const existingProfilesJson = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
    const existingProfiles: Profile[] = existingProfilesJson ? JSON.parse(existingProfilesJson) : [];

    // Set profileA as active
    this.profileA.isActive = true;

    const updatedProfiles = [...existingProfiles, this.profileA, this.profileB];
    await mmkvStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfiles));

    logger.log('[ProfileIsolationTest] Created test profiles:', this.profileA.name, this.profileB.name);

    return { profileA: this.profileA, profileB: this.profileB };
  }

  /**
   * Simulate watching action content on Profile A
   */
  async simulateProfileAWatchAction(): Promise<void> {
    if (!this.profileA) throw new Error('Profile A not created');

    // Set Profile A as active
    await this.setActiveProfile(this.profileA.id);

    // Simulate watching action movie with 50% progress
    const progress = {
      currentTime: 3600, // 1 hour into a 2-hour movie
      duration: 7200,
      lastUpdated: Date.now(),
      traktSynced: false,
    };

    await storageService.setWatchProgress(
      TEST_ACTION_CONTENT.id,
      TEST_ACTION_CONTENT.type,
      progress,
      undefined,
      { profile_id: this.profileA.id }
    );

    logger.log('[ProfileIsolationTest] Simulated action content viewing on Profile A');
  }

  /**
   * Simulate watching documentary content on Profile B
   */
  async simulateProfileBWatchDocumentary(): Promise<void> {
    if (!this.profileB) throw new Error('Profile B not created');

    // Set Profile B as active
    await this.setActiveProfile(this.profileB.id);

    // Simulate watching documentary series with 30% progress
    const episodeId = `${TEST_DOCUMENTARY_CONTENT.id}:1:1`;
    const progress = {
      currentTime: 900, // 15 minutes into a 50-minute episode
      duration: 3000,
      lastUpdated: Date.now(),
      traktSynced: false,
    };

    await storageService.setWatchProgress(
      TEST_DOCUMENTARY_CONTENT.id,
      TEST_DOCUMENTARY_CONTENT.type,
      progress,
      episodeId,
      { profile_id: this.profileB.id }
    );

    logger.log('[ProfileIsolationTest] Simulated documentary content viewing on Profile B');
  }

  /**
   * Set a profile as active
   */
  private async setActiveProfile(profileId: string): Promise<void> {
    const storedProfiles = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
    if (storedProfiles) {
      const parsedProfiles: Profile[] = JSON.parse(storedProfiles);
      const updatedProfiles = parsedProfiles.map(profile => ({
        ...profile,
        isActive: profile.id === profileId
      }));
      await mmkvStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfiles));
    }
  }

  /**
   * Verify Profile A sees only action content in continue watching
   */
  async verifyProfileAIsolation(): Promise<ProfileIsolationTestResult> {
    if (!this.profileA) {
      return {
        testName: 'Profile A Isolation',
        passed: false,
        message: 'Profile A not created'
      };
    }

    await this.setActiveProfile(this.profileA.id);

    // Get watch progress for action content
    const actionProgress = await storageService.getWatchProgress(
      TEST_ACTION_CONTENT.id,
      TEST_ACTION_CONTENT.type,
      undefined,
      this.profileA.id
    );

    // Try to get documentary content progress (should NOT exist for Profile A)
    const documentaryProgress = await storageService.getWatchProgress(
      TEST_DOCUMENTARY_CONTENT.id,
      TEST_DOCUMENTARY_CONTENT.type,
      `${TEST_DOCUMENTARY_CONTENT.id}:1:1`,
      this.profileA.id
    );

    const actionContentExists = actionProgress !== null && actionProgress.currentTime > 0;
    const documentaryContentNotVisible = documentaryProgress === null;

    const passed = actionContentExists && documentaryContentNotVisible;

    return {
      testName: 'Profile A Isolation - Action Content',
      passed,
      message: passed
        ? 'Profile A correctly shows only action content'
        : 'Profile A isolation failed - may be showing documentary content or missing action content',
      details: {
        actionContentVisible: actionContentExists,
        documentaryContentIsolated: documentaryContentNotVisible,
        actionProgress: actionProgress ? `${((actionProgress.currentTime / actionProgress.duration) * 100).toFixed(1)}%` : 'none',
      }
    };
  }

  /**
   * Verify Profile B sees only documentary content in continue watching
   */
  async verifyProfileBIsolation(): Promise<ProfileIsolationTestResult> {
    if (!this.profileB) {
      return {
        testName: 'Profile B Isolation',
        passed: false,
        message: 'Profile B not created'
      };
    }

    await this.setActiveProfile(this.profileB.id);

    // Get watch progress for documentary content
    const documentaryProgress = await storageService.getWatchProgress(
      TEST_DOCUMENTARY_CONTENT.id,
      TEST_DOCUMENTARY_CONTENT.type,
      `${TEST_DOCUMENTARY_CONTENT.id}:1:1`,
      this.profileB.id
    );

    // Try to get action content progress (should NOT exist for Profile B)
    const actionProgress = await storageService.getWatchProgress(
      TEST_ACTION_CONTENT.id,
      TEST_ACTION_CONTENT.type,
      undefined,
      this.profileB.id
    );

    const documentaryContentExists = documentaryProgress !== null && documentaryProgress.currentTime > 0;
    const actionContentNotVisible = actionProgress === null;

    const passed = documentaryContentExists && actionContentNotVisible;

    return {
      testName: 'Profile B Isolation - Documentary Content',
      passed,
      message: passed
        ? 'Profile B correctly shows only documentary content'
        : 'Profile B isolation failed - may be showing action content or missing documentary content',
      details: {
        documentaryContentVisible: documentaryContentExists,
        actionContentIsolated: actionContentNotVisible,
        documentaryProgress: documentaryProgress ? `${((documentaryProgress.currentTime / documentaryProgress.duration) * 100).toFixed(1)}%` : 'none',
      }
    };
  }

  /**
   * Verify cross-profile data cannot leak
   */
  async verifyCrossProfileIsolation(): Promise<ProfileIsolationTestResult> {
    if (!this.profileA || !this.profileB) {
      return {
        testName: 'Cross-Profile Isolation',
        passed: false,
        message: 'Test profiles not created'
      };
    }

    // Try to access Profile A's data with Profile B's ID (should fail)
    const crossAccessResult = await storageService.getWatchProgress(
      TEST_ACTION_CONTENT.id,
      TEST_ACTION_CONTENT.type,
      undefined,
      this.profileB.id // Using Profile B's ID to access Profile A's content
    );

    // Should be null because action content was added with Profile A's ID
    const passed = crossAccessResult === null;

    return {
      testName: 'Cross-Profile Data Isolation',
      passed,
      message: passed
        ? 'Cross-profile data access correctly blocked'
        : 'WARNING: Cross-profile data leak detected!',
      details: {
        crossAccessAttempted: true,
        dataLeaked: !passed,
        leakedData: crossAccessResult
      }
    };
  }

  /**
   * Verify storage key generation includes profile_id
   */
  async verifyStorageKeyIsolation(): Promise<ProfileIsolationTestResult> {
    if (!this.profileA || !this.profileB) {
      return {
        testName: 'Storage Key Isolation',
        passed: false,
        message: 'Test profiles not created'
      };
    }

    // Get all storage keys
    const allKeys = await mmkvStorage.getAllKeys();

    // Find keys that contain profile-scoped watch progress
    const profileAKeys = allKeys.filter(key => key.includes(`:profile:${this.profileA!.id}:`));
    const profileBKeys = allKeys.filter(key => key.includes(`:profile:${this.profileB!.id}:`));

    const hasProfileAKeys = profileAKeys.length > 0;
    const hasProfileBKeys = profileBKeys.length > 0;
    const keysAreDifferent = profileAKeys.every(k => !profileBKeys.includes(k));

    const passed = hasProfileAKeys && hasProfileBKeys && keysAreDifferent;

    return {
      testName: 'Storage Key Isolation',
      passed,
      message: passed
        ? 'Storage keys correctly scoped to individual profiles'
        : 'Storage key isolation may be incomplete',
      details: {
        profileAKeyCount: profileAKeys.length,
        profileBKeyCount: profileBKeys.length,
        sampleProfileAKey: profileAKeys[0] || 'none',
        sampleProfileBKey: profileBKeys[0] || 'none',
      }
    };
  }

  /**
   * Verify profile switching clears active state correctly
   */
  async verifyProfileSwitching(): Promise<ProfileIsolationTestResult> {
    if (!this.profileA || !this.profileB) {
      return {
        testName: 'Profile Switching',
        passed: false,
        message: 'Test profiles not created'
      };
    }

    // Switch to Profile A
    await this.setActiveProfile(this.profileA.id);

    let storedProfiles = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
    let profiles: Profile[] = JSON.parse(storedProfiles || '[]');
    const profileAActiveAfterSwitch = profiles.find(p => p.id === this.profileA!.id)?.isActive;
    const profileBInactiveAfterSwitch = !profiles.find(p => p.id === this.profileB!.id)?.isActive;

    // Switch to Profile B
    await this.setActiveProfile(this.profileB.id);

    storedProfiles = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
    profiles = JSON.parse(storedProfiles || '[]');
    const profileAInactiveAfterSwitch2 = !profiles.find(p => p.id === this.profileA!.id)?.isActive;
    const profileBActiveAfterSwitch2 = profiles.find(p => p.id === this.profileB!.id)?.isActive;

    const passed = profileAActiveAfterSwitch && profileBInactiveAfterSwitch &&
                   profileAInactiveAfterSwitch2 && profileBActiveAfterSwitch2;

    return {
      testName: 'Profile Switching State Management',
      passed,
      message: passed
        ? 'Profile switching correctly updates active states'
        : 'Profile switching state management failed',
      details: {
        switchToAWorked: profileAActiveAfterSwitch && profileBInactiveAfterSwitch,
        switchToBWorked: profileAInactiveAfterSwitch2 && profileBActiveAfterSwitch2,
      }
    };
  }

  /**
   * Clean up test profiles
   */
  async cleanup(): Promise<void> {
    if (!this.profileA && !this.profileB) return;

    // Remove test profiles
    const storedProfiles = await mmkvStorage.getItem(PROFILE_STORAGE_KEY);
    if (storedProfiles) {
      const profiles: Profile[] = JSON.parse(storedProfiles);
      const cleanedProfiles = profiles.filter(p =>
        p.id !== this.profileA?.id && p.id !== this.profileB?.id
      );
      await mmkvStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(cleanedProfiles));
    }

    // Clean up test watch progress data
    const allKeys = await mmkvStorage.getAllKeys();
    const testKeys = allKeys.filter(key =>
      (this.profileA && key.includes(this.profileA.id)) ||
      (this.profileB && key.includes(this.profileB.id))
    );

    for (const key of testKeys) {
      await mmkvStorage.removeItem(key);
    }

    logger.log('[ProfileIsolationTest] Cleaned up test data');

    this.profileA = null;
    this.profileB = null;
  }

  /**
   * Run the full E2E profile isolation test suite
   */
  async runFullTestSuite(): Promise<ProfileIsolationTestSuite> {
    const results: ProfileIsolationTestResult[] = [];

    logger.log('[ProfileIsolationTest] Starting E2E Profile Isolation Test Suite');

    try {
      // Step 1: Create test profiles
      await this.createTestProfiles();
      results.push({
        testName: 'Create Test Profiles',
        passed: true,
        message: 'Test profiles created successfully'
      });

      // Step 2: Simulate Profile A watching action content
      await this.simulateProfileAWatchAction();
      results.push({
        testName: 'Simulate Profile A Watch Action',
        passed: true,
        message: 'Action content watch progress recorded for Profile A'
      });

      // Step 3: Simulate Profile B watching documentary content
      await this.simulateProfileBWatchDocumentary();
      results.push({
        testName: 'Simulate Profile B Watch Documentary',
        passed: true,
        message: 'Documentary content watch progress recorded for Profile B'
      });

      // Step 4: Verify Profile A isolation
      results.push(await this.verifyProfileAIsolation());

      // Step 5: Verify Profile B isolation
      results.push(await this.verifyProfileBIsolation());

      // Step 6: Verify cross-profile data isolation
      results.push(await this.verifyCrossProfileIsolation());

      // Step 7: Verify storage key isolation
      results.push(await this.verifyStorageKeyIsolation());

      // Step 8: Verify profile switching
      results.push(await this.verifyProfileSwitching());

    } catch (error: any) {
      results.push({
        testName: 'Test Suite Error',
        passed: false,
        message: `Error during test execution: ${error.message}`,
        details: { error: error.stack }
      });
    } finally {
      // Clean up test data
      await this.cleanup();
    }

    const allPassed = results.every(r => r.passed);

    const testSuite: ProfileIsolationTestSuite = {
      allPassed,
      results,
      timestamp: Date.now()
    };

    // Log summary
    logger.log('[ProfileIsolationTest] Test Suite Complete');
    logger.log(`[ProfileIsolationTest] Overall Result: ${allPassed ? 'PASSED' : 'FAILED'}`);
    logger.log(`[ProfileIsolationTest] Tests Passed: ${results.filter(r => r.passed).length}/${results.length}`);

    return testSuite;
  }
}

/**
 * Run the profile isolation test suite
 * Can be called from the app to verify profile isolation
 */
export async function runProfileIsolationTests(): Promise<ProfileIsolationTestSuite> {
  const tester = new ProfileIsolationTester();
  return tester.runFullTestSuite();
}

/**
 * Export individual test functions for selective testing
 */
export const profileIsolationTests = {
  runFullTestSuite: runProfileIsolationTests,
  ProfileIsolationTester,
};

export default profileIsolationTests;
