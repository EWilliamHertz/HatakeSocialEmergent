"""
Iteration 18 - Testing Clickable User Names in Messenger and Messages
Features tested:
- Web MessengerWidget - Chat header profile link
- Web MessengerWidget - Conversation list name links
- Web Messages page - Chat header name link
- Web Messages page - Conversation sidebar name links
- Web Messages page - Message sender avatar links
- Badge showcase still works (continuation from iteration 17)
- All badge APIs still functional
"""
import pytest
import requests
import os

BASE_URL = "http://localhost:3000"


class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test successful login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "token" in data
        assert "user" in data


class TestMessagesAPI:
    """Messages API tests - verifying endpoints work for messenger features"""
    
    @pytest.fixture
    def session_cookies(self):
        """Get session cookies via login"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return session
    
    def test_get_conversations(self, session_cookies):
        """Test GET /api/messages returns conversations with user_id for profile linking"""
        response = session_cookies.get(f"{BASE_URL}/api/messages")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Conversations should have user_id for profile linking
        if data.get("conversations"):
            for conv in data["conversations"]:
                assert "user_id" in conv, "Conversation missing user_id for profile link"
                assert "name" in conv, "Conversation missing name"
                assert "conversation_id" in conv, "Conversation missing conversation_id"
    
    def test_get_messages_in_conversation(self, session_cookies):
        """Test GET /api/messages/{convId} returns messages with sender_id for avatar profile linking"""
        # First get conversations
        conv_response = session_cookies.get(f"{BASE_URL}/api/messages")
        conversations = conv_response.json().get("conversations", [])
        
        if len(conversations) > 0:
            conv_id = conversations[0]["conversation_id"]
            response = session_cookies.get(f"{BASE_URL}/api/messages/{conv_id}")
            assert response.status_code == 200
            data = response.json()
            assert data.get("success") == True
            
            # Messages should have sender_id for avatar profile linking
            if data.get("messages"):
                for msg in data["messages"]:
                    assert "sender_id" in msg, "Message missing sender_id for avatar link"
                    assert "name" in msg, "Message missing sender name"
    
    def test_send_message(self, session_cookies):
        """Test POST /api/messages can send a message"""
        # First get conversations to find a recipient
        conv_response = session_cookies.get(f"{BASE_URL}/api/messages")
        conversations = conv_response.json().get("conversations", [])
        
        if len(conversations) > 0:
            recipient_id = conversations[0]["user_id"]
            response = session_cookies.post(f"{BASE_URL}/api/messages", json={
                "recipientId": recipient_id,
                "content": "Test message from iteration 18"
            })
            assert response.status_code == 200
            data = response.json()
            assert data.get("success") == True


class TestBadgeAPIs:
    """Badge API tests - ensuring badge showcase still works"""
    
    @pytest.fixture
    def session_cookies(self):
        """Get session cookies via login"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return session
    
    @pytest.fixture
    def user_id(self):
        """Get user ID"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return response.json().get("user", {}).get("user_id")
    
    def test_get_user_badges(self, session_cookies, user_id):
        """Test GET /api/badges?userId= returns user badges"""
        response = session_cookies.get(f"{BASE_URL}/api/badges?userId={user_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "badges" in data
        # Test user should have badges from previous iterations
        assert len(data["badges"]) >= 4, f"Expected at least 4 badges, got {len(data['badges'])}"
    
    def test_get_all_badge_definitions(self, session_cookies):
        """Test GET /api/badges/all returns all badge definitions"""
        response = session_cookies.get(f"{BASE_URL}/api/badges/all")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "badges" in data
        # Should have badge definitions
        assert len(data["badges"]) > 0
    
    def test_auto_award_badges(self, session_cookies):
        """Test POST /api/badges triggers badge auto-award check"""
        response = session_cookies.post(f"{BASE_URL}/api/badges", json={})
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True


class TestFeedBadgeShowcase:
    """Feed API tests for badge_count in posts"""
    
    @pytest.fixture
    def session_cookies(self):
        """Get session cookies via login"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return session
    
    def test_public_feed_has_badge_count(self, session_cookies):
        """Test GET /api/feed?tab=public includes badge_count in posts"""
        response = session_cookies.get(f"{BASE_URL}/api/feed?tab=public")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "posts" in data
        
        # Check badge_count field exists in posts
        for post in data["posts"][:5]:
            assert "badge_count" in post, f"Post missing badge_count field"


class TestUserSearch:
    """User search API tests - needed for starting new conversations"""
    
    @pytest.fixture
    def session_cookies(self):
        """Get session cookies via login"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return session
    
    def test_search_users(self, session_cookies):
        """Test GET /api/users/search returns users with user_id for profile linking"""
        response = session_cookies.get(f"{BASE_URL}/api/users/search?q=")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "users" in data
        
        # Users should have user_id for profile linking
        if len(data["users"]) > 0:
            for user in data["users"][:5]:
                assert "user_id" in user, "User missing user_id"
                assert "name" in user, "User missing name"


class TestProfileAPI:
    """Profile API tests"""
    
    @pytest.fixture
    def session_cookies(self):
        """Get session cookies via login"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return session
    
    def test_profile_page_loads(self, session_cookies):
        """Test GET /profile/{userId} page loads (returns HTML)"""
        # First get user_id
        me_response = session_cookies.get(f"{BASE_URL}/api/auth/me")
        user_id = me_response.json().get("user", {}).get("user_id")
        
        if user_id:
            # Profile is a page, not an API - check it returns 200
            response = session_cookies.get(f"{BASE_URL}/profile/{user_id}")
            assert response.status_code == 200
            # Page should contain HTML
            assert "<!DOCTYPE html>" in response.text or "<html" in response.text.lower()
