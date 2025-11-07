"""
Seed database with test videos that have transcripts.
This allows testing the practice feature end-to-end.

Usage:
    cd backend
    python scripts/seed_videos.py
"""

import os
import sys
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models import Video, Transcript

# Test videos with complete transcripts
TEST_VIDEOS = [
    {
        "youtube_id": "test_english_001",
        "title": "Introduction to English Grammar",
        "description": "Learn the basics of English grammar with clear examples and explanations.",
        "channel_name": "English Academy",
        "duration": 600,
        "language": "en",
        "thumbnail_url": "https://via.placeholder.com/320x180?text=Grammar",
        "view_count": 15000,
        "phrases": [
            {"text": "Hello everyone, welcome to the English Academy.", "start_time": 0.0, "duration": 2.0},
            {"text": "Today we will learn about basic English grammar.", "start_time": 2.5, "duration": 2.5},
            {"text": "Grammar is the foundation of any language.", "start_time": 5.5, "duration": 2.0},
            {"text": "Let's start with the present tense verb to be.", "start_time": 8.0, "duration": 2.0},
            {"text": "I am a student. You are a teacher. He is an engineer.", "start_time": 10.5, "duration": 3.0},
            {"text": "She is a doctor. We are friends. They are colleagues.", "start_time": 14.0, "duration": 3.0},
            {"text": "Now let's learn about articles: a, an, and the.", "start_time": 17.5, "duration": 2.5},
            {"text": "Use a before consonants: a book, a car, a dog.", "start_time": 20.5, "duration": 2.5},
            {"text": "Use an before vowels: an apple, an elephant, an orange.", "start_time": 23.5, "duration": 3.0},
            {"text": "Use the when referring to specific items.", "start_time": 27.0, "duration": 2.0},
        ]
    },
    {
        "youtube_id": "test_english_002",
        "title": "Common English Phrases for Daily Use",
        "description": "Master everyday English phrases for conversations.",
        "channel_name": "English Academy",
        "duration": 480,
        "language": "en",
        "thumbnail_url": "https://via.placeholder.com/320x180?text=Phrases",
        "view_count": 22000,
        "phrases": [
            {"text": "Good morning, how are you today?", "start_time": 0.0, "duration": 2.0},
            {"text": "I'm doing great, thank you for asking.", "start_time": 2.5, "duration": 2.0},
            {"text": "What's your name? My name is John.", "start_time": 5.0, "duration": 2.0},
            {"text": "Nice to meet you. The pleasure is mine.", "start_time": 7.5, "duration": 2.0},
            {"text": "Where are you from? I'm from California.", "start_time": 10.0, "duration": 2.0},
            {"text": "What do you do for work? I'm a software engineer.", "start_time": 12.5, "duration": 2.5},
            {"text": "Do you speak any other languages?", "start_time": 15.5, "duration": 2.0},
            {"text": "Yes, I speak Spanish and a little bit of French.", "start_time": 18.0, "duration": 2.5},
            {"text": "That's impressive! How long have you been learning?", "start_time": 20.5, "duration": 2.5},
            {"text": "I've been studying for about five years now.", "start_time": 23.5, "duration": 2.0},
        ]
    },
    {
        "youtube_id": "test_spanish_001",
        "title": "Introducción al Español",
        "description": "Aprende español desde cero con lecciones claras y prácticas.",
        "channel_name": "Spanish Lessons",
        "duration": 540,
        "language": "es",
        "thumbnail_url": "https://via.placeholder.com/320x180?text=Español",
        "view_count": 18500,
        "phrases": [
            {"text": "Hola a todos, bienvenidos a la clase de español.", "start_time": 0.0, "duration": 2.5},
            {"text": "Hoy vamos a aprender palabras básicas.", "start_time": 3.0, "duration": 2.0},
            {"text": "Yo me llamo Carlos. ¿Cómo te llamas?", "start_time": 5.5, "duration": 2.0},
            {"text": "Encantado de conocerte. El placer es mío.", "start_time": 8.0, "duration": 2.5},
            {"text": "¿De dónde eres? Yo soy de Madrid.", "start_time": 11.0, "duration": 2.0},
            {"text": "¿Qué haces en tu trabajo?", "start_time": 13.5, "duration": 2.0},
            {"text": "Soy ingeniero de software.", "start_time": 16.0, "duration": 1.5},
            {"text": "¿Hablas otros idiomas?", "start_time": 18.0, "duration": 1.5},
            {"text": "Sí, hablo inglés y un poco de francés.", "start_time": 20.0, "duration": 2.5},
            {"text": "Excelente, vamos a continuar aprendiendo.", "start_time": 23.0, "duration": 2.0},
        ]
    },
    {
        "youtube_id": "test_french_001",
        "title": "Cours de Français pour Débutants",
        "description": "Apprenez le français avec des leçons simples et efficaces.",
        "channel_name": "French Academy",
        "duration": 500,
        "language": "fr",
        "thumbnail_url": "https://via.placeholder.com/320x180?text=Français",
        "view_count": 12000,
        "phrases": [
            {"text": "Bonjour à tous, bienvenue au cours de français.", "start_time": 0.0, "duration": 2.5},
            {"text": "Aujourd'hui nous allons apprendre les bases.", "start_time": 3.0, "duration": 2.0},
            {"text": "Je m'appelle Pierre. Comment t'appelles-tu?", "start_time": 5.5, "duration": 2.0},
            {"text": "Enchanté de vous rencontrer.", "start_time": 8.0, "duration": 2.0},
            {"text": "D'où viens-tu? Je viens de Paris.", "start_time": 10.5, "duration": 2.0},
            {"text": "Que fais-tu comme travail?", "start_time": 13.0, "duration": 1.5},
            {"text": "Je suis un ingénieur logiciel.", "start_time": 15.0, "duration": 2.0},
            {"text": "Parles-tu d'autres langues?", "start_time": 17.5, "duration": 1.5},
            {"text": "Oui, je parle anglais et un peu d'espagnol.", "start_time": 19.5, "duration": 2.5},
            {"text": "Excellent, continuons notre leçon.", "start_time": 22.5, "duration": 2.0},
        ]
    },
    {
        "youtube_id": "test_german_001",
        "title": "Deutschkurs für Anfänger",
        "description": "Lernen Sie Deutsch mit einfachen und praktischen Lektionen.",
        "channel_name": "German Academy",
        "duration": 520,
        "language": "de",
        "thumbnail_url": "https://via.placeholder.com/320x180?text=Deutsch",
        "view_count": 9500,
        "phrases": [
            {"text": "Guten Tag alle zusammen, willkommen zum Deutschkurs.", "start_time": 0.0, "duration": 2.5},
            {"text": "Heute werden wir grundlegende Wörter lernen.", "start_time": 3.0, "duration": 2.0},
            {"text": "Ich heiße Michael. Wie heißt du?", "start_time": 5.5, "duration": 2.0},
            {"text": "Freut mich, dich kennenzulernen.", "start_time": 8.0, "duration": 2.0},
            {"text": "Woher kommst du? Ich komme aus Berlin.", "start_time": 10.5, "duration": 2.0},
            {"text": "Was machst du beruflich?", "start_time": 13.0, "duration": 1.5},
            {"text": "Ich bin Softwareentwickler.", "start_time": 15.0, "duration": 2.0},
            {"text": "Sprichst du andere Sprachen?", "start_time": 17.5, "duration": 1.5},
            {"text": "Ja, ich spreche Englisch und etwas Spanisch.", "start_time": 19.5, "duration": 2.5},
            {"text": "Ausgezeichnet, lass uns weitermachen.", "start_time": 22.5, "duration": 2.0},
        ]
    },
]

