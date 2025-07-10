module.exports = {
  extends: [
    'react-app',
    'react-app/jest',
    'prettier',
  ],
  plugins: ['prettier'],
  rules: {
    // General rules
    'no-console': 'warn',
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Prettier integration
    'prettier/prettier': 'error',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};