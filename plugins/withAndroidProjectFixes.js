const { withProjectBuildGradle, withGradleProperties } = require('@expo/config-plugins');

const withAndroidProjectFixes = (config) => {
    // Add androidsvg resolution to build.gradle
    config = withProjectBuildGradle(config, (config) => {
        console.log('[withAndroidProjectFixes] Applying androidsvg resolution fix to build.gradle...');
        config.modResults.contents = addAndroidSvgResolution(config.modResults.contents);
        return config;
    });

    // Increase memory in gradle.properties
    config = withGradleProperties(config, (config) => {
        console.log('[withAndroidProjectFixes] Increasing Gradle memory in gradle.properties...');
        config.modResults = config.modResults.map(item => {
            if (item.key === 'org.gradle.jvmargs') {
                return { ...item, value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m' };
            }
            return item;
        });
        return config;
    });

    return config;
};

function addAndroidSvgResolution(buildGradle) {
    const resolutionStrategy = `
    configurations.all {
        resolutionStrategy.dependencySubstitution {
            substitute module('com.caverock:androidsvg') using module('com.caverock:androidsvg-aar:1.4')
        }
    }
`;

    if (buildGradle.includes("substitute module('com.caverock:androidsvg')")) {
        return buildGradle;
    }

    const allProjectsIndex = buildGradle.indexOf('allprojects {');
    if (allProjectsIndex !== -1) {
        const insertIndex = buildGradle.indexOf('{', allProjectsIndex) + 1;
        return buildGradle.slice(0, insertIndex) + resolutionStrategy + buildGradle.slice(insertIndex);
    }

    return buildGradle + resolutionStrategy;
}

module.exports = withAndroidProjectFixes;