def seed_database():
    """Seed the database with test videos and transcripts."""

    # Create database connection
    database_url = settings.DATABASE_URL
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    try:
        # Clear existing test videos
        print("🗑️  Clearing existing test videos...")
        deleted_count = session.query(Video).filter(Video.youtube_id.like('test_%')).delete(synchronize_session=False)
        session.commit()
        print(f"   Deleted {deleted_count} existing test videos")

        # Add new test videos
        print("\n📝 Adding test videos to database...")

        for video_data in TEST_VIDEOS:
            phrases = video_data.pop("phrases")

            # Create video record
            video = Video(**video_data)
            session.add(video)
            session.flush()  # Get the video ID

            print(f"  ✅ Added video: {video.title} ({video.language.upper()})")

            # Add transcript with all phrases
            transcript = Transcript(
                video_id=video.id,
                phrases=phrases  # Store as JSON array
            )
            session.add(transcript)
            print(f"     Added {len(phrases)} phrases")

        session.commit()
        print("\n✅ Database successfully seeded with test videos!")
        print(f"📊 Added {len(TEST_VIDEOS)} test videos with transcripts")

        # Print summary
        print("\n📋 Test Videos Added:")
        for idx, video_data in enumerate(TEST_VIDEOS, 1):
            # Re-fetch video data since we popped phrases
            video = session.query(Video).filter(
                Video.youtube_id == TEST_VIDEOS[idx-1]['youtube_id']
            ).first()
            if video:
                print(f"  {idx}. {video.title}")
                print(f"     Language: {video.language.upper()}")
                print(f"     YouTube ID: {video.youtube_id}")

        print("\n💡 How to use test videos:")
        print("  1. Search for 'test', 'english', 'spanish', 'french', or 'german'")
        print("  2. Select a test video from results")
        print("  3. Practice with pre-loaded transcripts!")

    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding database: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    print("🌱 Starting database seed...\n")
    seed_database()
    print("\n🎉 Done!")
