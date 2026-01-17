let map, markersLayer;

// --- NEW: Simple debounce ---
function debounce(fn, delay=500) {
  let t; 
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// --- NEW: Geocode with OpenStreetMap Nominatim ---
async function geocodeAddress(q) {
  if (!q || q.trim().length < 2) return null;
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '0');
  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' }
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const { lat, lon } = data[0];
  return { lat: parseFloat(lat), lng: parseFloat(lon) };
}

function initMap() {
map = L.map('map').setView([34.0522, -118.2437], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
markersLayer = L.layerGroup().addTo(map);
}

function addVendorsToMap(vendors) {
markersLayer.clearLayers();
vendors.forEach(v => {
if (v.lat !== null && v.lng !== null) {
const m = L.marker([v.lat, v.lng]).addTo(markersLayer);
const distTxt = v.distance_miles != null ? `<br><small>${v.distance_miles.toFixed(1)} miles away</small>` : '';
m.bindPopup(`<strong>${escapeHtml(v.name)}</strong>${distTxt}<br><a href="/vendor/${v.id}" class="btn btn-sm btn-primary mt-2"><i class="bi bi-eye me-1"></i>View</a>`);
}
});
}

function renderVendorsGrid(vendors) {
  const grid = document.getElementById('vendorsGrid');
  const loading = document.getElementById('vendorsLoading');
  
  if (!grid) return;
  
  // Hide loading indicator
  if (loading) {
    loading.style.display = 'none';
  }
  
  if (vendors.length === 0) {
    grid.innerHTML = `
      <div class="text-center py-5">
        <div class="text-muted">
          <i class="bi bi-truck display-1 mb-3 d-block"></i>
          <h4>No food trucks found</h4>
          <p>Try adjusting your search criteria.</p>
        </div>
      </div>
    `;
    return;
  }

  grid.innerHTML = vendors.map(vendor => {
    // Format today's hours
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    const todayHours = vendor.hours && vendor.hours[today] ? vendor.hours[today] : 'Hours vary';
    
    return `
      <div class="vendor-profile-card">
        <div class="card">
          <div class="card-body d-flex">
            <!-- Logo on the left -->
            <div class="flex-shrink-0 me-3">
              <a href="/vendor/${vendor.id}" class="text-decoration-none">
                <img src="${vendor.logo_url || '/static/img/logo.png'}" 
                     alt="${escapeHtml(vendor.name)}" 
                     class="vendor-logo rounded-circle"
                     width="80" height="80"
                     style="object-fit: cover; border: 2px solid #e9ecef;">
              </a>
            </div>
            
            <!-- Business info on the right -->
            <div class="flex-grow-1 min-width-0">
              <h5 class="card-title mb-2">
                <a href="/vendor/${vendor.id}" 
                   class="text-decoration-none text-dark">
                  ${escapeHtml(vendor.name)}
                </a>
              </h5>
              
              <!-- Cuisine types -->
              ${vendor.cuisine_list && vendor.cuisine_list.length > 0 ? `
              <div class="mb-2">
                <small class="text-muted d-flex align-items-center flex-wrap">
                  <i class="bi bi-list-ul me-1"></i>
                  ${vendor.cuisine_list.map(cuisine => `<span class="me-1">${escapeHtml(cuisine)}</span>`).join('<span class="me-1">•</span>')}
                </small>
              </div>
              ` : ''}
              
              <!-- Current location (only if open) -->
              ${vendor.display_location ? `
              <div class="mb-2">
                <small class="text-success d-flex align-items-center">
                  <i class="bi bi-geo-alt-fill me-1"></i>
                  <span class="fw-semibold">${escapeHtml(vendor.display_location)}</span>
                  <span class="ms-2 badge bg-success">Open Now</span>
                </small>
              </div>
              ` : vendor.is_currently_open ? `
              <div class="mb-2">
                <small class="text-success d-flex align-items-center">
                  <i class="bi bi-clock me-1"></i>
                  <span class="badge bg-success">Open Now</span>
                </small>
              </div>
              ` : `
              <div class="mb-2">
                <small class="text-muted d-flex align-items-center">
                  <i class="bi bi-clock me-1"></i>
                  <span class="badge bg-secondary">Closed</span>
                </small>
              </div>
              `}
              
              <!-- Hours of operation link -->
              <div class="mb-0">
                <small class="text-muted">
                  <i class="bi bi-clock-history me-1"></i>
                  <a href="#" class="text-decoration-none hours-link" 
                     data-vendor-id="${vendor.id}" 
                     data-vendor-name="${escapeHtml(vendor.name)}"
                     data-vendor-hours='${JSON.stringify(vendor.hours)}'>
                    Hours of Operation
                  </a>
                </small>
                
                <!-- View Profile button -->
                <div class="mt-2">
                  <a href="/vendor/${vendor.id}" class="btn btn-primary btn-sm">
                    <i class="bi bi-eye me-1"></i>View Profile
                  </a>
                  ${(vendor.lat != null && vendor.lng != null) ? `
                  <a class="btn btn-outline-secondary btn-sm ms-1" target="_blank" 
                     href="https://www.google.com/maps/dir/?api=1&destination=${vendor.lat},${vendor.lng}">
                    <i class="bi bi-geo-alt me-1"></i>Directions
                  </a>
                  ` : ''}
                </div>
                
                <!-- Faved and Save Counters -->
                <div class="d-flex gap-2 mt-2 pt-2 border-top">
                  <button class="btn btn-outline-warning btn-sm vendor-like-btn" 
                          data-vendor-id="${vendor.id}" 
                          title="Fave this food truck">
                    <i class="bi bi-star me-1"></i>
                    <span class="like-count">${vendor.like_count || 0}</span>
                  </button>
                  <button class="btn btn-outline-primary btn-sm vendor-save-btn" 
                          data-vendor-id="${vendor.id}" 
                          title="Save this food truck">
                    <i class="bi bi-bookmark me-1"></i>
                    <span class="save-count">${vendor.save_count || 0}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Initialize vendor like/save buttons
  initVendorCardButtons();
}

function initVendorCardButtons() {
  // Remove existing event listeners to avoid duplicates
  document.querySelectorAll('.vendor-like-btn, .vendor-save-btn').forEach(btn => {
    btn.replaceWith(btn.cloneNode(true));
  });
  
  // Add event listeners for like buttons
  document.querySelectorAll('.vendor-like-btn').forEach(btn => {
    btn.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const vendorId = this.getAttribute('data-vendor-id');
      const likeCount = this.querySelector('.like-count');
      const icon = this.querySelector('i');
      
      // Check authentication before proceeding
      const result = await handleAuthenticatedAction(async () => {
        // Disable button during request
        this.disabled = true;
        
        try {
          const response = await fetch(`/api/vendors/${vendorId}/like`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          const data = await response.json();
          
          if (data.ok) {
            // Update like count
            likeCount.textContent = data.likes;
            
            // Toggle button appearance
            if (data.liked) {
              this.classList.remove('btn-outline-warning');
              this.classList.add('btn-warning');
              icon.classList.add('bi-star-fill');
              icon.classList.remove('bi-star');
            } else {
              this.classList.add('btn-outline-warning');
              this.classList.remove('btn-warning');
              icon.classList.remove('bi-star-fill');
              icon.classList.add('bi-star');
            }
          } else {
            alert('Failed to update fave');
          }
        } catch (error) {
          console.error('Error faving vendor:', error);
          alert('Failed to update fave');
        } finally {
          this.disabled = false;
        }
        return true;
      });
      
      // If authentication failed, result will be false
      if (!result) {
        this.disabled = false;
      }
    });
  });
  
  // Add event listeners for save buttons
  document.querySelectorAll('.vendor-save-btn').forEach(btn => {
    btn.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const vendorId = this.getAttribute('data-vendor-id');
      const saveCount = this.querySelector('.save-count');
      const icon = this.querySelector('i');
      
      // Check authentication before proceeding
      const result = await handleAuthenticatedAction(async () => {
        // Disable button during request
        this.disabled = true;
        
        try {
          const response = await fetch(`/api/vendors/${vendorId}/save`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          const data = await response.json();
          
          if (data.ok) {
            // Update save count
            saveCount.textContent = data.saves;
            
            // Toggle button appearance
            if (data.saved) {
              this.classList.remove('btn-outline-primary');
              this.classList.add('btn-primary');
              icon.classList.add('bi-bookmark-fill');
              icon.classList.remove('bi-bookmark');
            } else {
              this.classList.add('btn-outline-primary');
              this.classList.remove('btn-primary');
              icon.classList.remove('bi-bookmark-fill');
              icon.classList.add('bi-bookmark');
            }
          } else {
            alert('Failed to update save');
          }
        } catch (error) {
          console.error('Error saving vendor:', error);
          alert('Failed to update save');
        } finally {
          this.disabled = false;
        }
        return true;
      });
      
      // If authentication failed, result will be false
      if (!result) {
        this.disabled = false;
      }
    });
  });
}

// New function to fetch enhanced vendor data
async function fetchVendorCards() {
  try {
    const response = await fetch('/api/vendors/cards');
    return await response.json();
  } catch (error) {
    console.error('Error fetching vendor cards:', error);
    return [];
  }
}

async function fetchVendors(opts={}) {
const params = new URLSearchParams(opts).toString();
return fetch(`/api/vendors?${params}`).then(r => r.json());
}

function fetchReels(){
return fetch('/api/reels').then(r=>r.json());
}

function fetchEvents(){
return fetch('/api/events').then(r=>r.json());
}

function renderReels(reels){
const grid = document.getElementById('reelsGrid');
if (!grid) return;

// Get the current vendor ID from the page (if on vendor profile page)
const currentVendorId = window.location.pathname.split('/vendor/')[1];

// Filter reels based on context
let filteredReels;
if (currentVendorId) {
  // On vendor profile page: show only that vendor's reels
  filteredReels = reels.filter(r => r.vendor_id == currentVendorId);
} else {
  // On main page: show all reels
  filteredReels = reels;
}

if (filteredReels.length === 0) {
  grid.innerHTML = '<div class="text-center text-muted w-100">No Grub Reels yet. Be the first to share your delicious creations!</div>';
  return;
}

// Render all reels as vertical stack for mobile, horizontal for desktop
grid.innerHTML = filteredReels.map((r, index) => `
<a href="/vendor/${r.vendor_id}" class="reel-link" style="text-decoration:none;color:inherit;">
  <div class="reel-container" data-reel-index="${index}">
    <div class="reel-card" style="cursor:pointer;">
      ${r.title ? `<div class="card-body pb-2"><div class="reel-caption">${escapeHtml(r.title)}</div></div>` : ''}
      <video class="reel-video" 
             controls 
             preload="metadata" 
             poster="${r.thumbnail_url || ''}"
             data-video-id="${r.id}">
        <source src="${r.video_url}" type="video/mp4">
      </video>
      <div class="card-body">
        <div class="d-flex align-items-center justify-content-between mb-0">
          <div class="d-flex align-items-center gap-2">
            <img src="${r.vendor_logo_url || '/static/img/logo.png'}" 
                 width="32" height="32" 
                 class="rounded-circle" 
                 alt="vendor">
            <div>
              <div class="fw-semibold small">${escapeHtml(r.vendor_name || '')}</div>
            </div>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-danger btn-sm like-btn" 
                    data-reel-id="${r.id}" 
                    title="Like">
              <i class="bi bi-heart"></i>
              <span class="like-count">${r.likes || 0}</span>
            </button>
            <button class="btn btn-outline-primary btn-sm save-btn" 
                    data-reel-id="${r.id}" 
                    title="Save">
              <i class="bi bi-bookmark"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</a>
`).join('');
}

function renderEvents(events) {
const grid = document.getElementById('eventsGrid');
if (!grid) return;
grid.innerHTML = events.map(e => `
<div class="col-12 col-md-6 col-lg-4">
<div class="card h-100">
<div class="card-body">
<div class="fw-semibold">${escapeHtml(e.title || '')}</div>
<div class="text-muted small">${escapeHtml(e.start_time || '')}</div>
<div class="small mt-2">${escapeHtml(e.description || '')}</div>
</div>
</div>
</div>
`).join('');
}

// --- Activate the Vendors tab ---
function showVendorsTab() {
const vendorsTabBtn = document.querySelector('button[data-bs-target="#vendors"]');
if (vendorsTabBtn) vendorsTabBtn.click();
}

// --- NEW: Near-location wiring (auto-search) ---
function wireNearAutoSearch() {
const nearInput = document.getElementById('near');
const radius = document.getElementById('radius');
const btnGPS = document.getElementById('useMyLocation');

// Persist the current lat/lng in closure
let nearLatLng = null;

async function runSearchFromState() {
const params = {};
if (nearLatLng) params.near = `${nearLatLng.lat},${nearLatLng.lng}`;
if (radius && radius.value) params.radius = radius.value;

const vendors = await fetchVendors(params);
renderVendorsGrid(vendors);
showVendorsTab();
}

// Debounced geocode on typing
const onNearChange = debounce(async () => {
const text = (nearInput.value || '').trim();
if (!text) { nearLatLng = null; return; }
if (text.toLowerCase() === 'your location' && nearLatLng) {
// already set by GPS
runSearchFromState();
return;
}
const ll = await geocodeAddress(text);
if (ll) {
nearLatLng = ll;
await runSearchFromState();
}
}, 600);

nearInput?.addEventListener('input', onNearChange);
nearInput?.addEventListener('keydown', (e) => {
if (e.key === 'Enter') { e.preventDefault(); onNearChange(); }
});

// GPS button sets coords but keeps text short
btnGPS?.addEventListener('click', () => {
  btnGPS.disabled = true;
  btnGPS.innerHTML = '<i class="bi bi-arrow-repeat spinner-border spinner-border-sm me-1"></i>'; // Loading spinner
  
  if (!navigator.geolocation) {
    btnGPS.disabled = false;
    btnGPS.innerHTML = '<i class="bi bi-geo-alt-fill"></i>';
    alert('Geolocation not supported by your browser.');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(async pos => {
    btnGPS.disabled = false;
    btnGPS.innerHTML = '<i class="bi bi-geo-alt-fill text-success"></i>'; // Success indicator
    nearLatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    if (nearInput) {
      nearInput.value = 'Your Location';
    }
    await runSearchFromState();
  }, err => {
    console.error('Geolocation error:', err); // Debug log
    btnGPS.disabled = false;
    btnGPS.innerHTML = '<i class="bi bi-geo-alt-fill"></i>';
    
    let errorMsg = 'Unable to get your location.';
    if (err.code === 1) {
      errorMsg = 'Location access denied. Please enable location permissions and try again.';
    } else if (err.code === 2) {
      errorMsg = 'Location information unavailable.';
    } else if (err.code === 3) {
      errorMsg = 'Location request timed out. Please try again.';
    }
    alert(errorMsg);
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
});

// Radius change should re-run if we already have a nearLatLng
radius?.addEventListener('change', () => {
if (nearLatLng) runSearchFromState();
});
}

// Utility function for HTML escaping (if not already defined elsewhere)
function escapeHtml(text) {
if (!text) return '';
const div = document.createElement('div');
div.textContent = text;
return div.innerHTML;
}

// Check if user is authenticated by looking for login-related elements
function isUserAuthenticated() {
  // Use global authentication status from base template
  return window.isAuthenticated === true;
}

// Show signup encouragement modal
function showSignupModal() {
  const modal = new bootstrap.Modal(document.getElementById('signupEncourageModal'));
  modal.show();
}

// Handle authentication required for interactions
async function handleAuthenticatedAction(actionFn) {
  if (!isUserAuthenticated()) {
    showSignupModal();
    return false;
  }
  return await actionFn();
}

// --- On load: wire up the new behavior ---
window.addEventListener('DOMContentLoaded', async ()=>{
// Wire up the location search functionality for index page
wireNearAutoSearch();

// Wire up the GPS functionality for vendor management page
wireManageGPS();

// Load reels and events on page load
try { renderReels && renderReels(await fetch('/api/reels').then(r=>r.json())); } catch {}
try { renderEvents && renderEvents(await fetch('/api/events').then(r=>r.json())); } catch {}

// Set up vendor tab handling
const vendorsTab = document.querySelector('button[data-bs-target="#vendors"]');
let vendorsLoaded = false;
async function loadVendorsIfNeeded() {
  if (!vendorsLoaded) {
    const vendors = await fetchVendorCards();
    renderVendorsGrid(vendors);
    vendorsLoaded = true;
  }
}
if (vendorsTab) {
  vendorsTab.addEventListener('shown.bs.tab', loadVendorsIfNeeded);
  // Also check if the tab is already active on page load
  const vendorsTabPane = document.getElementById('vendors');
  if (vendorsTabPane && vendorsTabPane.classList.contains('show') && vendorsTabPane.classList.contains('active')) {
    loadVendorsIfNeeded();
  }
}
});

// GPS functionality for vendor management
function wireManageGPS() {
  const btn = document.getElementById('btnUpdateGPS');
  const status = document.getElementById('gpsStatus');
  if (!btn || !status) return;

  const vendorId = btn.getAttribute('data-vendor-id');
  btn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      status.textContent = 'Geolocation not supported in this browser.';
      status.className = 'small text-danger mt-2';
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-border spinner-border-sm me-1"></i>Locating...';
    status.textContent = 'Getting your location...';
    status.className = 'small text-info mt-2';

    navigator.geolocation.getCurrentPosition(async pos => {
      const payload = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      try {
        const res = await fetch(`/api/vendors/${vendorId}/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          status.textContent = `Location updated successfully at ${data.updated_at}`;
          status.className = 'small text-success mt-2';
        } else {
          status.textContent = `Update failed: ${data.error || 'Unknown error'}`;
          status.className = 'small text-danger mt-2';
        }
      } catch (e) {
        status.textContent = 'Network error during update.';
        status.className = 'small text-danger mt-2';
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-geo-alt-fill me-1"></i>Use my current location';
      }
    }, err => {
      console.error('Geolocation error:', err);
      let errorMsg = 'Unable to get your location.';
      if (err.code === 1) {
        errorMsg = 'Location access denied. Please enable location permissions.';
      } else if (err.code === 2) {
        errorMsg = 'Location information unavailable.';
      } else if (err.code === 3) {
        errorMsg = 'Location request timed out.';
      }
      status.textContent = errorMsg;
      status.className = 'small text-danger mt-2';
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-geo-alt-fill me-1"></i>Use my current location';
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  });
}

