from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[1]

class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    jwt_secret: str = Field(validation_alias=AliasChoices("jwt_secret", "jwt_secret_key"))
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = Field(
        default=480,
        validation_alias=AliasChoices("jwt_expire_minutes", "access_token_expire_minutes"),
    )

    # Auto-routing scheduler: how often the background loop checks for a
    # completed request week that still needs routing.
    routing_check_interval_seconds: int = 60

    # Dev/test flag: bypass the Friday/Saturday request-window check so the
    # weekly flow can be exercised on any day of the week.
    request_window_override: bool = False

    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

settings = Settings()
