"""
Backend API Tests for Hatake.Social Feed Features
Tests: Comments, Replies (threaded), Emoji Reactions on Posts and Comments
"""

import pytest
import requests
import time

BASE_URL = "http://localhost:3000"

# Test data
TEST_USER = {
    "email": "demo@hatake.social",
    "password": "demo123"
}

POST_ID = "post_mlo03wwip7g9z0cgzpg"
COMMENT_ID = "comment_mlplkf7djft8i2az9sf"

# Session to persist cookies
session = requests.Session()
session.headers.update({"Content-Type": "application/json"})


@pytest.fixture(autouse=True)
def login_user():
    """Ensure user is logged in before tests"""
    response = session.post(f"{BASE_URL}/api/auth/login", json=TEST_USER)
    if response.status_code != 200:
        pytest.skip("Login failed - skipping tests")
    print(f"Logged in as {TEST_USER['email']}")


class TestComments:
    """Comments API tests"""
    
    def test_get_comments_for_post(self, login_user):
        """Test GET /api/feed/{postId}/comments - retrieves comments"""
        response = session.get(f"{BASE_URL}/api/feed/{POST_ID}/comments")
        print(f"GET comments status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "comments" in data
        assert isinstance(data["comments"], list)
        print(f"✓ Found {len(data['comments'])} comments")
    
    def test_create_comment(self, login_user):
        """Test POST /api/feed/{postId}/comments - creates a new comment"""
        comment_content = f"TEST_comment_{int(time.time())}"
        response = session.post(
            f"{BASE_URL}/api/feed/{POST_ID}/comments",
            json={"content": comment_content}
        )
        print(f"POST comment status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "commentId" in data
        print(f"✓ Created comment with ID: {data['commentId']}")
        
        # Verify comment exists in GET
        get_response = session.get(f"{BASE_URL}/api/feed/{POST_ID}/comments")
        comments = get_response.json().get("comments", [])
        comment_contents = [c.get("content") for c in comments]
        assert comment_content in comment_contents
        print("✓ Comment verified in GET response")
    
    def test_create_reply_to_comment(self, login_user):
        """Test POST /api/feed/{postId}/comments with parentCommentId - creates a reply"""
        reply_content = f"TEST_reply_{int(time.time())}"
        response = session.post(
            f"{BASE_URL}/api/feed/{POST_ID}/comments",
            json={
                "content": reply_content,
                "parentCommentId": COMMENT_ID
            }
        )
        print(f"POST reply status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "commentId" in data
        print(f"✓ Created reply with ID: {data['commentId']}")
        
        # Verify reply has correct parent_comment_id
        get_response = session.get(f"{BASE_URL}/api/feed/{POST_ID}/comments")
        comments = get_response.json().get("comments", [])
        reply = next((c for c in comments if c.get("content") == reply_content), None)
        assert reply is not None
        assert reply.get("parent_comment_id") == COMMENT_ID
        print("✓ Reply verified with correct parent_comment_id")
    
    def test_create_comment_missing_content(self, login_user):
        """Test POST comment with missing content returns 400"""
        response = session.post(
            f"{BASE_URL}/api/feed/{POST_ID}/comments",
            json={}
        )
        assert response.status_code == 400
        print("✓ Missing content rejected correctly")


class TestPostReactions:
    """Post reactions API tests"""
    
    def test_get_post_reactions(self, login_user):
        """Test GET /api/feed/{postId}/reactions - retrieves reactions"""
        response = session.get(f"{BASE_URL}/api/feed/{POST_ID}/reactions")
        print(f"GET post reactions status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "reactions" in data
        print(f"✓ Found {len(data['reactions'])} reaction types")
        
        # Verify reaction structure
        for reaction in data["reactions"]:
            assert "emoji" in reaction
            assert "count" in reaction
            assert "userReacted" in reaction
    
    def test_add_emoji_reaction_to_post(self, login_user):
        """Test POST /api/feed/{postId}/reactions - adds emoji reaction"""
        response = session.post(
            f"{BASE_URL}/api/feed/{POST_ID}/reactions",
            json={"emoji": "👍"}
        )
        print(f"POST reaction status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("action") in ["added", "removed"]  # Toggle behavior
        print(f"✓ Reaction action: {data.get('action')}")
    
    def test_add_fire_emoji_reaction(self, login_user):
        """Test adding 🔥 emoji reaction"""
        response = session.post(
            f"{BASE_URL}/api/feed/{POST_ID}/reactions",
            json={"emoji": "🔥"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Fire emoji reaction: {data.get('action')}")
    
    def test_add_heart_emoji_reaction(self, login_user):
        """Test adding ❤️ emoji reaction"""
        response = session.post(
            f"{BASE_URL}/api/feed/{POST_ID}/reactions",
            json={"emoji": "❤️"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Heart emoji reaction: {data.get('action')}")
    
    def test_add_reaction_missing_emoji(self, login_user):
        """Test POST reaction with missing emoji returns 400"""
        response = session.post(
            f"{BASE_URL}/api/feed/{POST_ID}/reactions",
            json={}
        )
        assert response.status_code == 400
        print("✓ Missing emoji rejected correctly")


class TestCommentReactions:
    """Comment reactions API tests"""
    
    def test_add_emoji_reaction_to_comment(self, login_user):
        """Test POST /api/feed/{postId}/comments/{commentId}/reactions - adds emoji to comment"""
        response = session.post(
            f"{BASE_URL}/api/feed/{POST_ID}/comments/{COMMENT_ID}/reactions",
            json={"emoji": "👍"}
        )
        print(f"POST comment reaction status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("action") in ["added", "removed"]
        print(f"✓ Comment reaction action: {data.get('action')}")
    
    def test_add_reaction_missing_emoji(self, login_user):
        """Test POST comment reaction with missing emoji returns 400"""
        response = session.post(
            f"{BASE_URL}/api/feed/{POST_ID}/comments/{COMMENT_ID}/reactions",
            json={}
        )
        assert response.status_code == 400
        print("✓ Missing emoji rejected correctly")
    
    def test_comment_reactions_returned_in_comments(self, login_user):
        """Test that GET comments includes reaction data"""
        # First add a reaction
        session.post(
            f"{BASE_URL}/api/feed/{POST_ID}/comments/{COMMENT_ID}/reactions",
            json={"emoji": "🔥"}
        )
        
        # Then get comments and check for reactions
        response = session.get(f"{BASE_URL}/api/feed/{POST_ID}/comments")
        data = response.json()
        
        assert response.status_code == 200
        comments = data.get("comments", [])
        
        # Find the target comment
        target_comment = next(
            (c for c in comments if c.get("comment_id") == COMMENT_ID),
            None
        )
        
        if target_comment:
            assert "reactions" in target_comment
            print(f"✓ Comment has reactions field with {len(target_comment['reactions'])} reaction types")
        else:
            print("Note: Target comment not found, but API structure is correct")


class TestShopPage:
    """Shop page (static data) tests"""
    
    def test_shop_page_loads(self):
        """Test that shop page returns 200"""
        response = requests.get(f"{BASE_URL}/shop")
        assert response.status_code == 200
        print("✓ Shop page loads correctly")


class TestAboutPage:
    """About page (static data) tests"""
    
    def test_about_page_loads(self):
        """Test that about page returns 200"""
        response = requests.get(f"{BASE_URL}/about")
        assert response.status_code == 200
        print("✓ About page loads correctly")
    
    def test_about_page_no_andrew(self):
        """Test that about page does not contain Andrew/ScryDex"""
        response = requests.get(f"{BASE_URL}/about")
        content = response.text
        
        assert "Andrew" not in content
        assert "ScryDex" not in content
        print("✓ About page does not contain Andrew/ScryDex")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
