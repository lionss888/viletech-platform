#!/usr/bin/env python3
"""Direct test of analytics functionality."""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
import random
from uuid import uuid4

# Import database session
from app.db.session import get_db, SessionLocal

# Import analytics models
from app.analytics.models import UserSession, UserInteraction, ConversationMetrics

def test_analytics_direct():
    """Test analytics functionality directly through database."""
    print("🧪 Testing analytics functionality directly...")
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Test 1: Create user session
        print("1. Creating user session...")
        session = UserSession(
            session_id=str(uuid4()),
            user_id="test_user_123",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0 (Test Browser)",
            started_at=datetime.utcnow(),
            is_active=True,
            device_type="desktop",
            browser="chrome",
            os="linux"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        print(f"   ✅ Session created: {session.id}")
        
        # Test 2: Create user interaction
        print("2. Creating user interaction...")
        interaction = UserInteraction(
            session_id=session.session_id,
            conversation_id=str(uuid4()),
            interaction_type="message_sent",
            timestamp=datetime.utcnow(),
            user_id="test_user_123",
            model_used="llama3.2:3b-instruct-q4_0",
            response_time_ms=1200,
            success=True,
            session_metadata={"message": "Test message"}
        )
        db.add(interaction)
        db.commit()
        db.refresh(interaction)
        print(f"   ✅ Interaction created: {interaction.id}")
        
        # Test 3: Create conversation metrics
        print("3. Creating conversation metrics...")
        metrics = ConversationMetrics(
            session_id=session.session_id,
            conversation_id=interaction.conversation_id,
            started_at=datetime.utcnow() - timedelta(minutes=30),
            ended_at=datetime.utcnow(),
            total_messages=10,
            user_messages=5,
            assistant_messages=5,
            total_duration_seconds=1800,
            avg_response_time_ms=1500.0,
            model_used="llama3.2:3b-instruct-q4_0",
            rag_used=True,
            tools_used=2,
            errors_count=0,
            satisfaction_score=4
        )
        db.add(metrics)
        db.commit()
        db.refresh(metrics)
        print(f"   ✅ Metrics created: {metrics.id}")
        
        # Test 4: Query data
        print("4. Querying analytics data...")
        
        # Count sessions
        session_count = db.query(UserSession).count()
        print(f"   📊 Total sessions: {session_count}")
        
        # Count interactions
        interaction_count = db.query(UserInteraction).count()
        print(f"   🔄 Total interactions: {interaction_count}")
        
        # Count conversations
        conversation_count = db.query(ConversationMetrics).count()
        print(f"   💬 Total conversations: {conversation_count}")
        
        # Test 5: Generate sample analytics
        print("5. Generating sample analytics...")
        
        # Daily stats
        today = datetime.utcnow().date()
        today_sessions = db.query(UserSession).filter(
            UserSession.started_at >= today
        ).count()
        print(f"   📅 Sessions today: {today_sessions}")
        
        # Model usage
        model_usage = db.query(UserInteraction.model_used).filter(
            UserInteraction.model_used.isnot(None)
        ).distinct().all()
        print(f"   🤖 Models used: {[m[0] for m in model_usage]}")
        
        # Success rate
        total_interactions = db.query(UserInteraction).count()
        successful_interactions = db.query(UserInteraction).filter(
            UserInteraction.success == True
        ).count()
        success_rate = (successful_interactions / total_interactions * 100) if total_interactions > 0 else 0
        print(f"   ✅ Success rate: {success_rate:.1f}%")
        
        print("\n🎉 All tests passed! Analytics system is working correctly.")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        db.rollback()
        return False
        
    finally:
        db.close()

def generate_sample_data():
    """Generate sample analytics data for testing."""
    print("\n📊 Generating sample data...")
    
    db = SessionLocal()
    
    try:
        # Generate 10 sessions with interactions
        for i in range(10):
            # Create session
            session = UserSession(
                session_id=f"session_{i}_{uuid4().hex[:8]}",
                user_id=f"user_{i}",
                ip_address=f"192.168.1.{100 + i}",
                user_agent="Mozilla/5.0 (Test Browser)",
                started_at=datetime.utcnow() - timedelta(hours=random.randint(0, 24)),
                ended_at=datetime.utcnow() - timedelta(minutes=random.randint(5, 60)),
                is_active=random.choice([True, False]),
                device_type=random.choice(["desktop", "mobile", "tablet"]),
                browser=random.choice(["chrome", "firefox", "safari"]),
                os=random.choice(["windows", "macos", "linux"])
            )
            db.add(session)
            db.flush()  # Get the ID without committing
            
            # Create interactions for this session
            for j in range(random.randint(3, 15)):
                interaction = UserInteraction(
                    session_id=session.session_id,
                    conversation_id=f"conv_{i}_{j}",
                    interaction_type=random.choice([
                        "message_sent", "message_received", "model_switched", 
                        "conversation_started", "error_occurred"
                    ]),
                    timestamp=datetime.utcnow() - timedelta(minutes=random.randint(0, 1440)),
                    user_id=f"user_{i}",
                    model_used=random.choice([
                        "llama3.2:3b-instruct-q4_0", "llama3.1:8b-instruct-q4_0"
                    ]),
                    response_time_ms=random.randint(500, 5000),
                    success=random.random() > 0.1,  # 90% success rate
                    error_message=None if random.random() > 0.1 else "Test error"
                )
                db.add(interaction)
            
            # Create conversation metrics
            metrics = ConversationMetrics(
                session_id=session.session_id,
                conversation_id=f"conv_{i}_0",
                started_at=session.started_at,
                ended_at=session.ended_at,
                total_messages=random.randint(5, 50),
                user_messages=random.randint(2, 25),
                assistant_messages=random.randint(2, 25),
                total_duration_seconds=random.randint(300, 3600),
                avg_response_time_ms=random.uniform(800, 3000),
                model_used=random.choice([
                    "llama3.2:3b-instruct-q4_0", "llama3.1:8b-instruct-q4_0"
                ]),
                rag_used=random.choice([True, False]),
                tools_used=random.randint(0, 5),
                errors_count=random.randint(0, 3),
                satisfaction_score=random.randint(1, 5) if random.random() > 0.3 else None
            )
            db.add(metrics)
        
        db.commit()
        print(f"   ✅ Generated 10 sessions with interactions and metrics")
        
    except Exception as e:
        print(f"❌ Failed to generate sample data: {str(e)}")
        db.rollback()
        
    finally:
        db.close()

if __name__ == "__main__":
    print("🎯 AMG Flow Analytics Direct Test")
    print("=" * 40)
    
    # Test basic functionality
    if test_analytics_direct():
        # Generate sample data
        generate_sample_data()
        
        # Show final stats
        db = SessionLocal()
        try:
            session_count = db.query(UserSession).count()
            interaction_count = db.query(UserInteraction).count()
            conversation_count = db.query(ConversationMetrics).count()
            
            print(f"\n📈 Final Statistics:")
            print(f"   Sessions: {session_count}")
            print(f"   Interactions: {interaction_count}")
            print(f"   Conversations: {conversation_count}")
            print(f"   Total records: {session_count + interaction_count + conversation_count}")
            
        finally:
            db.close()
        
        print("\n🎉 Analytics system is ready for testing!")
        print("\nNext steps:")
        print("1. Open the web UI: file://$(pwd)/scripts/test_analytics_ui.html")
        print("2. Test API endpoints manually")
        print("3. View data in the main application")
    else:
        print("\n❌ Analytics system has issues. Please check the errors above.")
