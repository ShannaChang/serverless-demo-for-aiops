from locust import HttpUser, task, between
import json
import random
import string
import uuid

class ApiUser(HttpUser):
    wait_time = between(1, 5)
    
    def on_start(self):
        self.client.headers = {'Content-Type': 'application/json'}
    
    @task(3)
    def get_all_items(self):
        self.client.get("/items")
    
    @task(2)
    def get_item_by_id(self):
        # Generate a random ID
        item_id = str(random.randint(1, 100))
        self.client.get(f"/items/{item_id}")
    
    @task(1)
    def create_item(self):
        # Generate a random item
        item_id = str(uuid.uuid4())
        item_name = ''.join(random.choices(string.ascii_lowercase, k=8))
        
        payload = {
            "id": item_id,
            "name": item_name
        }
        
        self.client.post("/items", json=payload)
