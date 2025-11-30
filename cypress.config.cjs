const { defineConfig } = require("cypress");

module.exports = defineConfig({
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    charts: true,
    reportPageTitle: 'Edumate Test Report',
    embeddedScreenshots: true,
    inlineAssets: true,
    saveAllAttempts: false,
  },
  e2e: {
    setupNodeEvents(on, config) {
      require('cypress-mochawesome-reporter/plugin')(on); 
      return config;
    },
    baseUrl: 'http://127.0.0.1:5500',
    // Add these to handle Firebase better
    defaultCommandTimeout: 15000,
    pageLoadTimeout: 30000,
    responseTimeout: 30000,
    requestTimeout: 5000,
    // Disable video for faster tests
    video: false,
  },
});