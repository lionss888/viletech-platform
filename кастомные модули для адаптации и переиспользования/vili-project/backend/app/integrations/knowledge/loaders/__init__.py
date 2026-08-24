"""Knowledge loaders"""

from app.integrations.knowledge.loaders.base_loader import BaseLoader
from app.integrations.knowledge.loaders.url_loader import URLLoader
from app.integrations.knowledge.loaders.file_loader import FileLoader
from app.integrations.knowledge.loaders.csv_loader import CSVLoader
from app.integrations.knowledge.loaders.txt_loader import TXTLoader
from app.integrations.knowledge.loaders.pdf_loader import PDFLoader

__all__ = ["BaseLoader", "URLLoader", "FileLoader", "CSVLoader", "TXTLoader", "PDFLoader"]
