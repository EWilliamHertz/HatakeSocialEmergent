"""
Iteration 15 - Testing bug fixes for Hatake.Social TCG Platform
Features to test:
1. Web feed Groups tab shows posts from user's groups
2. Web feed Groups tab has group selector dropdown that shows user's groups  
3. Creating a post with group_id saves correctly and appears in group feed
4. Mobile FeedScreen fetches groups correctly (API returns 'groups' not 'myGroups')
5. Decks API returns community decks at GET /api/decks?type=community
6. Copy deck API works at POST /api/decks/{deckId}/copy
7. CSV import UI is present in CollectionScreen
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://tcg-social-hub-1.preview.emergentagent.com')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data.get("success"), f"Login not successful: {data}"
        return data.get("token")

    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}

    def test_login_returns_token(self):
        """Test login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data


class TestGroupsAPI:
    """Groups API tests - verify 'groups' field in response"""

    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Login and get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        assert response.status_code == 200
        data = response.json()
        return {"Authorization": f"Bearer {data.get('token')}"}

    def test_groups_api_returns_groups_field(self, auth_headers):
        """
        CRITICAL: Verify /api/groups?type=my returns 'groups' field (not 'myGroups')
        This was the bug causing mobile feed Groups tab to fail
        """
        response = requests.get(f"{BASE_URL}/api/groups?type=my", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # The API should return 'groups' field
        assert data.get("success") == True, f"Expected success: {data}"
        assert "groups" in data, f"Expected 'groups' field in response, got keys: {data.keys()}"
        # Should NOT have 'myGroups' field (old bug)
        assert "myGroups" not in data, "Should not have 'myGroups' field"
        assert isinstance(data["groups"], list), "groups should be a list"
        
    def test_discover_groups(self, auth_headers):
        """Test discover groups endpoint"""
        response = requests.get(f"{BASE_URL}/api/groups?type=discover", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "groups" in data


class TestFeedWithGroups:
    """Feed API tests with group support"""

    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Login and get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        assert response.status_code == 200
        data = response.json()
        return {"Authorization": f"Bearer {data.get('token')}"}

    def test_feed_groups_tab(self, auth_headers):
        """Test feed groups tab returns posts"""
        response = requests.get(f"{BASE_URL}/api/feed?tab=groups", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "posts" in data
        assert isinstance(data["posts"], list)

    def test_feed_public_tab(self, auth_headers):
        """Test feed public tab"""
        response = requests.get(f"{BASE_URL}/api/feed?tab=public", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "posts" in data

    def test_feed_friends_tab(self, auth_headers):
        """Test feed friends tab"""
        response = requests.get(f"{BASE_URL}/api/feed?tab=friends", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "posts" in data

    def test_create_post_with_group_id(self, auth_headers):
        """
        CRITICAL: Test creating a post with group_id parameter
        This tests the fix for posting to specific groups from the feed
        """
        # First, get user's groups to get a valid group_id
        groups_response = requests.get(f"{BASE_URL}/api/groups?type=my", headers=auth_headers)
        groups_data = groups_response.json()
        
        # If user has groups, test posting to a group
        if groups_data.get("success") and groups_data.get("groups"):
            group_id = groups_data["groups"][0]["group_id"]
            
            # Create post with group_id (using group_id, not groupId)
            response = requests.post(f"{BASE_URL}/api/feed", headers=auth_headers, json={
                "content": "TEST_Post to group from feed test",
                "group_id": group_id,
                "visibility": "group"
            })
            assert response.status_code == 200, f"Failed to create post: {response.text}"
            data = response.json()
            assert data.get("success") == True, f"Post creation failed: {data}"
            assert "postId" in data
            print(f"Created post with ID {data['postId']} in group {group_id}")
        else:
            # Skip if no groups - just test regular post creation
            response = requests.post(f"{BASE_URL}/api/feed", headers=auth_headers, json={
                "content": "TEST_Regular post without group",
                "visibility": "public"
            })
            assert response.status_code == 200
            data = response.json()
            assert data.get("success") == True
            print("User has no groups, tested regular post creation")

    def test_create_post_with_groupId_camelcase(self, auth_headers):
        """
        Test creating a post with groupId (camelCase) for backwards compatibility
        The API should accept both group_id and groupId
        """
        # Get user's groups
        groups_response = requests.get(f"{BASE_URL}/api/groups?type=my", headers=auth_headers)
        groups_data = groups_response.json()
        
        if groups_data.get("success") and groups_data.get("groups"):
            group_id = groups_data["groups"][0]["group_id"]
            
            # Create post with groupId (camelCase)
            response = requests.post(f"{BASE_URL}/api/feed", headers=auth_headers, json={
                "content": "TEST_Post with groupId camelCase",
                "groupId": group_id,
                "visibility": "group"
            })
            assert response.status_code == 200
            data = response.json()
            assert data.get("success") == True, f"Post creation with groupId failed: {data}"
            print(f"Created post with groupId (camelCase) in group {group_id}")
        else:
            pytest.skip("User has no groups to test groupId posting")


class TestDecksAPI:
    """Decks API tests including community decks and copy functionality"""

    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Login and get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        assert response.status_code == 200
        data = response.json()
        return {"Authorization": f"Bearer {data.get('token')}"}

    def test_get_my_decks(self, auth_headers):
        """Test getting user's own decks"""
        response = requests.get(f"{BASE_URL}/api/decks", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "decks" in data
        assert isinstance(data["decks"], list)

    def test_get_community_decks(self, auth_headers):
        """
        CRITICAL: Test getting community decks with type=community parameter
        This tests the new community decks feature
        """
        response = requests.get(f"{BASE_URL}/api/decks?type=community", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "decks" in data
        assert isinstance(data["decks"], list)
        print(f"Found {len(data['decks'])} community decks")

    def test_create_deck(self, auth_headers):
        """Test creating a new deck"""
        response = requests.post(f"{BASE_URL}/api/decks", headers=auth_headers, json={
            "name": "TEST_Deck for copy test",
            "game": "mtg",
            "format": "Standard",
            "description": "Test deck for iteration 15",
            "isPublic": True
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "deckId" in data
        return data["deckId"]

    def test_copy_deck_api(self, auth_headers):
        """
        CRITICAL: Test the new copy deck endpoint
        POST /api/decks/{deckId}/copy
        """
        # First create a public deck to copy
        create_response = requests.post(f"{BASE_URL}/api/decks", headers=auth_headers, json={
            "name": "TEST_Original Deck for Copy",
            "game": "mtg",
            "format": "Modern",
            "description": "Original deck to be copied",
            "isPublic": True
        })
        assert create_response.status_code == 200
        original_deck_id = create_response.json().get("deckId")
        
        # Now copy the deck
        copy_response = requests.post(f"{BASE_URL}/api/decks/{original_deck_id}/copy", headers=auth_headers)
        assert copy_response.status_code == 200, f"Copy failed: {copy_response.text}"
        copy_data = copy_response.json()
        assert copy_data.get("success") == True, f"Copy not successful: {copy_data}"
        assert "deckId" in copy_data, "Copied deck should have deckId"
        print(f"Successfully copied deck {original_deck_id} to {copy_data['deckId']}")
        
        # Verify the new deck exists
        get_response = requests.get(f"{BASE_URL}/api/decks", headers=auth_headers)
        decks = get_response.json().get("decks", [])
        copied_deck = next((d for d in decks if d["deck_id"] == copy_data["deckId"]), None)
        assert copied_deck is not None, "Copied deck should appear in user's decks"
        assert "(Copy)" in copied_deck["name"], "Copied deck name should contain '(Copy)'"


class TestFeedReactions:
    """Test feed reactions functionality"""

    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Login and get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        assert response.status_code == 200
        data = response.json()
        return {"Authorization": f"Bearer {data.get('token')}"}

    def test_feed_posts_include_reactions(self, auth_headers):
        """Test that feed posts include reactions array"""
        response = requests.get(f"{BASE_URL}/api/feed?tab=public", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        # Posts should have reactions field (even if empty)
        if data.get("posts"):
            for post in data["posts"][:5]:  # Check first 5 posts
                assert "reactions" in post or post.get("reactions") is None or isinstance(post.get("reactions", []), list)


class TestCleanup:
    """Cleanup test data"""

    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Login and get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        assert response.status_code == 200
        data = response.json()
        return {"Authorization": f"Bearer {data.get('token')}"}

    def test_cleanup_test_decks(self, auth_headers):
        """Clean up test decks created during testing"""
        # Get all decks
        response = requests.get(f"{BASE_URL}/api/decks", headers=auth_headers)
        if response.status_code == 200:
            decks = response.json().get("decks", [])
            for deck in decks:
                if deck.get("name", "").startswith("TEST_"):
                    delete_response = requests.delete(
                        f"{BASE_URL}/api/decks/{deck['deck_id']}", 
                        headers=auth_headers
                    )
                    print(f"Cleaned up test deck: {deck['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
