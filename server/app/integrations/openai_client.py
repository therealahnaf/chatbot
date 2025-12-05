"""OpenAI API client wrapper with error handling and retry logic."""

import asyncio
import logging
from typing import Any, Dict, List, Optional

from openai import AsyncOpenAI, OpenAIError, RateLimitError, APITimeoutError, APIConnectionError
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

from app.core.config import settings
from app.core.exceptions import ExternalServiceError

logger = logging.getLogger(__name__)


class OpenAIClient:
    """
    Wrapper for OpenAI API with error handling and retry logic.

    Provides methods for:
    - Chat completions (LLM responses)
    - Embeddings generation
    - Automatic retry on transient failures
    - Comprehensive error handling
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        embedding_model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ):
        """
        Initialize OpenAI client.

        Args:
            api_key: OpenAI API key (defaults to settings)
            model: Default chat model (defaults to settings)
            embedding_model: Default embedding model (defaults to settings)
            max_tokens: Default max tokens (defaults to settings)
            temperature: Default temperature (defaults to settings)
        """
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self.embedding_model = embedding_model or settings.OPENAI_EMBEDDING_MODEL
        self.max_tokens = max_tokens or settings.OPENAI_MAX_TOKENS
        self.temperature = temperature or settings.OPENAI_TEMPERATURE

        self.client = AsyncOpenAI(api_key=self.api_key)

    @retry(
        retry=retry_if_exception_type((RateLimitError, APITimeoutError, APIConnectionError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """
        Generate chat completion using OpenAI API.

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model to use (defaults to instance default)
            temperature: Sampling temperature (defaults to instance default)
            max_tokens: Maximum tokens to generate (defaults to instance default)
            stream: Whether to stream the response
            **kwargs: Additional parameters for OpenAI API

        Returns:
            Dict containing response data with keys:
                - content: The generated text
                - model: Model used
                - usage: Token usage statistics
                - finish_reason: Reason for completion

        Raises:
            ExternalServiceError: If OpenAI API call fails
        """
        try:
            response = await self.client.chat.completions.create(
                model=model or self.model,
                messages=messages,
                temperature=temperature if temperature is not None else self.temperature,
                max_tokens=max_tokens or self.max_tokens,
                stream=stream,
                **kwargs,
            )

            if stream:
                return {"stream": response}

            # Extract response data
            choice = response.choices[0]
            return {
                "content": choice.message.content,
                "model": response.model,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                },
                "finish_reason": choice.finish_reason,
            }

        except RateLimitError as e:
            logger.error(f"OpenAI rate limit exceeded: {e}")
            raise ExternalServiceError(f"Rate limit exceeded: {e}") from e

        except APITimeoutError as e:
            logger.error(f"OpenAI API timeout: {e}")
            raise ExternalServiceError(f"API timeout: {e}") from e

        except APIConnectionError as e:
            logger.error(f"OpenAI API connection error: {e}")
            raise ExternalServiceError(f"Connection error: {e}") from e

        except OpenAIError as e:
            logger.error(f"OpenAI API error: {e}")
            raise ExternalServiceError(f"OpenAI API error: {e}") from e

        except Exception as e:
            logger.error(f"Unexpected error in chat completion: {e}")
            raise ExternalServiceError(f"Unexpected error: {e}") from e

    @retry(
        retry=retry_if_exception_type((RateLimitError, APITimeoutError, APIConnectionError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    async def generate_embedding(
        self,
        text: str,
        model: Optional[str] = None,
        **kwargs: Any,
    ) -> List[float]:
        """
        Generate embedding for a single text.

        Args:
            text: Text to embed
            model: Embedding model to use (defaults to instance default)
            **kwargs: Additional parameters for OpenAI API

        Returns:
            List of floats representing the embedding vector

        Raises:
            ExternalServiceError: If OpenAI API call fails
        """
        try:
            response = await self.client.embeddings.create(
                model=model or self.embedding_model,
                input=text,
                **kwargs,
            )

            return response.data[0].embedding

        except RateLimitError as e:
            logger.error(f"OpenAI rate limit exceeded: {e}")
            raise ExternalServiceError(f"Rate limit exceeded: {e}") from e

        except APITimeoutError as e:
            logger.error(f"OpenAI API timeout: {e}")
            raise ExternalServiceError(f"API timeout: {e}") from e

        except APIConnectionError as e:
            logger.error(f"OpenAI API connection error: {e}")
            raise ExternalServiceError(f"Connection error: {e}") from e

        except OpenAIError as e:
            logger.error(f"OpenAI API error: {e}")
            raise ExternalServiceError(f"OpenAI API error: {e}") from e

        except Exception as e:
            logger.error(f"Unexpected error in embedding generation: {e}")
            raise ExternalServiceError(f"Unexpected error: {e}") from e

    @retry(
        retry=retry_if_exception_type((RateLimitError, APITimeoutError, APIConnectionError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    async def generate_embeddings_batch(
        self,
        texts: List[str],
        model: Optional[str] = None,
        batch_size: int = 100,
        **kwargs: Any,
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in batches.

        Args:
            texts: List of texts to embed
            model: Embedding model to use (defaults to instance default)
            batch_size: Number of texts to process per batch
            **kwargs: Additional parameters for OpenAI API

        Returns:
            List of embedding vectors (one per input text)

        Raises:
            ExternalServiceError: If OpenAI API call fails
        """
        if not texts:
            return []

        embeddings = []

        try:
            # Process in batches to avoid rate limits
            for i in range(0, len(texts), batch_size):
                batch = texts[i : i + batch_size]

                response = await self.client.embeddings.create(
                    model=model or self.embedding_model,
                    input=batch,
                    **kwargs,
                )

                # Extract embeddings in order
                batch_embeddings = [item.embedding for item in response.data]
                embeddings.extend(batch_embeddings)

                # Small delay between batches to avoid rate limits
                if i + batch_size < len(texts):
                    await asyncio.sleep(0.1)

            return embeddings

        except RateLimitError as e:
            logger.error(f"OpenAI rate limit exceeded: {e}")
            raise ExternalServiceError(f"Rate limit exceeded: {e}") from e

        except APITimeoutError as e:
            logger.error(f"OpenAI API timeout: {e}")
            raise ExternalServiceError(f"API timeout: {e}") from e

        except APIConnectionError as e:
            logger.error(f"OpenAI API connection error: {e}")
            raise ExternalServiceError(f"Connection error: {e}") from e

        except OpenAIError as e:
            logger.error(f"OpenAI API error: {e}")
            raise ExternalServiceError(f"OpenAI API error: {e}") from e

        except Exception as e:
            logger.error(f"Unexpected error in batch embedding generation: {e}")
            raise ExternalServiceError(f"Unexpected error: {e}") from e

    async def health_check(self) -> bool:
        """
        Check if OpenAI API is accessible.

        Returns:
            True if API is accessible, False otherwise
        """
        try:
            # Simple test with minimal tokens
            await self.chat_completion(
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1,
            )
            return True
        except Exception as e:
            logger.error(f"OpenAI health check failed: {e}")
            return False


# Global client instance
_openai_client: Optional[OpenAIClient] = None


def get_openai_client() -> OpenAIClient:
    """
    Get or create global OpenAI client instance.

    Returns:
        OpenAIClient instance
    """
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAIClient()
    return _openai_client
