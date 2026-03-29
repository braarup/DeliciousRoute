import sqlite3

def test_reel_queries():
    conn = sqlite3.connect('deliciousroute.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("=== TESTING REEL QUERIES ===")
    
    # Test query for vendor 1
    print("\n1. Testing query for vendor_id = 1:")
    print("SQL: SELECT * FROM reels WHERE vendor_id = 1")
    try:
        reels_1 = cursor.execute("SELECT * FROM reels WHERE vendor_id = ?", (1,)).fetchall()
        print(f"Found {len(reels_1)} reels for vendor 1:")
        for reel in reels_1:
            print(f"  - Reel {reel['id']}: vendor_id={reel['vendor_id']}, title='{reel['title']}'")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test query for vendor 2
    print("\n2. Testing query for vendor_id = 2:")
    print("SQL: SELECT * FROM reels WHERE vendor_id = 2")
    try:
        reels_2 = cursor.execute("SELECT * FROM reels WHERE vendor_id = ?", (2,)).fetchall()
        print(f"Found {len(reels_2)} reels for vendor 2:")
        for reel in reels_2:
            print(f"  - Reel {reel['id']}: vendor_id={reel['vendor_id']}, title='{reel['title']}'")
    except Exception as e:
        print(f"Error: {e}")
    
    # Show ALL reels
    print("\n3. ALL reels in database:")
    print("SQL: SELECT * FROM reels ORDER BY id")
    try:
        all_reels = cursor.execute("SELECT * FROM reels ORDER BY id").fetchall()
        print(f"Total reels in database: {len(all_reels)}")
        for reel in all_reels:
            print(f"  - Reel {reel['id']}: vendor_id={reel['vendor_id']}, title='{reel['title']}'")
    except Exception as e:
        print(f"Error: {e}")
    
    # Show vendors
    print("\n4. ALL vendors in database:")
    print("SQL: SELECT * FROM vendors ORDER BY id")
    try:
        all_vendors = cursor.execute("SELECT * FROM vendors ORDER BY id").fetchall()
        print(f"Total vendors in database: {len(all_vendors)}")
        for vendor in all_vendors:
            print(f"  - Vendor {vendor['id']}: name='{vendor['name']}'")
    except Exception as e:
        print(f"Error: {e}")
    
    conn.close()

if __name__ == "__main__":
    test_reel_queries()
