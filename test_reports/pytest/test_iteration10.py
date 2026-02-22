"""
Iteration 10 Test Suite - Hatake.Social TCG Platform
Testing features:
1. Marketplace Delete - Owner can delete their own listing via API
2. Wishlists Feature - CRUD operations (create, view, delete)
3. Trade Ratings API - POST /api/trades/ratings
4. User Reputation API - GET /api/trades/ratings?userId
5. CSV Import - Preview and import for Pokemon and MTG
"""

import pytest
import requests
import time
import json

BASE_URL = "https://hatake-tcg-preview.preview.emergentagent.com"


class TestAuthentication:
    """Test authentication flows for session management"""
    
    @pytest.fixture(scope="class")
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


class TestMarketplaceDelete:
    """Test marketplace delete feature - owners can delete their own listings"""
    
    @pytest.fixture(scope="class")
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
    
    def test_create_and_delete_listing(self, auth_session):
        """Test creating a listing and then deleting it"""
        unique_id = f"test-delete-{int(time.time())}"
        
        # Create listing
        create_response = auth_session.post(f"{BASE_URL}/api/marketplace", json={
            "cardId": unique_id,
            "game": "mtg",
            "cardData": {"name": "Test Delete Card", "set": "TEST"},
            "price": 5.00,
            "condition": "Near Mint"
        })
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        data = create_response.json()
        assert data.get("success") == True
        listing_id = data["listingId"]
        print(f"Created listing: {listing_id}")
        
        # Delete listing
        delete_response = auth_session.delete(f"{BASE_URL}/api/marketplace/{listing_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        delete_data = delete_response.json()
        assert delete_data.get("success") == True
        print(f"Successfully deleted listing: {listing_id}")
    
    def test_delete_nonexistent_listing_returns_404(self, auth_session):
        """Test that deleting a non-existent listing returns 404"""
        response = auth_session.delete(f"{BASE_URL}/api/marketplace/nonexistent-listing-xyz-123")
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data.get("error", "").lower()
        print("Correctly returned 404 for non-existent listing")


class TestWishlistsCRUD:
    """Test wishlists CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate - skipping wishlists tests")
        return session
    
    def test_create_wishlist(self, auth_session):
        """Test creating a new wishlist"""
        unique_name = f"Test Wishlist {int(time.time())}"
        
        response = auth_session.post(f"{BASE_URL}/api/wishlists", json={
            "name": unique_name,
            "description": "Created for testing",
            "isPublic": True
        })
        assert response.status_code == 200, f"Create wishlist failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "wishlist" in data
        assert data["wishlist"]["name"] == unique_name
        print(f"Created wishlist: {data['wishlist']['wishlist_id']}")
        return data["wishlist"]["wishlist_id"]
    
    def test_get_user_wishlists(self, auth_session):
        """Test getting user's wishlists"""
        response = auth_session.get(f"{BASE_URL}/api/wishlists")
        assert response.status_code == 200, f"Get wishlists failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "wishlists" in data
        print(f"User has {len(data['wishlists'])} wishlists")
    
    def test_get_public_wishlists(self, auth_session):
        """Test getting public wishlists"""
        response = auth_session.get(f"{BASE_URL}/api/wishlists?public=true")
        assert response.status_code == 200, f"Get public wishlists failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"Found {len(data.get('wishlists', []))} public wishlists")
    
    def test_wishlist_crud_full_cycle(self, auth_session):
        """Test full CRUD cycle: create, read, update, delete"""
        # CREATE
        unique_name = f"CRUD Test {int(time.time())}"
        create_response = auth_session.post(f"{BASE_URL}/api/wishlists", json={
            "name": unique_name,
            "description": "Full CRUD test",
            "isPublic": False
        })
        assert create_response.status_code == 200
        wishlist_id = create_response.json()["wishlist"]["wishlist_id"]
        print(f"Created wishlist: {wishlist_id}")
        
        # READ
        get_response = auth_session.get(f"{BASE_URL}/api/wishlists/{wishlist_id}")
        assert get_response.status_code == 200
        wishlist = get_response.json().get("wishlist", {})
        assert wishlist["name"] == unique_name
        print(f"Read wishlist: {wishlist['name']}")
        
        # UPDATE
        update_response = auth_session.put(f"{BASE_URL}/api/wishlists/{wishlist_id}", json={
            "name": f"{unique_name} - Updated",
            "isPublic": True
        })
        assert update_response.status_code == 200
        print(f"Updated wishlist")
        
        # Verify update
        verify_response = auth_session.get(f"{BASE_URL}/api/wishlists/{wishlist_id}")
        updated_wishlist = verify_response.json().get("wishlist", {})
        assert "Updated" in updated_wishlist["name"]
        assert updated_wishlist["is_public"] == True
        
        # DELETE
        delete_response = auth_session.delete(f"{BASE_URL}/api/wishlists/{wishlist_id}")
        assert delete_response.status_code == 200
        assert delete_response.json().get("success") == True
        print(f"Deleted wishlist: {wishlist_id}")
        
        # Verify deletion
        get_deleted_response = auth_session.get(f"{BASE_URL}/api/wishlists/{wishlist_id}")
        assert get_deleted_response.status_code == 404
        print("Verified wishlist is deleted (404)")


class TestTradeRatingsAPI:
    """Test trade ratings POST and GET endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate - skipping trade ratings tests")
        return session
    
    def test_get_user_ratings_empty(self, auth_session):
        """Test getting ratings for user with no ratings"""
        # Use a non-existent user ID to test empty state
        response = auth_session.get(f"{BASE_URL}/api/trades/ratings?userId=nonexistent-user")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("ratings") == []
        assert data["stats"]["totalRatings"] == 0
        print("Empty ratings response structure is correct")
    
    def test_get_user_ratings_endpoint_structure(self, auth_session):
        """Test the ratings endpoint returns correct structure"""
        # First get current user
        me_response = auth_session.get(f"{BASE_URL}/api/auth/me")
        user_id = me_response.json().get("user", {}).get("user_id")
        
        response = auth_session.get(f"{BASE_URL}/api/trades/ratings?userId={user_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "ratings" in data
        assert "stats" in data
        assert "totalRatings" in data["stats"]
        assert "averageRating" in data["stats"]
        assert "positiveRatings" in data["stats"]
        print(f"Ratings structure correct. Total: {data['stats']['totalRatings']}, Avg: {data['stats']['averageRating']}")
    
    def test_post_rating_requires_trade_id(self, auth_session):
        """Test that posting a rating requires trade ID"""
        response = auth_session.post(f"{BASE_URL}/api/trades/ratings", json={
            "ratedUserId": "some-user",
            "rating": 5,
            "comment": "Great trade!"
        })
        # Should return 400 for missing tradeId
        assert response.status_code == 400
        assert "trade" in response.json().get("error", "").lower() or "required" in response.json().get("error", "").lower()
        print("Correctly validates trade ID is required")
    
    def test_post_rating_validates_rating_range(self, auth_session):
        """Test that rating must be between 1 and 5"""
        response = auth_session.post(f"{BASE_URL}/api/trades/ratings", json={
            "tradeId": "test-trade-123",
            "ratedUserId": "some-user",
            "rating": 10,  # Invalid - should be 1-5
            "comment": "Invalid rating"
        })
        # Should return 400 for invalid rating or 404 for non-existent trade
        assert response.status_code in [400, 404]
        print(f"Response for invalid rating: {response.status_code}")


class TestUserReputationAPI:
    """Test user reputation display via ratings API"""
    
    def test_get_reputation_without_auth(self):
        """Test getting user reputation without authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/trades/ratings?userId=any-user-id")
        assert response.status_code == 200  # Reputation is public
        data = response.json()
        assert data.get("success") == True
        assert "stats" in data
        print("Reputation endpoint is publicly accessible")
    
    def test_reputation_stats_structure(self):
        """Test reputation stats have correct structure"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/trades/ratings?userId=test-user-123")
        assert response.status_code == 200
        data = response.json()
        
        stats = data.get("stats", {})
        assert isinstance(stats.get("totalRatings"), int)
        assert isinstance(stats.get("averageRating"), (int, float))
        assert isinstance(stats.get("positiveRatings"), int)
        print(f"Stats structure: total={stats['totalRatings']}, avg={stats['averageRating']}, positive={stats['positiveRatings']}")


class TestCSVImport:
    """Test CSV import functionality for Pokemon and MTG cards"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate - skipping CSV import tests")
        return session
    
    def test_csv_preview_mtg(self, auth_session):
        """Test MTG CSV preview action"""
        # ManaBox format CSV content
        csv_content = """Manabox ID,Scryfall ID,Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,Mana box ID,Purchase price,Condition
,8f4f5e3e-6e9c-4c85-9d26-27b8c4c36ed1,Lightning Bolt,lea,Limited Edition Alpha,161,false,common,1,,2.50,Near Mint
,7d1f4d5e-5f5c-4e7a-8f5e-6b4e8c9a7f2d,Counterspell,5ed,Fifth Edition,85,false,common,2,,0.50,Lightly Played"""
        
        response = auth_session.post(f"{BASE_URL}/api/collection/import", json={
            "csvContent": csv_content,
            "action": "preview",
            "gameType": "mtg"
        })
        assert response.status_code == 200, f"Preview failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "preview" in data or "cards" in data
        cards = data.get("preview") or data.get("cards", [])
        assert len(cards) >= 1
        print(f"MTG CSV preview returned {len(cards)} cards")
        
        # Verify card structure
        card = cards[0]
        assert "name" in card
        assert "setCode" in card or "setName" in card
        print(f"First card: {card.get('name')}")
    
    def test_csv_preview_pokemon(self, auth_session):
        """Test Pokemon CSV preview action"""
        # Pokemon TCG format CSV content
        csv_content = """Name,Set Code,Edition Name,Collector Number,Quantity,Condition,Price
Pikachu,swsh1,Sword & Shield,65,1,Near Mint,5.00
Charizard,sv03,Obsidian Flames,125,2,Lightly Played,25.00"""
        
        response = auth_session.post(f"{BASE_URL}/api/collection/import", json={
            "csvContent": csv_content,
            "action": "preview",
            "gameType": "pokemon"
        })
        assert response.status_code == 200, f"Preview failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        cards = data.get("preview") or data.get("cards", [])
        assert len(cards) >= 1
        print(f"Pokemon CSV preview returned {len(cards)} cards")
        
        # Verify card structure
        card = cards[0]
        assert card.get("game") == "pokemon"
        print(f"First Pokemon card: {card.get('name')}")
    
    def test_csv_import_mtg(self, auth_session):
        """Test actually importing MTG cards"""
        unique_id = str(int(time.time()))
        csv_content = f"""Manabox ID,Scryfall ID,Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,Mana box ID,Purchase price,Condition
,test-scryfall-{unique_id},Test Import Card {unique_id},tst,Test Set,001,false,common,1,,1.00,Near Mint"""
        
        response = auth_session.post(f"{BASE_URL}/api/collection/import", json={
            "csvContent": csv_content,
            "action": "import",
            "gameType": "mtg"
        })
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("imported", 0) >= 1
        print(f"Successfully imported {data.get('imported')} MTG cards")
    
    def test_csv_requires_content(self, auth_session):
        """Test that CSV content is required"""
        response = auth_session.post(f"{BASE_URL}/api/collection/import", json={
            "action": "preview",
            "gameType": "mtg"
        })
        assert response.status_code == 400
        assert "csv" in response.json().get("error", "").lower() or "content" in response.json().get("error", "").lower()
        print("Correctly validates CSV content is required")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
