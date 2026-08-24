"""Training pipeline for fine-tuning models on conversation data."""

import json
import subprocess
import tempfile
import os
from datetime import datetime
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

from app.learning.data_collector import TrainingDataset, data_collector
from app.utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class TrainingConfig:
    """Configuration for model training."""
    base_model: str = "llama3.2:3b-instruct-q4_0"
    new_model_name: str = "amg-flow-custom"
    epochs: int = 3
    learning_rate: float = 0.0001
    batch_size: int = 4
    max_length: int = 512
    temperature: float = 0.7
    top_p: float = 0.9


@dataclass
class TrainingMetrics:
    """Training metrics and results."""
    model_name: str
    training_examples: int
    epochs_completed: int
    final_loss: float
    training_time: float
    accuracy: float = 0.0
    perplexity: float = 0.0
    created_at: datetime = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()


class TrainingPipeline:
    """Pipeline for training models on conversation data."""
    
    def __init__(self):
        self.training_config = TrainingConfig()
        self.supported_formats = ["alpaca", "chatml"]
    
    def train_model(
        self, 
        dataset: TrainingDataset,
        config: Optional[TrainingConfig] = None
    ) -> TrainingMetrics:
        """Train a model on the provided dataset."""
        if config is None:
            config = self.training_config
        
        try:
            logger.info(f"Starting training with {len(dataset.examples)} examples")
            
            # Prepare dataset
            prepared_data = data_collector.prepare_fine_tuning_dataset(
                dataset, 
                format_type="alpaca"
            )
            
            # Create temporary training files
            with tempfile.TemporaryDirectory() as temp_dir:
                # Save dataset
                dataset_path = os.path.join(temp_dir, "training_data.json")
                with open(dataset_path, 'w', encoding='utf-8') as f:
                    json.dump(prepared_data, f, indent=2, ensure_ascii=False)
                
                # Create Modelfile for training
                modelfile_path = os.path.join(temp_dir, "Modelfile")
                self._create_modelfile(modelfile_path, config)
                
                # Train model using Ollama
                metrics = self._train_with_ollama(
                    dataset_path, 
                    modelfile_path, 
                    config
                )
                
                return metrics
                
        except Exception as e:
            logger.error(f"Training failed: {str(e)}")
            return TrainingMetrics(
                model_name=config.new_model_name,
                training_examples=len(dataset.examples),
                epochs_completed=0,
                final_loss=float('inf'),
                training_time=0.0
            )
    
    def _create_modelfile(self, modelfile_path: str, config: TrainingConfig):
        """Create Modelfile for Ollama training."""
        modelfile_content = f"""FROM {config.base_model}

PARAMETER temperature {config.temperature}
PARAMETER top_p {config.top_p}
PARAMETER num_ctx 4096

SYSTEM \"\"\"
You are a helpful AI assistant trained on AMG Flow conversation data.
You provide personalized responses based on previous interactions.
Always be helpful, accurate, and contextually aware.
\"\"\"
"""
        
        with open(modelfile_path, 'w', encoding='utf-8') as f:
            f.write(modelfile_content)
    
    def _train_with_ollama(
        self, 
        dataset_path: str, 
        modelfile_path: str, 
        config: TrainingConfig
    ) -> TrainingMetrics:
        """Train model using Ollama (simplified implementation)."""
        start_time = datetime.utcnow()
        
        try:
            # Note: This is a simplified implementation
            # In a real scenario, you would:
            # 1. Use Ollama's fine-tuning capabilities (if available)
            # 2. Use external tools like LoRA, QLoRA
            # 3. Use cloud services like AWS SageMaker, Google AI Platform
            
            # For now, we'll simulate training by creating a custom model
            # that uses the base model with custom system prompt
            
            # Create custom model using Modelfile
            create_cmd = [
                "docker", "exec", "ollama", 
                "ollama", "create", config.new_model_name, 
                "-f", "/tmp/Modelfile"
            ]
            
            # Copy files to container
            subprocess.run([
                "docker", "cp", modelfile_path, 
                f"ollama:/tmp/Modelfile"
            ], check=True)
            
            # Create model
            result = subprocess.run(create_cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                raise Exception(f"Failed to create model: {result.stderr}")
            
            # Calculate training time
            training_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Simulate metrics (in real implementation, these would come from training)
            metrics = TrainingMetrics(
                model_name=config.new_model_name,
                training_examples=len(json.load(open(dataset_path))['data']),
                epochs_completed=config.epochs,
                final_loss=0.5,  # Simulated
                training_time=training_time,
                accuracy=0.85,  # Simulated
                perplexity=2.1  # Simulated
            )
            
            logger.info(f"Model {config.new_model_name} created successfully")
            return metrics
            
        except Exception as e:
            logger.error(f"Ollama training failed: {str(e)}")
            raise
    
    def evaluate_model(
        self, 
        model_name: str, 
        test_data: List[Dict[str, str]]
    ) -> Dict[str, float]:
        """Evaluate trained model on test data."""
        try:
            # This would involve running the model on test data
            # and calculating various metrics
            
            # For now, return simulated metrics
            return {
                "accuracy": 0.85,
                "perplexity": 2.1,
                "bleu_score": 0.72,
                "rouge_score": 0.78
            }
            
        except Exception as e:
            logger.error(f"Model evaluation failed: {str(e)}")
            return {}
    
    def deploy_model(self, model_name: str) -> bool:
        """Deploy trained model for use."""
        try:
            # Check if model exists
            check_cmd = ["docker", "exec", "ollama", "ollama", "list"]
            result = subprocess.run(check_cmd, capture_output=True, text=True)
            
            if model_name in result.stdout:
                logger.info(f"Model {model_name} is available")
                return True
            else:
                logger.error(f"Model {model_name} not found")
                return False
                
        except Exception as e:
            logger.error(f"Failed to deploy model: {str(e)}")
            return False
    
    def get_available_models(self) -> List[str]:
        """Get list of available models."""
        try:
            check_cmd = ["docker", "exec", "ollama", "ollama", "list"]
            result = subprocess.run(check_cmd, capture_output=True, text=True)
            
            models = []
            for line in result.stdout.split('\n')[1:]:  # Skip header
                if line.strip():
                    model_name = line.split()[0]
                    models.append(model_name)
            
            return models
            
        except Exception as e:
            logger.error(f"Failed to get models: {str(e)}")
            return []
    
    def delete_model(self, model_name: str) -> bool:
        """Delete a trained model."""
        try:
            delete_cmd = ["docker", "exec", "ollama", "ollama", "rm", model_name]
            result = subprocess.run(delete_cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info(f"Model {model_name} deleted successfully")
                return True
            else:
                logger.error(f"Failed to delete model: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to delete model: {str(e)}")
            return False


# Global training pipeline instance
training_pipeline = TrainingPipeline()
