#!/usr/bin/env python
"""Verify external service integrations are properly configured."""

import sys
import asyncio
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))


async def verify_openai_client():
    """Verify OpenAI client can be instantiated."""
    try:
        from app.integrations.openai_client import OpenAIClient, get_openai_client

        # Test instantiation
        client = OpenAIClient()
        print("✓ OpenAI client instantiated successfully")

        # Test global instance
        global_client = get_openai_client()
        print("✓ OpenAI global client retrieved successfully")

        # Verify attributes
        assert hasattr(client, "chat_completion"), "Missing chat_completion method"
        assert hasattr(client, "generate_embedding"), "Missing generate_embedding method"
        assert hasattr(
            client, "generate_embeddings_batch"
        ), "Missing generate_embeddings_batch method"
        assert hasattr(client, "health_check"), "Missing health_check method"
        print("✓ OpenAI client has all required methods")

        return True
    except Exception as e:
        print(f"✗ OpenAI client verification failed: {e}")
        return False


async def verify_langfuse_client():
    """Verify Langfuse client can be instantiated."""
    try:
        from app.integrations.langfuse_client import LangfuseClient, get_langfuse_client

        # Test instantiation
        client = LangfuseClient()
        print("✓ Langfuse client instantiated successfully")

        # Test global instance
        global_client = get_langfuse_client()
        print("✓ Langfuse global client retrieved successfully")

        # Verify attributes
        assert hasattr(client, "create_trace"), "Missing create_trace method"
        assert hasattr(client, "create_span"), "Missing create_span method"
        assert hasattr(client, "create_generation"), "Missing create_generation method"
        assert hasattr(client, "log_event"), "Missing log_event method"
        assert hasattr(client, "trace_context"), "Missing trace_context method"
        assert hasattr(client, "health_check"), "Missing health_check method"
        print("✓ Langfuse client has all required methods")

        return True
    except Exception as e:
        print(f"✗ Langfuse client verification failed: {e}")
        return False


async def main():
    """Run all verification checks."""
    print("=" * 60)
    print("Verifying External Service Integrations")
    print("=" * 60)
    print()

    results = []

    print("1. Verifying OpenAI Client...")
    results.append(await verify_openai_client())
    print()

    print("2. Verifying Langfuse Client...")
    results.append(await verify_langfuse_client())
    print()

    print("=" * 60)
    if all(results):
        print("✓ All integrations verified successfully!")
        print("=" * 60)
        return 0
    else:
        print("✗ Some integrations failed verification")
        print("=" * 60)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
