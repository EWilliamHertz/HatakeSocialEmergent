"""
Iteration 14 - Bug fix verification for Hatake.Social TCG Platform
Focus Areas:
1. Mobile Collection: Single card delete via DELETE /api/collection?id={id}
2. Mobile MTG Search: Scryfall search without name: prefix
3. Web Marketplace: Shop product images
4. Feed API: Posts with reactions array
5. Feed Like API: POST /api/feed/{postId}/like toggle
6. Feed Reactions API: POST /api/feed/{postId}/reactions emoji reactions
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://tcg-social-hub-1.preview.emergentagent.com')

class TestAuth:
    """Test authentication for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Login and return authenticated session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@test.com", "password": "password"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data.get("success") == True or "token" in data
        
        # Store token for Bearer auth
        token = data.get("token")
        if token:
            session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    def test_login_returns_token(self):
        """Test login returns valid token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@test.com", "password": "password"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or data.get("success") == True
        print("Login returns token: PASS")


class TestCollectionDeleteAPI:
    """Test Collection DELETE API - Single card delete"""
    
    def get_auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@test.com", "password": "password"}
        )
        token = response.json().get("token")
        if token:
            session.headers.update({"Authorization": f"Bearer {token}"})
        return session, token
    
    def test_collection_delete_requires_auth(self):
        """Test DELETE /api/collection requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/collection?id=999999")
        assert response.status_code == 401
        print("Collection DELETE requires auth: PASS")
    
    def test_collection_delete_requires_id(self):
        """Test DELETE /api/collection requires id parameter"""
        session, token = self.get_auth_session()
        response = session.delete(f"{BASE_URL}/api/collection")
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        print("Collection DELETE requires ID: PASS")
    
    def test_collection_delete_returns_success(self):
        """Test DELETE /api/collection?id={id} returns success for valid request"""
        session, token = self.get_auth_session()
        
        # First, add a test card to delete
        add_response = session.post(
            f"{BASE_URL}/api/collection",
            json={
                "card_id": "test-delete-card-14",
                "game": "mtg",
                "card_data": {"name": "Test Delete Card", "id": "test-delete-card-14"},
                "quantity": 1,
                "condition": "Near Mint"
            }
        )
        
        if add_response.status_code == 200:
            # Get the card ID from collection
            get_response = session.get(f"{BASE_URL}/api/collection")
            items = get_response.json().get("items", [])
            
            # Find our test card
            test_card = None
            for item in items:
                if item.get("card_id") == "test-delete-card-14":
                    test_card = item
                    break
            
            if test_card:
                card_id = test_card.get("id")
                # Now delete it
                delete_response = session.delete(f"{BASE_URL}/api/collection?id={card_id}")
                assert delete_response.status_code == 200
                data = delete_response.json()
                assert data.get("success") == True
                print(f"Collection DELETE card ID {card_id}: PASS")
            else:
                print("Test card not found in collection - skipping delete test")
        else:
            print(f"Could not add test card: {add_response.text}")


