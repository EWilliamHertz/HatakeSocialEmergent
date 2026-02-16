"""
Backend API Tests for Hatake.Social TCG Platform
Tests: Authentication, Decks, Trades, Calls (Video signaling)
"""

import pytest
import requests
import os
import time

# Get base URL from environment or use default
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')

# Test data
TEST_USER = {
    "email": f"test_hatake_{int(time.time())}@example.com",
    "password": "TestPassword123!",
    "name": "Test User Hatake"
}

# Session to persist cookies
session = requests.Session()
session.headers.update({"Content-Type": "application/json"})


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test that health endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ Health endpoint working")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_signup_new_user(self):
        """Test user signup"""
        response = session.post(f"{BASE_URL}/api/auth/signup", json=TEST_USER)
        print(f"Signup response status: {response.status_code}")
        print(f"Signup response: {response.text[:500]}")
        
        # 200 for new user, 400 if user exists
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "user" in data
            assert data["user"]["email"] == TEST_USER["email"]
            print("✓ User signup successful")
        else:
            print("✓ User already exists (expected in repeated tests)")
    
    def test_login_user(self):
        """Test user login"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        })
        
        if response.status_code != 200:
            # Try signup first if login fails
            signup_response = session.post(f"{BASE_URL}/api/auth/signup", json=TEST_USER)
            if signup_response.status_code == 200:
                response = session.post(f"{BASE_URL}/api/auth/login", json={
                    "email": TEST_USER["email"],
                    "password": TEST_USER["password"]
                })
        
        print(f"Login response status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "user" in data
        assert "token" in data
        print("✓ User login successful")
    
    def test_get_current_user(self):
        """Test get current user endpoint"""
        # First login to get session cookie
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        })
        
        response = session.get(f"{BASE_URL}/api/auth/me")
        print(f"Get me response status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        print("✓ Get current user successful")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected correctly")


class TestDecksAPI:
    """Decks CRUD endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def login_user(self):
        """Ensure user is logged in before deck tests"""
        # Try login
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        })
        if response.status_code != 200:
            # Signup and login
            session.post(f"{BASE_URL}/api/auth/signup", json=TEST_USER)
            session.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_USER["email"],
                "password": TEST_USER["password"]
            })
    
    def test_get_decks_list(self):
        """Test getting list of decks"""
        response = session.get(f"{BASE_URL}/api/decks")
        print(f"Get decks response status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "decks" in data
        assert isinstance(data["decks"], list)
        print(f"✓ Get decks successful, found {len(data['decks'])} decks")
    
    def test_create_deck(self):
        """Test creating a new deck"""
        deck_data = {
            "name": f"TEST_Deck_{int(time.time())}",
            "description": "Test deck for automated testing",
            "game": "mtg",
            "format": "Standard",
            "isPublic": False
        }
        
        response = session.post(f"{BASE_URL}/api/decks", json=deck_data)
        print(f"Create deck response status: {response.status_code}")
        print(f"Create deck response: {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "deckId" in data
        print(f"✓ Deck created with ID: {data['deckId']}")
        
        # Verify deck was created by fetching it
        decks_response = session.get(f"{BASE_URL}/api/decks")
        decks_data = decks_response.json()
        deck_ids = [d.get("deck_id") for d in decks_data.get("decks", [])]
        assert data["deckId"] in deck_ids
        print("✓ Deck verified in list")
    
    def test_create_deck_missing_fields(self):
        """Test creating deck with missing required fields"""
        response = session.post(f"{BASE_URL}/api/decks", json={
            "description": "Missing name and game"
        })
        assert response.status_code == 400
        print("✓ Missing fields rejected correctly")


class TestTradesAPI:
    """Trades endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def login_user(self):
        """Ensure user is logged in before trade tests"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        })
        if response.status_code != 200:
            session.post(f"{BASE_URL}/api/auth/signup", json=TEST_USER)
            session.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_USER["email"],
                "password": TEST_USER["password"]
            })
    
    def test_get_trades_list(self):
        """Test getting list of trades"""
        response = session.get(f"{BASE_URL}/api/trades")
        print(f"Get trades response status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "trades" in data
        print(f"✓ Get trades successful, found {len(data['trades'])} trades")
    
    def test_create_trade_missing_recipient(self):
        """Test creating trade without recipient fails"""
        response = session.post(f"{BASE_URL}/api/trades", json={
            "initiatorItems": [],
            "recipientItems": []
        })
        print(f"Create trade (no recipient) response status: {response.status_code}")
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        print("✓ Trade without recipient rejected correctly")


class TestCallsAPI:
    """Video/Audio call signaling API tests (REST polling)"""
    
    @pytest.fixture(autouse=True)
    def login_user(self):
        """Ensure user is logged in before call tests"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        })
        if response.status_code != 200:
            session.post(f"{BASE_URL}/api/auth/signup", json=TEST_USER)
            session.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_USER["email"],
                "password": TEST_USER["password"]
            })
    
    def test_get_signals_authenticated(self):
        """Test polling for signals when authenticated"""
        response = session.get(f"{BASE_URL}/api/calls")
        print(f"Get calls response status: {response.status_code}")
        print(f"Get calls response: {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "signals" in data
        print("✓ GET /api/calls works for authenticated user")
    
    def test_get_signals_unauthenticated(self):
        """Test polling for signals without auth returns 401"""
        unauth_session = requests.Session()
        response = unauth_session.get(f"{BASE_URL}/api/calls")
        print(f"Get calls (unauth) response status: {response.status_code}")
        
        assert response.status_code == 401
        print("✓ GET /api/calls correctly rejects unauthenticated requests")
    
    def test_post_signal(self):
        """Test sending a signal"""
        signal_data = {
            "type": "test_signal",
            "target": "target_user_id",
            "data": {"test": "data"}
        }
        
        response = session.post(f"{BASE_URL}/api/calls", json=signal_data)
        print(f"Post signal response status: {response.status_code}")
        print(f"Post signal response: {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ POST /api/calls works for sending signals")
    
    def test_post_signal_missing_fields(self):
        """Test sending signal with missing required fields"""
        response = session.post(f"{BASE_URL}/api/calls", json={
            "type": "offer"
            # Missing target
        })
        print(f"Post signal (missing fields) response status: {response.status_code}")
        
        assert response.status_code == 400
        print("✓ POST /api/calls correctly rejects missing fields")
    
    def test_delete_call_signals(self):
        """Test ending a call / clearing signals"""
        response = session.delete(f"{BASE_URL}/api/calls?target=test_target")
        print(f"Delete call response status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ DELETE /api/calls works for ending calls")


class TestCollectionAPI:
    """Collection endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def login_user(self):
        """Ensure user is logged in"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        })
        if response.status_code != 200:
            session.post(f"{BASE_URL}/api/auth/signup", json=TEST_USER)
            session.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_USER["email"],
                "password": TEST_USER["password"]
            })
    
    def test_get_collection(self):
        """Test getting user's collection"""
        response = session.get(f"{BASE_URL}/api/collection")
        print(f"Get collection response status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "items" in data
        print(f"✓ Get collection successful, found {len(data['items'])} items")


class TestMessagesAPI:
    """Messages endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def login_user(self):
        """Ensure user is logged in"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        })
        if response.status_code != 200:
            session.post(f"{BASE_URL}/api/auth/signup", json=TEST_USER)
            session.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_USER["email"],
                "password": TEST_USER["password"]
            })
    
    def test_get_conversations(self):
        """Test getting user's conversations"""
        response = session.get(f"{BASE_URL}/api/messages")
        print(f"Get messages response status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "conversations" in data
        print(f"✓ Get conversations successful, found {len(data['conversations'])} conversations")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
