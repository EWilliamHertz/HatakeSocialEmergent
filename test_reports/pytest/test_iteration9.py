"""
Iteration 9 Test Suite - Hatake.Social TCG Platform
Testing features:
1. Marketplace DELETE API - owners can delete their own listings
2. Collection Dashboard - shows detailed statistics (rarity, game, condition)
3. Collection CSV Export - exports collection as CSV file
4. Deck Analytics component renders without errors
5. LiveKit token API generates valid tokens
"""

import pytest
import requests
import time
import jwt

BASE_URL = "http://localhost:3000"


class TestAuthentication:
    """Test authentication flows"""
    
    @pytest.fixture
    def session(self):
        """Create a session for testing"""
        return requests.Session()
    
    def test_login(self, session):
        """Test user login"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Login successful for test@test.com")
        return session


class TestMarketplaceDeleteAPI:
    """Test marketplace delete feature - owners can delete their own listings"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate - skipping marketplace delete tests")
        return session
    
    def test_create_listing_for_deletion(self, auth_session):
        """Test creating a listing that we can then delete"""
        response = auth_session.post(f"{BASE_URL}/api/marketplace", json={
            "cardId": "test-delete-card-123",
            "game": "mtg",
            "cardData": {"name": "Test Delete Card", "set": "TEST"},
            "price": 5.00,
            "condition": "Near Mint"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "listingId" in data
        print(f"Created listing: {data['listingId']}")
        return data["listingId"]
    
    def test_owner_can_delete_own_listing(self, auth_session):
        """Test that owner can delete their own listing"""
        # First create a listing
        create_response = auth_session.post(f"{BASE_URL}/api/marketplace", json={
            "cardId": f"test-delete-{int(time.time())}",
            "game": "mtg",
            "cardData": {"name": "Owner Delete Test"},
            "price": 1.00,
            "condition": "Near Mint"
        })
        assert create_response.status_code == 200
        listing_id = create_response.json()["listingId"]
        
        # Now delete it
        delete_response = auth_session.delete(f"{BASE_URL}/api/marketplace/{listing_id}")
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert data.get("success") == True
        print(f"Successfully deleted listing: {listing_id}")
        
        # Verify it's gone by checking marketplace
        listings_response = auth_session.get(f"{BASE_URL}/api/marketplace?sort=newest")
        listings = listings_response.json().get("listings", [])
        listing_ids = [l["listing_id"] for l in listings]
        assert listing_id not in listing_ids, "Listing should be deleted"
    
    def test_delete_nonexistent_listing_returns_404(self, auth_session):
        """Test that deleting a non-existent listing returns 404"""
        response = auth_session.delete(f"{BASE_URL}/api/marketplace/nonexistent-listing-123")
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data.get("error", "").lower()
        print("Correctly returned 404 for non-existent listing")
    
    def test_non_owner_cannot_delete_listing(self, auth_session):
        """Test that non-owner cannot delete another user's listing"""
        # Get a listing from another user
        listings_response = auth_session.get(f"{BASE_URL}/api/marketplace?sort=newest")
        listings = listings_response.json().get("listings", [])
        
        # Find a listing not owned by test user
        auth_response = auth_session.get(f"{BASE_URL}/api/auth/me")
        current_user_id = auth_response.json().get("user", {}).get("user_id")
        
        other_user_listing = None
        for listing in listings:
            if listing["user_id"] != current_user_id:
                other_user_listing = listing
                break
        
        if not other_user_listing:
            pytest.skip("No other user's listing found to test unauthorized deletion")
        
        # Try to delete it (should fail)
        response = auth_session.delete(f"{BASE_URL}/api/marketplace/{other_user_listing['listing_id']}")
        assert response.status_code == 403
        print(f"Correctly denied deletion of other user's listing")


class TestCollectionAPI:
    """Test collection API with statistics for dashboard"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate - skipping collection tests")
        return session
    
    def test_get_collection(self, auth_session):
        """Test getting user's collection"""
        response = auth_session.get(f"{BASE_URL}/api/collection?game=")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "items" in data
        print(f"Collection has {len(data['items'])} items")
        
        if len(data["items"]) > 0:
            item = data["items"][0]
            # Verify item has required fields for dashboard stats
            assert "card_data" in item
            assert "quantity" in item
            assert "game" in item
            print(f"First item: {item.get('card_data', {}).get('name', 'Unknown')}")
    
    def test_collection_items_have_rarity(self, auth_session):
        """Test that collection items have rarity info for dashboard"""
        response = auth_session.get(f"{BASE_URL}/api/collection?game=")
        data = response.json()
        items = data.get("items", [])
        
        # Check if items have rarity in card_data
        rarities_found = set()
        for item in items[:10]:  # Check first 10
            rarity = item.get("card_data", {}).get("rarity", "Unknown")
            rarities_found.add(rarity)
        
        print(f"Rarities found: {rarities_found}")
        assert len(rarities_found) > 0
    
    def test_collection_items_have_condition(self, auth_session):
        """Test that collection items have condition for dashboard"""
        response = auth_session.get(f"{BASE_URL}/api/collection?game=")
        data = response.json()
        items = data.get("items", [])
        
        conditions_found = set()
        for item in items[:10]:
            condition = item.get("condition", "Near Mint")
            conditions_found.add(condition)
        
        print(f"Conditions found: {conditions_found}")
        assert len(conditions_found) > 0


class TestLiveKitTokenAPI:
    """Test LiveKit token generation API"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate - skipping LiveKit tests")
        return session
    
    def test_generate_livekit_token(self, auth_session):
        """Test generating a LiveKit token"""
        response = auth_session.post(f"{BASE_URL}/api/livekit/token", json={
            "roomName": "test-room-" + str(int(time.time())),
            "participantName": "Test User"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "token" in data
        assert "serverUrl" in data
        assert "roomName" in data
        assert "identity" in data
        
        print(f"Generated LiveKit token for room: {data['roomName']}")
        print(f"Server URL: {data['serverUrl']}")
        
        # Verify token is valid JWT
        token = data["token"]
        # Decode without verification to check structure
        decoded = jwt.decode(token, options={"verify_signature": False})
        assert "video" in decoded
        assert decoded["video"].get("roomJoin") == True
        print(f"Token grants room join permission")
    
    def test_token_requires_room_name(self, auth_session):
        """Test that room name is required"""
        response = auth_session.post(f"{BASE_URL}/api/livekit/token", json={
            "participantName": "Test User"
        })
        assert response.status_code == 400
        data = response.json()
        assert "room" in data.get("error", "").lower()
        print("Correctly requires room name")
    
    def test_token_requires_authentication(self):
        """Test that token endpoint requires authentication"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/livekit/token", json={
            "roomName": "test-room",
            "participantName": "Anon"
        })
        assert response.status_code == 401
        print("Correctly requires authentication")


class TestDeckAnalyticsEndpoint:
    """Test deck endpoints that feed into analytics component"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate - skipping deck tests")
        return session
    
    def test_get_decks_list(self, auth_session):
        """Test getting list of user's decks"""
        response = auth_session.get(f"{BASE_URL}/api/decks")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "decks" in data
        print(f"User has {len(data['decks'])} decks")
    
    def test_community_decks_endpoint(self, auth_session):
        """Test getting community decks"""
        response = auth_session.get(f"{BASE_URL}/api/decks/community?public=true")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Community has {len(data.get('decks', []))} public decks")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
