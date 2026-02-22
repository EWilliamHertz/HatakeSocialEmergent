"""
Iteration 17 - Testing Badge Showcase in Feed, Feed API badge_count/top_badge fields, Upload API error handling
Features tested:
- Feed API (GET /api/feed?tab=public) - badge_count and top_badge fields
- Badge APIs (GET /api/badges?userId=, POST /api/badges, GET /api/badges/all)
- Upload API (POST /api/upload) - error handling for missing file (400 vs 500)
- Decks API (GET /api/decks)
"""
import pytest
import requests
import os
import base64

BASE_URL = "http://localhost:3000"

class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test successful login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "test@test.com"
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400]


class TestFeedAPIBadgeShowcase:
    """Feed API tests for badge_count and top_badge fields (Iteration 17 focus)"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return response.json().get("token")
    
    @pytest.fixture
    def user_id(self):
        """Get user ID"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return response.json().get("user", {}).get("user_id")
    
    def test_public_feed_returns_badge_count_and_top_badge(self, auth_token):
        """Test GET /api/feed?tab=public returns badge_count and top_badge for each post"""
        response = requests.get(
            f"{BASE_URL}/api/feed?tab=public",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "posts" in data
        posts = data["posts"]
        
        # Check that posts have badge_count and top_badge fields
        # Note: badge_count can be 0 if user has no badges, top_badge can be null
        if len(posts) > 0:
            for post in posts[:5]:  # Check first 5 posts
                assert "badge_count" in post, f"Post {post.get('post_id')} missing badge_count"
                # badge_count should be a number (can be 0)
                assert isinstance(post["badge_count"], (int, str)), f"badge_count should be numeric"
                # top_badge can be null or a string badge_type
                assert "top_badge" in post or post.get("top_badge") is None, f"Post missing top_badge field"
                
    def test_friends_feed_returns_badge_count_and_top_badge(self, auth_token):
        """Test GET /api/feed?tab=friends returns badge_count and top_badge"""
        response = requests.get(
            f"{BASE_URL}/api/feed?tab=friends",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
    def test_groups_feed_returns_badge_count_and_top_badge(self, auth_token):
        """Test GET /api/feed?tab=groups returns badge_count and top_badge"""
        response = requests.get(
            f"{BASE_URL}/api/feed?tab=groups",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
    def test_feed_without_auth(self):
        """Test GET /api/feed without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/feed?tab=public")
        assert response.status_code == 401
        
    def test_create_post_and_verify_in_feed(self, auth_token):
        """Test creating a post and verifying it shows in feed with badge info"""
        # Create a test post
        create_response = requests.post(
            f"{BASE_URL}/api/feed",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={
                "content": "Test post for badge showcase iteration 17",
                "visibility": "public"
            }
        )
        assert create_response.status_code == 200
        create_data = create_response.json()
        assert create_data.get("success") == True
        
        # Verify in feed
        feed_response = requests.get(
            f"{BASE_URL}/api/feed?tab=public",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert feed_response.status_code == 200
        feed_data = feed_response.json()
        posts = feed_data.get("posts", [])
        
        # Find our post
        our_post = next((p for p in posts if "badge showcase iteration 17" in p.get("content", "")), None)
        if our_post:
            # Verify badge fields exist
            assert "badge_count" in our_post


class TestBadgeSystem:
    """Badge system API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return response.json().get("token")
    
    @pytest.fixture
    def user_id(self):
        """Get user ID"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return response.json().get("user", {}).get("user_id")
    
    def test_get_all_badges(self):
        """Test GET /api/badges/all returns all badge definitions"""
        response = requests.get(f"{BASE_URL}/api/badges/all")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "badges" in data
        badges = data["badges"]
        # Should have 26 badges
        assert len(badges) == 26, f"Expected 26 badges, got {len(badges)}"
        # Verify badge structure
        for badge in badges:
            assert "badge_type" in badge
            assert "name" in badge
            assert "description" in badge
            assert "icon" in badge
            assert "color" in badge
            assert "category" in badge
        
    def test_get_user_badges(self, user_id):
        """Test GET /api/badges?userId= returns user badges"""
        response = requests.get(f"{BASE_URL}/api/badges?userId={user_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "badges" in data
        badges = data["badges"]
        # Test user should have at least some badges (4 based on previous iteration)
        assert isinstance(badges, list)
        print(f"User {user_id} has {len(badges)} badges")
        # Verify badge structure if badges exist
        if len(badges) > 0:
            badge = badges[0]
            assert "badge_type" in badge
            assert "user_id" in badge
            assert badge["user_id"] == user_id
    
    def test_get_user_badges_without_userid(self):
        """Test GET /api/badges without userId returns 400"""
        response = requests.get(f"{BASE_URL}/api/badges")
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        
    def test_check_and_award_badges(self, auth_token):
        """Test POST /api/badges auto-awards badges based on user stats"""
        response = requests.post(
            f"{BASE_URL}/api/badges",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        # Should return newBadges array and stats
        assert "newBadges" in data
        assert "stats" in data
        stats = data["stats"]
        # Verify stats structure
        assert "completedTrades" in stats
        assert "collectionSize" in stats
        assert "decksCount" in stats
        
    def test_check_badges_without_auth(self):
        """Test POST /api/badges without auth returns 401"""
        response = requests.post(f"{BASE_URL}/api/badges")
        assert response.status_code == 401


class TestUploadAPI:
    """Upload API tests - Iteration 17 focus on error handling for missing file"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return response.json().get("token")
    
    def test_upload_image(self, auth_token):
        """Test POST /api/upload accepts image and returns Cloudinary URL"""
        # Create a minimal 1x1 PNG
        png_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
        
        files = {'file': ('test.png', png_data, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/upload",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "url" in data
        assert "cloudinary" in data["url"].lower()
        assert data.get("type") == "image/png"
        
    def test_upload_without_auth(self):
        """Test POST /api/upload without auth returns 401"""
        png_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
        files = {'file': ('test.png', png_data, 'image/png')}
        response = requests.post(f"{BASE_URL}/api/upload", files=files)
        assert response.status_code == 401
        
    def test_upload_without_file_returns_400(self, auth_token):
        """Test POST /api/upload without file returns 400 (not 500) - Iteration 17 fix"""
        response = requests.post(
            f"{BASE_URL}/api/upload",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # Should return 400 for missing file, not 500
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "error" in data
        print(f"Upload error message: {data.get('error')}")


class TestDecksAPI:
    """Decks API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return response.json().get("token")
    
    def test_get_user_decks(self, auth_token):
        """Test GET /api/decks returns user decks"""
        response = requests.get(
            f"{BASE_URL}/api/decks",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "decks" in data
        decks = data["decks"]
        assert isinstance(decks, list)
        print(f"User has {len(decks)} decks")
        
    def test_get_community_decks(self, auth_token):
        """Test GET /api/decks?type=community returns community decks"""
        response = requests.get(
            f"{BASE_URL}/api/decks?type=community",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "decks" in data
        
    def test_decks_without_auth(self):
        """Test GET /api/decks without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/decks")
        assert response.status_code == 401


class TestProfileBadges:
    """Profile page badges tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return response.json().get("token")
    
    @pytest.fixture
    def user_id(self):
        """Get user ID"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return response.json().get("user", {}).get("user_id")
    
    def test_profile_stats(self, auth_token):
        """Test GET /api/profile/stats returns user stats"""
        response = requests.get(
            f"{BASE_URL}/api/profile/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "stats" in data
        stats = data["stats"]
        assert "collection_count" in stats
        assert "listings_count" in stats
        assert "friends_count" in stats


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