// Grub Reels horizontal scroll-to-video functionality
function initReelsHorizontalScrolling() {
  let isScrolling = false;
  let currentVideoIndex = 0;
  let scrollTimeout;
  const reelContainers = document.querySelectorAll('.reel-container');
  const reelsTab = document.getElementById('reels');
  
  if (reelContainers.length === 0 || !reelsTab) return;

  // Improve intersection observer for better video management
  const observerOptions = {
    root: reelsTab,
    rootMargin: '-10% 0px -10% 0px',
    threshold: 0.6
  };

  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target.querySelector('.reel-video');
      if (entry.isIntersecting) {
        // Pause all other videos
        document.querySelectorAll('.reel-video').forEach(v => {
          if (v !== video) v.pause();
        });
        // Update current index
        const container = entry.target;
        currentVideoIndex = Array.from(reelContainers).indexOf(container);
      }
    });
  }, observerOptions);

  reelContainers.forEach(container => {
    videoObserver.observe(container);
  });

  // Horizontal wheel navigation between videos
  reelsTab.addEventListener('wheel', (e) => {
    // Only handle wheel events if we're not already scrolling
    if (isScrolling) {
      e.preventDefault();
      return;
    }
    
    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY; // Handle both horizontal and vertical wheel
    const isMobile = window.innerWidth <= 768;
    
    // On mobile, use normal scrolling with snap assistance
    if (isMobile) {
      // Let mobile handle normal scroll but add snap assistance
      clearTimeout(scrollTimeout);
      
      scrollTimeout = setTimeout(() => {
        snapToNearestVideo();
      }, 150);
      return;
    }
    
    // Desktop: Use controlled scroll-to-video behavior
    if (Math.abs(delta) < 30) return; // Ignore small scrolls
    
    e.preventDefault();
    isScrolling = true;
    
    if (delta > 0 && currentVideoIndex < reelContainers.length - 1) {
      // Scroll right to next video
      currentVideoIndex++;
    } else if (delta < 0 && currentVideoIndex > 0) {
      // Scroll left to previous video
      currentVideoIndex--;
    } else {
      isScrolling = false;
      return;
    }
    
    // Scroll to the target video horizontally
    reelContainers[currentVideoIndex].scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
    
    // Reset scrolling flag after animation
    setTimeout(() => {
      isScrolling = false;
    }, 600);
    
  }, { passive: false });

  // Touch support for mobile devices (horizontal swipe)
  let touchStartX = 0;
  let touchEndX = 0;
  
  reelsTab.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  
  reelsTab.addEventListener('touchend', (e) => {
    if (!touchStartX) return;
    
    touchEndX = e.changedTouches[0].clientX;
    const touchDiff = touchStartX - touchEndX;
    const isMobile = window.innerWidth <= 768;
    
    // On mobile, add snap assistance after touch scroll
    if (isMobile && Math.abs(touchDiff) > 50) {
      setTimeout(() => {
        snapToNearestVideo();
      }, 100);
    }
    
    touchStartX = 0;
  }, { passive: true });

  // Helper function to snap to nearest video horizontally
  function snapToNearestVideo() {
    const reelsRect = reelsTab.getBoundingClientRect();
    const reelsCenterX = reelsRect.left + reelsRect.width / 2;
    
    let nearestContainer = null;
    let nearestDistance = Infinity;
    
    reelContainers.forEach((container, index) => {
      const containerRect = container.getBoundingClientRect();
      const containerCenterX = containerRect.left + containerRect.width / 2;
      const distance = Math.abs(containerCenterX - reelsCenterX);
      
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestContainer = container;
        currentVideoIndex = index;
      }
    });
    
    if (nearestContainer) {
      nearestContainer.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }

  // Initialize with first video centered - REMOVED AUTO-SCROLL
  // The automatic centering was causing the page to slide up on refresh
}

