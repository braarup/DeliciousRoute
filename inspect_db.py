#!/usr/bin/env python3

import sqlite3
import sys

# Connect to database
try:
    conn = sqlite3.connect('deliciousroute.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("=" * 50)
    print("DELICIOUS ROUTE DATABASE INSPECTION")
    print("=" * 50)
    
    # Check vendors
    print("\nVENDORS TABLE:")
    print("-" * 30)
    vendors = cursor.execute("SELECT id, name, owner_user_id FROM vendors ORDER BY id").fetchall()
    if vendors:
        for v in vendors:
            print(f"Vendor {v['id']}: {v['name']} (owner: {v['owner_user_id']})")
    else:
        print("No vendors found")
    
    # Check reels
    print("\nREELS TABLE:")
    print("-" * 30)
    reels = cursor.execute("SELECT id, vendor_id, title FROM reels ORDER BY id").fetchall()
    if reels:
        for r in reels:
            title = r['title'] or 'No title'
            print(f"Reel {r['id']}: belongs to vendor {r['vendor_id']} - '{title}'")
    else:
        print("No reels found")
    
    # Check relationship
    print("\nVENDOR-REEL RELATIONSHIP:")
    print("-" * 30)
    for vendor in vendors:
        vendor_reels = cursor.execute("SELECT id, title FROM reels WHERE vendor_id = ?", (vendor['id'],)).fetchall()
        print(f"Vendor {vendor['id']} ({vendor['name']}) has {len(vendor_reels)} reel(s):")
        for reel in vendor_reels:
            title = reel['title'] or 'No title'
            print(f"  - Reel {reel['id']}: '{title}'")
        if not vendor_reels:
            print("  - No reels")
    
    print("\n" + "=" * 50)
    
except Exception as e:
    print(f"Database error: {e}")
finally:
    if conn:
        conn.close()
