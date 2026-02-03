import os
from dotenv import load_dotenv, find_dotenv
from pymongo import MongoClient
import sys

# Load env directly to be sure
load_dotenv(find_dotenv())

mongo_url = os.getenv("MONGODB_URL")
print(f"Testing connection to: {mongo_url.split('@')[1] if '@' in mongo_url else 'INVALID_URL_FORMAT'}")

try:
    client = MongoClient(mongo_url)
    # The ismaster command is cheap and does not require auth, 
    # but accessing a database/collection usually triggers auth.
    # We'll try to list database names which definitely requires admin/auth privileges usually
    # or just a simple ping.
    
    print("Attempting server info (ping)...")
    client.admin.command('ping')
    print("Ping successful!")
    
    print("Attempting to list databases...")
    dbs = client.list_database_names()
    print(f"Databases: {dbs}")
    
except Exception as e:
    print(f"Connection failed: {e}")
    # Print full error details
    import traceback
    traceback.print_exc()
