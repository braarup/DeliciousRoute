import sqlite3

DB_PATH = "deliciousroute.db"

ALTERS = [
    "ALTER TABLE vendors ADD COLUMN lat REAL",
    "ALTER TABLE vendors ADD COLUMN lng REAL",
    "ALTER TABLE vendors ADD COLUMN address TEXT"
]

def safe_alter():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    for stmt in ALTERS:
        try:
            cur.execute(stmt)
            print(f"Executed: {stmt}")
        except Exception as e:
            print(f"Skipped: {stmt} (reason: {e})")
    conn.commit()
    conn.close()
    print("Done.")

if __name__ == "__main__":
    safe_alter()
