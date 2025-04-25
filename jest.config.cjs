/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Remove moduleNameMapper for JSON as we load it via fs now
  // moduleNameMapper: {
  //   '^(.+)\.json$': '$1.json'
  // },
  // Remove specific ts-jest transform config, rely on babel.config.js via preset
  // transform: {
  //   '^.+\.ts?$': [
  //     'ts-jest',
  //     {
  //       tsconfig: 'tsconfig.json',
  //       diagnostics: {
  //         ignoreCodes: ['TS2732'] 
  //       }
  //     }
  //   ]
  // },
  // Keep this potentially, though Babel might handle it better
  transformIgnorePatterns: [
    '/node_modules/(?!js-yaml/)'
  ]
}; 