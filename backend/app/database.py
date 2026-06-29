from supabase import create_client, Client
from app.config import settings

def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_key)

# Single shared instance (good for most cases)
supabase: Client = get_supabase()