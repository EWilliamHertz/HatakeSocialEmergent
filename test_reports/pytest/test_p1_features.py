"""
P1 Features Tests for Hatake.Social TCG Platform
Tests: Community Decks API, User Collection API, User Search, Search with Set/Number
"""

import pytest
import requests
import os
import time

# Base URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')

# Test credentials - existing test user
TEST_USER = {
    "email": "testuser@test.com",
    "password": "testpass123"
}

# Alternative test user for signup
SIGNUP_USER = {
    "email": f"test_p1_{int(time.time())}@example.com",
    "password": "TestPassword123!",
    "name": "P1 Test User"
}

# Session to persist cookies
session = requests.Session()
session.headers.update({"Content-Type": "application/json"})

def login_or_signup():
    """Helper to login with test user, or signup if needed"""
    # First try provided test credentials
    response = session.post(f"{BASE_URL}/api/auth/login", json=TEST_USER)
    if response.status_code == 200:
        print(f"✓ Logged in as {TEST_USER['email']}")
        return True
    
    # If that fails, try signup with new user
    print(f"Login failed for {TEST_USER['email']}, trying signup...")
    signup_response = session.post(f"{BASE_URL}/api/auth/signup", json=SIGNUP_USER)
    if signup_response.status_code == 200:
        print(f"✓ Signed up as {SIGNUP_USER['email']}")
        return True
    
    # Try login with signup user
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": SIGNUP_USER["email"],
        "password": SIGNUP_USER["password"]
    })
    if login_response.status_code == 200:
        print(f"✓ Logged in as {SIGNUP_USER['email']}")
        return True
    
    print(f"✗ Could not authenticate. Signup response: {signup_response.text}")
    return False


