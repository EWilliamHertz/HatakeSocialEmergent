"""
Iteration 16 - Testing Badge System, Messenger Widget, Upload API, and Bulk Listing
Features tested:
- Badge system APIs (GET /api/badges, GET /api/badges/all, POST /api/badges)
- Upload API (POST /api/upload)
- Bulk listing API (POST /api/collection/bulk-list)
- Messages API (GET /api/messages)
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
        """Test GET /api/badges/all returns all 26 badge definitions"""
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
        # Test user should have at least some badges
        assert isinstance(badges, list)
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
    """Upload API tests"""
    
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
        
    def test_upload_without_file(self, auth_token):
        """Test POST /api/upload without file returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/upload",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 400


class TestBulkListingAPI:
    """Bulk listing API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return response.json().get("token")
    
    def test_bulk_list_single_item(self, auth_token):
        """Test POST /api/collection/bulk-list with single item"""
        response = requests.post(
            f"{BASE_URL}/api/collection/bulk-list",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={
                "listings": [
                    {
                        "card_id": "test_bulk_card_1",
                        "game": "mtg",
                        "card_data": {"name": "Test Bulk Card 1", "set": "test"},
                        "price": 9.99
                    }
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("listed") == 1
        assert "listingIds" in data
        assert len(data["listingIds"]) == 1
        
    def test_bulk_list_multiple_items(self, auth_token):
        """Test POST /api/collection/bulk-list with multiple items"""
        response = requests.post(
            f"{BASE_URL}/api/collection/bulk-list",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={
                "listings": [
                    {
                        "card_id": "test_bulk_card_2",
                        "game": "mtg",
                        "card_data": {"name": "Test Bulk Card 2", "set": "test"},
                        "price": 5.00
                    },
                    {
                        "card_id": "test_bulk_card_3",
                        "game": "pokemon",
                        "card_data": {"name": "Test Pokemon Card", "set": "test"},
                        "price": 15.50
                    }
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("listed") == 2
        assert len(data["listingIds"]) == 2
        
    def test_bulk_list_without_auth(self):
        """Test POST /api/collection/bulk-list without auth returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/collection/bulk-list",
            headers={"Content-Type": "application/json"},
            json={
                "listings": [
                    {"card_id": "test", "game": "mtg", "card_data": {}, "price": 1}
                ]
            }
        )
        assert response.status_code == 401
        
    def test_bulk_list_empty_array(self, auth_token):
        """Test POST /api/collection/bulk-list with empty listings array returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/collection/bulk-list",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={"listings": []}
        )
        assert response.status_code == 400
        
    def test_bulk_list_invalid_price(self, auth_token):
        """Test POST /api/collection/bulk-list with invalid price returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/collection/bulk-list",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={
                "listings": [
                    {"card_id": "test", "game": "mtg", "card_data": {}, "price": 0}
                ]
            }
        )
        assert response.status_code == 400
        
    def test_bulk_list_missing_required_fields(self, auth_token):
        """Test POST /api/collection/bulk-list with missing fields returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/collection/bulk-list",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={
                "listings": [
                    {"card_id": "test"}  # Missing game, card_data, price
                ]
            }
        )
        assert response.status_code == 400


class TestMessagesAPI:
    """Messages API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return response.json().get("token")
    
    def test_get_conversations(self, auth_token):
        """Test GET /api/messages returns conversations"""
        response = requests.get(
            f"{BASE_URL}/api/messages",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "conversations" in data
        assert isinstance(data["conversations"], list)
        
    def test_get_conversations_without_auth(self):
        """Test GET /api/messages without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/messages")
        assert response.status_code == 401


class TestUsersSearchAPI:
    """Users search API tests for messenger widget"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "password"
        })
        return response.json().get("token")
    
    def test_search_users(self, auth_token):
        """Test GET /api/users/search returns users list"""
        response = requests.get(
            f"{BASE_URL}/api/users/search?q=",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "users" in data
        assert isinstance(data["users"], list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
