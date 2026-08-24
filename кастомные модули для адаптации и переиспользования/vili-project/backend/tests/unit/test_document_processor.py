"""Unit tests for Document Processor Service"""

import pytest
from unittest.mock import MagicMock, patch

from app.services.document_processor import DocumentProcessor
from app.core.exceptions import DocumentProcessingException


@pytest.mark.unit
class TestDocumentProcessor:
    """Tests for the Document Processor Service"""
    
    @pytest.fixture
    def processor(self):
        """Create a fresh document processor for each test."""
        return DocumentProcessor()
    
    # ============================================
    # Test format detection
    # ============================================
    
    def test_detect_format_pdf(self, processor):
        """Test PDF format detection by extension."""
        result = processor.detect_format("document.pdf", b"PDF content")
        assert result == "pdf"
    
    def test_detect_format_xml(self, processor):
        """Test XML format detection by extension."""
        result = processor.detect_format("data.xml", b"<?xml version='1.0'?>")
        assert result == "xml"
    
    def test_detect_format_json(self, processor):
        """Test JSON format detection by extension."""
        result = processor.detect_format("data.json", b'{"key": "value"}')
        assert result == "json"
    
    def test_detect_format_csv(self, processor):
        """Test CSV format detection by extension."""
        result = processor.detect_format("data.csv", b"a,b,c\n1,2,3")
        assert result == "csv"
    
    def test_detect_format_txt(self, processor):
        """Test TXT format detection by extension."""
        result = processor.detect_format("document.txt", b"Plain text content")
        assert result == "txt"
    
    def test_detect_format_swift_by_content(self, processor):
        """Test SWIFT format detection by content."""
        swift_content = b"{1:F01BANKUS33AXXX0000000000}{2:I103 MT message"
        result = processor.detect_format("message", swift_content)
        assert result == "swift"
    
    def test_detect_format_unknown_defaults_to_txt(self, processor):
        """Test unknown format defaults to txt."""
        result = processor.detect_format("unknown.xyz", b"Some content")
        assert result == "txt"
    
    # ============================================
    # Test text processing
    # ============================================
    
    def test_process_text_utf8(self, processor):
        """Test processing UTF-8 text file."""
        content = "Hello, World! Привет, мир!".encode('utf-8')
        result = processor.process_document(content, "test.txt", "txt")
        
        assert "text" in result
        assert "Hello, World!" in result["text"]
        assert "Привет, мир!" in result["text"]
        assert result["metadata"]["format"] == "TXT"
        assert result["metadata"]["encoding"] == "utf-8"
    
    def test_process_text_utf8_bom(self, processor):
        """Test processing UTF-8 with BOM text file."""
        content = "Hello, World!".encode('utf-8-sig')
        result = processor.process_document(content, "test.txt", "txt")
        
        assert "Hello, World!" in result["text"]
    
    def test_process_text_latin1(self, processor):
        """Test processing Latin-1 text file."""
        content = "Héllo, Wörld!".encode('latin-1')
        result = processor.process_document(content, "test.txt", "txt")
        
        assert "text" in result
        assert "Héllo" in result["text"]
    
    def test_process_text_counts_lines(self, processor):
        """Test that text processing counts lines correctly."""
        content = "Line 1\nLine 2\nLine 3".encode('utf-8')
        result = processor.process_document(content, "test.txt", "txt")
        
        assert result["parsed_data"]["lines"] == 3
    
    # ============================================
    # Test document processing with parsers
    # ============================================
    
    def test_process_document_with_format_override(self, processor):
        """Test processing with explicit format override."""
        content = b"Some content"
        result = processor.process_document(content, "file.xyz", "txt")
        
        assert "text" in result
    
    def test_process_document_json(self, processor):
        """Test JSON document processing."""
        content = b'{"name": "Test", "value": 123}'
        
        with patch.object(processor.parsers['json'], 'parse') as mock_parse:
            mock_parse.return_value = {
                "data": {"name": "Test", "value": 123},
                "metadata": {"format": "JSON"}
            }
            
            result = processor.process_document(content, "data.json", "json")
            mock_parse.assert_called_once_with(content)
    
    def test_process_document_pdf(self, processor):
        """Test PDF document processing."""
        content = b"%PDF-1.4 fake pdf content"
        
        with patch.object(processor.parsers['pdf'], 'parse') as mock_parse:
            mock_parse.return_value = {
                "text": "Extracted PDF text",
                "metadata": {"format": "PDF", "pages": 1}
            }
            
            result = processor.process_document(content, "doc.pdf", "pdf")
            mock_parse.assert_called_once_with(content)
    
    def test_process_document_xml(self, processor):
        """Test XML document processing."""
        content = b"<?xml version='1.0'?><root><item>test</item></root>"
        
        with patch.object(processor.parsers['xml'], 'parse') as mock_parse:
            mock_parse.return_value = {
                "data": {"root": {"item": "test"}},
                "metadata": {"format": "XML"}
            }
            
            result = processor.process_document(content, "data.xml", "xml")
            mock_parse.assert_called_once_with(content)
    
    def test_process_document_swift(self, processor):
        """Test SWIFT message processing."""
        content = b"{1:F01BANKUS33AXXX0000000000}{2:I103 content"
        
        with patch.object(processor.parsers['swift'], 'parse') as mock_parse:
            mock_parse.return_value = {
                "fields": {":20:": "REF123"},
                "metadata": {"format": "SWIFT", "message_type": "MT103"}
            }
            
            result = processor.process_document(content, "message.txt", "swift")
            mock_parse.assert_called_once_with(content)
    
    # ============================================
    # Test error handling
    # ============================================
    
    def test_process_document_parser_error(self, processor):
        """Test error handling when parser fails."""
        content = b"Invalid content"
        
        with patch.object(processor.parsers['json'], 'parse') as mock_parse:
            mock_parse.side_effect = Exception("Parse error")
            
            with pytest.raises(DocumentProcessingException) as exc_info:
                processor.process_document(content, "data.json", "json")
            
            assert "Failed to process document" in str(exc_info.value)
            assert exc_info.value.details["file_name"] == "data.json"
    
    # ============================================
    # Test extract_key_fields
    # ============================================
    
    def test_extract_key_fields_swift(self, processor):
        """Test extracting key fields from SWIFT message."""
        parsed_data = {
            "fields": {
                ":50:": "SENDER BANK",
                ":59:": "BENEFICIARY BANK",
                ":32A:": "230115USD10000,00",
                ":20:": "REF123456",
                ":30:": "230115"
            }
        }
        
        result = processor.extract_key_fields(parsed_data, "SWIFT")
        
        assert result["sender"] == "SENDER BANK"
        assert result["receiver"] == "BENEFICIARY BANK"
        assert result["amount"] == "230115USD10000,00"
        assert result["reference"] == "REF123456"
    
    def test_extract_key_fields_non_swift(self, processor):
        """Test extracting key fields from non-SWIFT document."""
        parsed_data = {"some": "data"}
        result = processor.extract_key_fields(parsed_data, "JSON")
        
        assert result == {}
    
    def test_extract_key_fields_swift_missing_fields(self, processor):
        """Test extracting key fields when some fields are missing."""
        parsed_data = {
            "fields": {
                ":20:": "REF123456"
            }
        }
        
        result = processor.extract_key_fields(parsed_data, "SWIFT")
        
        assert result["reference"] == "REF123456"
        assert result["sender"] == ""
        assert result["receiver"] == ""
