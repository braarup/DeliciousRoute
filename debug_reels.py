import sqlite3

conn = sqlite3.connect('deliciousroute.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("=== REELS TABLE ===")
try:
    reels = cursor.execute("SELECT id, vendor_id, title FROM reels ORDER BY vendor_id, id").fetchall()
    if reels:
        print("Reel ID | Vendor ID | Title")
        print("--------|-----------|-------")
        for reel in reels:
            title = reel['title'] if reel['title'] else "No title"
            print(f"{reel['id']:7} | {reel['vendor_id']:9} | {title}")
    else:
        print("No reels found")
except Exception as e:
    print(f"Error accessing reels table: {e}")

print("\n=== VENDORS TABLE ===")
try:
    vendors = cursor.execute("SELECT id, name, owner_user_id FROM vendors ORDER BY id").fetchall()
    if vendors:
        print("Vendor ID | Name | Owner User ID")
        print("----------|------|-------------")
        for vendor in vendors:
            print(f"{vendor['id']:9} | {vendor['name'][:20]:20} | {vendor['owner_user_id']}")
    else:
        print("No vendors found")
except Exception as e:
    print(f"Error accessing vendors table: {e}")

conn.close()
