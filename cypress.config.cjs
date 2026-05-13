const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',
    viewportWidth: 1280,
    viewportHeight: 720,
    testIsolation: true,
    setupNodeEvents(on, config) {
      try {
        const fs = require('fs');
        const envFile = fs.readFileSync('.env.local', 'utf8');
        envFile.split('\n').forEach(line => {
          const match = line.match(/^([^=]+)=(.*)$/);
          if (match) {
            config.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
          }
        });
      } catch (e) {
        // ignore if not found
      }
      return config;
    },
  },
});
