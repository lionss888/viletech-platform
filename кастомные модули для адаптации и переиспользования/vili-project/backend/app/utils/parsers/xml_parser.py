"""XML document parser"""

from typing import Dict, Any
import xml.etree.ElementTree as ET

from app.core.exceptions import DocumentProcessingException


class XMLParser:
    """Парсер XML документов"""
    
    def __init__(self):
        self.content = None
        self.metadata = {}
    
    def parse(self, file_content: bytes) -> Dict[str, Any]:
        """
        Парсинг XML файла
        
        Args:
            file_content: Содержимое XML файла
        
        Returns:
            Dict: Распарсенные данные
        """
        try:
            # Декодируем content
            xml_string = file_content.decode('utf-8')
            
            # Парсим XML
            root = ET.fromstring(xml_string)
            
            # Извлекаем текст из всех элементов
            text_parts = []
            for elem in root.iter():
                if elem.text and elem.text.strip():
                    text_parts.append(elem.text.strip())
            
            full_text = "\n".join(text_parts)
            
            # Преобразуем XML в словарь
            parsed_data = self._element_to_dict(root)
            
            self.content = full_text
            self.metadata = {
                'root_tag': root.tag,
                'elements_count': len(list(root.iter())),
                'format': 'XML'
            }
            
            return {
                'text': full_text,
                'metadata': self.metadata,
                'parsed_data': parsed_data
            }
        except ET.ParseError as e:
            raise DocumentProcessingException(
                f"Invalid XML format: {str(e)}",
                details={"error": str(e)}
            )
        except Exception as e:
            raise DocumentProcessingException(
                f"Failed to parse XML: {str(e)}",
                details={"error": str(e)}
            )
    
    def _element_to_dict(self, element: ET.Element) -> Dict[str, Any]:
        """Преобразование XML элемента в словарь"""
        result = {}
        
        # Добавляем атрибуты
        if element.attrib:
            result['@attributes'] = element.attrib
        
        # Добавляем текст
        if element.text and element.text.strip():
            result['@text'] = element.text.strip()
        
        # Добавляем дочерние элементы
        for child in element:
            child_data = self._element_to_dict(child)
            
            if child.tag in result:
                # Если элемент уже есть, создаем список
                if not isinstance(result[child.tag], list):
                    result[child.tag] = [result[child.tag]]
                result[child.tag].append(child_data)
            else:
                result[child.tag] = child_data
        
        return result if result else element.text
