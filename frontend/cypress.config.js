const { defineConfig } = require("cypress");

module.exports = defineConfig({
  allowCypressEnv: false,
  experimentalRunAllSpecs: true,
  e2e: {
    baseUrl: 'https://minhas-financias.vercel.app/',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
