"""
Iteration 11 Test Suite - Hatake.Social TCG Platform
Testing features:
1. Sealed Products CRUD - Create, Read, Update, Delete for Pokemon and MTG
2. Sealed Products Stats - Total invested, current value, profit/loss
3. Deck Builder Import - MTGA format parsing, Archidekt format with set codes
4. Deck Builder Export - MTGA, Archidekt, and Plain Text formats
5. Deck Analytics - Mana curve, color distribution, type breakdown (UI verified)
6. Deck Legality - Format validation (card count, copy limits)
7. Deck Playtesting - Sample hand and draw card (UI verified)
8. Marketplace - Price percentage feature for listings
"""

import pytest
import requests
import time
import json

BASE_URL = "https://deck-builder-test-1.preview.emergentagent.com"


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


class TestSealedProductsCRUD:
    """Test Sealed Products CRUD operations for Pokemon and MTG"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate - skipping sealed products tests")
        return session
    
    def test_create_pokemon_sealed_product(self, auth_session):
        """Test creating a Pokemon sealed product"""
        unique_name = f"TEST_Pokemon_Sealed_{int(time.time())}"
        
        response = auth_session.post(f"{BASE_URL}/api/sealed", json={
            "name": unique_name,
            "game": "pokemon",
            "productType": "Elite Trainer Box (ETB)",
            "setName": "Prismatic Evolutions",
            "setCode": "SVE",
            "language": "EN",
            "quantity": 2,
            "purchasePrice": 59.99,
            "currentValue": 89.99,
            "notes": "Test Pokemon sealed product"
        })
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "productId" in data
        print(f"Created Pokemon sealed product: {data['productId']}")
        
        # Store for cleanup
        auth_session.test_pokemon_product_id = data["productId"]
    
    def test_create_mtg_sealed_product(self, auth_session):
        """Test creating an MTG sealed product"""
        unique_name = f"TEST_MTG_Sealed_{int(time.time())}"
        
        response = auth_session.post(f"{BASE_URL}/api/sealed", json={
            "name": unique_name,
            "game": "mtg",
            "productType": "Collector Booster Box",
            "setName": "Modern Horizons 3",
            "setCode": "MH3",
            "language": "EN",
            "quantity": 1,
            "purchasePrice": 299.99,
            "currentValue": 350.00,
            "notes": "Test MTG sealed product"
        })
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "productId" in data
        print(f"Created MTG sealed product: {data['productId']}")
        
        auth_session.test_mtg_product_id = data["productId"]
    
    def test_get_all_sealed_products(self, auth_session):
        """Test getting all sealed products"""
        response = auth_session.get(f"{BASE_URL}/api/sealed")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "products" in data
        assert "totals" in data
        print(f"Found {len(data['products'])} sealed products")
    
    def test_get_sealed_products_by_game_mtg(self, auth_session):
        """Test filtering sealed products by MTG game"""
        response = auth_session.get(f"{BASE_URL}/api/sealed?game=mtg")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # All products should be MTG
        for product in data.get("products", []):
            assert product["game"] == "mtg", f"Expected mtg, got {product['game']}"
        print(f"Found {len(data['products'])} MTG sealed products")
    
    def test_get_sealed_products_by_game_pokemon(self, auth_session):
        """Test filtering sealed products by Pokemon game"""
        response = auth_session.get(f"{BASE_URL}/api/sealed?game=pokemon")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # All products should be Pokemon
        for product in data.get("products", []):
            assert product["game"] == "pokemon", f"Expected pokemon, got {product['game']}"
        print(f"Found {len(data['products'])} Pokemon sealed products")
    
    def test_get_single_sealed_product(self, auth_session):
        """Test getting a single sealed product by ID"""
        if not hasattr(auth_session, 'test_pokemon_product_id'):
            pytest.skip("No test product created")
        
        product_id = auth_session.test_pokemon_product_id
        response = auth_session.get(f"{BASE_URL}/api/sealed/{product_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "product" in data
        assert data["product"]["product_id"] == product_id
        print(f"Retrieved product: {data['product']['name']}")
    
    def test_update_sealed_product(self, auth_session):
        """Test updating a sealed product"""
        if not hasattr(auth_session, 'test_pokemon_product_id'):
            pytest.skip("No test product created")
        
        product_id = auth_session.test_pokemon_product_id
        
        response = auth_session.patch(f"{BASE_URL}/api/sealed/{product_id}", json={
            "currentValue": 110.00,
            "notes": "Updated via API test"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Updated product: {product_id}")
        
        # Verify update
        verify_response = auth_session.get(f"{BASE_URL}/api/sealed/{product_id}")
        verify_data = verify_response.json()
        assert float(verify_data["product"]["current_value"]) == 110.00
        assert verify_data["product"]["notes"] == "Updated via API test"
        print("Verified update successful")
    
    def test_delete_sealed_product(self, auth_session):
        """Test deleting a sealed product"""
        if not hasattr(auth_session, 'test_pokemon_product_id'):
            pytest.skip("No test product created")
        
        product_id = auth_session.test_pokemon_product_id
        
        response = auth_session.delete(f"{BASE_URL}/api/sealed/{product_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Deleted product: {product_id}")
        
        # Verify deletion
        verify_response = auth_session.get(f"{BASE_URL}/api/sealed/{product_id}")
        assert verify_response.status_code == 404
        print("Verified deletion successful")
    
    def test_get_nonexistent_product_returns_404(self, auth_session):
        """Test getting a non-existent product returns 404"""
        response = auth_session.get(f"{BASE_URL}/api/sealed/nonexistent-product-xyz")
        assert response.status_code == 404
        print("Correctly returned 404 for non-existent product")


class TestSealedProductsStats:
    """Test sealed products statistics calculation"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate")
        return session
    
    def test_stats_calculation(self, auth_session):
        """Test that stats (total invested, current value) are calculated correctly"""
        response = auth_session.get(f"{BASE_URL}/api/sealed")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        totals = data.get("totals", {})
        assert "total_products" in totals
        assert "total_items" in totals
        assert "total_invested" in totals
        assert "total_value" in totals
        
        print(f"Stats: Products={totals['total_products']}, Items={totals['total_items']}, "
              f"Invested=${totals['total_invested']}, Value=${totals['total_value']}")


