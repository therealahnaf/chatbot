import dotenv
from db_langgraph import get_db_connection, get_checkpointer

dotenv.load_dotenv()

def init_db():
    print("Connecting to database...")
    conn = get_db_connection()
    try:
        print("Initializing LangGraph checkpoint tables...")
        checkpointer = get_checkpointer(conn)
        checkpointer.setup()
        print("✅ Database initialized successfully.")
        print("Tables created (if not existed): checkpoints, checkpoint_blobs, checkpoint_writes, etc.")
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
