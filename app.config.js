// Dynamic Expo config that switches between mobile and TV configurations
// based on the APP_VARIANT environment variable

const fs = require('fs');
const path = require('path');

module.exports = () => {
    const variant = process.env.APP_VARIANT;

    // If APP_VARIANT is 'tv', load app.tv.json, otherwise load app.json
    const configFile = variant === 'tv' ? 'app.tv.json' : 'app.json';
    const configPath = path.resolve(__dirname, configFile);

    console.log(`[app.config.js] Loading config from: ${configFile}`);

    if (!fs.existsSync(configPath)) {
        throw new Error(`Config file not found: ${configPath}`);
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    return config.expo || config;
};
