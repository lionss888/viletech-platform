"""Unit tests for Text Chunker"""

import pytest

from app.integrations.knowledge.chunkers.text_chunker import TextChunker


@pytest.mark.unit
class TestTextChunker:
    """Tests for the Text Chunker"""
    
    @pytest.fixture
    def chunker(self):
        """Create a text chunker with default settings."""
        return TextChunker(chunk_size=1000, chunk_overlap=200)
    
    @pytest.fixture
    def small_chunker(self):
        """Create a text chunker with small chunk size for testing."""
        return TextChunker(chunk_size=100, chunk_overlap=20)
    
    # ============================================
    # Test split_text method
    # ============================================
    
    def test_split_text_empty(self, chunker):
        """Test splitting empty text."""
        result = chunker.split_text("")
        assert result == []
    
    def test_split_text_none(self, chunker):
        """Test splitting None text."""
        result = chunker.split_text(None)
        assert result == []
    
    def test_split_text_short_text(self, chunker):
        """Test splitting text shorter than chunk size."""
        text = "This is a short paragraph."
        result = chunker.split_text(text)
        
        assert len(result) == 1
        assert result[0]["content"] == text
        assert result[0]["metadata"]["chunk_index"] == 0
    
    def test_split_text_with_paragraphs(self, small_chunker):
        """Test splitting text with multiple paragraphs."""
        text = """First paragraph with some content.

Second paragraph with more content.

Third paragraph to make sure we have multiple chunks."""
        
        result = small_chunker.split_text(text)
        
        assert len(result) >= 1
        # Each chunk should have content
        for chunk in result:
            assert len(chunk["content"]) > 0
            assert "chunk_index" in chunk["metadata"]
    
    def test_split_text_with_metadata(self, chunker):
        """Test that metadata is included in chunks."""
        text = "Sample text for testing."
        metadata = {"source": "test", "category": "unit_test"}
        
        result = chunker.split_text(text, metadata=metadata)
        
        assert len(result) == 1
        assert result[0]["metadata"]["source"] == "test"
        assert result[0]["metadata"]["category"] == "unit_test"
        assert result[0]["metadata"]["chunk_index"] == 0
        assert result[0]["metadata"]["chunk_size"] > 0
    
    def test_split_text_long_paragraph(self, small_chunker):
        """Test splitting a very long paragraph."""
        # Create a long paragraph that exceeds chunk size
        text = "This is a sentence. " * 50  # ~1000 characters
        
        result = small_chunker.split_text(text)
        
        # Should be split into multiple chunks
        assert len(result) > 1
        # Chunks should be sequential
        for i, chunk in enumerate(result):
            assert chunk["metadata"]["chunk_index"] == i
    
    def test_split_text_preserves_content(self, chunker):
        """Test that important content is preserved after chunking."""
        text = "Important keyword: compliance. This text contains key information."
        
        result = chunker.split_text(text)
        
        # The content should be in the chunks
        all_content = " ".join([chunk["content"] for chunk in result])
        assert "compliance" in all_content
        assert "important" in all_content.lower()
    
    # ============================================
    # Test _normalize_text method
    # ============================================
    
    def test_normalize_text_removes_extra_whitespace(self, chunker):
        """Test that extra whitespace is normalized."""
        text = "Text   with    multiple     spaces"
        result = chunker._normalize_text(text)
        
        assert "  " not in result
        assert result == "Text with multiple spaces"
    
    def test_normalize_text_normalizes_newlines(self, chunker):
        """Test that newlines are normalized."""
        text = "First line\n\n\n\nSecond line"
        result = chunker._normalize_text(text)
        
        assert "\n\n\n\n" not in result
        assert "\n\n" in result
    
    def test_normalize_text_strips(self, chunker):
        """Test that text is stripped."""
        text = "  \n  Content here  \n  "
        result = chunker._normalize_text(text)
        
        assert not result.startswith(" ")
        assert not result.endswith(" ")
    
    # ============================================
    # Test _split_into_sentences method
    # ============================================
    
    def test_split_into_sentences_basic(self, chunker):
        """Test basic sentence splitting."""
        text = "First sentence. Second sentence. Third sentence."
        result = chunker._split_into_sentences(text)
        
        assert len(result) == 3
        assert "First sentence." in result
    
    def test_split_into_sentences_with_questions(self, chunker):
        """Test sentence splitting with questions."""
        text = "Is this a question? Yes it is!"
        result = chunker._split_into_sentences(text)
        
        assert len(result) == 2
    
    def test_split_into_sentences_empty(self, chunker):
        """Test sentence splitting with empty text."""
        result = chunker._split_into_sentences("")
        assert result == []
    
    # ============================================
    # Test _create_chunk method
    # ============================================
    
    def test_create_chunk_basic(self, chunker):
        """Test basic chunk creation."""
        content = "Sample content"
        result = chunker._create_chunk(content, 0)
        
        assert result["content"] == "Sample content"
        assert result["metadata"]["chunk_index"] == 0
        assert result["metadata"]["chunk_size"] == len("Sample content")
    
    def test_create_chunk_with_metadata(self, chunker):
        """Test chunk creation with additional metadata."""
        content = "Sample content"
        metadata = {"source": "test_file.txt"}
        result = chunker._create_chunk(content, 5, metadata)
        
        assert result["metadata"]["chunk_index"] == 5
        assert result["metadata"]["source"] == "test_file.txt"
    
    def test_create_chunk_strips_content(self, chunker):
        """Test that chunk content is stripped."""
        content = "  Content with spaces  "
        result = chunker._create_chunk(content, 0)
        
        assert result["content"] == "Content with spaces"
    
    # ============================================
    # Test split_by_pages method
    # ============================================
    
    def test_split_by_pages_basic(self, chunker):
        """Test basic page splitting."""
        text = """[Страница 1]
Content of page 1.

[Страница 2]
Content of page 2."""
        
        result = chunker.split_by_pages(text)
        
        assert len(result) == 2
        assert result[0]["metadata"]["page_number"] == 1
        assert result[1]["metadata"]["page_number"] == 2
    
    def test_split_by_pages_with_metadata(self, chunker):
        """Test page splitting with additional metadata."""
        text = "[Страница 1]\nPage content"
        metadata = {"source": "document.pdf"}
        
        result = chunker.split_by_pages(text, metadata=metadata)
        
        assert result[0]["metadata"]["source"] == "document.pdf"
        assert result[0]["metadata"]["page_number"] == 1
    
    def test_split_by_pages_empty(self, chunker):
        """Test page splitting with empty text."""
        result = chunker.split_by_pages("")
        assert result == []
    
    def test_split_by_pages_no_separator(self, chunker):
        """Test page splitting when separator not found."""
        text = "Just plain text without page markers."
        
        result = chunker.split_by_pages(text)
        
        assert len(result) == 1
    
    # ============================================
    # Test overlap functionality
    # ============================================
    
    def test_get_overlap_short_chunk(self, chunker):
        """Test overlap when previous chunk is shorter than overlap size."""
        previous = "Short text"
        next_content = "Next content"
        
        result = chunker._get_overlap(previous, next_content)
        
        assert "Short text" in result
        assert "Next content" in result
    
    def test_get_overlap_long_chunk(self, small_chunker):
        """Test overlap when previous chunk is longer than overlap size."""
        previous = "First sentence. Second sentence. Third sentence ends here."
        next_content = "New content"
        
        result = small_chunker._get_overlap(previous, next_content)
        
        # Should contain overlap from previous and new content
        assert "New content" in result
    
    # ============================================
    # Test chunk_size and chunk_overlap configuration
    # ============================================
    
    def test_custom_chunk_size(self):
        """Test chunker with custom chunk size."""
        chunker = TextChunker(chunk_size=50, chunk_overlap=10)
        text = "A" * 100  # 100 characters
        
        result = chunker.split_text(text)
        
        assert len(result) >= 2
    
    def test_custom_separator(self):
        """Test chunker with custom separator."""
        chunker = TextChunker(chunk_size=1000, separator="---")
        text = "Part one---Part two---Part three"
        
        result = chunker.split_text(text)
        
        # Should recognize custom separator
        assert len(result) >= 1
