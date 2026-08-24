"""Data collection and preparation for model training."""

import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from sqlalchemy.orm import Session

from app.db.models import Message
from app.db.crud import message_crud
from app.utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class TrainingExample:
    """A training example for fine-tuning."""
    instruction: str
    input_text: str
    output_text: str
    conversation_id: str
    created_at: datetime
    quality_score: float = 1.0


@dataclass
class TrainingDataset:
    """Training dataset for model fine-tuning."""
    examples: List[TrainingExample]
    metadata: Dict[str, Any]
    created_at: datetime


class DataCollector:
    """Collects and prepares training data from conversations."""
    
    def __init__(self):
        self.min_conversation_length = 4  # Minimum messages for training
        self.quality_threshold = 0.5  # Minimum quality score
    
    def collect_conversation_data(
        self, 
        db: Session, 
        convo_id: str
    ) -> List[TrainingExample]:
        """Collect training data from a conversation."""
        try:
            # Get all messages from conversation
            messages = message_crud.get_by_convo_id(db, convo_id, limit=1000)
            
            if len(messages) < self.min_conversation_length:
                logger.info(f"Conversation {convo_id} too short for training")
                return []
            
            # Group messages by user-assistant pairs
            training_examples = []
            user_messages = []
            assistant_messages = []
            
            for message in messages:
                if message.role == "user":
                    user_messages.append(message)
                elif message.role == "assistant":
                    assistant_messages.append(message)
            
            # Create training examples
            for i, user_msg in enumerate(user_messages):
                if i < len(assistant_messages):
                    assistant_msg = assistant_messages[i]
                    
                    # Calculate quality score based on message characteristics
                    quality_score = self._calculate_quality_score(user_msg, assistant_msg)
                    
                    if quality_score >= self.quality_threshold:
                        example = TrainingExample(
                            instruction=user_msg.content,
                            input_text="",  # Could be context from previous messages
                            output_text=assistant_msg.content,
                            conversation_id=convo_id,
                            created_at=user_msg.created_at,
                            quality_score=quality_score
                        )
                        training_examples.append(example)
            
            logger.info(f"Collected {len(training_examples)} training examples from {convo_id}")
            return training_examples
            
        except Exception as e:
            logger.error(f"Failed to collect data from {convo_id}: {str(e)}")
            return []
    
    def collect_all_conversations(
        self, 
        db: Session, 
        limit: int = 1000
    ) -> TrainingDataset:
        """Collect training data from all conversations."""
        try:
            # Get all conversation IDs
            # Note: This is a simplified approach - in production, you'd want pagination
            all_examples = []
            
            # Get unique conversation IDs
            conversations = db.query(Message.convo_id).distinct().limit(limit).all()
            
            for (convo_id,) in conversations:
                examples = self.collect_conversation_data(db, convo_id)
                all_examples.extend(examples)
            
            # Sort by quality score
            all_examples.sort(key=lambda x: x.quality_score, reverse=True)
            
            # Create dataset
            dataset = TrainingDataset(
                examples=all_examples,
                metadata={
                    "total_examples": len(all_examples),
                    "unique_conversations": len(conversations),
                    "avg_quality_score": sum(e.quality_score for e in all_examples) / len(all_examples) if all_examples else 0,
                    "collection_date": datetime.utcnow().isoformat()
                },
                created_at=datetime.utcnow()
            )
            
            logger.info(f"Collected {len(all_examples)} total training examples")
            return dataset
            
        except Exception as e:
            logger.error(f"Failed to collect all conversations: {str(e)}")
            return TrainingDataset(examples=[], metadata={}, created_at=datetime.utcnow())
    
    def prepare_fine_tuning_dataset(
        self, 
        dataset: TrainingDataset,
        format_type: str = "alpaca"
    ) -> Dict[str, Any]:
        """Prepare dataset in format suitable for fine-tuning."""
        try:
            if format_type == "alpaca":
                return self._prepare_alpaca_format(dataset)
            elif format_type == "chatml":
                return self._prepare_chatml_format(dataset)
            else:
                raise ValueError(f"Unsupported format: {format_type}")
                
        except Exception as e:
            logger.error(f"Failed to prepare dataset: {str(e)}")
            return {}
    
    def _prepare_alpaca_format(self, dataset: TrainingDataset) -> Dict[str, Any]:
        """Prepare dataset in Alpaca format."""
        alpaca_data = []
        
        for example in dataset.examples:
            alpaca_example = {
                "instruction": example.instruction,
                "input": example.input_text,
                "output": example.output_text
            }
            alpaca_data.append(alpaca_example)
        
        return {
            "format": "alpaca",
            "data": alpaca_data,
            "metadata": dataset.metadata
        }
    
    def _prepare_chatml_format(self, dataset: TrainingDataset) -> Dict[str, Any]:
        """Prepare dataset in ChatML format."""
        chatml_data = []
        
        for example in dataset.examples:
            chatml_example = {
                "messages": [
                    {"role": "user", "content": example.instruction},
                    {"role": "assistant", "content": example.output_text}
                ]
            }
            chatml_data.append(chatml_example)
        
        return {
            "format": "chatml",
            "data": chatml_data,
            "metadata": dataset.metadata
        }
    
    def _calculate_quality_score(
        self, 
        user_message: Message, 
        assistant_message: Message
    ) -> float:
        """Calculate quality score for a user-assistant message pair."""
        score = 1.0
        
        # Length factors
        user_len = len(user_message.content)
        assistant_len = len(assistant_message.content)
        
        # Penalize very short responses
        if assistant_len < 10:
            score *= 0.5
        elif assistant_len < 50:
            score *= 0.8
        
        # Penalize very long responses (might be rambling)
        if assistant_len > 2000:
            score *= 0.9
        
        # Reward balanced conversation
        if 20 <= user_len <= 500 and 50 <= assistant_len <= 1000:
            score *= 1.1
        
        # Check for common low-quality patterns
        assistant_content = assistant_message.content.lower()
        
        # Penalize generic responses
        generic_responses = [
            "i don't know",
            "i can't help",
            "sorry, i can't",
            "i'm not sure"
        ]
        
        if any(phrase in assistant_content for phrase in generic_responses):
            score *= 0.7
        
        # Reward responses with specific information
        if len(assistant_content.split()) > 20:
            score *= 1.05
        
        return min(score, 1.0)  # Cap at 1.0
    
    def export_dataset(
        self, 
        dataset: TrainingDataset, 
        filepath: str,
        format_type: str = "alpaca"
    ) -> bool:
        """Export dataset to file."""
        try:
            prepared_data = self.prepare_fine_tuning_dataset(dataset, format_type)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(prepared_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Dataset exported to {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to export dataset: {str(e)}")
            return False


# Global data collector instance
data_collector = DataCollector()
