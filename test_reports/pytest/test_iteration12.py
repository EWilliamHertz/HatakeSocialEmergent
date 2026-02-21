"""
Iteration 12 - Mobile App Backend API Tests
Tests for: Login API, Collection API with Bearer token, Marketplace API, Auth/Me endpoint
Focus on mobile app authentication and data retrieval with Bearer token
"""
import pytest
import requests
import os

# Use production URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://hatake-preview-1.preview.emergentagent.com')
if BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')

TEST_USER_EMAIL = "test@test.com"
TEST_USER_PASSWORD = "password"


class TestMobileAppLogin:
    """Test mobile app login functionality"""
    
    def test_login_returns_token(self):
        """Test that login returns a Bearer token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Login should return success=True"
        assert "token" in data, "Login should return a token"
        assert "user" in data, "Login should return user data"
        assert isinstance(data["token"], str), "Token should be a string"
        assert len(data["token"]) > 0, "Token should not be empty"
        
        # Validate user data structure
        user = data["user"]
        assert "user_id" in user, "User should have user_id"
        assert "email" in user, "User should have email"
        assert user["email"] == TEST_USER_EMAIL, "Email should match"
        print(f"Login successful, token length: {len(data['token'])}")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": "wrongpassword"}
        )
        # Should return 401 or 400 with error
        assert response.status_code in [400, 401], f"Expected auth error: {response.text}"


class TestBearerTokenAuth:
    """Test Bearer token authentication for mobile app APIs"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token from login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_collection_with_bearer_token(self, auth_token):
        """Test /api/collection with Bearer token auth"""
        response = requests.get(
            f"{BASE_URL}/api/collection",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Collection API failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Collection should return success=True"
        assert "items" in data, "Collection should return items"
        assert isinstance(data["items"], list), "Items should be a list"
        print(f"Collection returned {len(data['items'])} items")
    
    def test_collection_without_auth(self):
        """Test /api/collection without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/collection")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_marketplace_with_bearer_token(self, auth_token):
        """Test /api/marketplace with Bearer token auth"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Marketplace API failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Marketplace should return success=True"
        assert "listings" in data, "Marketplace should return listings"
        assert isinstance(data["listings"], list), "Listings should be a list"
        print(f"Marketplace returned {len(data['listings'])} listings")
    
    def test_auth_me_with_bearer_token(self, auth_token):
        """Test /api/auth/me returns user data with Bearer token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        
        data = response.json()
        assert "user" in data, "Should return user data"
        assert data["user"]["email"] == TEST_USER_EMAIL, "Email should match"
        print(f"Auth/me returned user: {data['user']['name']}")


class TestCollectionData:
    """Test collection data structure and image URLs"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token from login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        return response.json()["token"]
    
    def test_pokemon_card_has_image_field(self, auth_token):
        """Test that Pokemon cards have the 'image' field from TCGdex"""
        response = requests.get(
            f"{BASE_URL}/api/collection?game=pokemon",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        pokemon_items = data.get("items", [])
        
        if len(pokemon_items) > 0:
            # Check first Pokemon card with card_data
            for item in pokemon_items:
                card_data = item.get("card_data", {})
                if card_data:
                    # TCGdex format uses 'image' field (not 'images.large/small')
                    # Or it could have 'images' with large/small
                    has_image = "image" in card_data or "images" in card_data
                    assert has_image, f"Pokemon card should have image data: {card_data.keys()}"
                    print(f"Pokemon card '{card_data.get('name')}' has image data")
                    break
        else:
            pytest.skip("No Pokemon cards in collection to test")
    
    def test_mtg_card_has_image_uris(self, auth_token):
        """Test that MTG cards have image_uris from Scryfall"""
        response = requests.get(
            f"{BASE_URL}/api/collection?game=mtg",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        mtg_items = data.get("items", [])
        
        if len(mtg_items) > 0:
            # Find an MTG card with actual Scryfall image data
            for item in mtg_items:
                card_data = item.get("card_data", {})
                if card_data and card_data.get("image_uris"):
                    image_uris = card_data["image_uris"]
                    assert "normal" in image_uris or "small" in image_uris, \
                        "MTG card should have normal or small image URI"
                    print(f"MTG card '{card_data.get('name')}' has image_uris")
                    break
            else:
                print("No MTG cards with image_uris found (test data may not have images)")
        else:
            pytest.skip("No MTG cards in collection to test")


class TestMarketplaceData:
    """Test marketplace listing data structure"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token from login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        return response.json()["token"]
    
    def test_marketplace_listing_has_card_data(self, auth_token):
        """Test that marketplace listings have proper card_data with images"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        listings = data.get("listings", [])
        
        if len(listings) > 0:
            listing = listings[0]
            assert "card_data" in listing, "Listing should have card_data"
            assert "price" in listing, "Listing should have price"
            assert "condition" in listing, "Listing should have condition"
            assert "seller_name" in listing, "Listing should have seller_name"
            
            # Check for image data in card_data
            card_data = listing["card_data"]
            has_image = ("image_uris" in card_data or "images" in card_data or 
                        "image" in card_data)
            assert has_image, f"Listing card_data should have image: {card_data.keys()}"
            print(f"Marketplace listing '{card_data.get('name')}' verified")
        else:
            pytest.skip("No marketplace listings to test")


class TestFeedAPI:
    """Test feed/social API for mobile app"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token from login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        return response.json()["token"]
    
    def test_feed_endpoint(self, auth_token):
        """Test /api/feed returns posts"""
        response = requests.get(
            f"{BASE_URL}/api/feed?type=public",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # Feed might return 200 with posts or empty array
        assert response.status_code == 200, f"Feed API failed: {response.text}"
        
        data = response.json()
        # Check structure - may have success, posts
        if "posts" in data:
            assert isinstance(data["posts"], list), "Posts should be a list"
            print(f"Feed returned {len(data['posts'])} posts")
        else:
            print(f"Feed response: {data}")


class TestGameFiltering:
    """Test game filtering for collection and marketplace"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token from login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        return response.json()["token"]
    
    def test_collection_filter_pokemon(self, auth_token):
        """Test filtering collection by pokemon"""
        response = requests.get(
            f"{BASE_URL}/api/collection?game=pokemon",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        items = data.get("items", [])
        # All items should be pokemon
        for item in items:
            assert item["game"] == "pokemon", f"Expected pokemon, got {item['game']}"
        print(f"Pokemon filter returned {len(items)} items")
    
    def test_collection_filter_mtg(self, auth_token):
        """Test filtering collection by mtg"""
        response = requests.get(
            f"{BASE_URL}/api/collection?game=mtg",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        items = data.get("items", [])
        # All items should be mtg
        for item in items:
            assert item["game"] == "mtg", f"Expected mtg, got {item['game']}"
        print(f"MTG filter returned {len(items)} items")
    
    def test_marketplace_filter_pokemon(self, auth_token):
        """Test filtering marketplace by pokemon"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace?game=pokemon",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        listings = data.get("listings", [])
        # All listings should be pokemon
        for listing in listings:
            assert listing["game"] == "pokemon", f"Expected pokemon, got {listing['game']}"
        print(f"Pokemon marketplace filter returned {len(listings)} listings")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
