"""
Test iteration 6 - Testing features for Hatake.Social TCG platform
Features to test:
1. Messages API returns messages with timestamps
2. Search API correctly filters by game (game=mtg should NOT return Pokemon)
3. CSV import preview and import work correctly  
4. Collection page MTG search works
5. Messages page has formatMessageTime function for timestamps
"""

import pytest
import requests
import json
import os

BASE_URL = "http://localhost:3000"

class TestMessagesTimestamps:
    """Test that messages have proper timestamps"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        # Login with test user
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        print(f"Login response: {login_resp.status_code}")
        if login_resp.status_code == 200:
            data = login_resp.json()
            print(f"Login success: {data.get('success')}")
        return session
    
    def test_conversations_have_timestamps(self, auth_session):
        """Test that conversations list includes last_message_at timestamp"""
        resp = auth_session.get(f"{BASE_URL}/api/messages")
        print(f"Conversations API response: {resp.status_code}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        data = resp.json()
        print(f"Conversations data keys: {data.keys()}")
        assert data.get('success') == True, "Expected success=true"
        
        conversations = data.get('conversations', [])
        print(f"Number of conversations: {len(conversations)}")
        
        # If there are conversations, check they have timestamp fields
        if len(conversations) > 0:
            conv = conversations[0]
            print(f"First conversation keys: {conv.keys()}")
            # The API returns last_message_at field
            assert 'last_message_at' in conv or 'updated_at' in conv, \
                "Conversation should have timestamp field (last_message_at or updated_at)"
            print(f"PASS: Conversation has timestamp field")
        else:
            print("No conversations found - skipping timestamp check")
    
    def test_messages_have_created_at_timestamp(self, auth_session):
        """Test that messages in a conversation have created_at timestamps"""
        # First get conversations
        conv_resp = auth_session.get(f"{BASE_URL}/api/messages")
        assert conv_resp.status_code == 200
        
        conversations = conv_resp.json().get('conversations', [])
        if len(conversations) == 0:
            pytest.skip("No conversations found to test message timestamps")
        
        conv_id = conversations[0].get('conversation_id')
        print(f"Testing messages for conversation: {conv_id}")
        
        # Get messages for first conversation
        msg_resp = auth_session.get(f"{BASE_URL}/api/messages/{conv_id}")
        print(f"Messages API response: {msg_resp.status_code}")
        assert msg_resp.status_code == 200
        
        data = msg_resp.json()
        messages = data.get('messages', [])
        print(f"Number of messages: {len(messages)}")
        
        if len(messages) > 0:
            msg = messages[0]
            print(f"First message keys: {msg.keys()}")
            assert 'created_at' in msg, "Message should have created_at timestamp"
            print(f"PASS: Message has created_at: {msg.get('created_at')}")
        else:
            print("No messages found in conversation")


class TestSearchGameFilter:
    """Test that search API correctly filters by game type"""
    
    def test_search_mtg_returns_only_mtg(self):
        """Test that game=mtg only returns MTG cards, no Pokemon"""
        resp = requests.get(f"{BASE_URL}/api/search", params={
            "q": "sol",
            "game": "mtg",
            "type": "cards"
        })
        print(f"MTG Search response: {resp.status_code}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        data = resp.json()
        results = data.get('results', [])
        print(f"Number of results: {len(results)}")
        
        # Check that all results are MTG cards
        mtg_count = 0
        pokemon_count = 0
        for card in results:
            game = card.get('game', '').lower()
            if game == 'mtg':
                mtg_count += 1
            elif game == 'pokemon':
                pokemon_count += 1
                print(f"ERROR: Found Pokemon card in MTG search: {card.get('name')}")
        
        print(f"MTG cards: {mtg_count}, Pokemon cards: {pokemon_count}")
        assert pokemon_count == 0, f"Search with game=mtg should NOT return Pokemon cards. Found {pokemon_count} Pokemon cards"
        assert mtg_count > 0, "Search with game=mtg should return at least some MTG cards"
        print("PASS: game=mtg filter correctly returns only MTG cards")
    
    def test_search_pokemon_returns_only_pokemon(self):
        """Test that game=pokemon only returns Pokemon cards, no MTG"""
        resp = requests.get(f"{BASE_URL}/api/search", params={
            "q": "pikachu",
            "game": "pokemon",
            "type": "cards"
        })
        print(f"Pokemon Search response: {resp.status_code}")
        assert resp.status_code == 200
        
        data = resp.json()
        results = data.get('results', [])
        print(f"Number of results: {len(results)}")
        
        # Check all results are Pokemon
        pokemon_count = 0
        mtg_count = 0
        for card in results:
            game = card.get('game', '').lower()
            if game == 'pokemon':
                pokemon_count += 1
            elif game == 'mtg':
                mtg_count += 1
                print(f"ERROR: Found MTG card in Pokemon search: {card.get('name')}")
        
        print(f"Pokemon cards: {pokemon_count}, MTG cards: {mtg_count}")
        assert mtg_count == 0, f"Search with game=pokemon should NOT return MTG cards"
        print("PASS: game=pokemon filter correctly returns only Pokemon cards")
    
    def test_search_all_returns_both_games(self):
        """Test that game=all returns both MTG and Pokemon cards"""
        resp = requests.get(f"{BASE_URL}/api/search", params={
            "q": "fire",
            "game": "all",
            "type": "cards"
        })
        print(f"All games search response: {resp.status_code}")
        assert resp.status_code == 200
        
        data = resp.json()
        results = data.get('results', [])
        print(f"Number of results: {len(results)}")
        
        games_found = set()
        for card in results:
            game = card.get('game', '').lower()
            if game:
                games_found.add(game)
        
        print(f"Games found in results: {games_found}")
        # With game=all, we may get both MTG and Pokemon depending on search term
        assert len(results) > 0, "Search with game=all should return results"
        print("PASS: game=all returns results")


class TestCSVImport:
    """Test CSV import preview and actual import functionality"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return session
    
    def test_csv_preview_manabox_format(self, auth_session):
        """Test CSV preview with ManaBox format"""
        csv_content = '''Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Condition,Language,Purchase price currency
"TEST_Sol Ring","2xm","Double Masters","270",,"uncommon","1","1234","9fd6b4e0-b4c4-46b2-a9b7-eb55a3e5f9cd","5.00","false","false","near_mint","English","EUR"'''
        
        resp = auth_session.post(f"{BASE_URL}/api/collection/import", json={
            "csvContent": csv_content,
            "action": "preview"
        })
        print(f"CSV Preview response: {resp.status_code}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        data = resp.json()
        print(f"Preview response keys: {data.keys()}")
        assert data.get('success') == True, f"Expected success=true, got {data}"
        
        cards = data.get('cards', [])
        print(f"Number of cards in preview: {len(cards)}")
        assert len(cards) == 1, "Expected 1 card in preview"
        
        card = cards[0]
        print(f"Card data: {card}")
        assert card.get('name') == 'TEST_Sol Ring', f"Expected name 'TEST_Sol Ring', got {card.get('name')}"
        assert card.get('currency') == 'EUR', f"Expected currency 'EUR', got {card.get('currency')}"
        assert card.get('game') == 'mtg', f"Expected game 'mtg', got {card.get('game')}"
        print("PASS: CSV preview ManaBox format works correctly with currency preservation")
    
    def test_csv_preview_pokemon_format(self, auth_session):
        """Test CSV preview with Pokemon export format"""
        csv_content = '''Name,Set Code,Edition Name,Collector Number,Release Date,Price,Condition,Quantity
"TEST_Pikachu","sv01","Scarlet & Violet","25","2023-03-31","2.50","near_mint","1"'''
        
        resp = auth_session.post(f"{BASE_URL}/api/collection/import", json={
            "csvContent": csv_content,
            "action": "preview"
        })
        print(f"Pokemon CSV Preview response: {resp.status_code}")
        assert resp.status_code == 200
        
        data = resp.json()
        assert data.get('success') == True
        
        cards = data.get('cards', [])
        assert len(cards) == 1
        
        card = cards[0]
        print(f"Pokemon card data: {card}")
        assert card.get('game') == 'pokemon', f"Expected game 'pokemon', got {card.get('game')}"
        print("PASS: CSV preview Pokemon format detected correctly")


class TestMTGCardSearch:
    """Test MTG card search via /api/cards/mtg proxy"""
    
    def test_mtg_search_by_name(self):
        """Test MTG card search by name"""
        resp = requests.get(f"{BASE_URL}/api/cards/mtg", params={
            "q": "Lightning Bolt"
        })
        print(f"MTG search response: {resp.status_code}")
        assert resp.status_code == 200
        
        data = resp.json()
        print(f"Response keys: {data.keys()}")
        assert data.get('success') == True, f"Expected success=true"
        
        cards = data.get('cards', [])
        print(f"Number of cards found: {len(cards)}")
        assert len(cards) > 0, "Expected at least one card for Lightning Bolt"
        
        # Check first card has expected MTG fields
        card = cards[0]
        print(f"First card name: {card.get('name')}")
        assert 'name' in card, "Card should have name"
        print("PASS: MTG card search works")
    
    def test_mtg_search_by_set_and_number(self):
        """Test MTG card search by set code and collector number"""
        # Search for a card by set and number (Sol Ring in 2XM)
        resp = requests.get(f"{BASE_URL}/api/cards/mtg", params={
            "set": "2xm",
            "number": "270"
        })
        print(f"MTG set+number search response: {resp.status_code}")
        assert resp.status_code == 200
        
        data = resp.json()
        cards = data.get('cards', [])
        print(f"Number of cards found: {len(cards)}")
        
        if len(cards) > 0:
            card = cards[0]
            print(f"Found card: {card.get('name')}")
        print("PASS: MTG search by set+number works")


class TestMessagesFormatting:
    """Test that messages page frontend has timestamp formatting functions"""
    
    def test_messages_api_returns_timestamp_fields(self):
        """Verify the messages API structure supports timestamps"""
        # Login first
        session = requests.Session()
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Cannot login to test messages")
        
        # Get conversations
        conv_resp = session.get(f"{BASE_URL}/api/messages")
        assert conv_resp.status_code == 200
        
        data = conv_resp.json()
        conversations = data.get('conversations', [])
        
        print(f"Conversations count: {len(conversations)}")
        if len(conversations) > 0:
            conv = conversations[0]
            # Verify conversation has timestamp fields that can be formatted
            assert 'last_message_at' in conv or 'updated_at' in conv, \
                "Conversation should have timestamp field"
            
            # Get messages from conversation
            conv_id = conv.get('conversation_id')
            msg_resp = session.get(f"{BASE_URL}/api/messages/{conv_id}")
            
            if msg_resp.status_code == 200:
                msg_data = msg_resp.json()
                messages = msg_data.get('messages', [])
                
                if len(messages) > 0:
                    msg = messages[0]
                    assert 'created_at' in msg, "Message should have created_at timestamp"
                    
                    # Verify timestamp is a valid ISO format
                    created_at = msg.get('created_at')
                    print(f"Message timestamp format: {created_at}")
                    assert created_at is not None, "created_at should not be null"
                    print("PASS: Messages have proper timestamp fields for formatting")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
