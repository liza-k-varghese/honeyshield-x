from fastapi import FastAPI
import psycopg
import redis

app = FastAPI(
    title="HoneyShield X API",
    version="0.1.0",
)

POSTGRES_HOST = "127.0.0.1"
POSTGRES_PORT = 5432
POSTGRES_DB = "honeyshield"
POSTGRES_USER = "honeyshield"
POSTGRES_PASSWORD = "change_this_password"

REDIS_HOST = "127.0.0.1"
REDIS_PORT = 6379


@app.get("/health")
def health():
    postgres_status = "disconnected"
    redis_status = "disconnected"

    try:
        with psycopg.connect(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            dbname=POSTGRES_DB,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
        ) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()

            postgres_status = "connected"

    except Exception as error:
        postgres_status = f"error: {error}"

    try:
        redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            decode_responses=True,
        )

        redis_client.ping()
        redis_status = "connected"
        redis_client.close()

    except Exception as error:
        redis_status = f"error: {error}"

    overall_status = (
        "ok"
        if postgres_status == "connected"
        and redis_status == "connected"
        else "degraded"
    )

    return {
        "status": overall_status,
        "service": "HoneyShield X API",
        "postgresql": postgres_status,
        "redis": redis_status,
    }

