module.exports = {
  extends: ['react-app', 'react-app/jest'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './config/tsconfig/tsconfig.json',
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['react', '@typescript-eslint'],
  rules: {
    // Disable the problematic rule
    '@typescript-eslint/no-unused-expressions': 'off'
  }
};