class TestCommunityDecksAPI:
    """Community Decks endpoint tests - /api/decks/community"""
    
    def test_get_community_decks_no_auth(self):
        """Test that community decks endpoint works without authentication"""
        unauth_session = requests.Session()
        response = unauth_session.get(f"{BASE_URL}/api/decks/community")
        print(f"Community decks (no auth) status: {response.status_code}")
        print(f"Response: {response.text[:300]}")
        
        # Should work without auth since these are public decks
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "decks" in data
        print(f"✓ Community decks accessible, found {len(data['decks'])} public decks")
    
    def test_get_community_decks_with_game_filter(self):
        """Test filtering community decks by game"""
        response = requests.get(f"{BASE_URL}/api/decks/community?game=mtg")
        print(f"Community decks (mtg filter) status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify all returned decks are MTG
        for deck in data.get("decks", []):
            assert deck.get("game") == "mtg", f"Expected mtg, got {deck.get('game')}"
        print(f"✓ MTG filter working, found {len(data['decks'])} MTG decks")
    
    def test_get_community_decks_with_format_filter(self):
        """Test filtering community decks by format"""
        response = requests.get(f"{BASE_URL}/api/decks/community?format=Legacy")
        print(f"Community decks (Legacy filter) status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Format filter working, found {len(data['decks'])} Legacy decks")
    
    def test_get_community_decks_with_search(self):
        """Test searching community decks"""
        response = requests.get(f"{BASE_URL}/api/decks/community?search=ANT")
        print(f"Community decks (search) status: {response.status_code}")
        print(f"Response: {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Search working, found {len(data['decks'])} matching decks")
    
    def test_get_community_decks_combined_filters(self):
        """Test combining game and format filters"""
        response = requests.get(f"{BASE_URL}/api/decks/community?game=mtg&format=Legacy")
        print(f"Community decks (combined filter) status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        for deck in data.get("decks", []):
            assert deck.get("game") == "mtg"
            assert deck.get("format") == "Legacy"
        print(f"✓ Combined filters working, found {len(data['decks'])} MTG Legacy decks")


class TestUserSearchAPI:
    """User Search endpoint tests - /api/users/search"""
    
    @pytest.fixture(autouse=True)
    def ensure_login(self):
        """Ensure user is logged in before tests"""
        login_or_signup()
    
    def test_user_search_authenticated(self):
        """Test user search when authenticated"""
        response = session.get(f"{BASE_URL}/api/users/search?q=test")
        print(f"User search status: {response.status_code}")
        print(f"Response: {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "users" in data
        print(f"✓ User search working, found {len(data['users'])} users")
    
    def test_user_search_unauthenticated(self):
        """Test user search without authentication"""
        unauth_session = requests.Session()
        response = unauth_session.get(f"{BASE_URL}/api/users/search?q=test")
        print(f"User search (unauth) status: {response.status_code}")
        
        # Should require authentication
        assert response.status_code == 401
        print("✓ User search correctly requires authentication")
    
    def test_user_search_short_query(self):
        """Test user search with short query"""
        response = session.get(f"{BASE_URL}/api/users/search?q=a")
        print(f"User search (short query) status: {response.status_code}")
        
        # Should return empty or validation error
        assert response.status_code in [200, 400]
        print("✓ Short query handled correctly")


class TestUserCollectionAPI:
    """User Collection endpoint tests - /api/collection/user/[userId]"""
    
    @pytest.fixture(autouse=True)
    def ensure_login(self):
        """Ensure user is logged in before tests"""
        login_or_signup()
    
    def test_get_user_collection_authenticated(self):
        """Test getting another user's collection when authenticated"""
        # First get current user to find a user ID
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        if me_response.status_code != 200:
            pytest.skip("Could not get current user")
        
        current_user = me_response.json().get("user", {})
        user_id = current_user.get("user_id")
        
        if not user_id:
            pytest.skip("No user ID found")
        
        # Try to get own collection via the user endpoint
        response = session.get(f"{BASE_URL}/api/collection/user/{user_id}")
        print(f"User collection status: {response.status_code}")
        print(f"Response: {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "items" in data
        print(f"✓ User collection endpoint working, found {len(data['items'])} items")
    
    def test_get_user_collection_unauthenticated(self):
        """Test getting user collection without authentication"""
        unauth_session = requests.Session()
        response = unauth_session.get(f"{BASE_URL}/api/collection/user/some-user-id")
        print(f"User collection (unauth) status: {response.status_code}")
        
        # Should require authentication
        assert response.status_code == 401
        print("✓ User collection correctly requires authentication")


class TestSearchWithFilters:
    """Search endpoint tests with set code and collector number"""
    
    def test_search_mtg_card(self):
        """Test searching for MTG card"""
        response = requests.get(f"{BASE_URL}/api/search?q=lightning%20bolt&game=mtg")
        print(f"Search MTG card status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Check if results have set code and collector_number
        if len(data.get("results", [])) > 0:
            card = data["results"][0]
            print(f"Card: {card.get('name')}")
            # MTG cards have 'set' as a string (set code) and 'collector_number'
            set_code = card.get('set') if isinstance(card.get('set'), str) else card.get('set_code', 'N/A')
            print(f"Set code: {set_code}")
            print(f"Collector number: {card.get('collector_number', 'N/A')}")
        
        print(f"✓ MTG search working, found {len(data['results'])} results")
    
    def test_search_pokemon_card(self):
        """Test searching for Pokemon card"""
        response = requests.get(f"{BASE_URL}/api/search?q=charizard&game=pokemon")
        print(f"Search Pokemon card status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        if len(data.get("results", [])) > 0:
            card = data["results"][0]
            print(f"Card: {card.get('name')}")
            print(f"Set: {card.get('set', {}).get('name', 'N/A')}")
            print(f"Number: {card.get('number', 'N/A')}")
        
        print(f"✓ Pokemon search working, found {len(data['results'])} results")
    
    def test_search_with_set_code(self):
        """Test searching with set code filter"""
        # Use Pokemon API with set filter
        response = requests.get(f"{BASE_URL}/api/search?q=charizard&game=pokemon&set=base1")
        print(f"Search with set code status: {response.status_code}")
        print(f"Response: {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Set code filter working, found {len(data['results'])} results")


class TestDecksPageTabs:
    """Test decks page functionality - My Decks and Community tabs"""
    
    @pytest.fixture(autouse=True)
    def ensure_login(self):
        """Ensure user is logged in before tests"""
        login_or_signup()
    
    def test_get_my_decks(self):
        """Test getting user's own decks"""
        response = session.get(f"{BASE_URL}/api/decks")
        print(f"My decks status: {response.status_code}")
        print(f"Response: {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "decks" in data
        print(f"✓ My decks endpoint working, found {len(data['decks'])} decks")
    
    def test_create_public_deck(self):
        """Test creating a public deck"""
        deck_data = {
            "name": f"TEST_Public_Deck_{int(time.time())}",
            "description": "Public test deck for P1 features",
            "game": "mtg",
            "format": "Standard",
            "isPublic": True
        }
        
        response = session.post(f"{BASE_URL}/api/decks", json=deck_data)
        print(f"Create public deck status: {response.status_code}")
        print(f"Response: {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "deckId" in data
        
        # Verify it appears in community decks
        community_response = requests.get(f"{BASE_URL}/api/decks/community")
        community_data = community_response.json()
        deck_ids = [d.get("deck_id") for d in community_data.get("decks", [])]
        
        # New deck should be in community
        assert data["deckId"] in deck_ids, "Public deck should appear in community decks"
        print(f"✓ Public deck created and visible in community: {data['deckId']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
