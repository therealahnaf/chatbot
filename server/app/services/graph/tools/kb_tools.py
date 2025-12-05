"""
Knowledge Base search tools - Standard LangChain tool pattern
"""
from typing import Optional
from uuid import UUID
import structlog

from langchain_core.tools import tool

logger = structlog.get_logger()


def create_kb_tools(kb_service, user_id: Optional[UUID] = None):
    """Factory function to create KB tools with injected services."""
    
    @tool
    async def search_knowledge_base(query: str) -> str:
        """Search the knowledge base for relevant information.
        
        Args:
            query: The search query to find relevant documents.
            
        Returns:
            Formatted search results or error message.
        """
        logger.info("Executing knowledge base search", query=query)
        
        if not kb_service:
            return "Error: Knowledge base service not available"
        
        if not query or len(query.strip()) < 3:
            return "Error: Please provide a search query with at least 3 characters"
        
        try:
            # Use KnowledgeBaseService.search method
            results = await kb_service.search(
                query=query,
                user_id=user_id,
                limit=5,
                score_threshold=0.3
            )

            if results:
                # Log detailed search results
                logger.info(
                    "Knowledge base search completed",
                    query=query,
                    num_results=len(results),
                    scores=[f"{r.score:.2f}" for r in results],
                    document_ids=[r.document_id for r in results]
                )

                # Log each result's content preview
                for i, result in enumerate(results, 1):
                    logger.info(
                        f"KB Result {i}",
                        score=f"{result.score:.2f}",
                        document_id=result.document_id,
                        chunk_index=result.chunk_index,
                        text_preview=result.text[:200] + "..." if len(result.text) > 200 else result.text
                    )

                # Format SearchResult objects
                formatted_results = []
                for i, result in enumerate(results, 1):
                    formatted_results.append(
                        f"Result {i} (Score: {result.score:.2f}):\n"
                        f"{result.text}\n"
                        f"Source: Document ID {result.document_id}"
                    )

                result_text = "\n\n".join(formatted_results)
                final_response = f"Found {len(results)} relevant documents:\n\n{result_text}"

                # Log the complete context being returned to LLM
                logger.info(
                    "KB tool returning context to LLM",
                    context_length=len(final_response),
                    context_preview=final_response[:500] + "..." if len(final_response) > 500 else final_response
                )

                return final_response
            else:
                logger.info("No KB results found", query=query)
                return "No relevant information found in knowledge base."
        
        except Exception as e:
            logger.error("KB search failed", error=str(e), exc_info=True)
            return f"Error: Knowledge base search failed: {str(e)}"
    
    return [search_knowledge_base]