// Like and save functionality
function initReelsInteractions() {
  document.addEventListener('click', async (e) => {
    // Like button
    if (e.target.closest('.like-btn')) {
      const btn = e.target.closest('.like-btn');
      const reelId = btn.getAttribute('data-reel-id');
      const likeCount = btn.querySelector('.like-count');
      const icon = btn.querySelector('i');
      
      // Check authentication before proceeding
      const result = await handleAuthenticatedAction(async () => {
        try {
          const response = await fetch(`/api/reels/${reelId}/like`, {
            method: 'POST'
          });
          const data = await response.json();
          
          if (response.ok && data.ok) {
            likeCount.textContent = data.likes;
            icon.className = data.liked ? 'bi bi-heart-fill' : 'bi bi-heart';
            btn.className = data.liked ? 'btn btn-danger btn-sm like-btn' : 'btn btn-outline-danger btn-sm like-btn';
          }
          return true;
        } catch (error) {
          console.error('Failed to like reel:', error);
          return false;
        }
      });
    }
    
    // Save button
    if (e.target.closest('.save-btn')) {
      const btn = e.target.closest('.save-btn');
      const reelId = btn.getAttribute('data-reel-id');
      const icon = btn.querySelector('i');
      
      // Check authentication before proceeding
      const result = await handleAuthenticatedAction(async () => {
        try {
          const response = await fetch(`/api/reels/${reelId}/save`, {
            method: 'POST'
          });
          const data = await response.json();
          
          if (response.ok && data.ok) {
            icon.className = data.saved ? 'bi bi-bookmark-fill' : 'bi bi-bookmark';
            btn.className = data.saved ? 'btn btn-primary btn-sm save-btn' : 'btn btn-outline-primary btn-sm save-btn';
          }
          return true;
        } catch (error) {
          console.error('Failed to save reel:', error);
          return false;
        }
      });
    }
  });
}

