const { defineConfig } = require("cypress");

module.exports = defineConfig({
  reporter: 'cypress-mochawesome-reporter', // <--- ADD THIS
  reporterOptions: {
    charts: true,
    reportPageTitle: 'Edumate Test Report',
    embeddedScreenshots: true,
    inlineAssets: true,
    saveAllAttempts: false,
  },
  e2e: {
    setupNodeEvents(on, config) {
      // <--- ADD THIS LINE
      require('cypress-mochawesome-reporter/plugin')(on); 
      return config;
    },
    baseUrl: 'http://127.0.0.1:5500', // Update this to match your live server port
  },
});