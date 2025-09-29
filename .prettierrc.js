module.exports = {
  // Prettier configuration for CRM-X-SHIVAY
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 80,
  useTabs: false,
  endOfLine: 'lf',
  arrowParens: 'avoid',
  bracketSpacing: true,
  jsxSingleQuote: false,
  quoteProps: 'as-needed',
  bracketSameLine: false,
  // Tailwind CSS class ordering
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindConfig: './tailwind.config.ts',
  tailwindFunctions: ['clsx', 'cn', 'cva'],
}
