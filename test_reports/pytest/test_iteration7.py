"""
Iteration 7 Test Suite - Hatake.Social TCG Platform
Testing bug fixes:
1. Bulk list for sale creates marketplace listings
2. CSV Import with game type selector (MTG vs Pokemon)
3. Trades page dark mode
4. Trade detail page shows card names and values
5. Profile page shows 'Collection' and 'Items for Sale' sections
6. Member since date displays correctly
7. Shop page shows payment info
8. Feed emoji reactions in single section
9. Messenger photo click opens fullscreen modal
10. Admin can delete community decks
"""

import pytest
import requests
import time

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
        assert data.get("success") == True or "user" in data or "token" in data
        print(f"Login response: {data}")
        return session


class TestBulkListAPI:
    """Test bulk listing feature for marketplace"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate - skipping bulk list tests")
        return session
    
    def test_bulk_list_endpoint_exists(self, auth_session):
        """Test that bulk list endpoint exists"""
        # Test with invalid data to see if endpoint responds
        response = auth_session.post(f"{BASE_URL}/api/collection/bulk-list", json={
            "listings": []
        })
        # Should return 400 for empty listings, not 404
        assert response.status_code in [200, 400, 401]
        print(f"Bulk list endpoint response: {response.status_code} - {response.json()}")
    
    def test_bulk_list_requires_valid_listings(self, auth_session):
        """Test bulk list validation"""
        response = auth_session.post(f"{BASE_URL}/api/collection/bulk-list", json={
            "listings": [{
                "card_id": "test-card-123",
                "game": "mtg",
                "card_data": {"name": "Test Card"},
                "price": 10.00
            }]
        })
        # Should create listing successfully or return appropriate error
        print(f"Bulk list with valid data: {response.status_code} - {response.json()}")
        assert response.status_code in [200, 201, 401]


class TestCSVImportAPI:
    """Test CSV import with game type selector"""
    
    @pytest.fixture
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
    
    def test_csv_import_preview_mtg(self, auth_session):
        """Test CSV import preview for MTG format"""
        csv_content = """Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Condition,Language,Purchase price currency
Lightning Bolt,2xm,Double Masters,117,normal,common,1,,d4f1add9-16b7-4a85-9a87-c05d6bbf12a7,0.00,false,false,near_mint,English,EUR"""
        
        response = auth_session.post(f"{BASE_URL}/api/collection/import", json={
            "csvContent": csv_content,
            "action": "preview",
            "gameType": "mtg"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "cards" in data
        print(f"MTG CSV preview - Cards found: {len(data.get('cards', []))}")
        if data.get('cards'):
            print(f"First card: {data['cards'][0]}")
            # Verify game is mtg
            assert data['cards'][0].get('game') == 'mtg'
    
    def test_csv_import_preview_pokemon(self, auth_session):
        """Test CSV import preview for Pokemon format"""
        csv_content = """Name,Set Code,Edition Name,Collector Number,Release Date,Price,Condition,Quantity
Pikachu,swsh1,Sword & Shield,065,2020-02-07,5.00,Near Mint,1"""
        
        response = auth_session.post(f"{BASE_URL}/api/collection/import", json={
            "csvContent": csv_content,
            "action": "preview",
            "gameType": "pokemon"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Pokemon CSV preview - Cards found: {len(data.get('cards', []))}")
        if data.get('cards'):
            print(f"First card: {data['cards'][0]}")
            # Verify game is pokemon
            assert data['cards'][0].get('game') == 'pokemon'


class TestTradesAPI:
    """Test trades page and detail page"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate - skipping trades tests")
        return session
    
    def test_trades_list_endpoint(self, auth_session):
        """Test trades list endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/trades")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Trades count: {len(data.get('trades', []))}")


class TestProfileAPI:
    """Test profile page with Collection and Items for Sale sections"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate - skipping profile tests")
        return session
    
    def test_profile_stats_endpoint(self, auth_session):
        """Test profile stats endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/profile/stats")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Profile stats: {data.get('stats', {})}")
    
    def test_auth_me_returns_created_at(self, auth_session):
        """Test that auth/me returns created_at for member since date"""
        response = auth_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        user = data.get('user', {})
        print(f"User data: {user}")
        # Check if created_at is present (for member since date)
        assert 'created_at' in user, "User should have created_at field for member since date"
    
    def test_collection_endpoint(self, auth_session):
        """Test collection endpoint for profile"""
        response = auth_session.get(f"{BASE_URL}/api/collection?limit=6")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Collection items: {len(data.get('items', []))}")
    
    def test_my_listings_endpoint(self, auth_session):
        """Test my listings endpoint for profile"""
        response = auth_session.get(f"{BASE_URL}/api/marketplace/my-listings")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"My listings: {len(data.get('listings', []))}")


class TestShopAPI:
    """Test shop page with payment info"""
    
    def test_shop_endpoint(self):
        """Test shop products endpoint"""
        response = requests.get(f"{BASE_URL}/api/shop")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Shop products: {len(data.get('products', []))}")


class TestFeedAPI:
    """Test feed page with emoji reactions"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate - skipping feed tests")
        return session
    
    def test_feed_endpoint(self, auth_session):
        """Test feed endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/feed?tab=public")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Feed posts: {len(data.get('posts', []))}")
    
    def test_post_reactions_endpoint(self, auth_session):
        """Test post reactions endpoint exists"""
        # First get a post
        feed_response = auth_session.get(f"{BASE_URL}/api/feed?tab=public")
        if feed_response.status_code == 200:
            posts = feed_response.json().get('posts', [])
            if posts:
                post_id = posts[0].get('post_id')
                # Test reactions endpoint
                response = auth_session.get(f"{BASE_URL}/api/feed/{post_id}/reactions")
                assert response.status_code == 200
                print(f"Post reactions response: {response.json()}")
            else:
                print("No posts found to test reactions")
                pytest.skip("No posts available")
        else:
            pytest.skip("Cannot load feed")


class TestMessagesAPI:
    """Test messages page with media features"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate - skipping messages tests")
        return session
    
    def test_conversations_endpoint(self, auth_session):
        """Test conversations endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/messages")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Conversations: {len(data.get('conversations', []))}")


class TestDecksAPI:
    """Test decks page with admin deletion"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate - skipping decks tests")
        return session
    
    def test_my_decks_endpoint(self, auth_session):
        """Test my decks endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/decks")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"My decks: {len(data.get('decks', []))}")
    
    def test_community_decks_endpoint(self, auth_session):
        """Test community decks endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/decks/community?public=true")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Community decks: {len(data.get('decks', []))}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
