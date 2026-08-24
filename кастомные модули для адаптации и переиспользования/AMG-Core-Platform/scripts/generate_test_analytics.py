#!/usr/bin/env python3
"""
Script to generate test analytics data for AMG Flow.
This script creates realistic user sessions, interactions, and conversation metrics.
"""

import asyncio
import random
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any
import requests
import json
import time

# Configuration
API_BASE_URL = "http://localhost:8000"
NUM_SESSIONS = 50
NUM_CONVERSATIONS_PER_SESSION = 3
NUM_MESSAGES_PER_CONVERSATION = 10

# Sample data
USER_NAMES = [
    "alex_petrov", "maria_ivanova", "dmitry_smirnov", "elena_kuznetsova",
    "sergey_volkov", "anna_fedorova", "mikhail_kozlov", "olga_morozova",
    "andrey_novikov", "tatyana_vasilieva", "vladimir_sokolov", "irina_lebedeva",
    "nikolay_medvedev", "svetlana_egorova", "pavel_komarov", "natalia_zhukova",
    "anton_rybakov", "galina_sorokina", "yuri_vinogradov", "lyudmila_romanova"
]

MODELS = [
    "llama3.2:3b-instruct-q4_0", "llama3.2:1b-instruct-q4_0", 
    "llama3.1:8b-instruct-q4_0", "llama3.1:70b-instruct-q4_0"
]

INTERACTION_TYPES = [
    "message_sent", "message_received", "model_switched", "conversation_started",
    "conversation_ended", "error_occurred", "tool_used", "rag_used"
]

MESSAGE_CONTENTS = [
    "Привет! Как дела?",
    "Расскажи мне о машинном обучении",
    "Помоги с программированием на Python",
    "Что такое искусственный интеллект?",
    "Как работает нейронная сеть?",
    "Объясни принципы работы блокчейна",
    "Помоги написать SQL запрос",
    "Что такое Docker и зачем он нужен?",
    "Расскажи о микросервисной архитектуре",
    "Как оптимизировать производительность базы данных?",
    "Что такое CI/CD?",
    "Объясни принципы REST API",
    "Помоги с настройкой Kubernetes",
    "Что такое мониторинг приложений?",
    "Как работает система кэширования?",
    "Расскажи о принципах безопасности",
    "Что такое DevOps?",
    "Помоги с настройкой Nginx",
    "Объясни принципы работы с Git",
    "Что такое контейнеризация?"
]

ERROR_MESSAGES = [
    "Connection timeout", "Model not available", "Rate limit exceeded",
    "Invalid request format", "Server error", "Authentication failed",
    "Resource not found", "Validation error", "Database connection failed",
    "External service unavailable"
]

