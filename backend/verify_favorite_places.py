import asyncio
import uuid
import sys
import os

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.favorite_place import FavoritePlace
from app.schemas.favorite_place import FavoritePlaceCreateRequest, FavoritePlaceUpdateRequest
from app.repositories.favorite_place_repository import FavoritePlaceRepository


async def run_verification():
    print("==================================================")
    print("  FAVORITE PLACES SYSTEM VERIFICATION TEST")
    print("==================================================")

    async with SessionLocal() as session:
        # 1. Fetch or create a test user
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.role == "PASSENGER"))
        test_user = result.scalars().first()

        if not test_user:
            print("[TEST] Creating mock test user...")
            test_user = User(
                id=uuid.uuid4(),
                name="Test Passenger",
                phone=f"+91{uuid.uuid4().int % 10000000000:010d}",
                role="PASSENGER"
            )
            session.add(test_user)
            await session.commit()
            await session.refresh(test_user)

        user_id = test_user.id
        print(f"[TEST] Using test user: {test_user.name} (ID: {user_id})")

        repo = FavoritePlaceRepository(session)

        # Clean existing test places for this user
        existing = await repo.get_by_user_id(user_id)
        for p in existing:
            await repo.delete(p.id, user_id)
        await session.commit()

        # 2. Test Create HOME
        print("\n[TEST 1] Creating Home favorite place...")
        home_req = FavoritePlaceCreateRequest(
            place_type="HOME",
            place_name="Sweet Home",
            full_address="123 Palm Grove Avenue, Bengaluru",
            latitude=12.9716,
            longitude=77.5946,
            city="Bengaluru",
            state="Karnataka",
            country="India",
            is_default=True
        )
        home_place = await repo.create(user_id, home_req)
        await session.commit()
        await session.refresh(home_place)
        assert home_place.place_type == "HOME"
        assert home_place.is_default is True
        print(f" -> Success: Created Home (ID: {home_place.id}, Name: {home_place.place_name})")

        # 3. Test Duplicate HOME rejection constraint
        print("\n[TEST 2] Verifying duplicate Home rejection...")
        try:
            dup_home = FavoritePlaceCreateRequest(
                place_type="HOME",
                place_name="Second Home",
                full_address="456 Oak Street, Bengaluru",
                latitude=12.9800,
                longitude=77.6000
            )
            await repo.create(user_id, dup_home)
            print(" -> ERROR: Duplicate HOME constraint failed!")
            sys.exit(1)
        except ValueError as e:
            print(f" -> Success: Duplicate HOME correctly rejected! ({e})")

        # 4. Test Create WORK and AIRPORT
        print("\n[TEST 3] Creating Work & Airport places...")
        work_req = FavoritePlaceCreateRequest(
            place_type="WORK",
            place_name="HQ Office",
            full_address="789 Tech Park, Electronic City, Bengaluru",
            latitude=12.8399,
            longitude=77.6770
        )
        work_place = await repo.create(user_id, work_req)

        airport_req = FavoritePlaceCreateRequest(
            place_type="AIRPORT",
            place_name="Kempegowda Airport",
            full_address="KIA Terminal 1, Devanahalli, Bengaluru",
            latitude=13.1986,
            longitude=77.7066
        )
        airport_place = await repo.create(user_id, airport_req)

        # Test OTHER places (unlimited allowed)
        other1_req = FavoritePlaceCreateRequest(
            place_type="OTHER",
            place_name="Gold's Gym",
            full_address="100 Indiranagar 100ft Rd, Bengaluru",
            latitude=12.9783,
            longitude=77.6385
        )
        other1_place = await repo.create(user_id, other1_req)

        other2_req = FavoritePlaceCreateRequest(
            place_type="OTHER",
            place_name="Coffee Club",
            full_address="Koramangala 5th Block, Bengaluru",
            latitude=12.9352,
            longitude=77.6245
        )
        other2_place = await repo.create(user_id, other2_req)
        await session.commit()
        print(" -> Success: Created Work, Airport, and 2 Other places!")

        # 5. List places
        print("\n[TEST 4] Retrieving list of favorite places...")
        all_places = await repo.get_by_user_id(user_id)
        print(f" -> Success: Fetched {len(all_places)} favorite places:")
        for p in all_places:
            print(f"    - [{p.place_type}] {p.place_name} | Default: {p.is_default} | {p.full_address}")
        assert len(all_places) == 5

        # 6. Test Update Place
        print("\n[TEST 5] Updating place details...")
        upd_req = FavoritePlaceUpdateRequest(
            place_name="HQ Global HQ Office",
            landmark="Near Gate 3"
        )
        updated_work = await repo.update(work_place.id, user_id, upd_req)
        await session.commit()
        assert updated_work.place_name == "HQ Global HQ Office"
        assert updated_work.landmark == "Near Gate 3"
        print(f" -> Success: Updated Work place name: {updated_work.place_name}, Landmark: {updated_work.landmark}")

        # 7. Test Set Default
        print("\n[TEST 6] Setting Work place as default...")
        def_work = await repo.set_default(work_place.id, user_id)
        await session.commit()
        all_places_check = await repo.get_by_user_id(user_id)
        default_p = [p for p in all_places_check if p.is_default]
        assert len(default_p) == 1
        assert default_p[0].id == work_place.id
        print(f" -> Success: Default place switched to {def_work.place_name}")

        # 8. Test Delete Place
        print("\n[TEST 7] Deleting Other place...")
        del_success = await repo.delete(other2_place.id, user_id)
        await session.commit()
        assert del_success is True
        remaining = await repo.get_by_user_id(user_id)
        assert len(remaining) == 4
        print(f" -> Success: Deleted place. Remaining count: {len(remaining)}")

        print("\n==================================================")
        print("  ALL VERIFICATION TESTS PASSED SUCCESSFULLY!")
        print("==================================================")


if __name__ == "__main__":
    asyncio.run(run_verification())
