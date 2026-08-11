// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  {
    ignores: [
      'dist/**',
      'chart/dist/**',
      'chart/node_modules/**',
      '.angular/**',
      '.tmp-*/**',
      '.playwright-*/**',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', style: 'kebab-case', prefix: ['app', 'cs'] },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', style: 'camelCase', prefix: 'app' },
      ],
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',

      // Components intentionally omit the Component suffix.
      '@angular-eslint/component-class-suffix': 'off',
      '@angular-eslint/directive-class-suffix': 'off',

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@angular/forms',
              importNames: ['NG_VALUE_ACCESSOR', 'ControlValueAccessor'],
              message:
                'Form controls implement FormValueControl from @angular/forms/signals. See shared/controls/base-form-control.ts.',
            },
          ],
          patterns: [
            {
              group: ['@fortawesome/pro-*', '@fortawesome/fontawesome-pro', '@awesome.me/*'],
              message:
                'Chillscope uses public Font Awesome Free definitions through shared/icons only.',
            },
          ],
        },
      ],

      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Decorator[expression.callee.name=/^(Input|Output|ViewChild|ViewChildren|ContentChild|ContentChildren|HostBinding|HostListener)$/]',
          message:
            'Use the signal-based equivalents: input(), output(), model(), viewChild(), contentChild(), host bindings in the component metadata.',
        },
        {
          selector: 'MethodDefinition[kind="constructor"] TSParameterProperty',
          message: 'Use inject() instead of constructor parameter injection.',
        },
        {
          selector: 'MethodDefinition[kind="constructor"] Decorator',
          message: 'Use inject() instead of decorated constructor parameters.',
        },
        {
          selector: 'TSClassImplements[expression.name="ControlValueAccessor"]',
          message:
            'Implement FormValueControl or FormCheckboxControl from @angular/forms/signals instead.',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
      '@angular-eslint/template/eqeqeq': 'error',
      '@angular-eslint/template/no-negated-async': 'error',
    },
  },
);
