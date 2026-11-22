import securityRules from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'src/**/*', 'server/**/*', 'api/**/*', '*.ts', '*.tsx', '*.js'],
  },
  {
    files: ['**/*.rules'],
    plugins: {
      '@firebase/security-rules': securityRules,
    },
    languageOptions: {
      parser: securityRules.parser,
    },
    rules: {
      ...securityRules.configs.recommended.rules,
    },
  },
];
