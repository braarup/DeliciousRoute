import os, sqlite3, math, time, sys
from datetime import datetime
from functools import wraps
from flask import (Flask, render_template, request, jsonify, redirect, url_for, flash, g)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_login import (
    LoginManager, UserMixin, login_user, logout_user,
    login_required as flask_login_required, current_user
)

# --- Optional: load .env without crashing if package missing --------------------
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass






# --- Optional: load .env without crashing if package missing --------------------
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass







def allowed_file(filename: str) -> bool:
    _, ext = os.path.splitext(filename.lower())
    return ext in ALLOWED_EXTS

# Optional OpenAI (graceful fallback if not present)
try:
    import openai
    OPENAI_AVAILABLE = True
    print(f"✅ OpenAI imported successfully, version: {openai.__version__}")
except Exception as e:
    openai = None
    OPENAI_AVAILABLE = False
    print(f"❌ OpenAI import failed: {e}")
    print(f"Python executable: {sys.executable}")
    print(f"Python path: {sys.path[:3]}")
    # Try to give more specific guidance
    try:
        import subprocess
        result = subprocess.run([sys.executable, "-m", "pip", "list"], 
                              capture_output=True, text=True, timeout=10)
        if "openai" not in result.stdout.lower():
            print("OpenAI package not found in pip list")
        else:
            print("OpenAI package found in pip list but import failed")
    except Exception:
        pass


# ------------------------------------------------------------------------------
# App & Config
# ------------------------------------------------------------------------------
app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.getenv("FLASK_SECRET_KEY", "change-me"),
    DATABASE=os.getenv("DATABASE", "deliciousroute.db"),
)

