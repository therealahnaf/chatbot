# Linting and Code Quality Guide

## Overview

This project uses modern, fast linting tools to maintain code quality, consistency, and security.

## Tools Used

### 1. **Pylint** 🔍 (Primary Linter)

**What it is**: A comprehensive Python linter that checks for errors, enforces coding standards, and
looks for code smells.

**Why we use it**: Industry-standard linter with extensive checks for code quality, bugs, and best
practices.

**Configuration**: `.pylintrc` and `pyproject.toml` under `[tool.pylint]`

**Usage**:

```bash
# Check code
uv run pylint app --rcfile=pyproject.toml

# Check specific file
uv run pylint app/services/agent/agent_service.py

# Or use make command
make lint
```

**Checks for**:

- Code errors and bugs
- PEP 8 compliance
- Code complexity
- Unused variables and imports
- Code duplication
- Design issues
- Refactoring opportunities
- Best practices violations

### 2. **Black** 🖤 (Code Formatter)

**What it is**: The uncompromising Python code formatter.

**Why we use it**: Eliminates debates about code style, ensures consistency.

**Configuration**: `pyproject.toml` under `[tool.black]`

**Usage**:

```bash
# Format code
poetry run black app tests

# Check without formatting
poetry run black --check app tests

# Or use make command
make format
```

**Settings**:

- Line length: 100 characters
- Target: Python 3.11

### 3. **isort** 📦 (Import Sorting)

**What it is**: Sorts and organizes Python imports.

**Why we use it**: Keeps imports clean and organized.

**Configuration**: `pyproject.toml` under `[tool.isort]`

**Usage**:

```bash
# Sort imports
uv run isort app tests

# Check without sorting
uv run isort --check app tests
```

**Settings**:

- Profile: black (compatible with Black)
- Line length: 100

### 4. **mypy** 🔍 (Type Checking)

**What it is**: Static type checker for Python.

**Why we use it**: Catches type-related bugs before runtime.

**Configuration**: `pyproject.toml` under `[tool.mypy]`

**Usage**:

```bash
# Run type checking
poetry run mypy app

# Check specific file
poetry run mypy app/services/agent/agent_service.py
```

**Settings**:

- Python version: 3.11
- Strict mode enabled
- Pydantic plugin enabled

### 5. **Bandit** 🔒 (Security Linter)

**What it is**: Security-focused linter that finds common security issues.

**Why we use it**: Identifies potential security vulnerabilities.

**Configuration**: `pyproject.toml` under `[tool.bandit]`

**Usage**:

```bash
# Run security checks
poetry run bandit -r app

# With config
poetry run bandit -r app -c pyproject.toml
```

**Checks for**:

- SQL injection vulnerabilities
- Hardcoded passwords
- Insecure cryptography
- Shell injection
- And more...

### 6. **Prettier** 💅 (YAML/JSON/Markdown Formatter)

**What it is**: Opinionated formatter for YAML, JSON, and Markdown files.

**Why we use it**: Keeps configuration files and documentation formatted.

**Configuration**: `.prettierrc`

**Usage**:

```bash
# Format all files
npx prettier --write "**/*.{yml,yaml,json,md}"

# Check without formatting
npx prettier --check "**/*.{yml,yaml,json,md}"
```

**Settings**:

- Print width: 100
- Tab width: 2 spaces
- Single quotes: false

### 7. **Commitlint** 📝 (Commit Message Linter)

**What it is**: Enforces conventional commit message format.

**Why we use it**: Maintains consistent, meaningful commit history.

**Configuration**: `commitlint.config.js`

**Format**:

```
type(scope): subject

body

footer
```

**Valid types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions/updates
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Maintenance tasks
- `revert`: Revert previous commit

**Examples**:

```bash
# Good commits
git commit -m "feat: add conversation history retrieval"
git commit -m "fix: resolve database connection timeout"
git commit -m "docs: update API documentation"
git commit -m "refactor(agent): simplify routing logic"

# Bad commits (will be rejected)
git commit -m "updated stuff"
git commit -m "Fix bug"
git commit -m "FEAT: new feature"
```

## Pre-commit Hooks

Pre-commit hooks automatically run checks before each commit.

### Installation

