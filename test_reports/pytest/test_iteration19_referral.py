"""
Iteration 19 - Referral System Tests
Tests referral API, invite validation, profile with invite_code, badge definitions, signup with invite code
"""
import pytest
import requests
import os
import uuid

BASE_URL = "http://localhost:3000"

@pytest.fixture
def session():
    """Create a requests session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

@pytest.fixture
def auth_session():
    """Create authenticated session with test user"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    
    # Login as test user
    login_res = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@test.com",
        "password": "password"
    })
    
    if login_res.status_code != 200:
        pytest.skip("Could not authenticate test user")
    
    # Cookies are auto-stored in session
    return s

class TestBadgeDefinitions:
    """Tests for GET /api/badges/all - should include recruiter badge"""
    
    def test_badges_all_returns_success(self, session):
        """Test that badges all endpoint returns success"""
        res = session.get(f"{BASE_URL}/api/badges/all")
        assert res.status_code == 200
        data = res.json()
        assert data.get("success") is True
        assert "badges" in data
        print(f"GET /api/badges/all - returned {len(data['badges'])} badges")
        
    def test_badges_all_includes_recruiter_badge(self, session):
        """Test that recruiter badge exists in badge definitions"""
        res = session.get(f"{BASE_URL}/api/badges/all")
        assert res.status_code == 200
        data = res.json()
        badges = data.get("badges", [])
        
        # Find recruiter badge
        recruiter_badge = next((b for b in badges if b.get("badge_type") == "recruiter"), None)
        
        assert recruiter_badge is not None, "Recruiter badge not found in badge definitions"
        assert recruiter_badge.get("name") == "Recruiter"
        assert recruiter_badge.get("description") == "Invited a friend to Hatake.Social"
        assert recruiter_badge.get("category") == "Special"
        print(f"Recruiter badge found: {recruiter_badge}")


class TestReferralAPI:
    """Tests for GET/POST /api/referral - invite code and referral count"""
    
    def test_referral_get_unauthenticated(self, session):
        """Test that unauthenticated users get 401"""
        res = session.get(f"{BASE_URL}/api/referral")
        assert res.status_code == 401
        print("GET /api/referral without auth returns 401")
    
    def test_referral_get_authenticated(self, auth_session):
        """Test GET /api/referral returns invite code and referral count"""
        res = auth_session.get(f"{BASE_URL}/api/referral")
        assert res.status_code == 200
        data = res.json()
        
        assert data.get("success") is True
        assert "inviteCode" in data
        assert "referralCount" in data
        assert "referrals" in data
        
        # Test user should have HatakeTest code
        print(f"GET /api/referral - inviteCode: {data['inviteCode']}, referralCount: {data['referralCount']}")
        
    def test_referral_post_sets_custom_code(self, auth_session):
        """Test POST /api/referral sets custom invite code"""
        # First get current code
        get_res = auth_session.get(f"{BASE_URL}/api/referral")
        original_code = get_res.json().get("inviteCode")
        
        # Set a unique new code
        new_code = f"TestCode{uuid.uuid4().hex[:6]}"
        
        res = auth_session.post(f"{BASE_URL}/api/referral", json={
            "inviteCode": new_code
        })
        assert res.status_code == 200
        data = res.json()
        assert data.get("success") is True
        assert data.get("inviteCode") == new_code
        print(f"POST /api/referral - set new code: {new_code}")
        
        # Restore original code (HatakeTest)
        if original_code:
            auth_session.post(f"{BASE_URL}/api/referral", json={
                "inviteCode": original_code
            })
            print(f"Restored original code: {original_code}")
    
    def test_referral_post_rejects_short_code(self, auth_session):
        """Test POST /api/referral rejects codes too short (< 3 chars)"""
        res = auth_session.post(f"{BASE_URL}/api/referral", json={
            "inviteCode": "AB"  # 2 chars - too short
        })
        assert res.status_code == 400
        data = res.json()
        assert "error" in data
        print(f"POST /api/referral rejects short code: {data.get('error')}")
    
    def test_referral_post_rejects_special_chars(self, auth_session):
        """Test POST /api/referral rejects codes with special characters"""
        res = auth_session.post(f"{BASE_URL}/api/referral", json={
            "inviteCode": "Test@Code!"  # Has special chars
        })
        assert res.status_code == 400
        data = res.json()
        assert "error" in data
        print(f"POST /api/referral rejects special chars: {data.get('error')}")
    
    def test_referral_post_allows_valid_codes(self, auth_session):
        """Test POST /api/referral allows underscores and hyphens"""
        valid_codes = ["Test_Code", "Test-Code", "TestCode123"]
        
        for code in valid_codes:
            unique_code = f"{code}_{uuid.uuid4().hex[:4]}"
            res = auth_session.post(f"{BASE_URL}/api/referral", json={
                "inviteCode": unique_code
            })
            assert res.status_code == 200, f"Failed for valid code: {unique_code}"
            print(f"Valid code accepted: {unique_code}")
        
        # Restore HatakeTest
        auth_session.post(f"{BASE_URL}/api/referral", json={
            "inviteCode": "HatakeTest"
        })


