# Contributing to AI Agent Platform

Thank you for your interest in contributing to the AI Agent Platform! This document provides
guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Maintain professional communication

## Getting Started

### Prerequisites

- Python 3.11+
- Docker & Docker Compose
- uv (Python package manager)
- Git

### Setup Development Environment

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/your-username/ai-agent-platform.git
   cd ai-agent-platform
   ```

2. Install uv (if not already installed):

   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

3. Install dependencies:

   ```bash
   uv pip install -e ".[dev]"
   # or use make
   make install
   ```

4. Set up pre-commit hooks (recommended):

   ```bash
   make setup-hooks
   # or
   uv run pre-commit install
   uv run pre-commit install --hook-type commit-msg
   ```

5. Copy environment file:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

6. Start services:
   ```bash
   docker-compose up -d
   ```

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/updates

### Making Changes

1. Create a new branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards

3. Write or update tests

4. Run tests and linting:

   ```bash
   make test
   make format
   make lint
   # or individually
   uv run pytest
   uv run black app tests
   uv run isort app tests
   uv run pylint app
   uv run mypy app
   ```

5. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

### Commit Message Format

Follow conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test additions/updates
- `chore:` - Maintenance tasks

Example:

```
feat: add conversation history retrieval with feedback

- Implement get_conversation_with_details method
- Add SQL query for joining messages and feedback
- Update conversation schema
```

## Coding Standards

### Python Style Guide

- Follow PEP 8
- Use Black for formatting (line length: 100)
- Use isort for import sorting
- Maximum file length: 300 lines
- Use type hints for all functions

### Code Organization

- **API Layer**: Handle HTTP requests, validation, responses
- **Service Layer**: Business logic, orchestration
- **Repository Layer**: Data access, database operations
- **Models**: SQLAlchemy models
- **Schemas**: Pydantic models for validation

### Naming Conventions

- **Files**: `snake_case.py`
- **Classes**: `PascalCase`
- **Functions/Methods**: `snake_case`
- **Constants**: `UPPER_SNAKE_CASE`
- **Private methods**: `_leading_underscore`

### Documentation

- Add docstrings to all public functions and classes
- Use Google-style docstrings
- Update README.md for significant changes
- Add inline comments for complex logic

Example:

```python
async def process_query(
    self,
    user_id: str,
    query: str,
    conversation_id: Optional[str] = None
) -> AgentResponse:
    """Process user query through the AI agent.

    Args:
        user_id: The ID of the user making the query
        query: The user's question or request
        conversation_id: Optional conversation ID to continue existing conversation

    Returns:
        AgentResponse containing the agent's response and metadata

    Raises:
        ValidationError: If query is invalid
        AgentError: If agent processing fails
    """
    pass
```

## Testing

### Writing Tests

- Write unit tests for business logic
- Write integration tests for API endpoints
- Use pytest fixtures for common setup
- Mock external services (OpenAI, etc.)
- Aim for 80%+ code coverage

### Test Structure

```python
import pytest
from app.services.agent.agent_service import AgentService

@pytest.fixture
def agent_service():
    """Fixture for agent service"""
    return AgentService()

@pytest.mark.unit
async def test_process_query_success(agent_service, mock_openai):
    """Test successful query processing"""
    # Arrange
    user_id = "test-user"
    query = "What is AI?"

    # Act
    response = await agent_service.process_query(user_id, query)

    # Assert
    assert response.conversation_id is not None
    assert len(response.response) > 0
```

### Running Tests

```bash
# Run all tests
poetry run pytest

# Run specific test file
poetry run pytest tests/unit/test_agent.py

# Run with coverage
poetry run pytest --cov=app --cov-report=html

# Run only unit tests
poetry run pytest -m unit

# Run only integration tests
poetry run pytest -m integration
```

## Pull Request Process

1. **Update Documentation**: Ensure README and other docs are updated

2. **Add Tests**: All new features must have tests

3. **Run Quality Checks**:

   ```bash
   poetry run pytest
   poetry run black app tests
   poetry run isort app tests
   poetry run flake8 app tests
   poetry run mypy app
   ```

4. **Create Pull Request**:
   - Use a clear, descriptive title
   - Reference related issues
   - Describe what changed and why
   - Include screenshots for UI changes
   - List any breaking changes

5. **Code Review**:
   - Address reviewer feedback
   - Keep discussions focused and professional
   - Update PR based on feedback

6. **Merge**:
   - Squash commits if requested
   - Ensure CI passes
   - Wait for approval from maintainers

## Project Structure Guidelines

### Adding New Features

1. **API Endpoint**: Add to `app/api/v1/`
2. **Business Logic**: Add to `app/services/`
3. **Data Access**: Add to `app/repositories/`
4. **Models**: Add to `app/models/`
5. **Schemas**: Add to `app/schemas/`
6. **Tests**: Add to `tests/unit/` or `tests/integration/`

### File Size Limit

- Maximum 300 lines per file
- Split large files into smaller modules
- Use clear, descriptive names for split files

### Prompts Management

- Store all prompts in `prompts/` directory
- Use Jinja2 templates for variables
- Add metadata files for versioning
- Test prompts with various inputs

## Common Tasks

### Adding a New API Endpoint

1. Create schema in `app/schemas/`
2. Add endpoint in `app/api/v1/`
3. Implement service logic in `app/services/`
4. Add repository methods if needed
5. Write tests
6. Update API documentation

### Adding a New Database Model

1. Create model in `app/models/`
2. Create migration: `poetry run alembic revision --autogenerate -m "description"`
3. Review and edit migration
4. Apply migration: `poetry run alembic upgrade head`
5. Add repository methods
6. Write tests

### Adding a New Prompt

1. Create prompt file in `prompts/` subdirectory
2. Add metadata file if needed
3. Update prompt manager if necessary
4. Test prompt rendering
5. Document prompt variables

## Questions or Issues?

- Open an issue for bugs or feature requests
- Use discussions for questions
- Tag maintainers for urgent issues

## License

By contributing, you agree that your contributions will be licensed under the same license as the
project.

Thank you for contributing! 🎉