```bash
# Install hooks
make setup-hooks

# Or manually
poetry run pre-commit install
poetry run pre-commit install --hook-type commit-msg
```

### What runs on commit

1. **Ruff** - Lints and fixes code
2. **Black** - Formats Python code
3. **isort** - Sorts imports
4. **mypy** - Type checking
5. **Prettier** - Formats YAML/JSON/Markdown
6. **General checks**:
   - Trailing whitespace removal
   - End of file fixer
   - YAML/JSON/TOML validation
   - Large file detection
   - Merge conflict detection
   - Private key detection
7. **Bandit** - Security checks
8. **Commitlint** - Commit message validation

### Manual execution

```bash
# Run all hooks on all files
poetry run pre-commit run --all-files

# Run specific hook
poetry run pre-commit run ruff --all-files
poetry run pre-commit run black --all-files

# Skip hooks (not recommended)
git commit --no-verify -m "message"
```

## Quick Commands (Makefile)

```bash
# Setup
make install          # Install dependencies
make setup-hooks      # Install pre-commit hooks

# Code Quality
make lint             # Run all linters
make format           # Format all code
make check            # Check without fixing

# Testing
make test             # Run all tests
make test-cov         # Run tests with coverage

# Development
make dev              # Start dev server
make clean            # Clean cache files
```

## IDE Integration

### VS Code

Install extensions:

- **Ruff** - charliermarsh.ruff
- **Black Formatter** - ms-python.black-formatter
- **Prettier** - esbenp.prettier-vscode
- **Python** - ms-python.python

Add to `.vscode/settings.json`:

```json
{
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports": true
    }
  },
  "ruff.lint.run": "onSave",
  "[yaml]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[markdown]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### PyCharm

1. **Ruff**: Install Ruff plugin from marketplace
2. **Black**: Settings → Tools → Black → Enable on save
3. **mypy**: Settings → Tools → Python Integrated Tools → Type checker: mypy

## CI/CD Integration

Pre-commit hooks run automatically in CI/CD pipelines:

```yaml
# .github/workflows/lint.yml
name: Lint

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: "3.11"
      - name: Install dependencies
        run: |
          pip install poetry
          poetry install
      - name: Run pre-commit
        run: poetry run pre-commit run --all-files
```

## Best Practices

### 1. Run linters before committing

```bash
make lint
make format
```

### 2. Fix issues incrementally

Don't ignore linter warnings - fix them as you go.

### 3. Use type hints

```python
# Good
def process_query(user_id: str, query: str) -> AgentResponse:
    pass

# Bad
def process_query(user_id, query):
    pass
```

### 4. Keep functions small

Maximum 50 lines per function (Ruff will warn).

### 5. Write meaningful commit messages

Follow conventional commits format.

### 6. Don't disable linters without reason

```python
# Only when absolutely necessary
# ruff: noqa: E501
very_long_line_that_cannot_be_broken = "..."
```

## Troubleshooting

### Ruff is too strict

Adjust rules in `pyproject.toml`:

```toml
[tool.ruff]
ignore = ["E501"]  # Ignore line length
```

### Pre-commit hooks are slow

Skip specific hooks:

```bash
SKIP=mypy git commit -m "message"
```

### Conflicts between formatters

Black and Ruff are configured to work together. If conflicts occur:

1. Run Black first
2. Then run Ruff
3. Report the issue

### Type checking errors

Add type ignore comments sparingly:

```python
result = some_function()  # type: ignore[arg-type]
```

## Summary

| Tool       | Purpose           | Speed  | Auto-fix |
| ---------- | ----------------- | ------ | -------- |
| Ruff       | Linting           | ⚡⚡⚡ | ✅       |
| Black      | Formatting        | ⚡⚡   | ✅       |
| isort      | Import sorting    | ⚡⚡   | ✅       |
| mypy       | Type checking     | ⚡     | ❌       |
| Bandit     | Security          | ⚡⚡   | ❌       |
| Prettier   | Config formatting | ⚡⚡   | ✅       |
| Commitlint | Commit messages   | ⚡⚡⚡ | ❌       |

**Recommended workflow**:

1. Write code
2. Run `make format` (auto-fixes formatting)
3. Run `make lint` (checks for issues)
4. Fix any remaining issues
5. Commit (pre-commit hooks run automatically)

Happy coding! 🚀
