from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://user:pass@localhost/hacklatam"
    mistral_api_key: str = ""
    openrouter_api_key: str = ""
    zavu_api_key: str = ""
    make_webhook_url: str = ""
    alert_phone: str = ""
    virustotal_api_key: str = ""
    groq_api_key: str = ""
    cors_origins: list[str] = [
        "http://localhost:5173",
        "https://haven-lat.vercel.app",
        "https://*.vercel.app",
        "https://haven-lat.codebynas.dev",
        "https://www.haven-lat.codebynas.dev",
    ]


settings = Settings()