# Vendor signup route
@app.route("/signup/vendor", methods=["GET", "POST"])
def signup_vendor():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        first_name = request.form.get("first_name", "").strip()
        last_name = request.form.get("last_name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        cuisine = request.form.get("cuisine", "").strip()
        description = request.form.get("description", "").strip()
        db = get_db()
        # Validate input
        if not name or not first_name or not last_name or not email or not password:
            flash("All fields marked * are required.", "danger")
            return render_template("signup_vendor.html")
        existing = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        if existing:
            flash("Email already registered. Please sign in.", "warning")
            return render_template("signup_vendor.html")
        password_hash = generate_password_hash(password)
        # Create user
        db.execute(
            "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
            (name, email, password_hash, "vendor")
        )
        db.commit()
        user_row = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        # Create vendor profile
        db.execute(
            "INSERT INTO vendors (name, first_name, last_name, cuisine, description, owner_user_id, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
            (name, first_name, last_name, cuisine, description, user_row["id"])
        )
        db.commit()
        login_user(User(user_row))
        flash("Vendor account created and logged in!", "success")
        return redirect(url_for("manage"))
    return render_template("signup_vendor.html")

# Customer signup route
@app.route("/signup/customer", methods=["GET", "POST"])
def signup_customer():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        db = get_db()
        # Validate input
        if not name or not email or not password:
            flash("All fields are required.", "danger")
            return render_template("signup_customer.html")
        existing = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        if existing:
            flash("Email already registered. Please sign in.", "warning")
            return render_template("signup_customer.html")
        password_hash = generate_password_hash(password)
        db.execute(
            "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
            (name, email, password_hash, "customer")
        )
        db.commit()
        user_row = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        login_user(User(user_row))
        flash("Account created and logged in!", "success")
        return redirect(url_for("profile"))
    return render_template("signup_customer.html")

# Uploads (profile/vendor images)
UPLOAD_FOLDER = os.path.join(app.root_path, "static", "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTS = {".png", ".jpg", ".jpeg", ".gif"}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER



# ------------------------------------------------------------------------------
# Role Required Decorator
# ------------------------------------------------------------------------------
def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not current_user.is_authenticated or current_user.role not in roles:
                return render_template("errors.html", code=403, message="Access denied"), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

# ------------------------------------------------------------------------------
# API: Update Vendor Location
# ------------------------------------------------------------------------------
@app.route('/api/vendor/location', methods=['POST'])
@flask_login_required
@role_required('vendor', 'admin')
def update_vendor_location():
    db = get_db()
    data = request.get_json(force=True)
    lat = data.get('lat')
    lng = data.get('lng')
    address = data.get('address')
    if lat is None or lng is None:
        return jsonify({'ok': False, 'error': 'Latitude and longitude required.'}), 400
    from datetime import datetime
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    db.execute(
        "UPDATE vendors SET lat=?, lng=?, address=?, last_updated=? WHERE owner_user_id=?",
        (lat, lng, address, now, current_user.id)
    )
    db.commit()
    return jsonify({'ok': True})

# Uploads (profile/vendor images)
UPLOAD_FOLDER = os.path.join(app.root_path, "static", "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTS = {".png", ".jpg", ".jpeg", ".gif"}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

def allowed_file(filename: str) -> bool:
    _, ext = os.path.splitext(filename.lower())
    return ext in ALLOWED_EXTS

# Optional OpenAI (graceful fallback if not present)
try:
    import openai
    OPENAI_AVAILABLE = True
    print(f"✅ OpenAI imported successfully, version: {openai.__version__}")
except Exception as e:
    openai = None
    OPENAI_AVAILABLE = False
    print(f"❌ OpenAI import failed: {e}")
    print(f"Python executable: {sys.executable}")
    print(f"Python path: {sys.path[:3]}")
    
    # Try to give more specific guidance
    try:
        import subprocess
        result = subprocess.run([sys.executable, "-m", "pip", "list"], 
                              capture_output=True, text=True, timeout=10)
        if "openai" not in result.stdout.lower():
            print("OpenAI package not found in pip list")
        else:
            print("OpenAI package found in pip list but import failed")
    except Exception:
        pass

# ------------------------------------------------------------------------------
# Flask-Login
# ------------------------------------------------------------------------------
login_manager = LoginManager(app)
login_manager.login_view = "login"

class User(UserMixin):
    def __init__(self, row):
        self.id = row["id"]
        self.email = row["email"]
        self.name = row["name"]
        self.role = row["role"]

@login_manager.user_loader
def load_user(user_id):
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    return User(row) if row else None

def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not current_user.is_authenticated or current_user.role not in roles:
                return render_template("errors.html", code=403, message="Access denied"), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

# ------------------------------------------------------------------------------
# DB helpers
# ------------------------------------------------------------------------------
def init_db():
    # Add location and last_updated columns to vendors table if they don't exist
    try:
        db.execute("ALTER TABLE vendors ADD COLUMN lat REAL")
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE vendors ADD COLUMN lng REAL")
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE vendors ADD COLUMN address TEXT")
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE vendors ADD COLUMN last_updated TEXT")
    except Exception:
        pass
    db = sqlite3.connect(app.config["DATABASE"])
    db.row_factory = sqlite3.Row
    
    # Create tables for likes and saves
    db.executescript("""
        CREATE TABLE IF NOT EXISTS reel_likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reel_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            created_at TEXT,
            FOREIGN KEY (reel_id) REFERENCES reels (id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(reel_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS reel_saves (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reel_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            created_at TEXT,
            FOREIGN KEY (reel_id) REFERENCES reels (id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(reel_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS vendor_likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vendor_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vendor_id) REFERENCES vendors (id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(vendor_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS vendor_saves (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vendor_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vendor_id) REFERENCES vendors (id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(vendor_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS vendor_hours (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vendor_id INTEGER NOT NULL,
            day_of_week INTEGER NOT NULL,  -- 0=Monday, 1=Tuesday, ..., 6=Sunday
            open_time TEXT,               -- HH:MM format (24h)
            close_time TEXT,              -- HH:MM format (24h)
            is_closed INTEGER DEFAULT 0,  -- 1 if closed on this day
            FOREIGN KEY (vendor_id) REFERENCES vendors (id),
            UNIQUE(vendor_id, day_of_week)
        );
    """)
    
    # Add new columns to vendors table if they don't exist
    try:
        db.execute("ALTER TABLE vendors ADD COLUMN website TEXT")
    except Exception:
        pass  # Column already exists
        
    try:
        db.execute("ALTER TABLE vendors ADD COLUMN social_facebook TEXT")
    except Exception:
        pass
        
    try:
        db.execute("ALTER TABLE vendors ADD COLUMN social_instagram TEXT")  
    except Exception:
        pass
        
    try:
        db.execute("ALTER TABLE vendors ADD COLUMN social_twitter TEXT")
    except Exception:
        pass
    
    try:
        db.execute("ALTER TABLE vendors ADD COLUMN current_city TEXT")
    except Exception:
        pass
        
    try:
        db.execute("ALTER TABLE vendors ADD COLUMN current_address TEXT")
    except Exception:
        pass
    
    # Add first_name and last_name columns to vendors table
    try:
        db.execute("ALTER TABLE vendors ADD COLUMN first_name TEXT")
    except Exception:
        pass
    
    try:
        db.execute("ALTER TABLE vendors ADD COLUMN last_name TEXT")
    except Exception:
        pass
    
    db.commit()
    db.close()

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()

# ------------------------------------------------------------------------------
# Utils
# ------------------------------------------------------------------------------
def haversine_miles(lat1, lon1, lat2, lon2):
    """Great-circle distance in MILES."""
    R = 3958.8  # Earth radius in miles
    from math import radians, sin, cos, atan2, sqrt
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dl = radians(lon2 - lon1)
    a = sin(dphi/2)**2 + cos(phi1) * cos(phi2) * sin(dl/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

def format_time_12h(time_24h):
    """Convert 24h format (HH:MM) to 12h format (H:MM AM/PM)"""
    if not time_24h:
        return ""
    try:
        hour, minute = map(int, time_24h.split(':'))
        if hour == 0:
            return f"12:{minute:02d} AM"
        elif hour < 12:
            return f"{hour}:{minute:02d} AM"
        elif hour == 12:
            return f"12:{minute:02d} PM"
        else:
            return f"{hour-12}:{minute:02d} PM"
    except:
        return time_24h

def get_vendor_hours(vendor_id):
    """Get operating hours for a vendor"""
    db = get_db()
    hours = db.execute(
        "SELECT day_of_week, open_time, close_time, is_closed FROM vendor_hours WHERE vendor_id=? ORDER BY day_of_week",
        (vendor_id,)
    ).fetchall()
    
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    hours_dict = {}
    
    for hour in hours:
        day_name = days[hour['day_of_week']]
        if hour['is_closed']:
            hours_dict[day_name] = 'Closed'
        else:
            open_12h = format_time_12h(hour['open_time'])
            close_12h = format_time_12h(hour['close_time'])
            hours_dict[day_name] = f"{open_12h} to {close_12h}"
    
    return hours_dict

def is_vendor_currently_open(vendor_id):
    """Check if vendor is currently open based on hours and day"""
    from datetime import datetime
    import time
    
    db = get_db()
    now = datetime.now()
    current_day = now.weekday()  # 0=Monday, 6=Sunday
    current_time = now.strftime("%H:%M")
    
    hour_info = db.execute(
        "SELECT open_time, close_time, is_closed FROM vendor_hours WHERE vendor_id=? AND day_of_week=?",
        (vendor_id, current_day)
    ).fetchone()
    
    if not hour_info or hour_info['is_closed']:
        return False
        
    if hour_info['open_time'] and hour_info['close_time']:
        return hour_info['open_time'] <= current_time <= hour_info['close_time']
    
    return False

async def reverse_geocode_location(lat, lng):
    """Convert coordinates to city name using a geocoding service"""
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            # Using OpenStreetMap Nominatim for reverse geocoding
            url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json"
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    address = data.get('address', {})
                    city = address.get('city') or address.get('town') or address.get('village')
                    return city
    except:
        pass
    return None

def get_current_vendor():
    if not current_user.is_authenticated:
        return None
    db = get_db()
    # Use a single FK name consistently: owner_user_id
    vendor = db.execute(
        "SELECT * FROM vendors WHERE owner_user_id=?",
        (current_user.id,),
    ).fetchone()
    
    return vendor

@app.context_processor
def inject_user_data():
    """Make current user and vendor data available in all templates"""
    if current_user.is_authenticated:
        # Get current vendor data for vendors
        current_vendor = get_current_vendor() if current_user.role == "vendor" else None
        
        # Extract first name
        user_first_name = None
        if current_user.role == "vendor" and current_vendor:
            # For vendors, use first_name from vendor table if it exists
            try:
                first_name = current_vendor['first_name']
                if first_name:
                    user_first_name = first_name
            except (KeyError, IndexError):
                # If first_name column doesn't exist or is empty, fall back to parsing name
                pass
        
        # Fallback: extract from full name if no first_name found
        if not user_first_name and current_user.name:
            user_first_name = current_user.name.split()[0] if current_user.name else None
            
        return {
            'current_vendor': current_vendor,
            'user_first_name': user_first_name
        }
    return {
        'current_vendor': None,
        'user_first_name': None
    }

# ------------------------------------------------------------------------------
# Pages
# ------------------------------------------------------------------------------
@app.route("/")
def index():
    db = get_db()
    ads_header, ads_body = [], []
    try:
        ads_header = db.execute(
            "SELECT * FROM ads WHERE is_active=1 AND position='header' ORDER BY id"
        ).fetchall()
        ads_body = db.execute(
            "SELECT * FROM ads WHERE is_active=1 AND position='body' ORDER BY id"
        ).fetchall()
    except sqlite3.Error:
        # ads table might not exist yet; render without carousels
        pass
    return render_template("index.html", ads_header=ads_header, ads_body=ads_body)

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email","").strip().lower()
        password = request.form.get("password","")

        db = get_db()
        row = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()

        # NOTE: schema uses 'password_hash'
        if row and check_password_hash(row["password_hash"], password):
            login_user(User(row))
            flash("Welcome back!", "success")
            # If vendor, set session flag to show location modal
            if row["role"] == "vendor":
                from flask import session
                session["show_location_modal"] = True
            nxt = request.args.get("next")
            return redirect(nxt or url_for("profile"))
        flash("Invalid email or password", "danger")
    return render_template("login.html")

@app.route("/logout")
@flask_login_required
def logout():
    logout_user()
    flash("Signed out.", "info")
    return redirect(url_for("index"))

@app.route("/manage")
@flask_login_required
@role_required("vendor", "admin")
def manage():
    vendor = get_current_vendor()
    return render_template("manage.html", vendor=vendor)



@app.route("/profile")
@flask_login_required
def profile():
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id=?", (current_user.id,)).fetchone()
    vendor = get_current_vendor() if current_user.role == "vendor" else None
    # Check session flag for location modal
    from flask import session
    show_location_modal = False
    if current_user.is_authenticated and current_user.role == "vendor":
        show_location_modal = session.pop("show_location_modal", False)
    return render_template("profile.html", user=user, vendor=vendor, show_location_modal=show_location_modal)

@app.post("/profile/upload")
@flask_login_required
def profile_upload():
    file = request.files.get("photo")
    if not file or file.filename == "":
        flash("No file selected.", "warning")
        return redirect(url_for("profile"))

    if not allowed_file(file.filename):
        flash("Invalid file type. Use PNG, JPG, JPEG, or GIF.", "danger")
        return redirect(url_for("profile"))

    filename = secure_filename(f"user_{current_user.id}_" + file.filename)
    path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(path)
    rel_url = f"/static/uploads/{filename}"

    db = get_db()
    if current_user.role == "vendor":
        # Prefer vendor logo for vendors
        db.execute("UPDATE vendors SET logo_url=? WHERE owner_user_id=?", (rel_url, current_user.id))
    else:
        # Store on users for customers
        db.execute("UPDATE users SET profile_img=? WHERE id=?", (rel_url, current_user.id))
    db.commit()

    flash("Profile image updated!", "success")
    return redirect(url_for("profile"))
# ------------------------------------------------------------------------------
# Vendor Menu and Photos Pages
# ------------------------------------------------------------------------------

@app.route("/vendor/<int:vendor_id>/menu")
def vendor_menus(vendor_id):
    db = get_db()
    vendor = db.execute("SELECT * FROM vendors WHERE id=?", (vendor_id,)).fetchone()
    if not vendor:
        return render_template("errors.html", code=404, message="Vendor not found"), 404
    return render_template("vendor_menus.html", vendor=vendor)

@app.route("/vendor/<int:vendor_id>/photos")
def vendor_photos(vendor_id):
    db = get_db()
    vendor = db.execute("SELECT * FROM vendors WHERE id=?", (vendor_id,)).fetchone()
    if not vendor:
        return render_template("errors.html", code=404, message="Vendor not found"), 404
    return render_template("vendor_photos.html", vendor=vendor)

# ------------------------------------------------------------------------------
# Static Pages
# ------------------------------------------------------------------------------
@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/contact")
def contact():
    return render_template("contact.html")

# ------------------------------------------------------------------------------
# Public vendor page
# ------------------------------------------------------------------------------
@app.route("/status")
def status_check():
    return f"<h1>App Status: ACTIVE - Version 3</h1><p>Time: {__import__('datetime').datetime.now()}</p><p><a href='/'>Home</a></p>"

@app.route("/vendor/<int:vendor_id>/test")
def test_vendor_profile(vendor_id):
    """Simple test route to debug reel filtering"""
    db = get_db()
    
    # Get vendor
    vendor = db.execute("SELECT * FROM vendors WHERE id=?", (vendor_id,)).fetchone()
    if not vendor:
        return f"<h1>Vendor {vendor_id} not found</h1>"
    
    # Get ALL reels first
    all_reels = db.execute("SELECT id, vendor_id, title FROM reels ORDER BY id").fetchall()
    
    # Filter for this vendor
    vendor_reels = [r for r in all_reels if r['vendor_id'] == vendor_id]
    
    # Create simple HTML response
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><title>Test Vendor {vendor_id}</title></head>
    <body>
        <h1>TEST: Vendor {vendor_id} ({vendor['name']})</h1>
        
        <h2>All Reels in Database:</h2>
        <ul>
        {''.join([f'<li>Reel {r["id"]}: vendor_id={r["vendor_id"]}, title="{r["title"] or "No title"}"</li>' for r in all_reels])}
        </ul>
        
        <h2>Reels for THIS Vendor ({vendor_id}):</h2>
        <ul>
        {''.join([f'<li>Reel {r["id"]}: vendor_id={r["vendor_id"]}, title="{r["title"] or "No title"}"</li>' for r in vendor_reels])}
        </ul>
        
        <p><strong>Should show {len(vendor_reels)} reel(s) for vendor {vendor_id}</strong></p>
        
        <p><a href="/vendor/{vendor_id}">Back to regular vendor profile</a></p>
        <p><a href="/vendor/1/test">Test Vendor 1</a> | <a href="/vendor/2/test">Test Vendor 2</a></p>
    </body>
    </html>
    """
    
    return html

@app.route("/vendor/<int:vendor_id>")
def vendor_profile(vendor_id):
    db = get_db()
    vendor = db.execute("SELECT * FROM vendors WHERE id=?", (vendor_id,)).fetchone()
    if not vendor:
        return render_template("errors.html", code=404, message="Vendor not found"), 404
    
    # Get ALL reels and filter in Python (since SQL filtering had issues)
    all_reels = db.execute("SELECT * FROM reels ORDER BY created_at DESC").fetchall()
    reels = [reel for reel in all_reels if int(reel['vendor_id']) == int(vendor_id)]

    # Check if current user owns this vendor
    is_owner = False
    if current_user.is_authenticated and current_user.role == "vendor":
        owner_vendor = db.execute("SELECT * FROM vendors WHERE owner_user_id=?", (current_user.id,)).fetchone()
        is_owner = owner_vendor and owner_vendor["id"] == vendor_id

    # Get like and save counts
    like_count = db.execute(
        "SELECT COUNT(*) as count FROM vendor_likes WHERE vendor_id = ?", 
        (vendor_id,)
    ).fetchone()['count']

    save_count = db.execute(
        "SELECT COUNT(*) as count FROM vendor_saves WHERE vendor_id = ?", 
        (vendor_id,)
    ).fetchone()['count']

    # Add counts and hours to vendor dict
    vendor = dict(vendor)
    vendor['like_count'] = like_count
    vendor['save_count'] = save_count
    vendor['hours'] = get_vendor_hours(vendor_id)

    return render_template("vendor_profile.html", vendor=vendor, reels=reels, is_owner=is_owner)

@app.route("/vendors")
def vendors_list():
    """Display all registered vendors with their profile cards"""
    db = get_db()
    vendors = db.execute(
        "SELECT * FROM vendors WHERE is_active=1 ORDER BY name"
    ).fetchall()
    
    # Enhance vendor data with hours and location info
    enhanced_vendors = []
    for vendor in vendors:
        vendor_dict = dict(vendor)
        
        # Get hours of operation
        vendor_dict['hours'] = get_vendor_hours(vendor['id'])
        vendor_dict['is_currently_open'] = is_vendor_currently_open(vendor['id'])
        
        # Only show location if currently open
        if vendor_dict['is_currently_open'] and vendor.get('current_city'):
            vendor_dict['display_location'] = vendor['current_city']
        else:
            vendor_dict['display_location'] = None
            
        # Format cuisine list
        if vendor['cuisine']:
            vendor_dict['cuisine_list'] = [c.strip() for c in vendor['cuisine'].split(',')]
        else:
            vendor_dict['cuisine_list'] = []
            
        enhanced_vendors.append(vendor_dict)
    
    return render_template("vendors_list.html", vendors=enhanced_vendors)

# API endpoint to update vendor business information
@app.route("/api/vendors/<int:vendor_id>/update", methods=["POST"])
@flask_login_required
def update_vendor_info(vendor_id):
    if current_user.role != "vendor":
        return jsonify({"ok": False, "error": "Access denied"}), 403
    
    db = get_db()
    # Verify ownership
    vendor = db.execute("SELECT * FROM vendors WHERE id=? AND owner_user_id=?", 
                       (vendor_id, current_user.id)).fetchone()
    if not vendor:
        return jsonify({"ok": False, "error": "Vendor not found or access denied"}), 404
    
    data = request.json
    
    # Update basic vendor info
    db.execute("""
        UPDATE vendors SET 
            name=?, cuisine=?, description=?, first_name=?, last_name=?, website=?, 
            social_facebook=?, social_instagram=?, social_twitter=?
        WHERE id=?
    """, (
        data.get('name', '').strip(),
        data.get('cuisine', '').strip(),
        data.get('description', '').strip(),
        data.get('first_name', '').strip(),
        data.get('last_name', '').strip(),
        data.get('website', '').strip(),
        data.get('social_facebook', '').strip(),
        data.get('social_instagram', '').strip(),
        data.get('social_twitter', '').strip(),
        vendor_id
    ))
    
    db.commit()
    return jsonify({"ok": True, "message": "Vendor information updated successfully"})

# API endpoint to get vendor hours
@app.route("/api/vendors/<int:vendor_id>/hours", methods=["GET"])
@flask_login_required  
def get_vendor_hours_api(vendor_id):
    if current_user.role != "vendor":
        return jsonify({"ok": False, "error": "Access denied"}), 403
    
    db = get_db()
    # Verify ownership
    vendor = db.execute("SELECT * FROM vendors WHERE id=? AND owner_user_id=?", 
                       (vendor_id, current_user.id)).fetchone()
    if not vendor:
        return jsonify({"ok": False, "error": "Vendor not found or access denied"}), 404
    
    hours = get_vendor_hours(vendor_id)
    return jsonify({"ok": True, "hours": hours})

# API endpoint to update vendor hours
@app.route("/api/vendors/<int:vendor_id>/hours", methods=["POST"])
@flask_login_required  
def update_vendor_hours(vendor_id):
    if current_user.role != "vendor":
        return jsonify({"ok": False, "error": "Access denied"}), 403
    
    db = get_db()
    # Verify ownership
    vendor = db.execute("SELECT * FROM vendors WHERE id=? AND owner_user_id=?", 
                       (vendor_id, current_user.id)).fetchone()
    if not vendor:
        return jsonify({"ok": False, "error": "Vendor not found or access denied"}), 404
    
    hours_data = request.json.get('hours', {})
    
    # Clear existing hours
    db.execute("DELETE FROM vendor_hours WHERE vendor_id=?", (vendor_id,))
    
    # Insert new hours
    for day_idx, day_hours in hours_data.items():
        day_idx = int(day_idx)
        if day_hours.get('is_closed'):
            # Explicitly closed day
            db.execute(
                "INSERT INTO vendor_hours (vendor_id, day_of_week, is_closed) VALUES (?,?,1)",
                (vendor_id, day_idx)
            )
        elif day_hours.get('open_time') and day_hours.get('close_time'):
            # Only insert if both times are provided
            db.execute(
                "INSERT INTO vendor_hours (vendor_id, day_of_week, open_time, close_time, is_closed) VALUES (?,?,?,?,0)",
                (vendor_id, day_idx, day_hours.get('open_time'), day_hours.get('close_time'))
            )
        # Skip days that have no times set and aren't explicitly closed
    
    db.commit()
    return jsonify({"ok": True, "message": "Hours updated successfully"})

# ------------------------------------------------------------------------------
# JSON APIs
# ------------------------------------------------------------------------------
@app.get("/api/vendors")
def api_vendors():
    """
    Search vendors by name/cuisine; optional near=lat,lng & radius (miles).
    """
    db = get_db()
    q = request.args.get("q", "").strip().lower()
    near = request.args.get("near")  # "lat,lng"
    radius_miles = float(request.args.get("radius", 10))

    rows = db.execute("SELECT * FROM vendors WHERE is_active=1").fetchall()
    vendors = []
    for r in rows:
        if q and (q not in (r["name"] or "").lower() and q not in (r["cuisine"] or "").lower()):
            continue
        item = dict(r)
        item["distance_miles"] = None
        vendors.append(item)

    if near:
        try:
            lat0, lng0 = [float(x) for x in near.split(",")]
            for v in vendors:
                if v.get("lat") is not None and v.get("lng") is not None:
                    v["distance_miles"] = haversine_miles(lat0, lng0, v["lat"], v["lng"])
            vendors = [v for v in vendors if v["distance_miles"] is not None and v["distance_miles"] <= radius_miles]
            vendors.sort(key=lambda x: x["distance_miles"])
        except Exception:
            pass

    return jsonify(vendors)

@app.get("/api/vendors/cards")
def api_vendor_cards():
    """
    Get vendor data formatted for profile cards with hours and location info
    """
    db = get_db()
    vendors = db.execute(
        "SELECT * FROM vendors WHERE is_active=1 ORDER BY name"
    ).fetchall()
    
    # Enhance vendor data with hours and location info
    enhanced_vendors = []
    for vendor in vendors:
        vendor_dict = dict(vendor)
        
        # Get hours of operation
        vendor_dict['hours'] = get_vendor_hours(vendor['id'])
        
        # Only include vendors that have configured hours
        if not vendor_dict['hours']:
            continue
            
        vendor_dict['is_currently_open'] = is_vendor_currently_open(vendor['id'])
        
        # Only show location if currently open
        if vendor_dict['is_currently_open'] and vendor['current_city']:
            vendor_dict['display_location'] = vendor['current_city']
        else:
            vendor_dict['display_location'] = None
            
        # Format cuisine list
        if vendor['cuisine']:
            vendor_dict['cuisine_list'] = [c.strip() for c in vendor['cuisine'].split(',')]
        else:
            vendor_dict['cuisine_list'] = []
            
        # Get like and save counts
        like_count = db.execute(
            "SELECT COUNT(*) as count FROM vendor_likes WHERE vendor_id = ?", 
            (vendor['id'],)
        ).fetchone()['count']
        
        save_count = db.execute(
            "SELECT COUNT(*) as count FROM vendor_saves WHERE vendor_id = ?", 
            (vendor['id'],)
        ).fetchone()['count']
        
        vendor_dict['like_count'] = like_count
        vendor_dict['save_count'] = save_count
            
        enhanced_vendors.append(vendor_dict)

    return jsonify(enhanced_vendors)

@app.post("/api/vendors/<int:vendor_id>/location")
@flask_login_required
@role_required("vendor", "admin")
def api_update_location(vendor_id):
    db = get_db()

    # Vendor can only update their own venue
    owner_vendor = db.execute(
        "SELECT * FROM vendors WHERE owner_user_id=?", (current_user.id,)
    ).fetchone()
    if not owner_vendor or (current_user.role == "vendor" and owner_vendor["id"] != vendor_id):
        return jsonify({"ok": False, "error": "forbidden"}), 403

    data = request.get_json(force=True) or {}
    try:
        lat = float(data.get("lat"))
        lng = float(data.get("lng"))
    except (TypeError, ValueError):
        return jsonify({"ok": False, "error": "invalid lat/lng"}), 400

    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    
    # Try to get city name from coordinates
    try:
        import requests
        # Using OpenStreetMap Nominatim for reverse geocoding
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json"
        response = requests.get(url, headers={'User-Agent': 'DeliciousRoute/1.0'})
        if response.status_code == 200:
            data_geo = response.json()
            address = data_geo.get('address', {})
            current_city = address.get('city') or address.get('town') or address.get('village') or address.get('municipality')
            
            # Update with city information
            db.execute(
                "UPDATE vendors SET lat=?, lng=?, last_updated=?, current_city=? WHERE id=?",
                (lat, lng, now, current_city, vendor_id),
            )
        else:
            # Fallback: update without city
            db.execute(
                "UPDATE vendors SET lat=?, lng=?, last_updated=? WHERE id=?",
                (lat, lng, now, vendor_id),
            )
    except Exception:
        # Fallback: update without city
        db.execute(
            "UPDATE vendors SET lat=?, lng=?, last_updated=? WHERE id=?",
            (lat, lng, now, vendor_id),
        )
    
    db.commit()
    return jsonify({"ok": True, "updated_at": now})

@app.post("/api/vendors/<int:vendor_id>/logo")
@flask_login_required
@role_required("vendor", "admin")
def api_update_vendor_logo(vendor_id):
    db = get_db()

    # Vendor can only update their own venue
    owner_vendor = db.execute(
        "SELECT * FROM vendors WHERE owner_user_id=?", (current_user.id,)
    ).fetchone()
    if not owner_vendor or (current_user.role == "vendor" and owner_vendor["id"] != vendor_id):
        return jsonify({"ok": False, "error": "forbidden"}), 403

    if 'photo' not in request.files:
        return jsonify({"ok": False, "error": "no file"}), 400
    
    file = request.files['photo']
    if file.filename == '':
        return jsonify({"ok": False, "error": "no file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"ok": False, "error": "invalid file type"}), 400

    filename = secure_filename(f"vendor_{vendor_id}_{file.filename}")
    path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(path)
    
    rel_url = f"/static/uploads/{filename}"
    db.execute("UPDATE vendors SET logo_url=? WHERE id=?", (rel_url, vendor_id))
    db.commit()
    
    return jsonify({"ok": True, "logo_url": rel_url})

@app.post("/api/users/<int:user_id>/profile-picture")
@flask_login_required
def api_update_user_profile_picture(user_id):
    db = get_db()

    # Users can only update their own profile picture
    if current_user.id != user_id:
        return jsonify({"ok": False, "error": "forbidden"}), 403

    if 'photo' not in request.files:
        return jsonify({"ok": False, "error": "no file"}), 400
    
    file = request.files['photo']
    if file.filename == '':
        return jsonify({"ok": False, "error": "no file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"ok": False, "error": "invalid file type"}), 400

    filename = secure_filename(f"user_{user_id}_{file.filename}")
    path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(path)
    
    rel_url = f"/static/uploads/{filename}"
    db.execute("UPDATE users SET profile_img=? WHERE id=?", (rel_url, user_id))
    db.commit()
    
    return jsonify({"ok": True, "profile_img_url": rel_url})

@app.post("/api/vendors/<int:vendor_id>/reel")
@flask_login_required
@role_required("vendor", "admin")
def api_upload_vendor_reel(vendor_id):
    db = get_db()

    # Vendor can only upload to their own profile
    owner_vendor = db.execute(
        "SELECT * FROM vendors WHERE owner_user_id=?", (current_user.id,)
    ).fetchone()
    if not owner_vendor or (current_user.role == "vendor" and owner_vendor["id"] != vendor_id):
        return jsonify({"ok": False, "error": "forbidden"}), 403

    if 'video' not in request.files:
        return jsonify({"ok": False, "error": "no video file"}), 400
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({"ok": False, "error": "no file selected"}), 400

    # Check if file is a video
    allowed_extensions = {'mp4', 'mov', 'avi', 'mkv', 'webm'}
    if not (file.filename and '.' in file.filename and 
            file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
        return jsonify({"ok": False, "error": "invalid video file type"}), 400

    caption = request.form.get('caption', '').strip()
    if len(caption) > 500:
        return jsonify({"ok": False, "error": "caption too long"}), 400

    # Delete existing reel for this vendor (only one allowed)
    existing_reel = db.execute(
        "SELECT * FROM reels WHERE vendor_id=?", (vendor_id,)
    ).fetchone()
    
    if existing_reel:
        # Delete old video file
        old_path = os.path.join(app.config["UPLOAD_FOLDER"], 
                               existing_reel["video_url"].split('/')[-1])
        if os.path.exists(old_path):
            os.remove(old_path)
        
        # Delete from database
        db.execute("DELETE FROM reels WHERE vendor_id=?", (vendor_id,))

    # Save new video
    filename = secure_filename(f"reel_{vendor_id}_{int(time.time())}_{file.filename}")
    path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(path)
    
    video_url = f"/static/uploads/{filename}"
    
    # Insert new reel
    db.execute(
        "INSERT INTO reels (vendor_id, title, video_url, created_at) VALUES (?, ?, ?, ?)",
        (vendor_id, caption, video_url, datetime.now().isoformat())
    )
    db.commit()
    
    return jsonify({"ok": True, "video_url": video_url})

@app.get("/api/reels")
def api_reels():
    db = get_db()
    rows = db.execute("""
        SELECT r.*, v.name as vendor_name, v.logo_url as vendor_logo_url,
               (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id) as likes
        FROM reels r 
        JOIN vendors v ON v.id=r.vendor_id 
        ORDER BY r.created_at DESC
    """).fetchall()
    return jsonify([dict(r) for r in rows])

@app.post("/api/reels/<int:reel_id>/like")
@flask_login_required
def api_like_reel(reel_id):
    db = get_db()
    
    # Check if already liked
    existing_like = db.execute(
        "SELECT * FROM reel_likes WHERE reel_id=? AND user_id=?", 
        (reel_id, current_user.id)
    ).fetchone()
    
    if existing_like:
        # Unlike
        db.execute("DELETE FROM reel_likes WHERE reel_id=? AND user_id=?", 
                  (reel_id, current_user.id))
        liked = False
    else:
        # Like
        db.execute("INSERT INTO reel_likes (reel_id, user_id, created_at) VALUES (?, ?, ?)",
                  (reel_id, current_user.id, datetime.now().isoformat()))
        liked = True
    
    db.commit()
    
    # Get updated like count
    likes = db.execute("SELECT COUNT(*) FROM reel_likes WHERE reel_id=?", (reel_id,)).fetchone()[0]
    
    return jsonify({"ok": True, "liked": liked, "likes": likes})

@app.post("/api/reels/<int:reel_id>/save")
@flask_login_required
def api_save_reel(reel_id):
    db = get_db()
    
    # Check if already saved
    existing_save = db.execute(
        "SELECT * FROM reel_saves WHERE reel_id=? AND user_id=?", 
        (reel_id, current_user.id)
    ).fetchone()
    
    if existing_save:
        # Unsave
        db.execute("DELETE FROM reel_saves WHERE reel_id=? AND user_id=?", 
                  (reel_id, current_user.id))
        saved = False
    else:
        # Save
        db.execute("INSERT INTO reel_saves (reel_id, user_id, created_at) VALUES (?, ?, ?)",
                  (reel_id, current_user.id, datetime.now().isoformat()))
        saved = True
    
    db.commit()
    
    return jsonify({"ok": True, "saved": saved})

@app.post("/api/vendors/<int:vendor_id>/like")
@flask_login_required
def api_like_vendor(vendor_id):
    db = get_db()
    
    # Check if already liked
    existing_like = db.execute(
        "SELECT * FROM vendor_likes WHERE vendor_id=? AND user_id=?", 
        (vendor_id, current_user.id)
    ).fetchone()
    
    if existing_like:
        # Unlike
        db.execute("DELETE FROM vendor_likes WHERE vendor_id=? AND user_id=?", 
                  (vendor_id, current_user.id))
        liked = False
    else:
        # Like
        db.execute("INSERT INTO vendor_likes (vendor_id, user_id, created_at) VALUES (?, ?, ?)",
                  (vendor_id, current_user.id, datetime.now().isoformat()))
        liked = True
    
    db.commit()
    
    # Get updated like count
    likes = db.execute("SELECT COUNT(*) FROM vendor_likes WHERE vendor_id=?", (vendor_id,)).fetchone()[0]
    
    return jsonify({"ok": True, "liked": liked, "likes": likes})

@app.post("/api/vendors/<int:vendor_id>/save")
@flask_login_required
def api_save_vendor(vendor_id):
    db = get_db()
    
    # Check if already saved
    existing_save = db.execute(
        "SELECT * FROM vendor_saves WHERE vendor_id=? AND user_id=?", 
        (vendor_id, current_user.id)
    ).fetchone()
    
    if existing_save:
        # Unsave
        db.execute("DELETE FROM vendor_saves WHERE vendor_id=? AND user_id=?", 
                  (vendor_id, current_user.id))
        saved = False
    else:
        # Save
        db.execute("INSERT INTO vendor_saves (vendor_id, user_id, created_at) VALUES (?, ?, ?)",
                  (vendor_id, current_user.id, datetime.now().isoformat()))
        saved = True
    
    db.commit()
    
    # Get updated save count
    saves = db.execute("SELECT COUNT(*) FROM vendor_saves WHERE vendor_id=?", (vendor_id,)).fetchone()[0]
    
    return jsonify({"ok": True, "saved": saved, "saves": saves})

@app.get("/api/users/<int:user_id>/faved-vendors")
@flask_login_required
def api_user_faved_vendors(user_id):
    # Ensure users can only access their own data
    if current_user.id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
        
    db = get_db()
    # Get vendors that the user has liked
    rows = db.execute("""
        SELECT v.*, vl.created_at as faved_at,
               COALESCE(COUNT(DISTINCT vl2.id), 0) as like_count,
               COALESCE(COUNT(DISTINCT vs.id), 0) as save_count
        FROM vendors v
        JOIN vendor_likes vl ON v.id = vl.vendor_id
        LEFT JOIN vendor_likes vl2 ON v.id = vl2.vendor_id
        LEFT JOIN vendor_saves vs ON v.id = vs.vendor_id
        WHERE vl.user_id = ?
        GROUP BY v.id, vl.created_at
        ORDER BY vl.created_at DESC
    """, (user_id,)).fetchall()
    
    return jsonify([dict(r) for r in rows])

@app.get("/api/users/<int:user_id>/saved-vendors")
@flask_login_required
def api_user_saved_vendors(user_id):
    # Ensure users can only access their own data
    if current_user.id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
        
    db = get_db()
    # Get vendors that the user has saved
    rows = db.execute("""
        SELECT v.*, vs.created_at as saved_at,
               COALESCE(COUNT(DISTINCT vl.id), 0) as like_count,
               COALESCE(COUNT(DISTINCT vs2.id), 0) as save_count
        FROM vendors v
        JOIN vendor_saves vs ON v.id = vs.vendor_id
        LEFT JOIN vendor_likes vl ON v.id = vl.vendor_id
        LEFT JOIN vendor_saves vs2 ON v.id = vs2.vendor_id
        WHERE vs.user_id = ?
        GROUP BY v.id, vs.created_at
        ORDER BY vs.created_at DESC
    """, (user_id,)).fetchall()
    
    return jsonify([dict(r) for r in rows])

@app.get("/api/events")
def api_events():
    db = get_db()
    rows = db.execute("SELECT * FROM events ORDER BY start_time ASC").fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/terms")
def terms_of_service():
    return render_template("terms.html")

@app.route("/privacy")
def privacy_policy():
    return render_template("privacy.html")

# ------------------------------------------------------------------------------
# AI Ad copy (optional) - COMMENTED OUT
# ------------------------------------------------------------------------------
# @app.post("/ai/generate_ad")
# @flask_login_required
# @role_required("vendor", "admin")
# def ai_generate_ad():
#     ... AI code commented out ...


# ------------------------------------------------------------------------------
# AI Logo Generator - COMMENTED OUT
# ------------------------------------------------------------------------------
# @app.post("/ai/generate_logo")
# @flask_login_required
# @role_required("vendor", "admin")
# def ai_generate_logo():
#     ... AI code commented out ...

@app.post("/api/vendors/<int:vendor_id>/save_ai_logo")
@flask_login_required
@role_required("vendor", "admin")
def api_save_ai_logo(vendor_id):
    payload = request.get_json(force=True) or {}
    logo_url = payload.get("logo_url")
    
    if not logo_url:
        return jsonify({"ok": False, "error": "No logo URL provided"})
    
    # Verify vendor ownership
    if current_user.role != "admin":
        db = get_db()
        vendor = db.execute("SELECT owner_user_id FROM vendors WHERE id=?", (vendor_id,)).fetchone()
        if not vendor or vendor["owner_user_id"] != current_user.id:
            return jsonify({"ok": False, "error": "Access denied"}), 403
    
    try:
        db = get_db()
        db.execute("UPDATE vendors SET logo_url=? WHERE id=?", (logo_url, vendor_id))
        db.commit()
        
        return jsonify({
            "ok": True,
            "message": "AI-generated logo saved successfully!",
            "logo_url": logo_url
        })
    except Exception as e:
        return jsonify({"ok": False, "error": f"Failed to save logo: {str(e)}"})

# ------------------------------------------------------------------------------
# Errors
# ------------------------------------------------------------------------------
@app.errorhandler(403)
def e403(e):
    return (render_template("errors.html", code=403, message="Forbidden"), 403)

@app.errorhandler(404)
def e404(e):
    return (render_template("errors.html", code=404, message="Not Found"), 404)

# ------------------------------------------------------------------------------
# Dev server
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    # Initialize database tables
    init_db()
    
    # Bind to your LAN IP so phones on Wi-Fi can access it
    from flask import cli
    ssl_context = ("certs/localhost+3.pem", "certs/localhost+3-key.pem")
    app.run(host="0.0.0.0", port=5000, debug=True, ssl_context=ssl_context)