// Initialize reels interactions when page loads
document.addEventListener('DOMContentLoaded', () => {
  initReelsInteractions();
  initHoursModal();
});

// Hours of Operation Modal functionality
function initHoursModal() {
  document.addEventListener('click', function(e) {
    if (e.target.closest('.hours-link')) {
      e.preventDefault();
      const link = e.target.closest('.hours-link');
      const vendorId = link.getAttribute('data-vendor-id');
      const vendorName = link.getAttribute('data-vendor-name');
      const hoursData = JSON.parse(link.getAttribute('data-vendor-hours') || '{}');
      
      showHoursModal(vendorName, hoursData);
    }
  });
}

function showHoursModal(vendorName, hoursData) {
  // Set vendor name
  document.getElementById('hoursVendorName').textContent = vendorName;
  
  // Clear and populate hours list
  const hoursContainer = document.getElementById('hoursListContainer');
  hoursContainer.innerHTML = '';
  
  const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  daysOrder.forEach(day => {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
    
    const daySpan = document.createElement('span');
    daySpan.className = 'fw-medium';
    daySpan.textContent = day;
    
    const hoursSpan = document.createElement('span');
    if (hoursData[day]) {
      hoursSpan.textContent = hoursData[day];
      hoursSpan.className = hoursData[day] === 'Closed' ? 'text-muted' : 'text-success';
    } else {
      hoursSpan.textContent = 'Closed';
      hoursSpan.className = 'text-muted';
    }
    
    listItem.appendChild(daySpan);
    listItem.appendChild(hoursSpan);
    hoursContainer.appendChild(listItem);
  });
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById('hoursModal'));
  modal.show();
}