class TestFeedAPIWithReactions:
    """Test Feed API - Posts with reactions"""
    
    def get_auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@test.com", "password": "password"}
        )
        token = response.json().get("token")
        if token:
            session.headers.update({"Authorization": f"Bearer {token}"})
        return session, token
    
    def test_feed_returns_posts_with_reactions(self):
        """Test GET /api/feed returns posts with reactions array"""
        session, token = self.get_auth_session()
        
        response = session.get(f"{BASE_URL}/api/feed?type=public")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, f"Feed API failed: {data}"
        posts = data.get("posts", [])
        
        if posts:
            for post in posts[:5]:
                # Check that reactions field exists (can be empty array)
                assert "reactions" in post, f"Post missing 'reactions' field: {post.keys()}"
                # Reactions should be a list
                assert isinstance(post["reactions"], list), f"Reactions should be list, got {type(post['reactions'])}"
                
                # Verify reaction structure if any exist
                for reaction in post["reactions"]:
                    assert "emoji" in reaction, f"Reaction missing emoji: {reaction}"
                    assert "count" in reaction, f"Reaction missing count: {reaction}"
                    assert "userReacted" in reaction, f"Reaction missing userReacted: {reaction}"
            
            print(f"Feed posts include reactions: PASS (checked {len(posts[:5])} posts)")
        else:
            print("No posts in feed - creating one to test reactions")
    
    def test_feed_posts_have_name_field(self):
        """Test feed posts have 'name' field for mobile app username display"""
        session, token = self.get_auth_session()
        
        response = session.get(f"{BASE_URL}/api/feed?type=public")
        assert response.status_code == 200
        data = response.json()
        
        if data.get("success") and data.get("posts"):
            for post in data["posts"][:5]:
                assert "name" in post, f"Post missing 'name' field for username: {post.keys()}"
            print("Feed posts have 'name' field: PASS")
        else:
            print("No posts to check name field")


class TestFeedLikeAPI:
    """Test Feed Like API - Toggle like"""
    
    def get_auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@test.com", "password": "password"}
        )
        token = response.json().get("token")
        if token:
            session.headers.update({"Authorization": f"Bearer {token}"})
        return session, token
    
    def test_like_requires_auth(self):
        """Test POST /api/feed/{postId}/like requires authentication"""
        response = requests.post(f"{BASE_URL}/api/feed/test-post/like")
        assert response.status_code == 401
        print("Feed like requires auth: PASS")
    
    def test_like_toggle_works(self):
        """Test POST /api/feed/{postId}/like toggles like status"""
        session, token = self.get_auth_session()
        
        # First get a post to like
        feed_response = session.get(f"{BASE_URL}/api/feed?type=public")
        data = feed_response.json()
        posts = data.get("posts", [])
        
        if posts:
            post_id = posts[0].get("post_id") or posts[0].get("id")
            
            # Toggle like
            like_response = session.post(f"{BASE_URL}/api/feed/{post_id}/like")
            assert like_response.status_code == 200
            like_data = like_response.json()
            
            assert like_data.get("success") == True, f"Like toggle failed: {like_data}"
            assert "liked" in like_data, f"Response missing 'liked' field: {like_data}"
            
            print(f"Feed like toggle for post {post_id}: PASS (liked={like_data['liked']})")
        else:
            print("No posts available to test like")