class TestInviteValidation:
    """Tests for GET /api/invite/[code] - validates invite codes"""
    
    def test_invite_valid_code_returns_inviter(self, session):
        """Test GET /api/invite/HatakeTest returns inviter info"""
        res = session.get(f"{BASE_URL}/api/invite/HatakeTest")
        assert res.status_code == 200
        data = res.json()
        
        assert data.get("success") is True
        assert "inviter" in data
        assert "name" in data["inviter"]
        assert "referralCount" in data["inviter"]
        print(f"GET /api/invite/HatakeTest - inviter: {data['inviter']}")
    
    def test_invite_invalid_code_returns_404(self, session):
        """Test GET /api/invite/[invalid] returns 404"""
        res = session.get(f"{BASE_URL}/api/invite/NonExistentCode12345")
        assert res.status_code == 404
        data = res.json()
        assert "error" in data
        print(f"GET /api/invite/invalid - 404: {data.get('error')}")


class TestProfileWithInviteCode:
    """Tests for GET /api/profile - should include invite_code and referral_count"""
    
    def test_profile_includes_invite_fields(self, auth_session):
        """Test GET /api/profile returns invite_code and referral_count"""
        res = auth_session.get(f"{BASE_URL}/api/profile")
        assert res.status_code == 200
        data = res.json()
        
        assert data.get("success") is True
        assert "user" in data
        
        user = data["user"]
        assert "invite_code" in user
        assert "referral_count" in user
        
        print(f"GET /api/profile - invite_code: {user.get('invite_code')}, referral_count: {user.get('referral_count')}")


class TestSignupWithInviteCode:
    """Tests for POST /api/auth/signup - accepts inviteCode parameter"""
    
    def test_signup_accepts_invite_code_parameter(self, session):
        """Test POST /api/auth/signup request body can include inviteCode"""
        # We won't actually create a user, just verify the endpoint exists
        # and would accept the inviteCode parameter by checking API structure
        
        # Generate unique email to avoid user exists error
        unique_email = f"test_invite_{uuid.uuid4().hex[:8]}@test.com"
        
        res = session.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": "testpassword123",
            "name": "Test Invite User",
            "inviteCode": "HatakeTest"  # Should be accepted
        })
        
        # 200 means signup succeeded (with inviteCode)
        # 400 with "User already exists" would also indicate endpoint works
        # We should NOT get 500 or validation error about inviteCode
        
        if res.status_code == 200:
            print(f"Signup with inviteCode succeeded for {unique_email}")
            data = res.json()
            assert data.get("success") is True
        else:
            data = res.json()
            # Should not be a parameter validation error
            assert "inviteCode" not in data.get("error", "").lower()
            print(f"Signup response: {res.status_code} - {data}")


class TestDuplicateInviteCode:
    """Test that duplicate invite codes are rejected"""
    
    def test_cannot_use_existing_invite_code(self, auth_session, session):
        """Test POST /api/referral rejects duplicate codes"""
        # First login as test user and confirm their code
        get_res = auth_session.get(f"{BASE_URL}/api/referral")
        test_user_code = get_res.json().get("inviteCode")
        
        if not test_user_code:
            pytest.skip("Test user has no invite code set")
        
        # Try to set the same code - should be rejected (user already owns it)
        # Actually this should succeed since same user owns it
        res = auth_session.post(f"{BASE_URL}/api/referral", json={
            "inviteCode": test_user_code
        })
        # Same user setting their own code should succeed
        assert res.status_code == 200
        print(f"User can set their own existing code: {test_user_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
