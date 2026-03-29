#!/usr/bin/env python3
"""
Fix reel vendor_id assignments if they're incorrect
"""

import sqlite3

def fix_reel_vendor_assignments():
    conn = sqlite3.connect('deliciousroute.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("BEFORE FIXING:")
    print("=" * 30)
    
    # Show current state
    vendors = cursor.execute("SELECT id, name FROM vendors ORDER BY id").fetchall()
    print("Vendors:")
    for v in vendors:
        print(f"  {v['id']}: {v['name']}")
    
    reels = cursor.execute("SELECT id, vendor_id, title FROM reels ORDER BY id").fetchall()
    print("\nReels:")
    for r in reels:
        print(f"  Reel {r['id']}: vendor_id={r['vendor_id']}, title='{r['title'] or 'No title'}'")
    
    # If there are exactly 2 vendors and 2 reels, and both reels have vendor_id=1,
    # then assign the second reel to vendor 2
    if len(vendors) >= 2 and len(reels) >= 2:
        if all(r['vendor_id'] == 1 for r in reels):
            print(f"\nFIXING: All reels have vendor_id=1, updating reel {reels[1]['id']} to vendor_id=2")
            cursor.execute("UPDATE reels SET vendor_id = 2 WHERE id = ?", (reels[1]['id'],))
            conn.commit()
            
            print("\nAFTER FIXING:")
            print("=" * 30)
            reels_after = cursor.execute("SELECT id, vendor_id, title FROM reels ORDER BY id").fetchall()
            print("Reels:")
            for r in reels_after:
                print(f"  Reel {r['id']}: vendor_id={r['vendor_id']}, title='{r['title'] or 'No title'}'")
        else:
            print("\nReels already have different vendor_id values - no fix needed")
    else:
        print(f"\nNot enough data to fix automatically ({len(vendors)} vendors, {len(reels)} reels)")
    
    conn.close()
    print("\nDone!")

if __name__ == "__main__":
    fix_reel_vendor_assignments()