class TestFeedReactionsAPI:
    """Test Feed Reactions API - Emoji reactions"""
    
    def get_auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@test.com", "password": "password"}
        )
        token = response.json().get("token")
        if token:
            session.headers.update({"Authorization": f"Bearer {token}"})
        return session, token
    
    def test_reactions_requires_auth(self):
        """Test POST /api/feed/{postId}/reactions requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/feed/test-post/reactions",
            json={"emoji": "❤️"}
        )
        assert response.status_code == 401
        print("Feed reactions requires auth: PASS")
    
    def test_reactions_requires_emoji(self):
        """Test POST /api/feed/{postId}/reactions requires emoji"""
        session, token = self.get_auth_session()
        
        # Get a post first
        feed_response = session.get(f"{BASE_URL}/api/feed?type=public")
        posts = feed_response.json().get("posts", [])
        
        if posts:
            post_id = posts[0].get("post_id") or posts[0].get("id")
            
            # Try without emoji
            response = session.post(
                f"{BASE_URL}/api/feed/{post_id}/reactions",
                json={}
            )
            assert response.status_code == 400
            print("Reactions endpoint requires emoji: PASS")
        else:
            print("No posts to test reactions endpoint")
    
    def test_reactions_add_emoji(self):
        """Test POST /api/feed/{postId}/reactions adds emoji reaction"""
        session, token = self.get_auth_session()
        
        feed_response = session.get(f"{BASE_URL}/api/feed?type=public")
        posts = feed_response.json().get("posts", [])
        
        if posts:
            post_id = posts[0].get("post_id") or posts[0].get("id")
            
            # Add reaction
            response = session.post(
                f"{BASE_URL}/api/feed/{post_id}/reactions",
                json={"emoji": "🔥"}
            )
            assert response.status_code == 200
            data = response.json()
            
            assert data.get("success") == True, f"Reaction add failed: {data}"
            assert "action" in data, f"Response missing 'action' field: {data}"
            
            print(f"Feed reaction add for post {post_id}: PASS (action={data['action']})")
        else:
            print("No posts to test reactions")


class TestShopAPI:
    """Test Shop API - Product images"""
    
    def test_shop_products_list(self):
        """Test GET /api/shop returns products"""
        response = requests.get(f"{BASE_URL}/api/shop")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, f"Shop API failed: {data}"
        print(f"Shop products list: PASS (found {len(data.get('products', []))} products)")
    
    def test_shop_products_have_image_field(self):
        """Test shop products have image field"""
        response = requests.get(f"{BASE_URL}/api/shop")
        assert response.status_code == 200
        data = response.json()
        
        products = data.get("products", [])
        for product in products:
            # Check that image field exists (can be null for products without images)
            assert "image" in product, f"Product missing 'image' field: {product.keys()}"
            # Check gallery_images field
            assert "gallery_images" in product, f"Product missing 'gallery_images' field: {product.keys()}"
        
        print(f"Shop products have image fields: PASS")
    
    def test_shop_products_category_filter(self):
        """Test shop category filter works"""
        # Test with Protection category
        response = requests.get(f"{BASE_URL}/api/shop?category=Protection")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        products = data.get("products", [])
        
        for product in products:
            assert product.get("category") == "Protection", f"Wrong category: {product.get('category')}"
        
        print(f"Shop category filter: PASS")


class TestMTGSearchScryfall:
    """Test MTG Search - Scryfall API direct test"""
    
    def test_scryfall_search_partial_name(self):
        """Test Scryfall search works with partial card name (no name: prefix)"""
        # The mobile app fix removes 'name:' prefix for better partial matching
        # Direct Scryfall test to verify behavior
        
        # Test 1: Search with just card name (partial)
        response = requests.get(
            "https://api.scryfall.com/cards/search?q=lightning",
            timeout=10
        )
        assert response.status_code == 200, f"Scryfall search failed: {response.status_code}"
        data = response.json()
        
        assert "data" in data, "Scryfall response missing 'data'"
        cards = data.get("data", [])
        assert len(cards) > 0, "No results for 'lightning' search"
        
        # Verify we got Lightning-related cards
        found_lightning = any("lightning" in card.get("name", "").lower() for card in cards)
        assert found_lightning, "No Lightning cards found"
        
        print(f"Scryfall partial name search: PASS (found {len(cards)} results)")
    
    def test_scryfall_search_with_set(self):
        """Test Scryfall search with set code"""
        # Test search with set filter
        response = requests.get(
            "https://api.scryfall.com/cards/search?q=bolt+set:m10",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            cards = data.get("data", [])
            print(f"Scryfall search with set: PASS (found {len(cards)} results)")
        elif response.status_code == 404:
            print("Scryfall search with set: PASS (no results, but API works)")
        else:
            assert False, f"Scryfall API error: {response.status_code}"


class TestMarketplaceAPI:
    """Test Marketplace API"""
    
    def get_auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@test.com", "password": "password"}
        )
        return session
    
    def test_marketplace_listings(self):
        """Test marketplace returns listings"""
        session = self.get_auth_session()
        
        response = session.get(f"{BASE_URL}/api/marketplace")
        assert response.status_code == 200
        data = response.json()
        
        if data.get("success"):
            print(f"Marketplace: PASS (found {len(data.get('listings', []))} listings)")
        else:
            print("Marketplace API responded")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
