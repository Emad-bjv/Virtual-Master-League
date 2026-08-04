from locust import HttpUser, task, between
import random

class VMLUser(HttpUser):
    wait_time = between(1, 3)

    # Assuming these are dummy test credentials or data
    TEAM_IDS = [1, 2, 3, 4]
    PACK_IDS = [1, 2, 3]

    @task(3)
    def view_transfer_market(self):
        self.client.get("/api/transfers/market/")

    @task(2)
    def view_gacha_packs(self):
        self.client.get("/api/gacha/packs/")

    @task(1)
    def simulate_pack_opening(self):
        # Warning: This writes to DB, ensure running against a test DB
        team_id = random.choice(self.TEAM_IDS)
        pack_id = random.choice(self.PACK_IDS)
        self.client.post("/api/gacha/open/", json={
            "team_id": team_id,
            "pack_id": pack_id
        })
