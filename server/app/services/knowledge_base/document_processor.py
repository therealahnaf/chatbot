"""Document processing service for parsing and chunking documents."""

import io
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import tiktoken

# File parsing libraries
try:
    import fitz  # PyMuPDF
except ImportError:
    try:
        import pymupdf as fitz  
    except ImportError:
        fitz = None

try:
    from docx import Document as DocxDocument
except ImportError:
    DocxDocument = None

try:
    import markdown
except ImportError:
    markdown = None


class DocumentChunk:
    """Represents a chunk of document text."""

    def __init__(
        self, text: str, chunk_index: int, metadata: Optional[Dict[str, Any]] = None
    ):
        self.text = text
        self.chunk_index = chunk_index
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert chunk to dictionary."""
        return {
            "text": self.text,
            "chunk_index": self.chunk_index,
            "metadata": self.metadata,
        }


class DocumentProcessor:
    """Process documents: parse files and chunk text."""

    def __init__(
        self,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        encoding_name: str = "cl100k_base",
        chunking_strategy: str = "section",
    ):
        """
        Initialize document processor.

        Args:
            chunk_size: Target size of each chunk in tokens (for token-based chunking)
            chunk_overlap: Number of overlapping tokens between chunks (for token-based chunking)
            encoding_name: Tiktoken encoding name for token counting
            chunking_strategy: Strategy to use - "section" (by # headings), "token" (by token count), or "numbered" (by 1), 2), etc.)
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.encoding = tiktoken.get_encoding(encoding_name)
        self.chunking_strategy = chunking_strategy

    async def process_file(
        self,
        file_content: bytes,
        filename: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[DocumentChunk]:
        """
        Process a file: parse and chunk it.

        Args:
            file_content: Raw file bytes
            filename: Name of the file
            metadata: Additional metadata to attach to chunks

        Returns:
            List of document chunks

        Raises:
            ValueError: If file type is not supported
        """
        # Determine file type from extension
        file_ext = Path(filename).suffix.lower()

        # Parse file based on type
        if file_ext == ".pdf":
            text = self._parse_pdf(file_content)
        elif file_ext == ".txt":
            text = self._parse_txt(file_content)
        elif file_ext in [".docx", ".doc"]:
            text = self._parse_docx(file_content)
        elif file_ext in [".md", ".markdown"]:
            text = self._parse_markdown(file_content)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")

        # Clean and normalize text
        text = self._clean_text(text)

        # Chunk the text based on strategy
        if self.chunking_strategy == "section":
            chunks = self._chunk_by_section(text, metadata or {})
        else:  # token-based chunking
            chunks = self._chunk_text(text, metadata or {})

        return chunks

    def _parse_pdf(self, file_content: bytes) -> str:
        """
        Parse PDF file and extract text using PyMuPDF dict format.

        This preserves document structure by identifying headings based on font size
        and formatting them as markdown-style headings (# Heading).
        """
        if fitz is None:
            raise ImportError(
                "PyMuPDF is required for PDF parsing. Install with: pip install pymupdf"
            )

        # Open PDF from bytes
        pdf_document = fitz.open(stream=file_content, filetype="pdf")

        all_blocks = []

        try:
            # Collect ALL blocks from ALL pages first
            # This prevents headings from being split across page boundaries
            for page_num in range(pdf_document.page_count):
                page = pdf_document[page_num]

                # Extract structured text as dictionary
                page_dict = page.get_text("dict")

                # Collect blocks from this page
                blocks = page_dict.get("blocks", [])
                all_blocks.extend(blocks)

        finally:
            # Always close the document to free resources
            pdf_document.close()

        # Process all blocks together to properly merge headings across pages
        return self._process_pdf_blocks(all_blocks)

    def _process_pdf_blocks(self, blocks: list) -> str:
        """
        Process PDF blocks from dict format and identify headings.

        Strategy:
        1. Extract text blocks with metadata (font size, style)
        2. Group consecutive lines with similar properties (same heading/paragraph)
        3. Identify headings based on font size
        4. Return text with headings marked
        """
        text_blocks = []
        font_sizes = []

        # First pass: extract all text blocks with metadata
        for block in blocks:
            if block.get("type") == 0:  # Text block
                for line in block.get("lines", []):
                    line_text = ""
                    max_font_size = 0
                    is_bold = False

                    for span in line.get("spans", []):
                        text = span.get("text", "")
                        font_size = span.get("size", 0)
                        font_flags = span.get("flags", 0)

                        max_font_size = max(max_font_size, font_size)
                        line_text += text

                        # Check if bold (flag 16 = bold)
                        if font_flags & 16:
                            is_bold = True

                        if font_size > 0:
                            font_sizes.append(font_size)

                    if line_text.strip():
                        text_blocks.append({
                            "text": line_text.strip(),
                            "font_size": max_font_size,
                            "is_bold": is_bold
                        })

        # Calculate average font size for heading detection
        if font_sizes:
            avg_font_size = sum(font_sizes) / len(font_sizes)
            heading_threshold = avg_font_size * 1.2
        else:
            heading_threshold = 0

        # Group consecutive blocks with similar properties
        grouped_blocks = []
        current_group = None

        for block in text_blocks:
            is_heading = block["font_size"] >= heading_threshold and heading_threshold > 0

            if current_group is None:
                current_group = {
                    "text": block["text"],
                    "is_heading": is_heading,
                    "font_size": block["font_size"]
                }
            else:
                # Check if this block should join the current group
                # Join if: same type (both heading or both not) and similar font size
                size_similar = abs(current_group["font_size"] - block["font_size"]) < 1.0
                same_type = current_group["is_heading"] == is_heading

                if same_type and size_similar:
                    # Join with space
                    current_group["text"] += " " + block["text"]
                else:
                    # Save current group and start new one
                    grouped_blocks.append(current_group)
                    current_group = {
                        "text": block["text"],
                        "is_heading": is_heading,
                        "font_size": block["font_size"]
                    }

        # Don't forget the last group
        if current_group:
            grouped_blocks.append(current_group)

        # Format the output with headings marked
        lines = []
        for group in grouped_blocks:
            text = group["text"]
            if group["is_heading"]:
                lines.append(f"# {text}")
            else:
                lines.append(text)

        return "\n".join(lines)

    def _parse_txt(self, file_content: bytes) -> str:
        """Parse plain text file."""
        # Try different encodings
        for encoding in ["utf-8", "latin-1", "cp1252"]:
            try:
                return file_content.decode(encoding)
            except UnicodeDecodeError:
                continue

        # Fallback: decode with errors ignored
        return file_content.decode("utf-8", errors="ignore")

    def _parse_docx(self, file_content: bytes) -> str:
        """Parse DOCX file and extract text."""
        if DocxDocument is None:
            raise ImportError(
                "python-docx is required for DOCX parsing. Install with: pip install python-docx"
            )

        docx_file = io.BytesIO(file_content)
        doc = DocxDocument(docx_file)

        text_parts = []
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text_parts.append(paragraph.text)

        return "\n\n".join(text_parts)

    def _parse_markdown(self, file_content: bytes) -> str:
        """Parse Markdown file."""
        text = self._parse_txt(file_content)

        # Optionally convert markdown to plain text
        # For now, keep markdown formatting as it provides structure
        return text

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text, removing only obvious PDF artifacts."""

        # Remove standalone page numbers only if they appear alone on a line
        # This prevents removing "Page 1" from actual content like "See Page 1 for details"
        text = re.sub(r'^\s*Page\s+\d+\s*$', '', text, flags=re.MULTILINE | re.IGNORECASE)
        text = re.sub(r'^\s*\d+\s+of\s+\d+\s*$', '', text, flags=re.MULTILINE)

        # Normalize whitespace within lines (but preserve line breaks for markdown)
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            # Clean whitespace within each line (replace multiple spaces with single space)
            cleaned_line = re.sub(r'\s+', ' ', line).strip()
            if cleaned_line:  # Only keep non-empty lines
                cleaned_lines.append(cleaned_line)

        text = '\n'.join(cleaned_lines)

        # Remove excessive blank lines (keep double newlines for paragraph breaks)
        text = re.sub(r'\n{3,}', '\n\n', text)

        # Strip leading/trailing whitespace
        text = text.strip()

        return text

    def _chunk_text(self, text: str, metadata: Dict[str, Any]) -> List[DocumentChunk]:
        """
        Chunk text into overlapping segments based on token count.

        Args:
            text: Text to chunk
            metadata: Metadata to attach to each chunk

        Returns:
            List of document chunks
        """
        # Encode text to tokens
        tokens = self.encoding.encode(text)

        chunks = []
        chunk_index = 0
        start_idx = 0

        while start_idx < len(tokens):
            # Calculate end index for this chunk
            end_idx = start_idx + self.chunk_size

            # Extract chunk tokens
            chunk_tokens = tokens[start_idx:end_idx]

            # Decode tokens back to text
            chunk_text = self.encoding.decode(chunk_tokens)

            # Create chunk with metadata
            chunk = DocumentChunk(
                text=chunk_text,
                chunk_index=chunk_index,
                metadata={
                    **metadata,
                    "start_token": start_idx,
                    "end_token": end_idx,
                    "token_count": len(chunk_tokens),
                },
            )

            chunks.append(chunk)

            # Move to next chunk with overlap
            start_idx += self.chunk_size - self.chunk_overlap
            chunk_index += 1

        return chunks

    def _chunk_by_section(self, text: str, metadata: Dict[str, Any]) -> List[DocumentChunk]:
        """
        Chunk text by sections marked with # heading markers.

        Each section starting with # becomes a separate chunk.
        If no sections are found, falls back to token-based chunking.

        Args:
            text: Text to chunk (should have headings marked with #)
            metadata: Metadata to attach to each chunk

        Returns:
            List of document chunks
        """
        lines = text.split('\n')
        sections = []
        current_section = []
        current_heading = None

        for line in lines:
            # Check if this line is a heading (starts with #)
            if line.strip().startswith('#'):
                # Save previous section if it exists
                if current_section:
                    section_text = '\n'.join(current_section).strip()
                    if section_text:
                        sections.append({
                            'heading': current_heading,
                            'text': section_text
                        })

                # Start new section with this heading
                current_heading = line.strip()
                current_section = [line]
            else:
                # Continue current section
                current_section.append(line)

        # Add the last section
        if current_section:
            section_text = '\n'.join(current_section).strip()
            if section_text:
                sections.append({
                    'heading': current_heading,
                    'text': section_text
                })

        # If no sections found, fall back to token-based chunking
        if not sections or all(s['heading'] is None for s in sections):
            return self._chunk_text(text, metadata)

        # Create chunks from sections
        chunks = []
        for idx, section in enumerate(sections):
            # Count tokens for this section
            token_count = self.count_tokens(section['text'])

            chunk = DocumentChunk(
                text=section['text'],
                chunk_index=idx,
                metadata={
                    **metadata,
                    "heading": section['heading'],
                    "token_count": token_count,
                    "chunking_strategy": "section",
                },
            )
            chunks.append(chunk)

        return chunks

    def count_tokens(self, text: str) -> int:
        """Count tokens in text."""
        return len(self.encoding.encode(text))

    def estimate_chunks(self, text: str) -> int:
        """Estimate number of chunks for given text."""
        token_count = self.count_tokens(text)
        if token_count <= self.chunk_size:
            return 1

        # Calculate chunks with overlap
        effective_chunk_size = self.chunk_size - self.chunk_overlap
        return (
            token_count - self.chunk_overlap + effective_chunk_size - 1
        ) // effective_chunk_size