class AnalyticsDataGenerator:
    """Generate test analytics data."""
    
    def __init__(self, api_base_url: str):
        self.api_base_url = api_base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'X-Request-ID': str(uuid.uuid4())
        })
    
    def generate_user_session(self, user_id: str) -> Dict[str, Any]:
        """Generate a user session."""
        start_time = datetime.now() - timedelta(days=random.randint(0, 30))
        duration = random.randint(300, 7200)  # 5 minutes to 2 hours
        
        return {
            "user_id": user_id,
            "started_at": start_time.isoformat(),
            "ended_at": (start_time + timedelta(seconds=duration)).isoformat(),
            "is_active": random.choice([True, False]),
            "ip_address": f"192.168.1.{random.randint(1, 254)}",
            "user_agent": random.choice([
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
            ]),
            "device_type": random.choice(["desktop", "mobile", "tablet"]),
            "browser": random.choice(["chrome", "firefox", "safari", "edge"]),
            "os": random.choice(["windows", "macos", "linux", "android", "ios"])
        }
    
    def generate_conversation_metrics(self, session_id: str, conversation_id: str) -> Dict[str, Any]:
        """Generate conversation metrics."""
        start_time = datetime.now() - timedelta(hours=random.randint(0, 24))
        duration = random.randint(60, 3600)  # 1 minute to 1 hour
        
        return {
            "session_id": session_id,
            "conversation_id": conversation_id,
            "started_at": start_time.isoformat(),
            "ended_at": (start_time + timedelta(seconds=duration)).isoformat(),
            "total_messages": random.randint(5, 50),
            "user_messages": random.randint(2, 25),
            "assistant_messages": random.randint(2, 25),
            "total_duration_seconds": duration,
            "avg_response_time_ms": random.randint(500, 5000),
            "model_used": random.choice(MODELS),
            "rag_used": random.choice([True, False]),
            "tools_used": random.randint(0, 5),
            "errors_count": random.randint(0, 3),
            "satisfaction_score": random.randint(1, 5) if random.random() > 0.2 else None
        }
    
    def generate_user_interaction(self, session_id: str, conversation_id: str) -> Dict[str, Any]:
        """Generate a user interaction."""
        interaction_type = random.choice(INTERACTION_TYPES)
        timestamp = datetime.now() - timedelta(minutes=random.randint(0, 1440))
        
        interaction = {
            "session_id": session_id,
            "conversation_id": conversation_id,
            "interaction_type": interaction_type,
            "timestamp": timestamp.isoformat(),
            "user_id": random.choice(USER_NAMES),
            "model_used": random.choice(MODELS),
            "response_time_ms": random.randint(100, 10000),
            "success": random.random() > 0.1,  # 90% success rate
            "error_message": None,
            "metadata": {}
        }
        
        # Add specific data based on interaction type
        if interaction_type == "message_sent":
            interaction["metadata"] = {
                "message_content": random.choice(MESSAGE_CONTENTS),
                "message_length": len(random.choice(MESSAGE_CONTENTS)),
                "language": "ru"
            }
        elif interaction_type == "message_received":
            interaction["metadata"] = {
                "response_length": random.randint(50, 2000),
                "tokens_used": random.randint(10, 500),
                "model_version": "latest"
            }
        elif interaction_type == "error_occurred":
            interaction["success"] = False
            interaction["error_message"] = random.choice(ERROR_MESSAGES)
            interaction["metadata"] = {
                "error_code": random.randint(400, 599),
                "retry_count": random.randint(0, 3)
            }
        elif interaction_type == "model_switched":
            interaction["metadata"] = {
                "previous_model": random.choice(MODELS),
                "new_model": random.choice(MODELS),
                "reason": random.choice(["performance", "availability", "user_preference"])
            }
        elif interaction_type == "rag_used":
            interaction["metadata"] = {
                "rag_type": random.choice(["vector_search", "knowledge_base", "document_search"]),
                "sources_count": random.randint(1, 5),
                "confidence_score": random.uniform(0.5, 1.0)
            }
        
        return interaction
    
    def create_session(self, session_data: Dict[str, Any]) -> str:
        """Create a user session via API."""
        try:
            response = self.session.post(
                f"{self.api_base_url}/v1/analytics/sessions",
                json=session_data
            )
            response.raise_for_status()
            return response.json()["session_id"]
        except Exception as e:
            print(f"Error creating session: {e}")
            return str(uuid.uuid4())
    
    def create_conversation_metrics(self, metrics_data: Dict[str, Any]) -> str:
        """Create conversation metrics via API."""
        try:
            response = self.session.post(
                f"{self.api_base_url}/v1/analytics/conversations",
                json=metrics_data
            )
            response.raise_for_status()
            return response.json()["conversation_id"]
        except Exception as e:
            print(f"Error creating conversation metrics: {e}")
            return str(uuid.uuid4())
    
    def create_user_interaction(self, interaction_data: Dict[str, Any]) -> str:
        """Create user interaction via API."""
        try:
            response = self.session.post(
                f"{self.api_base_url}/v1/analytics/interactions",
                json=interaction_data
            )
            response.raise_for_status()
            return response.json()["interaction_id"]
        except Exception as e:
            print(f"Error creating user interaction: {e}")
            return str(uuid.uuid4())
    
    def generate_all_data(self):
        """Generate all test analytics data."""
        print("🚀 Starting analytics data generation...")
        
        sessions_created = 0
        conversations_created = 0
        interactions_created = 0
        
        for i in range(NUM_SESSIONS):
            user_id = random.choice(USER_NAMES)
            
            # Create user session
            session_data = self.generate_user_session(user_id)
            session_id = self.create_session(session_data)
            sessions_created += 1
            
            print(f"📊 Created session {sessions_created}/{NUM_SESSIONS} for user {user_id}")
            
            # Create conversations for this session
            for j in range(NUM_CONVERSATIONS_PER_SESSION):
                conversation_id = str(uuid.uuid4())
                
                # Create conversation metrics
                metrics_data = self.generate_conversation_metrics(session_id, conversation_id)
                self.create_conversation_metrics(metrics_data)
                conversations_created += 1
                
                # Create interactions for this conversation
                for k in range(NUM_MESSAGES_PER_CONVERSATION):
                    interaction_data = self.generate_user_interaction(session_id, conversation_id)
                    self.create_user_interaction(interaction_data)
                    interactions_created += 1
                    
                    # Small delay to avoid overwhelming the API
                    time.sleep(0.01)
            
            print(f"   └─ Created {NUM_CONVERSATIONS_PER_SESSION} conversations, {NUM_MESSAGES_PER_CONVERSATION * NUM_CONVERSATIONS_PER_SESSION} interactions")
        
        print(f"\n✅ Data generation completed!")
        print(f"   📊 Sessions: {sessions_created}")
        print(f"   💬 Conversations: {conversations_created}")
        print(f"   🔄 Interactions: {interactions_created}")
        print(f"   📈 Total records: {sessions_created + conversations_created + interactions_created}")

def main():
    """Main function."""
    print("🎯 AMG Flow Analytics Data Generator")
    print("=" * 50)
    
    generator = AnalyticsDataGenerator(API_BASE_URL)
    
    # Test API connection
    try:
        response = requests.get(f"{API_BASE_URL}/v1/health")
        if response.status_code == 200:
            print("✅ API is accessible")
        else:
            print("❌ API is not accessible")
            return
    except Exception as e:
        print(f"❌ Cannot connect to API: {e}")
        return
    
    # Generate data
    generator.generate_all_data()
    
    print("\n🎉 Test data generation completed!")
    print("\nYou can now test the analytics endpoints:")
    print(f"  📊 Daily analytics: curl {API_BASE_URL}/v1/analytics/daily")
    print(f"  📈 User analytics: curl {API_BASE_URL}/v1/analytics/users")
    print(f"  💬 Conversation analytics: curl {API_BASE_URL}/v1/analytics/conversations")
    print(f"  🔄 Interaction analytics: curl {API_BASE_URL}/v1/analytics/interactions")

if __name__ == "__main__":
    main()
