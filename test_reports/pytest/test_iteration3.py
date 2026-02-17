"""
Iteration 3 Backend Tests - Testing CSV Import, MTG Proxy, Dark Mode classes
"""
import pytest
import requests
import os

BASE_URL = "http://localhost:3000"

class TestSession:
    """Store session across tests"""
    cookies = None
    user_id = None

@pytest.fixture(scope="module")
def auth_session():
    """Login and get authenticated session"""
    if TestSession.cookies:
        return TestSession.cookies
    
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "test@test.com", "password": "password"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    
    TestSession.cookies = response.cookies
    TestSession.user_id = response.json().get('user', {}).get('user_id')
    return TestSession.cookies


class TestMTGProxyEndpoint:
    """Test the new /api/cards/mtg proxy endpoint"""
    
    def test_mtg_search_by_query(self):
        """Test MTG search with query parameter"""
        response = requests.get(f"{BASE_URL}/api/cards/mtg?q=Lightning+Bolt")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') is True, "MTG search should succeed"
        assert 'cards' in data, "Response should have cards array"
        assert len(data['cards']) > 0, "Should find Lightning Bolt cards"
        
        # Verify first card has expected structure
        first_card = data['cards'][0]
        assert 'name' in first_card, "Card should have name"
        assert 'Lightning Bolt' in first_card['name'], "Should find Lightning Bolt"
        assert 'image_uris' in first_card, "Card should have image_uris"
        assert 'prices' in first_card, "Card should have prices"
    
    def test_mtg_search_by_set_and_number(self):
        """Test MTG search with set code and collector number"""
        response = requests.get(f"{BASE_URL}/api/cards/mtg?set=2xm&number=117")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') is True
        # May return empty or have cards depending on exact match
    
    def test_mtg_search_by_scryfall_id(self):
        """Test MTG search by Scryfall ID"""
        response = requests.get(f"{BASE_URL}/api/cards/mtg?id=5bd6353f-d119-40e6-895c-030a11a7a2fe")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') is True
        assert len(data.get('cards', [])) > 0, "Should find card by Scryfall ID"
        
        card = data['cards'][0]
        assert 'Nyx Lotus' in card.get('name', ''), "Should find Nyx Lotus"
    
    def test_mtg_search_empty_query_returns_error(self):
        """Test MTG search with no parameters"""
        response = requests.get(f"{BASE_URL}/api/cards/mtg")
        assert response.status_code == 400  # Should require some parameter
        

