module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "airbnb-base",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  plugins: [
    "@typescript-eslint"
  ],
  rules: {
    "import/extensions": [
      "error",
      "never",
      {"js": "always"}
    ],
    // specify the maximum length of a line in your program
    // Overriding airbnb styles
    // https://github.com/airbnb/javascript/blob/master/packages/eslint-config-airbnb-base/rules/style.js
    // https://eslint.org/docs/rules/max-len
    "max-len": ["error", 150, 2, {
      comments: 200,
      ignoreUrls: true,
      ignoreComments: false,
      ignoreRegExpLiterals: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
    }],
  },
  "settings": {
    "import/resolver": {
      "node": {
        "extensions": [
          ".js",
          ".ts"
        ]
      }
    }
  }
}
