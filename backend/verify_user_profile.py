import asyncio
import uuid
import sys
import os
from sqlalchemy import select

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.user_profile import UserProfileUpdateRequest, ProfilePhotoUploadRequest
from app.repositories.user_profile_repository import UserProfileRepository


async def run_verification():
    print("==================================================")
    print("  USER PROFILE & SETTINGS VERIFICATION TEST")
    print("==================================================")

    async with SessionLocal() as session:
        # 1. Fetch or create a test user
        result = await session.execute(select(User).where(User.role == "PASSENGER"))
        test_user = result.scalars().first()

        if not test_user:
            print("[TEST] Creating mock test user...")
            test_user = User(
                id=uuid.uuid4(),
                name="Profile Test Passenger",
                phone=f"+91{uuid.uuid4().int % 10000000000:010d}",
                role="PASSENGER"
            )
            session.add(test_user)
            await session.commit()
            await session.refresh(test_user)

        user_id = test_user.id
        print(f"[TEST] Using test user: {test_user.name} (ID: {user_id})")

        repo = UserProfileRepository(session)

        # 2. Auto-initialization check (GET or CREATE)
        print("\n[TEST 1] Testing profile auto-initialization...")
        profile = await repo.get_or_create(user_id)
        await session.commit()
        await session.refresh(profile)

        assert profile is not None, "Profile object should not be None"
        assert profile.id == user_id, f"Profile ID ({profile.id}) should match User ID ({user_id})"
        print(f"SUCCESS: Auto-initialized profile record for user {user_id}")

        # 3. Partial Update (PATCH) test
        print("\n[TEST 2] Testing partial profile update (bio, gender, emergency contact, upi_id)...")
        update_req = UserProfileUpdateRequest(
            name="Updated Test Passenger",
            bio="Frequent commuter & weekend traveller.",
            gender="FEMALE",
            secondary_phone="+919876543210",
            address_line1="42 Silicon Valley Blvd",
            city="Bengaluru",
            state="Karnataka",
            country="India",
            postal_code="560100",
            emergency_contact_name="Alex Smith",
            emergency_contact_phone="+919123456789",
            emergency_contact_relationship="Spouse",
            default_payment_method="UPI",
            upi_id="passenger@okaxis",
            preferred_language="en",
            theme="dark"
        )
        updated_profile = await repo.update(user_id, update_req)
        await session.commit()
        await session.refresh(updated_profile)

        assert updated_profile.bio == "Frequent commuter & weekend traveller."
        assert updated_profile.gender == "FEMALE"
        assert updated_profile.city == "Bengaluru"
        assert updated_profile.emergency_contact_name == "Alex Smith"
        assert updated_profile.upi_id == "passenger@okaxis"
        assert updated_profile.default_payment_method == "UPI"
        print("SUCCESS: Profile partial update persisted correctly.")

        # 4. Profile Photo Upload test
        print("\n[TEST 3] Testing avatar photo update...")
        sample_photo_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        photo_profile = await repo.update_photo(user_id, sample_photo_base64)
        await session.commit()
        await session.refresh(photo_profile)

        assert photo_profile.avatar_url == sample_photo_base64
        print("SUCCESS: Avatar photo uploaded and saved successfully.")

        # 5. Database Persistence Verification
        print("\n[TEST 4] Direct DB query persistence check...")
        db_stmt = select(UserProfile).where(UserProfile.id == user_id)
        db_res = await session.execute(db_stmt)
        persisted_profile = db_res.scalars().first()

        assert persisted_profile is not None
        assert persisted_profile.bio == "Frequent commuter & weekend traveller."
        assert persisted_profile.upi_id == "passenger@okaxis"
        assert persisted_profile.avatar_url == sample_photo_base64
        print("SUCCESS: Direct database persistence verified.")

        print("\n==================================================")
        print("  ALL VERIFICATION TESTS PASSED SUCCESSFULLY!")
        print("==================================================")



if __name__ == "__main__":
    asyncio.run(run_verification())