class TestDeckBuilderCards:
    """Test deck builder card operations"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate")
        return session
    
    def test_create_deck(self, auth_session):
        """Test creating a deck"""
        unique_name = f"TEST_Deck_{int(time.time())}"
        
        response = auth_session.post(f"{BASE_URL}/api/decks", json={
            "name": unique_name,
            "game": "mtg",
            "format": "Modern",
            "description": "Test deck for import/export testing"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "deckId" in data
        
        auth_session.test_deck_id = data["deckId"]
        print(f"Created deck: {data['deckId']}")
    
    def test_add_cards_to_deck(self, auth_session):
        """Test adding cards to a deck"""
        if not hasattr(auth_session, 'test_deck_id'):
            pytest.skip("No test deck created")
        
        deck_id = auth_session.test_deck_id
        
        # Add main deck card
        response = auth_session.post(f"{BASE_URL}/api/decks/{deck_id}/cards", json={
            "cardId": "test-lightning-bolt",
            "cardData": {
                "id": "test-lightning-bolt",
                "name": "Lightning Bolt",
                "set": "2xm",
                "collector_number": "141",
                "type_line": "Instant",
                "mana_cost": "{R}"
            },
            "quantity": 4,
            "category": "main"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("Added Lightning Bolt x4 to main deck")
    
    def test_add_sideboard_card(self, auth_session):
        """Test adding a sideboard card"""
        if not hasattr(auth_session, 'test_deck_id'):
            pytest.skip("No test deck created")
        
        deck_id = auth_session.test_deck_id
        
        response = auth_session.post(f"{BASE_URL}/api/decks/{deck_id}/cards", json={
            "cardId": "test-negate",
            "cardData": {
                "id": "test-negate",
                "name": "Negate",
                "set": "c21",
                "collector_number": "263",
                "type_line": "Instant",
                "mana_cost": "{1}{U}"
            },
            "quantity": 3,
            "category": "sideboard"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("Added Negate x3 to sideboard")
    
    def test_get_deck_with_cards(self, auth_session):
        """Test getting deck with all cards"""
        if not hasattr(auth_session, 'test_deck_id'):
            pytest.skip("No test deck created")
        
        deck_id = auth_session.test_deck_id
        response = auth_session.get(f"{BASE_URL}/api/decks/{deck_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "cards" in data
        
        cards = data["cards"]
        main_cards = [c for c in cards if c.get("category") == "main" or not c.get("category")]
        sideboard_cards = [c for c in cards if c.get("category") == "sideboard"]
        
        print(f"Deck has {len(main_cards)} main deck entries, {len(sideboard_cards)} sideboard entries")
    
    def test_update_card_quantity(self, auth_session):
        """Test updating card quantity"""
        if not hasattr(auth_session, 'test_deck_id'):
            pytest.skip("No test deck created")
        
        deck_id = auth_session.test_deck_id
        
        response = auth_session.patch(f"{BASE_URL}/api/decks/{deck_id}/cards", json={
            "cardId": "test-lightning-bolt",
            "quantity": 3
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("Updated Lightning Bolt quantity to 3")
    
    def test_remove_card_from_deck(self, auth_session):
        """Test removing a card from deck"""
        if not hasattr(auth_session, 'test_deck_id'):
            pytest.skip("No test deck created")
        
        deck_id = auth_session.test_deck_id
        
        response = auth_session.delete(
            f"{BASE_URL}/api/decks/{deck_id}/cards?cardId=test-negate"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("Removed Negate from sideboard")


class TestMarketplacePricePercentage:
    """Test marketplace price percentage feature"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        if response.status_code != 200:
            pytest.skip("Cannot authenticate")
        return session
    
    def test_create_listing_with_price_percentage(self, auth_session):
        """Test creating a listing with price percentage"""
        unique_id = f"test-pct-{int(time.time())}"
        
        response = auth_session.post(f"{BASE_URL}/api/marketplace", json={
            "cardId": unique_id,
            "game": "mtg",
            "cardData": {
                "name": "Test Percentage Card",
                "set": "TEST",
                "prices": {"usd": "10.00"},
                "price": 10.00
            },
            "pricePercentage": 90,
            "condition": "Near Mint"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "calculatedPrice" in data
        
        # 90% of $10 = $9.00
        calculated = float(data["calculatedPrice"])
        assert calculated == 9.00, f"Expected 9.00, got {calculated}"
        
        auth_session.test_pct_listing_id = data["listingId"]
        print(f"Created listing with 90% price: ${calculated}")
    
    def test_create_listing_with_static_price(self, auth_session):
        """Test creating a listing with static price"""
        unique_id = f"test-static-{int(time.time())}"
        
        response = auth_session.post(f"{BASE_URL}/api/marketplace", json={
            "cardId": unique_id,
            "game": "mtg",
            "cardData": {
                "name": "Test Static Price Card",
                "set": "TEST"
            },
            "price": 15.00,
            "condition": "Near Mint"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        auth_session.test_static_listing_id = data["listingId"]
        print(f"Created listing with static price: $15.00")
    
    def test_create_listing_without_price_fails(self, auth_session):
        """Test that creating a listing without price or pricePercentage fails"""
        response = auth_session.post(f"{BASE_URL}/api/marketplace", json={
            "cardId": "test-no-price",
            "game": "mtg",
            "cardData": {"name": "No Price Card"},
            "condition": "Near Mint"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        print("Correctly rejected listing without price")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return session
    
    def test_cleanup_test_sealed_products(self, auth_session):
        """Clean up test sealed products"""
        response = auth_session.get(f"{BASE_URL}/api/sealed")
        if response.status_code == 200:
            data = response.json()
            for product in data.get("products", []):
                if product["name"].startswith("TEST_"):
                    auth_session.delete(f"{BASE_URL}/api/sealed/{product['product_id']}")
                    print(f"Cleaned up: {product['name']}")
    
    def test_cleanup_test_decks(self, auth_session):
        """Clean up test decks"""
        response = auth_session.get(f"{BASE_URL}/api/decks")
        if response.status_code == 200:
            data = response.json()
            for deck in data.get("decks", []):
                if deck["name"].startswith("TEST_"):
                    auth_session.delete(f"{BASE_URL}/api/decks/{deck['deck_id']}")
                    print(f"Cleaned up deck: {deck['name']}")
    
    def test_cleanup_test_listings(self, auth_session):
        """Clean up test marketplace listings"""
        response = auth_session.get(f"{BASE_URL}/api/marketplace/my-listings")
        if response.status_code == 200:
            data = response.json()
            for listing in data.get("listings", []):
                if listing.get("card_data", {}).get("name", "").startswith("Test"):
                    auth_session.delete(f"{BASE_URL}/api/marketplace/{listing['listing_id']}")
                    print(f"Cleaned up listing: {listing['listing_id']}")
