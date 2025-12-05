// Commitlint configuration
// Enforces conventional commit format: type(scope): subject

module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Type enum
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature
        "fix", // Bug fix
        "refactor",
        "docs", // Documentation changes
        "style", // Code style changes (formatting, etc.)
        "refactor", // Code refactoring
        "perf", // Performance improvements
        "test", // Test additions/updates
        "build", // Build system changes
        "ci", // CI/CD changes
        "chore", // Maintenance tasks
        "revert", // Revert previous commit
      ],
    ],
    // Subject case
    "subject-case": [2, "never", ["upper-case", "pascal-case"]],
    // Subject length
    "subject-max-length": [2, "always", 100],
    // Subject empty
    "subject-empty": [2, "never"],
    // Type case
    "type-case": [2, "always", "lower-case"],
    // Type empty
    "type-empty": [2, "never"],
    // Scope case
    "scope-case": [2, "always", "lower-case"],
    // Body leading blank
    "body-leading-blank": [2, "always"],
    // Footer leading blank
    "footer-leading-blank": [2, "always"],
  },
};