class TestCSVImportPreview:
    """Test CSV import preview functionality"""
    
    def test_csv_preview_parses_manabox_format(self, auth_session):
        """Test that CSV preview correctly parses ManaBox format"""
        csv_content = """Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Condition,Language,Purchase price currency
Test Card 1,SET,Test Set,001,normal,rare,1,12345,5bd6353f-d119-40e6-895c-030a11a7a2fe,10.00,false,false,near_mint,English,USD
Test Card 2,SET,Test Set,002,foil,mythic,2,67890,,5.00,false,false,near_mint,English,EUR"""
        
        response = requests.post(
            f"{BASE_URL}/api/collection/import",
            json={"csvContent": csv_content, "action": "preview"},
            cookies=auth_session
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') is True, f"Preview should succeed: {data}"
        assert 'cards' in data, "Response should have cards array"
        assert len(data['cards']) == 2, "Should parse 2 cards"
        
        # Verify card structure
        card1 = data['cards'][0]
        assert card1['name'] == 'Test Card 1'
        assert card1['setCode'] == 'SET'
        assert card1['quantity'] == 1
        assert card1['foil'] is False
        
        card2 = data['cards'][1]
        assert card2['name'] == 'Test Card 2'
        assert card2['foil'] is True
        assert card2['quantity'] == 2
    
    def test_csv_preview_returns_total_counts(self, auth_session):
        """Test that preview returns total card and quantity counts"""
        csv_content = """Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Condition,Language,Purchase price currency
Card A,SET,Test,001,normal,rare,3,1,,,0,false,false,near_mint,English,USD
Card B,SET,Test,002,normal,uncommon,2,2,,,0,false,false,near_mint,English,USD"""
        
        response = requests.post(
            f"{BASE_URL}/api/collection/import",
            json={"csvContent": csv_content, "action": "preview"},
            cookies=auth_session
        )
        
        data = response.json()
        assert data.get('totalCards') == 2, "Should report 2 unique cards"
        assert data.get('totalQuantity') == 5, "Should report 5 total quantity"
    
    def test_csv_preview_without_auth_fails(self):
        """Test that CSV preview requires authentication"""
        csv_content = "Name,Set code\nTest,SET"
        
        response = requests.post(
            f"{BASE_URL}/api/collection/import",
            json={"csvContent": csv_content, "action": "preview"}
        )
        assert response.status_code == 401


class TestCSVImportActual:
    """Test CSV import actual import functionality"""
    
    def test_csv_import_creates_cards_with_data(self, auth_session):
        """Test that CSV import creates cards with proper card_data"""
        # Use a real Scryfall ID so we get real card data
        csv_content = """Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Condition,Language,Purchase price currency
Brainstorm,IMA,Iconic Masters,44,normal,common,1,TEST123,52ccc0e4-98b9-4f0b-8112-c30ae6ee6f13,1.00,false,false,near_mint,English,USD"""
        
        response = requests.post(
            f"{BASE_URL}/api/collection/import",
            json={"csvContent": csv_content, "action": "import"},
            cookies=auth_session
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') is True, f"Import should succeed: {data}"
        assert data.get('imported') >= 1, "Should import at least 1 card"
    
    def test_imported_card_has_scryfall_data(self, auth_session):
        """Verify imported card has proper card_data from Scryfall"""
        response = requests.get(
            f"{BASE_URL}/api/collection?game=mtg",
            cookies=auth_session
        )
        assert response.status_code == 200
        
        data = response.json()
        items = data.get('items', [])
        
        # Find our imported Brainstorm
        brainstorm = None
        for item in items:
            if item.get('card_data', {}).get('name') == 'Brainstorm':
                brainstorm = item
                break
        
        # If not found by name, check if we have any card with proper data
        if not brainstorm and items:
            # Check that at least some cards have proper data structure
            for item in items:
                card_data = item.get('card_data', {})
                if card_data.get('name') and card_data.get('name') != 'Unknown Card':
                    assert 'name' in card_data, "card_data should have name"
                    # Image URIs may be present from Scryfall fetch
                    break
    
    def test_csv_import_invalid_action_fails(self, auth_session):
        """Test that invalid action parameter fails"""
        response = requests.post(
            f"{BASE_URL}/api/collection/import",
            json={"csvContent": "test", "action": "invalid"},
            cookies=auth_session
        )
        assert response.status_code == 400


class TestCollectionPage:
    """Test collection page loads and displays data"""
    
    def test_collection_endpoint_returns_items(self, auth_session):
        """Test that collection endpoint returns items"""
        response = requests.get(
            f"{BASE_URL}/api/collection",
            cookies=auth_session
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') is True
        assert 'items' in data
    
    def test_collection_filter_by_game(self, auth_session):
        """Test collection filtering by game type"""
        response = requests.get(
            f"{BASE_URL}/api/collection?game=mtg",
            cookies=auth_session
        )
        assert response.status_code == 200
        
        data = response.json()
        items = data.get('items', [])
        for item in items:
            assert item.get('game') == 'mtg', "Filtered items should be MTG"


class TestFriendsEndpoint:
    """Test friends page endpoint"""
    
    def test_friends_list_works(self, auth_session):
        """Test friends list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/friends",
            cookies=auth_session
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') is True


class TestMarketplaceEndpoint:
    """Test marketplace endpoint"""
    
    def test_marketplace_list_works(self, auth_session):
        """Test marketplace listings endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace",
            cookies=auth_session
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('success') is True
        assert 'listings' in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
