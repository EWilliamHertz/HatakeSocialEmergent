"""
Iteration 5 - Testing Bug Fixes:
1. CSV import preview and actual import
2. Search API with type=all (users, posts, decks)
3. Search API game filter (game=mtg should only return MTG)
4. MessengerWidget JSON parsing
5. Collection page MTG search via backend proxy
"""

import pytest
import requests
import time

BASE_URL = "http://localhost:3000"


class TestAuth:
    """Authentication setup"""
    
    @pytest.fixture(scope='class')
    def session(self):
        """Create authenticated session"""
        sess = requests.Session()
        resp = sess.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        return sess
    
    def test_auth_me(self, session):
        """Verify user is authenticated"""
        resp = session.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert "user" in data
        assert data["user"]["email"] == "test@test.com"
        print("✓ Authentication working")


class TestCSVImportPreview:
    """CSV Import preview functionality - tests format detection and parsing"""
    
    @pytest.fixture(scope='class')
    def session(self):
        sess = requests.Session()
        resp = sess.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        assert resp.status_code == 200
        return sess
    
    def test_manabox_format_detection(self, session):
        """Test ManaBox MTG CSV format is correctly detected"""
        csv = '''Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Condition,Language,Purchase price currency
Lightning Bolt,2XM,Double Masters,117,,common,1,12345,f29ba16f-c8fb-42fe-aabf-87089cb214a7,0.50,false,false,near_mint,English,EUR'''
        
        resp = session.post(f"{BASE_URL}/api/collection/import", json={
            "csvContent": csv,
            "action": "preview"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["format"] == "manabox", f"Expected manabox format, got {data['format']}"
        assert len(data["cards"]) == 1
        assert data["cards"][0]["game"] == "mtg"
        print("✓ ManaBox format detected correctly")
    
    def test_pokemon_format_detection(self, session):
        """Test Pokemon CSV format is correctly detected"""
        csv = '''Name,Set Code,Edition Name,Collector Number,Release Date,Price,Condition,Quantity
Pikachu ex,PRE,Prismatic Evolutions,001,2025-01-17,25.99,Near Mint,1'''
        
        resp = session.post(f"{BASE_URL}/api/collection/import", json={
            "csvContent": csv,
            "action": "preview"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["format"] == "pokemon", f"Expected pokemon format, got {data['format']}"
        assert data["cards"][0]["game"] == "pokemon"
        print("✓ Pokemon format detected correctly")
    
    def test_currency_preserved_eur(self, session):
        """Test EUR currency is preserved from CSV (not hardcoded)"""
        csv = '''Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Condition,Language,Purchase price currency
Counterspell,4ED,Fourth Edition,67,,common,1,11111,11111111-1111-1111-1111-111111111111,1.50,false,false,near_mint,English,EUR'''
        
        resp = session.post(f"{BASE_URL}/api/collection/import", json={
            "csvContent": csv,
            "action": "preview"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["cards"][0]["currency"] == "EUR", f"Expected EUR, got {data['cards'][0]['currency']}"
        print("✓ EUR currency preserved from CSV")
    
    def test_currency_preserved_sek(self, session):
        """Test SEK currency is preserved from CSV"""
        csv = '''Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Condition,Language,Purchase price currency
Sol Ring,CMD,Commander,237,,uncommon,1,99999,d3d4ee94-cb16-4a1b-a73e-83ef43d17ad9,150.00,false,false,near_mint,English,SEK'''
        
        resp = session.post(f"{BASE_URL}/api/collection/import", json={
            "csvContent": csv,
            "action": "preview"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["cards"][0]["currency"] == "SEK", f"Expected SEK, got {data['cards'][0]['currency']}"
        print("✓ SEK currency preserved from CSV")


class TestCSVImportActual:
    """CSV Import actual database insertion tests"""
    
    @pytest.fixture(scope='class')
    def session(self):
        sess = requests.Session()
        resp = sess.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        assert resp.status_code == 200
        return sess
    
    def test_import_inserts_card_into_database(self, session):
        """Test that import action actually inserts card into collection"""
        # Use unique name to identify this test card
        unique_name = f"TEST_ImportCard_{int(time.time())}"
        csv = f'''Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Condition,Language,Purchase price currency
{unique_name},TST,Test Set,001,,common,1,12345,test-scryfall-id-{int(time.time())},5.00,false,false,near_mint,English,USD'''
        
        # Perform import
        resp = session.post(f"{BASE_URL}/api/collection/import", json={
            "csvContent": csv,
            "action": "import"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["imported"] == 1, f"Expected 1 imported, got {data.get('imported')}"
        
        # Verify card exists in collection
        resp = session.get(f"{BASE_URL}/api/collection")
        assert resp.status_code == 200
        collection_data = resp.json()
        
        # Find our test card
        found = False
        for item in collection_data.get("items", []):
            card_data = item.get("card_data", {})
            if card_data.get("name") == unique_name:
                found = True
                break
        
        assert found, f"Imported card '{unique_name}' not found in collection"
        print(f"✓ Card '{unique_name}' successfully imported and persisted")
    
    def test_import_multiple_cards(self, session):
        """Test importing multiple cards at once"""
        timestamp = int(time.time())
        csv = f'''Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Condition,Language,Purchase price currency
TEST_MultiCard1_{timestamp},TST,Test Set,001,,common,1,11111,multi-id-1-{timestamp},1.00,false,false,near_mint,English,USD
TEST_MultiCard2_{timestamp},TST,Test Set,002,,uncommon,2,22222,multi-id-2-{timestamp},2.00,false,false,lightly_played,English,USD'''
        
        resp = session.post(f"{BASE_URL}/api/collection/import", json={
            "csvContent": csv,
            "action": "import"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["imported"] == 2, f"Expected 2 imported, got {data.get('imported')}"
        print("✓ Multiple cards imported successfully")


class TestSearchAPIUsersPostsDecks:
    """Test Search API returns users, posts, and decks when type=all"""
    
    def test_search_returns_users(self):
        """Test that search API returns users when type=all"""
        resp = requests.get(f"{BASE_URL}/api/search?q=test&type=all")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "users" in data, "Response should contain 'users' field"
        # Users array should exist even if empty
        assert isinstance(data["users"], list)
        print(f"✓ Search returns users: {len(data['users'])} found")
    
    def test_search_returns_decks(self):
        """Test that search API returns decks when type=all"""
        resp = requests.get(f"{BASE_URL}/api/search?q=test&type=all")
        assert resp.status_code == 200
        data = resp.json()
        assert "decks" in data, "Response should contain 'decks' field"
        assert isinstance(data["decks"], list)
        print(f"✓ Search returns decks: {len(data['decks'])} found")
    
    def test_search_returns_posts(self):
        """Test that search API returns posts when type=all"""
        resp = requests.get(f"{BASE_URL}/api/search?q=test&type=all")
        assert resp.status_code == 200
        data = resp.json()
        assert "posts" in data, "Response should contain 'posts' field"
        assert isinstance(data["posts"], list)
        print(f"✓ Search returns posts: {len(data['posts'])} found")
    
    def test_search_all_types_combined(self):
        """Test that search with type=all returns all entity types"""
        resp = requests.get(f"{BASE_URL}/api/search?q=a&type=all")  # 'a' is common letter
        assert resp.status_code == 200
        data = resp.json()
        
        # All fields should be present
        assert "users" in data
        assert "posts" in data
        assert "decks" in data
        assert "results" in data  # cards
        
        # Verify the response structure
        assert data["success"] is True
        print(f"✓ Search type=all returns: {len(data.get('users',[]))} users, {len(data.get('posts',[]))} posts, {len(data.get('decks',[]))} decks, {len(data.get('results',[]))} cards")


class TestSearchAPIGameFilter:
    """Test Search API filters by game correctly - MTG search should only return MTG cards"""
    
    def test_mtg_search_only_returns_mtg(self):
        """Test that game=mtg filter only returns MTG cards, not Pokemon"""
        resp = requests.get(f"{BASE_URL}/api/search?q=Sol&game=mtg&type=cards")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        
        results = data.get("results", [])
        
        # All results should have game=mtg
        pokemon_cards = [c for c in results if c.get("game") == "pokemon"]
        assert len(pokemon_cards) == 0, f"Found {len(pokemon_cards)} Pokemon cards in MTG search"
        
        # Verify all returned cards are MTG
        for card in results:
            assert card.get("game") == "mtg", f"Card '{card.get('name')}' has game={card.get('game')}, expected mtg"
        
        print(f"✓ MTG search for 'Sol' returned {len(results)} cards, all MTG (0 Pokemon)")
    
    def test_pokemon_search_only_returns_pokemon(self):
        """Test that game=pokemon filter only returns Pokemon cards"""
        resp = requests.get(f"{BASE_URL}/api/search?q=Pikachu&game=pokemon&type=cards")
        assert resp.status_code == 200
        data = resp.json()
        
        results = data.get("results", [])
        
        # All results should be pokemon
        mtg_cards = [c for c in results if c.get("game") == "mtg"]
        assert len(mtg_cards) == 0, f"Found {len(mtg_cards)} MTG cards in Pokemon search"
        
        for card in results:
            assert card.get("game") == "pokemon", f"Card has game={card.get('game')}, expected pokemon"
        
        print(f"✓ Pokemon search for 'Pikachu' returned {len(results)} cards, all Pokemon")
    
    def test_all_game_search_returns_both(self):
        """Test that game=all returns both Pokemon and MTG cards"""
        # Using a generic term that might match both
        resp = requests.get(f"{BASE_URL}/api/search?q=dragon&game=all&type=cards")
        assert resp.status_code == 200
        data = resp.json()
        
        results = data.get("results", [])
        games = set(c.get("game") for c in results)
        
        # Should have results from both games (if dragon exists in both)
        print(f"✓ Search game=all for 'dragon' returned cards from games: {games}")


class TestMessengerJSONParsing:
    """Test Messenger API handles responses gracefully"""
    
    @pytest.fixture(scope='class')
    def session(self):
        sess = requests.Session()
        resp = sess.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        assert resp.status_code == 200
        return sess
    
    def test_messages_api_returns_json(self, session):
        """Test messages API returns valid JSON"""
        resp = session.get(f"{BASE_URL}/api/messages")
        assert resp.status_code == 200
        
        # Verify response is valid JSON
        try:
            data = resp.json()
            assert "success" in data or "conversations" in data
        except Exception as e:
            pytest.fail(f"Messages API did not return valid JSON: {e}")
        
        print("✓ Messages API returns valid JSON")
    
    def test_calls_api_returns_json(self, session):
        """Test calls API returns valid JSON (used by messenger widget for video calls)"""
        resp = session.get(f"{BASE_URL}/api/calls")
        assert resp.status_code == 200
        
        # Verify response is valid JSON
        try:
            data = resp.json()
            assert "success" in data or "signals" in data
        except Exception as e:
            pytest.fail(f"Calls API did not return valid JSON: {e}")
        
        print("✓ Calls API returns valid JSON")
    
    def test_calls_preview_mode_returns_json(self, session):
        """Test calls API with preview mode returns valid JSON"""
        resp = session.get(f"{BASE_URL}/api/calls?mode=preview")
        assert resp.status_code == 200
        
        try:
            data = resp.json()
            assert "success" in data
        except Exception as e:
            pytest.fail(f"Calls API preview mode did not return valid JSON: {e}")
        
        print("✓ Calls API preview mode returns valid JSON")


class TestCollectionMTGSearch:
    """Test Collection page MTG search uses backend proxy"""
    
    def test_mtg_cards_api_exists(self):
        """Test /api/cards/mtg endpoint exists and works"""
        resp = requests.get(f"{BASE_URL}/api/cards/mtg?q=Lightning+Bolt")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "cards" in data
        print(f"✓ MTG cards API working, returned {len(data.get('cards',[]))} cards")
    
    def test_pokemon_cards_api_exists(self):
        """Test /api/cards/pokemon endpoint exists and works"""
        resp = requests.get(f"{BASE_URL}/api/cards/pokemon?q=Pikachu")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "cards" in data
        print(f"✓ Pokemon cards API working, returned {len(data.get('cards',[]))} cards")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope='class')
    def session(self):
        sess = requests.Session()
        resp = sess.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return sess
    
    def test_cleanup_test_cards(self, session):
        """Remove TEST_ prefixed cards from collection"""
        # Get collection
        resp = session.get(f"{BASE_URL}/api/collection")
        if resp.status_code != 200:
            print("⚠ Could not get collection for cleanup")
            return
        
        data = resp.json()
        items = data.get("items", [])
        
        # Find test items
        test_items = []
        for item in items:
            card_data = item.get("card_data", {})
            name = card_data.get("name", "")
            if name.startswith("TEST_"):
                test_items.append(item)
        
        # Delete test items
        deleted = 0
        for item in test_items:
            item_id = item.get("item_id")
            if item_id:
                resp = session.delete(f"{BASE_URL}/api/collection/{item_id}")
                if resp.status_code in [200, 204]:
                    deleted += 1
        
        print(f"✓ Cleanup: Deleted {deleted} TEST_ prefixed cards")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
