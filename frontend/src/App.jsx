import { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png?url';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png?url';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png?url';
import 'leaflet/dist/leaflet.css';
import './App.css';

// ----------------------------------------------------
// Razorpay Simulated Sandbox Checkout Modal Component
// Fully custom styled with glassmorphism matching Sharefare
// ----------------------------------------------------
function RazorpayModal({ orderId, amount, onClose, onSuccess }) {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [upiId, setUpiId] = useState('');
  
  const [checkoutState, setCheckoutState] = useState('input'); // input, processing, success
  const [error, setError] = useState('');

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  const handlePay = (e) => {
    e.preventDefault();
    setError('');

    if (paymentMethod === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 16) {
        setError('Please enter a valid 16-digit credit card.');
        return;
      }
      if (!cardExpiry || cardExpiry.length < 5) {
        setError('Please enter a valid expiry date (MM/YY).');
        return;
      }
      if (cardCvv.length < 3) {
        setError('Please enter a valid CVV.');
        return;
      }
      if (!cardName.trim()) {
        setError('Cardholder name is required.');
        return;
      }
    } else {
      if (!upiId.includes('@') || upiId.length < 5) {
        setError('Please enter a valid UPI ID (e.g. user@upi).');
        return;
      }
    }

    setCheckoutState('processing');
    
    setTimeout(() => {
      setCheckoutState('success');
      setTimeout(() => {
        const mockPaymentId = `pay_sf_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString().slice(-4)}`;
        onSuccess(mockPaymentId);
      }, 1200);
    }, 1800);
  };

  return (
    <div className="rzp-overlay">
      <div className="rzp-modal glass-panel pulse-subtle">
        <div className="rzp-header">
          <div className="rzp-brand-logo">
            <span className="rzp-shield">🛡️</span>
            <div>
              <h4 className="rzp-title">Razorpay <span className="rzp-sandbox-tag">SANDBOX</span></h4>
              <p className="rzp-subtitle">Secure Fare Split Checkout</p>
            </div>
          </div>
          <button onClick={onClose} className="rzp-close-btn" disabled={checkoutState === 'processing'}>✕</button>
        </div>

        <div className="rzp-amount-box">
          <div className="rzp-amount-details">
            <span>Booking split-fare share:</span>
            <strong className="rzp-amount-display">${amount.toFixed(2)}</strong>
          </div>
          <div className="rzp-order-details">
            <span>Order ID: {orderId}</span>
          </div>
        </div>

        {checkoutState === 'input' && (
          <form onSubmit={handlePay} className="rzp-form">
            {error && <div className="alert alert-danger rzp-alert">{error}</div>}

            <div className="rzp-payment-tabs">
              <button
                type="button"
                className={`rzp-tab-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                💳 Cards (Mock)
              </button>
              <button
                type="button"
                className={`rzp-tab-btn ${paymentMethod === 'upi' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('upi')}
              >
                📱 UPI ID (Mock)
              </button>
            </div>

            {paymentMethod === 'card' ? (
              <div className="rzp-card-fields">
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label rzp-label">Card Number</label>
                  <input
                    type="text"
                    placeholder="4111 2222 3333 4444"
                    className="form-input rzp-input"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength="19"
                  />
                </div>
                <div className="form-row-2" style={{ gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label rzp-label">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      placeholder="12/28"
                      className="form-input rzp-input"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      maxLength="5"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label rzp-label">CVV</label>
                    <input
                      type="password"
                      placeholder="•••"
                      className="form-input rzp-input"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                      maxLength="4"
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label rzp-label">Cardholder Name</label>
                  <input
                    type="text"
                    placeholder="Jane Commuter"
                    className="form-input rzp-input"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="rzp-upi-fields" style={{ padding: '8px 0 16px' }}>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label rzp-label">UPI ID</label>
                  <input
                    type="text"
                    placeholder="student@okaxis"
                    className="form-input rzp-input"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
                  <span className="rzp-helper">Enter a simulated UPI ID (e.g., student@okaxis) to test.</span>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary rzp-pay-btn">
              🔒 Pay ${amount.toFixed(2)} securely via Razorpay
            </button>
          </form>
        )}

        {checkoutState === 'processing' && (
          <div className="rzp-loading-state">
            <div className="rzp-spinner"></div>
            <h3>Processing split-fare...</h3>
            <p>Connecting with Razorpay secure sandbox network. Do not close or refresh this modal.</p>
          </div>
        )}

        {checkoutState === 'success' && (
          <div className="rzp-success-state">
            <div className="rzp-success-checkmark">✓</div>
            <h3>Payment Success!</h3>
            <p>Razorpay Transaction confirmed. Your ride split share has been verified.</p>
          </div>
        )}

        <div className="rzp-footer">
          <span>🛡️ 256-bit SSL encrypted connection verified.</span>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Transition Navigation Hook
// Helper to implement the Directional View Transitions API
// ----------------------------------------------------
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

function resolveLocationCoordinates(locationLabel) {
  if (!locationLabel) return null;
  const map = {
    'west campus': [17.4272, 78.4445],
    'city center': [17.4325, 78.4432],
    'hitech city': [17.4451, 78.3916],
    'airport': [17.2403, 78.4294],
    'science hall': [17.4305, 78.4415],
    'library': [17.4261, 78.4413],
    'main science hall': [17.4305, 78.4415],
    'campus gate': [17.4285, 78.4431],
    'train station': [17.4391, 78.4983],
    'bus stop': [17.4320, 78.4420]
  };

  const normalized = locationLabel.toLowerCase();
  for (const key in map) {
    if (normalized.includes(key)) {
      return map[key];
    }
  }

  return null;
}

function calculateRoutePoints(start, end, steps = 40) {
  const points = [];
  const latStep = (end[0] - start[0]) / steps;
  const lngStep = (end[1] - start[1]) / steps;

  for (let i = 0; i <= steps; i += 1) {
    points.push([start[0] + latStep * i, start[1] + lngStep * i]);
  }

  return points;
}

function RideMap({ startPoint, endPoint }) {
  const defaultStart = [17.4272, 78.4445];
  const defaultEnd = [17.4451, 78.3916];
  const start = resolveLocationCoordinates(startPoint) || defaultStart;
  const end = resolveLocationCoordinates(endPoint) || defaultEnd;

  return (
    <div className="ride-map-wrapper glass-panel" style={{ padding: '18px' }}>
      <h3 className="section-subtitle" style={{ marginBottom: '16px' }}>Live Route Map</h3>
      <MapContainer
        center={start}
        zoom={12}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '320px', borderRadius: '20px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={start}>
          <Popup>Pickup: {startPoint}</Popup>
        </Marker>
        <Marker position={end}>
          <Popup>Drop-off: {endPoint}</Popup>
        </Marker>
        <Polyline positions={[start, end]} pathOptions={{ color: '#6366f1', weight: 4, dashArray: '10 8' }} />
      </MapContainer>
    </div>
  );
}

function TrackRideMap({ startPoint, endPoint, progress }) {
  const defaultStart = [17.4272, 78.4445];
  const defaultEnd = [17.4451, 78.3916];
  const start = resolveLocationCoordinates(startPoint) || defaultStart;
  const end = resolveLocationCoordinates(endPoint) || defaultEnd;
  const routePoints = useMemo(() => calculateRoutePoints(start, end, 40), [startPoint, endPoint]);
  const completedCount = Math.min(routePoints.length - 1, Math.max(1, Math.floor((progress / 100) * (routePoints.length - 1))));
  const completedRoute = routePoints.slice(0, completedCount + 1);
  const driverPosition = routePoints[completedCount];

  return (
    <div className="track-map-wrapper glass-panel" style={{ padding: '18px', marginBottom: '24px' }}>
      <h3 className="section-subtitle" style={{ marginBottom: '16px' }}>Live Driver Movement</h3>
      <MapContainer
        center={driverPosition}
        zoom={12}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '360px', borderRadius: '20px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={routePoints} pathOptions={{ color: '#9ca3af', weight: 4, dashArray: '12 8' }} />
        <Polyline positions={completedRoute} pathOptions={{ color: '#10b981', weight: 5 }} />
        <Marker position={driverPosition}>
          <Popup>Driver is here ({progress}% complete)</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

function useTransitionNavigate() {
  const navigate = useNavigate();
  
  return (to, direction = 'forward') => {
    if (!document.startViewTransition) {
      navigate(to);
      return;
    }
    
    document.startViewTransition({
      update: () => navigate(to),
      types: [direction]
    });
  };
}

// ----------------------------------------------------
// Main Layout wrapper with Header & Footer
// ----------------------------------------------------
function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const navigateTransition = useTransitionNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [myBookingsCount, setMyBookingsCount] = useState(0);

  const handleNav = (path, e) => {
    e.preventDefault();
    if (location.pathname === path) return;
    const direction = path === '/' ? 'backward' : 'forward';
    navigateTransition(path, direction);
  };

  useEffect(() => {
    if (!user) {
      setMyBookingsCount(0);
      setNotifications([]);
      return;
    }

    const loadBookingCount = async () => {
      try {
        const res = await axios.get('/api/bookings/me');
        setMyBookingsCount(res.data?.length || 0);
      } catch (err) {
        console.warn('Failed to load booking count', err);
      }
    };

    loadBookingCount();
    setNotifications([
      {
        id: 1,
        title: 'Ride accepted',
        message: 'Your ride to Hitech City is confirmed.',
        target: '/my-bookings',
        time: '2h ago',
        unread: true
      },
      {
        id: 2,
        title: 'New message',
        message: 'Priya S sent you a chat message.',
        target: '/my-bookings',
        time: '38m ago',
        unread: true
      },
      {
        id: 3,
        title: 'Driver arrived',
        message: 'Your driver is 5 minutes away.',
        target: '/my-bookings',
        time: '6m ago',
        unread: false
      }
    ]);
  }, [user]);

  const unreadCount = notifications.filter((item) => item.unread).length;

  return (
    <div className="app-container">
      <header className="main-header glass-panel">
        <div className="header-brand" onClick={(e) => handleNav('/', e)}>
          <span className="brand-logo">🚗</span>
          <span className="brand-name gradient-title">Sharefare</span>
        </div>
        <nav className="header-nav">
          <a href="/" onClick={(e) => handleNav('/', e)} className={location.pathname === '/' ? 'active' : ''}>
            Find Ride
          </a>
          <a href="/post-ride" onClick={(e) => handleNav('/post-ride', e)} className={location.pathname === '/post-ride' ? 'active' : ''}>
            Post Ride
          </a>
          {user ? (
            <>
              {user.role === 'admin' && (
                <a href="/admin-dashboard" onClick={(e) => handleNav('/admin-dashboard', e)} className={location.pathname === '/admin-dashboard' ? 'active' : ''}>
                  Admin Panel
                </a>
              )}
              <a href="/my-rides" onClick={(e) => handleNav('/my-rides', e)} className={location.pathname === '/my-rides' ? 'active' : ''}>
                Dashboard
              </a>
              <a href="/my-bookings" onClick={(e) => handleNav('/my-bookings', e)} className={location.pathname === '/my-bookings' ? 'active' : ''}>
                My Bookings
                {myBookingsCount > 0 && (
                  <span className="nav-badge">{myBookingsCount}</span>
                )}
              </a>
              <a href="/notifications" onClick={(e) => handleNav('/notifications', e)} className={location.pathname === '/notifications' ? 'active' : ''}>
                Notifications
                {unreadCount > 0 && (
                  <span className="nav-badge">{unreadCount}</span>
                )}
              </a>
              <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="user-profile-nav">
                  <a href="/profile" onClick={(e) => handleNav('/profile', e)} className="user-nav-link">
                    <span className="user-avatar-tag">🧑‍🎓</span>
                    <span className="user-nav-name">{user.name} {user.is_verified && '🛡️'}</span>
                  </a>
                  <button onClick={logout} className="btn btn-secondary btn-nav-logout">Logout</button>
                </div>
              </div>
            </>
          ) : (
            <a href="/login" onClick={(e) => handleNav('/login', e)} className="btn btn-primary btn-nav-login">
              Sign In
            </a>
          )}
        </nav>
      </header>

      <main className="main-content">
        {children}
      </main>

      <footer className="main-footer">
        <p>© 2026 Sharefare – Connecting Campus Commuters. Save Fuel, Share Fares, Help the Earth.</p>
      </footer>
    </div>
  );
}

// ----------------------------------------------------
// Landing Page: Search & List Rides
// ----------------------------------------------------
function LandingPage() {
  const [rides, setRides] = useState([]);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [femaleOnly, setFemaleOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Custom interactive dashboard states
  const { user } = useAuth();
  const [stats, setStats] = useState({ bookings: 0, notifications: 0, rating: 4.9 });
  const [showNotifOverlay, setShowNotifOverlay] = useState(false);
  const [calcCommutes, setCalcCommutes] = useState(5);
  const [calcDistance, setCalcDistance] = useState(12);

  const navigateTransition = useTransitionNavigate();

  const fetchRides = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchFrom) params.from = searchFrom;
      if (searchTo) params.to = searchTo;
      if (searchDate) params.date = searchDate;
      if (verifiedOnly) params.verified_students_only = true;
      if (femaleOnly) params.female_commuters_only = true;

      const res = await axios.get('/api/rides', { params });
      setRides(res.data);
    } catch (err) {
      console.error("Error fetching rides:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  // Fetch real user stats count dynamically
  useEffect(() => {
    if (user) {
      axios.get('/api/my-rides')
        .then(res => {
          const total = res.data.booked.length + res.data.driving.length;
          let notifCount = 0;
          if (user.id_proof_status === 'pending') notifCount = 1;
          if (user.id_proof_status === 'verified') notifCount = 1; // approved notification
          setStats({
            bookings: total,
            notifications: notifCount,
            rating: 4.9
          });
        })
        .catch(err => console.error("Error loading user landing stats:", err));
    } else {
      // Global fallback metrics for guests
      setStats({
        bookings: 142,
        notifications: 1, // simulated platform announcements
        rating: 4.9
      });
    }
  }, [user]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRides();
  };

  const handleClear = () => {
    setSearchFrom('');
    setSearchTo('');
    setSearchDate('');
    setVerifiedOnly(false);
    setFemaleOnly(false);
    // Trigger direct fetch
    axios.get('/api/rides').then(res => setRides(res.data));
  };

  const formatDate = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, { 
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className="landing-container" style={{ position: 'relative' }}>
      {/* Hero Welcome banner */}
      <section className="hero-banner glass-panel">
        <h1 className="hero-title gradient-text">Campus Commuting, Simplified.</h1>
        <p className="hero-subtitle">
          Connect with college students and staff traveling along your route. Share fuel costs, split fares, and reduce traffic.
        </p>
        <div className="hero-badges">
          <span className="badge badge-primary">🔒 Verified .edu Members</span>
          <span className="badge badge-success">🌱 Zero-carbon Offset</span>
          <span className="badge badge-warning">💸 Splits Costs Easily</span>
        </div>
      </section>

      {/* Visual Analytics / Stats Row Section (Matches user reference) */}
      <div className="stats-row-container">
        {/* Card 1: Bookings */}
        <div className="stats-card glass-panel">
          <div className="stats-icon-wrapper color-calendar">
            <span className="stats-icon">📅</span>
          </div>
          <div className="stats-info">
            <span className="stats-label">{user ? "YOUR TOTAL BOOKINGS" : "TOTAL PLATFORM BOOKINGS"}</span>
            <span className="stats-value">{stats.bookings}</span>
          </div>
        </div>

        {/* Card 2: Notifications */}
        <div 
          className="stats-card glass-panel" 
          style={{ cursor: 'pointer', transition: 'border-color 0.2s' }} 
          onClick={() => setShowNotifOverlay(!showNotifOverlay)}
        >
          <div className="stats-icon-wrapper color-users">
            <span className="stats-icon">🔔</span>
          </div>
          <div className="stats-info">
            <span className="stats-label">UNREAD NOTIFICATIONS</span>
            <span className="stats-value">
              {stats.notifications}
              {stats.notifications > 0 && <span className="stats-badge-pulse"></span>}
            </span>
          </div>
        </div>

        {/* Card 3: Rating */}
        <div className="stats-card glass-panel">
          <div className="stats-icon-wrapper color-rating">
            <span className="stats-icon">⭐</span>
          </div>
          <div className="stats-info">
            <span className="stats-label">PLATFORM RATING</span>
            <span className="stats-value">{stats.rating}</span>
          </div>
        </div>
      </div>

      {/* Campus Notifications Popover Menu */}
      {showNotifOverlay && (
        <div className="notif-overlay-glass glass-panel">
          <div className="notif-header">
            <h4>🔔 Campus Updates & Alerts</h4>
            <button onClick={() => setShowNotifOverlay(false)} className="btn-notif-close">✕</button>
          </div>
          <ul className="notif-list">
            {user ? (
              <>
                {user.id_proof_status === 'pending' && (
                  <li className="notif-item info">
                    <span className="notif-icon">⏳</span>
                    <div>
                      <strong>Identity Verification Pending</strong>
                      <p>Your document proof "{user.id_proof_name}" is in the vetting queue. Moderation audits usually take 5 minutes.</p>
                    </div>
                  </li>
                )}
                {user.id_proof_status === 'verified' && (
                  <li className="notif-item success">
                    <span className="notif-icon">🛡️</span>
                    <div>
                      <strong>Account Vetting Approved!</strong>
                      <p>Your identity has been verified. The green verified badge is now displayed beside your name.</p>
                    </div>
                  </li>
                )}
                <li className="notif-item">
                  <span className="notif-icon">💳</span>
                  <div>
                    <strong>Razorpay Sandbox Mode Active</strong>
                    <p>Split fare bookings can be safely checked out with any simulated credentials.</p>
                  </div>
                </li>
              </>
            ) : (
              <>
                <li className="notif-item info">
                  <span className="notif-icon">🔐</span>
                  <div>
                    <strong>Authorized Access Only</strong>
                    <p>Please sign in with your student or staff email domain to unlock security tracing features.</p>
                  </div>
                </li>
                <li className="notif-item">
                  <span className="notif-icon">💡</span>
                  <div>
                    <strong>Carpool Tip</strong>
                    <p>Coordinating campus rides offsets emissions and helps clear vehicle congestion in the parking slots.</p>
                  </div>
                </li>
              </>
            )}
          </ul>
        </div>
      )}

      <section className="search-section glass-panel">
        <h2 className="section-title">Find Your Commute</h2>
        <form onSubmit={handleSearch} className="search-form-grid">
          <div className="form-group">
            <label className="form-label">Leaving From</label>
            <input 
              type="text" 
              placeholder="e.g. City Airport, Main Campus"
              className="form-input"
              value={searchFrom}
              onChange={(e) => setSearchFrom(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Heading To</label>
            <input 
              type="text" 
              placeholder="e.g. North Dorms, Central Campus"
              className="form-input"
              value={searchTo}
              onChange={(e) => setSearchTo(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input 
              type="date" 
              className="form-input"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
            <label className="form-label" style={{ marginBottom: '6px' }}>Search Filters</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}>
              <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
              Verified Students Only
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}>
              <input type="checkbox" checked={femaleOnly} onChange={(e) => setFemaleOnly(e.target.checked)} />
              Female Commuters Only
            </label>
          </div>
          <div className="search-buttons-group">
            <button type="submit" className="btn btn-primary btn-search">Search Rides</button>
            {(searchFrom || searchTo || searchDate || verifiedOnly || femaleOnly) && (
              <button type="button" onClick={handleClear} className="btn btn-secondary btn-clear">Clear</button>
            )}
          </div>
        </form>
      </section>
 
      {/* Dynamic Savings Calculator */}
      <section className="calculator-section glass-panel">
        <div className="calculator-header">
          <span className="badge badge-success">🌱 Sharefare Green Calculator</span>
          <h2 className="calc-title gradient-text">Calculate Your Share & Carbon Savings</h2>
          <p className="calc-subtitle">Estimate how much money and carbon emissions you can offset by ride sharing this semester.</p>
        </div>
        <div className="calculator-grid">
          <div className="calc-controls">
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Commutes Per Week:</span>
                <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>{calcCommutes} trips</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="14" 
                value={calcCommutes} 
                onChange={(e) => setCalcCommutes(Number(e.target.value))}
                className="calc-range-slider"
              />
            </div>
            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Average Ride Distance:</span>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{calcDistance} miles</span>
              </label>
              <input 
                type="range" 
                min="2" 
                max="100" 
                value={calcDistance} 
                onChange={(e) => setCalcDistance(Number(e.target.value))}
                className="calc-range-slider"
              />
            </div>
          </div>
          <div className="calc-results-box" style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px dashed rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Estimated Fuel Savings</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--secondary)' }}>${(calcCommutes * calcDistance * 0.18).toFixed(2)}</span>
              </div>
              <span style={{ fontSize: '2rem' }}>💸</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>CO₂ Emissions Offset</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-hover)' }}>{(calcCommutes * calcDistance * 0.41).toFixed(1)} kg</span>
              </div>
              <span style={{ fontSize: '2rem' }}>🌱</span>
            </div>
          </div>
        </div>
      </section>
 
      {/* Available Rides section */}
      <section className="rides-list-section">
        <h2 className="section-title">Available Upcoming Rides ({rides.length})</h2>
        {loading ? (
          <div className="rides-loading glass-panel">
            <div className="spinner"></div>
            <p>Searching verified campus rides...</p>
          </div>
        ) : rides.length === 0 ? (
          <div className="rides-empty glass-panel">
            <p className="empty-emoji">🚗💨</p>
            <h3>No rides found matching your parameters</h3>
            <p>Try clearing filters or post your own ride to coordinate with others going your way!</p>
            <button onClick={() => navigateTransition('/post-ride')} className="btn btn-primary btn-post-prompt">
              Post Your Ride
            </button>
          </div>
        ) : (
          <div className="rides-grid">
            {rides.map(ride => (
              <div 
                key={ride.id} 
                className="ride-card glass-panel"
                onClick={() => navigateTransition(`/ride/${ride.id}`)}
              >
                <div className="ride-card-header">
                  <div className="ride-driver-info">
                    <span className="driver-avatar">🧑‍✈️</span>
                    <div>
                      <h4 className="driver-name">
                        {ride.driver_name} {ride.driver_is_verified && <span className="verified-badge-glow" title="Verified Driver">🛡️</span>}
                      </h4>
                      <span className="driver-sub">Host Driver</span>
                      {ride.is_recurring && (
                        <div style={{ marginTop: '4px' }}>
                          <span className="badge badge-success" style={{ fontSize: '9px', textTransform: 'capitalize', padding: '2px 6px', borderRadius: '6px' }}>
                            🗓️ {ride.recurrence_frequency}
                          </span>
                        </div>
                      )}
                      {ride.match_score !== undefined && ride.match_score !== null && (
                        <div style={{ marginTop: '6px' }}>
                          <span className={`badge ${
                            ride.match_score >= 80 ? 'badge-success' : ride.match_score >= 50 ? 'badge-warning' : 'badge-primary'
                          }`} style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '8px', textTransform: 'none' }}>
                            ⚡ {ride.match_score}% Match
                          </span>
                            </div>
                          )}

                          {(ride.vehicle_type || ride.vehicle_number) && (
                            <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                              {ride.vehicle_type ? (ride.vehicle_type.charAt(0).toUpperCase() + ride.vehicle_type.slice(1)) : ''}
                              {ride.vehicle_number ? ` • ${ride.vehicle_number}` : ''}
                            </div>
                          )}
                    </div>
                  </div>
                  <div className="ride-price-badge">
                    <span className="price-amount">${ride.cost_per_seat.toFixed(2)}</span>
                    <span className="price-sub">/ seat</span>
                  </div>
                </div>

                <div className="ride-route-visual">
                  <div className="route-dot start"></div>
                  <div className="route-line"></div>
                  <div className="route-dot end"></div>
                  <div className="route-labels">
                    <div className="route-point start-point">{ride.start_point}</div>
                    <div className="route-point end-point">{ride.end_point}</div>
                  </div>
                </div>

                <div className="ride-card-footer">
                  <div className="ride-meta-item">
                    <span className="meta-icon">📅</span>
                    <span className="meta-text">{formatDate(ride.pickup_time)}</span>
                  </div>
                  <div className="ride-meta-item">
                    <span className="meta-icon">💺</span>
                    <span className={`meta-text seat-count ${ride.available_seats === 0 ? 'full' : ''}`}>
                      {ride.available_seats} / {ride.total_seats} seats free
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ----------------------------------------------------
// Login & Registration Page
// ----------------------------------------------------
function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [localErr, setLocalErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const { login, register, error, setError } = useAuth();
  const navigateTransition = useTransitionNavigate();

  useEffect(() => {
    // Clear any previous error on component load
    setError(null);
    setLocalErr('');
  }, [isLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalErr('');
    setSuccessMsg('');

    if (!email || !password || (!isLogin && !name)) {
      setLocalErr('All fields are required.');
      return;
    }

    // Verify college email format
    if (!isLogin) {
      const isCampusEmail = email.endsWith('.edu') || email.includes('@college.') || email.includes('@school.') || email.includes('@univ.') || email.endsWith('.ac.in');
      if (!isCampusEmail) {
        setLocalErr('Registration is strictly restricted to verified campus emails (e.g., matching .edu or college domains).');
        return;
      }
    }

    try {
      if (isLogin) {
        await login(email, password);
        setSuccessMsg('Logged in successfully!');
        setTimeout(() => navigateTransition('/'), 800);
      } else {
        await register(name, email, password, role);
        setSuccessMsg('Account created! Logging you in...');
        setTimeout(() => navigateTransition('/'), 1000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box glass-panel pulse">
        <h2 className="login-title gradient-text">{isLogin ? 'Sign In to Sharefare' : 'Create Campus Account'}</h2>
        <p className="login-subtitle">
          {isLogin ? 'Enter your credentials to browse & book rides.' : 'Verify your campus email to post & join rides.'}
        </p>

        {localErr && <div className="alert alert-danger">{localErr}</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        {successMsg && <div className="alert alert-success">{successMsg}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                placeholder="e.g. Jane Doe"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Campus Email Address</label>
            <input 
              type="email" 
              placeholder="e.g. student@university.edu"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {!isLogin && <span className="input-helper">Must end with .edu, .ac.in or specific college domains</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Campus Role</label>
              <select 
                className="form-input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="student">Student</option>
                <option value="staff">Faculty / Staff</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-submit-auth">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="login-toggle-mode">
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button onClick={() => setIsLogin(!isLogin)} className="btn-toggle-link">
              {isLogin ? 'Sign up here' : 'Sign in here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Post a Ride Page
// ----------------------------------------------------
function PostRidePage() {
  const { user } = useAuth();
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('08:00');
  const [pickupPeriod, setPickupPeriod] = useState('AM');
  const [totalSeats, setTotalSeats] = useState(3);
  const [costPerSeat, setCostPerSeat] = useState(10);
  const [vehicleType, setVehicleType] = useState('car');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('daily');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');

  const navigateTransition = useTransitionNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setSuccess('');

    if (!startPoint || !endPoint || !pickupDate || !pickupTime || !pickupPeriod || totalSeats === undefined || costPerSeat === undefined) {
      setErr('Please fill out all required ride fields.');
      return;
    }

    const [hourStr, minuteStr] = pickupTime.split(':');
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      setErr('Enter a valid departure time.');
      return;
    }

    if (pickupPeriod === 'PM' && hour < 12) hour += 12;
    if (pickupPeriod === 'AM' && hour === 12) hour = 0;
    const normalizedHour = hour.toString().padStart(2, '0');
    const normalizedMinute = minute.toString().padStart(2, '0');
    const pickupTimeISO = `${pickupDate}T${normalizedHour}:${normalizedMinute}:00`;
    
    setLoading(true);
    try {
      const res = await axios.post('/api/rides', {
        start_point: startPoint,
        end_point: endPoint,
        pickup_time: pickupTimeISO,
        total_seats: parseInt(totalSeats),
        cost_per_seat: parseFloat(costPerSeat),
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber,
        description,
        is_recurring: isRecurring,
        recurrence_frequency: isRecurring ? recurrenceFrequency : null,
        recurrence_end: isRecurring ? recurrenceEnd : null
      });

      setSuccess('Ride posted successfully! Returning to home page...');
      setTimeout(() => navigateTransition('/'), 1200);
    } catch (err) {
      setErr(err.response?.data?.message || 'Failed to post ride. Please verify parameters.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="login-required-container glass-panel">
        <span className="unauth-emoji">🛑</span>
        <h2>Access Restricted</h2>
        <p>You must be signed in with a verified campus account to post a ride and split fuel fares.</p>
        <button onClick={() => navigateTransition('/login')} className="btn btn-primary btn-unauth-redirect">
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <div className="post-ride-container">
      <div className="post-ride-box glass-panel">
        <h2 className="post-title gradient-text">Post a Shared Ride</h2>
        <p className="post-subtitle">Share your route, specify seat availability, split costs, and travel together.</p>

        {err && <div className="alert alert-danger">{err}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="post-ride-form">
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Starting Point</label>
              <input 
                type="text" 
                placeholder="e.g. West Campus Gate, City Center"
                className="form-input"
                value={startPoint}
                onChange={(e) => setStartPoint(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Destination</label>
              <input 
                type="text" 
                placeholder="e.g. Main Science Hall, Airport Terminal"
                className="form-input"
                value={endPoint}
                onChange={(e) => setEndPoint(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Departure Date</label>
              <input 
                type="date" 
                className="form-input"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Departure Time</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="time" 
                  className="form-input"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  style={{ flex: 1 }}
                />
                <select
                  className="form-input"
                  value={pickupPeriod}
                  onChange={(e) => setPickupPeriod(e.target.value)}
                  style={{ width: '100px' }}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Available Passenger Seats</label>
              <input 
                type="number" 
                min="1" 
                max="8"
                className="form-input"
                value={totalSeats}
                onChange={(e) => setTotalSeats(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Requested Cost splitting ($ per seat)</label>
              <input 
                type="number" 
                min="0" 
                step="0.5"
                className="form-input"
                value={costPerSeat}
                onChange={(e) => setCostPerSeat(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row-2" style={{ marginTop: '12px' }}>
            <div className="form-group">
              <label className="form-label">Vehicle Type</label>
              <select
                className="form-input"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
              >
                <option value="car">Car (Hatchback / Sedan)</option>
                <option value="suv">SUV</option>
                <option value="bike">Bike / Motorcycle</option>
                <option value="van">Van / MPV</option>
                <option value="auto">Auto / Tuk-tuk</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Vehicle Number (Plate)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. KA-01-AB-1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Pickup Coordination Details (Optional)</label>
            <textarea 
              rows="3" 
              placeholder="e.g. Meet by the campus library clock tower. I have space for one large bag."
              className="form-input form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          <div className="form-group recurrence-section" style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
            <label className="form-label-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
              <input 
                type="checkbox" 
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
              />
              <span>Make this a recurring commute (Scheduled ride)</span>
            </label>

            {isRecurring && (
              <div className="form-row-2" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Frequency</label>
                  <select 
                    className="form-input"
                    value={recurrenceFrequency}
                    onChange={(e) => setRecurrenceFrequency(e.target.value)}
                  >
                    <option value="daily">Daily Commute</option>
                    <option value="weekly">Weekly Commute</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Repeat Until Date</label>
                  <input 
                    type="date" 
                    className="form-input"
                    value={recurrenceEnd}
                    onChange={(e) => setRecurrenceEnd(e.target.value)}
                    required={isRecurring}
                  />
                </div>
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-submit-ride" style={{ marginTop: '1.5rem' }}>
            {loading ? 'Posting ride...' : 'Post a Ride'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Ride Detail Page
// ----------------------------------------------------
function RideDetailPage() {
  const { id } = useParams();
  const { user, refreshUser } = useAuth();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  
  // Payment integration state variables
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentBookingId, setPaymentBookingId] = useState('');

  // Safety & SOS States
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosMessage, setSosMessage] = useState('Emergency SOS triggered!');
  const [sosLoading, setSosLoading] = useState(false);
  const [copysuccess, setCopysuccess] = useState(false);

  // Quick emergency update state
  const [editingEmergency, setEditingEmergency] = useState(false);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  useEffect(() => {
    if (user) {
      setEmergencyName(user.emergency_name || '');
      setEmergencyPhone(user.emergency_phone || '');
    }
  }, [user]);

  const navigateTransition = useTransitionNavigate();

  const fetchRideDetails = async () => {
    try {
      const res = await axios.get(`/api/rides/${id}`);
      setRide(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Ride details could not be retrieved.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRideDetails();
  }, [id]);

  const handleBookSeat = async () => {
    if (!user) {
      navigateTransition('/login');
      return;
    }

    setBookingLoading(true);
    setBookingSuccess('');
    setError('');
    
    try {
      const res = await axios.post(`/api/rides/${id}/book`);
      const { booking, razorpay_order_id, amount } = res.data;
      
      setPaymentBookingId(booking.id);
      setPaymentOrderId(razorpay_order_id);
      setPaymentAmount(amount);
      setShowPaymentModal(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId) => {
    try {
      const res = await axios.post('/api/payments/verify', {
        booking_id: paymentBookingId,
        razorpay_order_id: paymentOrderId,
        razorpay_payment_id: paymentId
      });
      setBookingSuccess(res.data.message);
      setShowPaymentModal(false);
      fetchRideDetails();
    } catch (err) {
      setError(err.response?.data?.message || 'Payment verification failed.');
      setShowPaymentModal(false);
    }
  };

  const formatDate = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="ride-detail-loading glass-panel">
        <div className="spinner"></div>
        <p>Retrieving route details...</p>
      </div>
    );
  }

  if (error && !ride) {
    return (
      <div className="alert alert-danger glass-panel" style={{ padding: '40px', marginTop: '20px' }}>
        <h3>Error occurred</h3>
        <p>{error}</p>
        <button onClick={() => navigateTransition('/', 'backward')} className="btn btn-secondary" style={{ marginTop: '16px' }}>
          Back to Rides
        </button>
      </div>
    );
  }

  const handleTriggerSOS = async () => {
    setSosLoading(true);
    try {
      await axios.post(`/api/rides/${id}/sos`, { sos_message: sosMessage });
      setShowSosModal(false);
      fetchRideDetails();
    } catch (err) {
      console.error("SOS Trigger failed:", err);
      alert("Failed to trigger SOS. Please contact security directly.");
    } finally {
      setSosLoading(false);
    }
  };

  const handleResolveSOS = async () => {
    try {
      await axios.post(`/api/rides/${id}/sos/resolve`);
      fetchRideDetails();
    } catch (err) {
      console.error("SOS Resolution failed:", err);
    }
  };

  const handleUpdateEmergency = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/users/emergency-contact', {
        emergency_name: emergencyName,
        emergency_phone: emergencyPhone
      });
      setEditingEmergency(false);
      if (refreshUser) await refreshUser();
    } catch (err) {
      alert('Failed to update emergency contact details.');
    }
  };

  const handleShareTrackingLink = (bookingId) => {
    const link = `${window.location.origin}/track-ride/${bookingId}`;
    navigator.clipboard.writeText(link);
    setCopysuccess(true);
    setTimeout(() => setCopysuccess(false), 2000);
  };

  const isDriver = user && ride.driver_id === user.id;
  const paidBooking = user && ride.bookings.find(b => b.passenger_id === user.id && b.payment_status === 'paid');
  const unpaidBooking = user && ride.bookings.find(b => b.passenger_id === user.id && b.payment_status === 'unpaid');
  const isFull = ride.available_seats === 0;

  return (
    <div className="ride-detail-container">
      {ride.sos_triggered && (
        <div className="alert alert-danger sos-active-banner animate-pulse" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ef4444', color: '#fff', padding: '16px', borderRadius: '12px' }}>
          <span>⚠️ EMERGENCY SOS ACTIVE on this commute! Campus Security dispatch has been notified.</span>
          {(isDriver || (user && user.role === 'admin')) && (
            <button onClick={handleResolveSOS} className="btn btn-sm btn-success" style={{ padding: '6px 12px' }}>
              ✓ Resolve SOS
            </button>
          )}
        </div>
      )}

      <button onClick={() => navigateTransition('/', 'backward')} className="btn btn-secondary btn-back-rides">
        ⬅️ Back to Rides
      </button>
 
      <div className="ride-detail-grid">
        {/* Main Details card */}
        <div className="ride-detail-main glass-panel">
          <div className="detail-header">
            <span className="detail-route-badge">COMMUTE ROUTE</span>
            {ride.is_recurring && (
              <span className="badge badge-success" style={{ marginLeft: '12px', fontSize: '11px', textTransform: 'capitalize' }}>
                🗓️ Recurring Commute ({ride.recurrence_frequency})
              </span>
            )}
            <h2 className="detail-route-title">
              {ride.start_point} ➔ {ride.end_point}
            </h2>
          </div>
 
          <div className="detail-meta-grid">
            <div className="detail-meta-card">
              <span className="meta-card-icon">📅</span>
              <div>
                <span className="meta-card-label">Departure Date & Time</span>
                <span className="meta-card-value">{formatDate(ride.pickup_time)}</span>
              </div>
            </div>
            <div className="detail-meta-card">
              <span className="meta-card-icon">💵</span>
              <div>
                <span className="meta-card-label">Splitting Cost</span>
                <span className="meta-card-value">${ride.cost_per_seat.toFixed(2)} per passenger</span>
              </div>
            </div>
            <div className="detail-meta-card">
              <span className="meta-card-icon">💺</span>
              <div>
                <span className="meta-card-label">Seat Availability</span>
                <span className="meta-card-value">
                  {ride.available_seats} of {ride.total_seats} seats free
                </span>
              </div>
            </div>
            {ride.is_recurring && (
              <div className="detail-meta-card">
                <span className="meta-card-icon">🗓️</span>
                <div>
                  <span className="meta-card-label">Recurrence Details</span>
                  <span className="meta-card-value">Repeats {ride.recurrence_frequency} until {ride.recurrence_end}</span>
                </div>
              </div>
            )}
          </div>
 
          <div className="detail-description-section">
            <h3 className="section-subtitle">Driver Description / Pickup Details</h3>
            <p className="detail-desc-text">
              {ride.description || "The driver hasn't provided extra description. Coordinate details directly upon approval."}
            </p>
          </div>
 
          <RideMap startPoint={ride.start_point} endPoint={ride.end_point} />
        </div>
 
        {/* Sidebar Driver & Booking Action card */}
        <div className="ride-detail-sidebar">
          {/* Driver profile card */}
          <div className="sidebar-card driver-profile-card glass-panel">
            <h3 className="sidebar-card-title">Your Host Driver</h3>
            <div className="driver-profile-body">
              <span className="driver-detail-avatar">🧑‍✈️</span>
              <div>
                <h4 className="driver-detail-name">
                  {ride.driver_name} {ride.driver_is_verified && <span className="verified-badge-glow" title="Verified Driver">🛡️</span>}
                </h4>
                <span className="badge badge-primary">{ride.driver_email.split('@')[1]} Member</span>
                  {(ride.vehicle_type || ride.vehicle_number) && (
                    <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {ride.vehicle_type ? (ride.vehicle_type.charAt(0).toUpperCase() + ride.vehicle_type.slice(1)) : ''}
                      {ride.vehicle_number ? ` • ${ride.vehicle_number}` : ''}
                    </div>
                  )}
              </div>
            </div>
            <p className="driver-contact-email">📩 {ride.driver_email}</p>
          </div>
 
          {/* Booking Action Card */}
          <div className="sidebar-card booking-action-card glass-panel">
            <h3 className="sidebar-card-title">Book Seat</h3>
            <div className="booking-price-summary">
              <div className="price-row">
                <span>1 Seat cost:</span>
                <span>${ride.cost_per_seat.toFixed(2)}</span>
              </div>
              <div className="price-row total">
                <span>Total Split Amount:</span>
                <span>${ride.cost_per_seat.toFixed(2)}</span>
              </div>
            </div>
 
            {error && <div className="alert alert-danger">{error}</div>}
            {bookingSuccess && <div className="alert alert-success">{bookingSuccess}</div>}
 
            {isDriver ? (
              <div className="booking-status-box status-host">
                <span>🛡️ You posted this ride</span>
                <p>Manage passenger requests inside your Dashboard.</p>
              </div>
            ) : paidBooking ? (
              <div className="booking-status-box status-booked">
                <span>✅ Seat Paid & Confirmed!</span>
                <p>You have secured a seat on this route.</p>
                <div style={{ marginTop: '8px', fontSize: '0.85rem', opacity: 0.8 }}>
                  <strong>Txn ID:</strong> {paidBooking.razorpay_payment_id || 'N/A'}
                </div>
                <p style={{ marginTop: '8px' }}>Have a safe journey!</p>
              </div>
            ) : unpaidBooking ? (
              <div className="booking-status-box status-host" style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d' }}>
                <span>⏳ Payment Pending!</span>
                <p>Your reservation is initialized, but not finalized.</p>
                <button 
                  onClick={() => {
                    setPaymentBookingId(unpaidBooking.id);
                    setPaymentOrderId(unpaidBooking.razorpay_order_id);
                    setPaymentAmount(unpaidBooking.payment_amount);
                    setShowPaymentModal(true);
                  }} 
                  className="btn btn-primary w-full btn-book-seat animate-pulse"
                  style={{ marginTop: '12px', boxShadow: '0 0 15px rgba(245, 158, 11, 0.3)' }}
                >
                  Complete Payment (${unpaidBooking.payment_amount.toFixed(2)})
                </button>
              </div>
            ) : isFull ? (
              <button disabled className="btn btn-secondary w-full" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                🚫 Ride is Full
              </button>
            ) : (
              <button 
                onClick={handleBookSeat} 
                disabled={bookingLoading} 
                className="btn btn-primary w-full btn-book-seat"
              >
                {bookingLoading ? 'Reserving...' : user ? 'Book Seat' : 'Sign In to Book'}
              </button>
            )}
          </div>

          {/* Trip Safety Control Panel */}
          {(isDriver || paidBooking) && (
            <div className="sidebar-card safety-control-card glass-panel" style={{ border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.03)' }}>
              <h3 className="sidebar-card-title" style={{ color: '#ef4444' }}>🚨 Trip Safety Actions</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                {/* Emergency Contact setup status */}
                <div className="emergency-setup-status" style={{ fontSize: '0.85rem', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <strong>Emergency Contact:</strong>
                  {user?.emergency_name ? (
                    <div style={{ marginTop: '4px' }}>
                      👤 {user.emergency_name} ({user.emergency_phone})
                    </div>
                  ) : (
                    <div style={{ color: '#f59e0b', marginTop: '4px' }}>⚠️ Not configured! Setup emergency contact.</div>
                  )}
                  
                  {!editingEmergency ? (
                    <button onClick={() => setEditingEmergency(true)} className="btn btn-link" style={{ padding: '0', fontSize: '11px', marginTop: '6px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                      {user?.emergency_name ? 'Change emergency details' : 'Configure now'}
                    </button>
                  ) : (
                    <form onSubmit={handleUpdateEmergency} style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <input 
                        type="text" 
                        placeholder="Contact Name" 
                        value={emergencyName} 
                        onChange={(e) => setEmergencyName(e.target.value)}
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        required
                      />
                      <input 
                        type="text" 
                        placeholder="Phone Number" 
                        value={emergencyPhone} 
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        required
                      />
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <button type="submit" className="btn btn-sm btn-success" style={{ fontSize: '10px', padding: '3px 8px' }}>Save</button>
                        <button type="button" onClick={() => setEditingEmergency(false)} className="btn btn-sm btn-secondary" style={{ fontSize: '10px', padding: '3px 8px' }}>Cancel</button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Share Live Tracking Link Button */}
                <button 
                  onClick={() => {
                    const activeBooking = ride.bookings.find(b => b.payment_status === 'paid') || ride.bookings[0];
                    const trackingId = paidBooking?.id || activeBooking?.id;
                    if (trackingId) {
                      handleShareTrackingLink(trackingId);
                    } else {
                      alert("Available once a passenger has booked a seat.");
                    }
                  }}
                  className="btn btn-secondary w-full"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <span>🔗</span> {copysuccess ? 'Link Copied!' : 'Share Live Tracking Link'}
                </button>

                {/* SOS Trigger Button */}
                {!ride.sos_triggered ? (
                  <button 
                    onClick={() => setShowSosModal(true)}
                    className="btn btn-danger w-full btn-sos"
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                      boxShadow: '0 0 15px rgba(239, 68, 68, 0.45)',
                      fontWeight: 'bold'
                    }}
                  >
                    🚨 Trigger Emergency SOS
                  </button>
                ) : (
                  <div style={{ textAlign: 'center', color: '#ef4444', fontWeight: 'bold', padding: '10px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', border: '1px solid #ef4444' }}>
                    🚨 SOS Signal Broadcasting
                  </div>
                )}
              </div>
            </div>
          )}
 
          {/* Booked Passengers listing */}
          <div className="sidebar-card passengers-list-card glass-panel">
            <h3 className="sidebar-card-title">Joined Travelers ({ride.bookings.length})</h3>
            {ride.bookings.length === 0 ? (
              <p className="no-passengers-text">No other passengers have joined yet. Be the first!</p>
            ) : (
              <ul className="passengers-list">
                {ride.bookings.map(b => (
                  <li key={b.id} className="passenger-item">
                    <span className="passenger-avatar">🧑‍🎓</span>
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="passenger-name">
                        {b.passenger_name} {b.passenger_is_verified && <span className="verified-badge-glow" title="Verified Passenger">🛡️</span>}
                      </span>
                      <span className={`passenger-status-badge ${b.payment_status === 'paid' ? 'paid-badge' : 'unpaid-badge'}`}>
                        {b.payment_status === 'paid' ? '✓ Paid' : '⏳ Unpaid'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {showSosModal && (
        <div className="rzp-overlay">
          <div className="rzp-modal glass-panel" style={{ maxWidth: '450px' }}>
            <div className="rzp-header">
              <h4 className="rzp-title" style={{ color: '#ef4444', margin: 0 }}>⚠️ Confirm SOS Escalation</h4>
              <button onClick={() => setShowSosModal(false)} className="rzp-close-btn">✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Triggering the SOS alert flags this ride in the platform administration control room, alerts the driver/travelers, and logs emergency coordination protocols.
              </p>
              
              <div className="form-group">
                <label className="form-label">SOS Situation Message (Optional)</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={sosMessage}
                  onChange={(e) => setSosMessage(e.target.value)}
                  placeholder="Describe your situation (e.g. Engine breakdown on highway, feeling unsafe)"
                ></textarea>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                <button 
                  onClick={handleTriggerSOS} 
                  disabled={sosLoading}
                  className="btn btn-danger w-full"
                  style={{ background: '#ef4444' }}
                >
                  {sosLoading ? 'Escalating...' : '🚨 Broadcast SOS Signal'}
                </button>
                <button 
                  onClick={() => setShowSosModal(false)} 
                  className="btn btn-secondary w-full"
                >
                  Cancel
                </button>
              </div>

              <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <strong>Immediate assistance numbers:</strong>
                <ul style={{ paddingLeft: '16px', marginTop: '6px' }}>
                  <li>Police / Emergency: <a href="tel:911" style={{ color: '#ef4444', textDecoration: 'underline' }}>911</a></li>
                  <li>Campus Security Hotline: <a href="tel:555-0199" style={{ color: '#10b981', textDecoration: 'underline' }}>555-0199</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <RazorpayModal
          orderId={paymentOrderId}
          amount={paymentAmount}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------
// Dashboard Page: User's posted & booked rides
// ----------------------------------------------------
function DashboardPage() {
  const { user, refreshUser, logout } = useAuth();
  const [data, setData] = useState({ driving: [], booked: [] });
  const [availableRides, setAvailableRides] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState('Student');
  
  // Payment integration state variables
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentBookingId, setPaymentBookingId] = useState('');

  // Identity verification upload state
  const [idProofFile, setIdProofFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [identityUploadMessage, setIdentityUploadMessage] = useState('');
  const [identityUploadError, setIdentityUploadError] = useState('');

  // Safety & emergency settings
  const [editingEmergency, setEditingEmergency] = useState(false);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const navigateTransition = useTransitionNavigate();

  useEffect(() => {
    if (user) {
      setEmergencyName(user.emergency_name || '');
      setEmergencyPhone(user.emergency_phone || '');
      setUserRole(user.is_driver ? 'Driver' : 'Student');
    }
  }, [user]);

  const handleUpdateEmergency = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/users/emergency-contact', {
        emergency_name: emergencyName,
        emergency_phone: emergencyPhone
      });
      setEditingEmergency(false);
      if (refreshUser) await refreshUser();
    } catch (err) {
      alert('Failed to update emergency contact details.');
    }
  };

  const handleIdentityUpload = async (e) => {
    e.preventDefault();
    setIdentityUploadError('');
    setIdentityUploadMessage('');

    if (!idProofFile || !selfieFile) {
      setIdentityUploadError('Please select both your student ID document and a selfie for verification.');
      return;
    }

    const formData = new FormData();
    formData.append('id_proof', idProofFile);
    formData.append('selfie', selfieFile);
    formData.append('id_proof_name', idProofFile.name);

    try {
      const res = await axios.post('/api/users/verify-identity', formData);
      setIdentityUploadMessage(res.data.message || 'Verification documents uploaded successfully.');
      setIdProofFile(null);
      setSelfieFile(null);
      if (refreshUser) await refreshUser();
    } catch (err) {
      setIdentityUploadError(err.response?.data?.message || 'Upload failed. Please try again.');
    }
  };

  const fetchDashboard = async () => {
    if (!user) return;
    try {
      const res = await axios.get('/api/my-rides');
      setData(res.data);
      
      // Mock available rides for nearby users
      const mockRides = [
        { id: 101, driver_name: 'Arjun K', rating: 4.8, start: 'JNTU Gate', end: 'Hitech City', time: '3:30 PM', price: 150, seats: 2 },
        { id: 102, driver_name: 'Priya S', rating: 4.9, start: 'HITEC Gate', end: 'Begumpet', time: '4:00 PM', price: 120, seats: 3 },
        { id: 103, driver_name: 'Rahul M', rating: 4.7, start: 'Kukatpally', end: 'Filmnagar', time: '3:45 PM', price: 180, seats: 1 }
      ];
      setAvailableRides(mockRides);
      
      // Mock notifications
      const mockNotif = [
        { id: 1, type: 'accepted', message: 'Your ride to Hitech City was accepted by Arjun K', time: '2 hours ago' },
        { id: 2, type: 'message', message: 'Priya S sent you a message: "See you soon!"', time: '30 minutes ago' },
        { id: 3, type: 'arrived', message: 'Your driver is 5 minutes away', time: '5 minutes ago' }
      ];
      setNotifications(mockNotif);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  const handlePaymentSuccess = async (paymentId) => {
    try {
      await axios.post('/api/payments/verify', {
        booking_id: paymentBookingId,
        razorpay_order_id: paymentOrderId,
        razorpay_payment_id: paymentId
      });
      setShowPaymentModal(false);
      fetchDashboard();
    } catch (err) {
      console.error("Payment verification failed:", err);
      alert(err.response?.data?.message || 'Payment verification failed.');
      setShowPaymentModal(false);
    }
  };

  const formatDate = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  if (!user) {
    return (
      <div className="login-required-container glass-panel">
        <span className="unauth-emoji">🔐</span>
        <h2>Dashboard Locked</h2>
        <p>Please log in to manage your rides, check passenger bookings, and review coordination notes.</p>
        <button onClick={() => navigateTransition('/login')} className="btn btn-primary btn-unauth-redirect">
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-container" style={{ flex: 1, padding: '0 26px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {/* WELCOME SECTION */}
        <div className="dashboard-header glass-panel" style={{ marginBottom: '28px', padding: '28px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'start' }}>
          <div>
            <h1 className="dashboard-title" style={{ margin: '0 0 6px 0', fontSize: '2rem' }}>Welcome back, {user.name}! 👋</h1>
            <p className="dashboard-subtitle" style={{ margin: 0, color: 'var(--text-muted)' }}>Manage your rides and find the best carpool options</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: '20px', padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--primary)' }}>⭐ 4.8</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rating</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#10b981' }}>{data.driving.length}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rides Posted</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#f59e0b' }}>{data.booked.length}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rides Booked</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#8b5cf6' }}>{userRole}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Role</div>
            </div>
          </div>
        </div>

        {/* SECURITY PANEL - Redirect to Profile */}
        <div className="dashboard-security-panel glass-panel" style={{ marginBottom: '28px', padding: '20px', textAlign: 'left', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>🛡️ Security & Identity Configuration</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Verification is now in your profile page. Complete your student ID upload and realtime selfie check.
              </p>
            </div>
            <button onClick={() => navigateTransition('/profile')} className="btn btn-primary" style={{ minWidth: '140px' }}>
              Open Profile
            </button>
          </div>
        </div>

        {/* AVAILABLE RIDES FEED */}
        <section className="dashboard-section glass-panel" style={{ marginBottom: '28px', padding: '22px', borderRadius: '18px' }}>
          <h2 className="section-title" style={{ marginTop: 0, marginBottom: '18px' }}>🚗 Available Nearby Rides</h2>
          
          {/* Search bar */}
          <div style={{ marginBottom: '18px' }}>
            <input 
              type="text"
              placeholder="Search by location, driver name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ width: '100%', padding: '10px 14px' }}
            />
          </div>

          {availableRides.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No rides available at the moment</p>
          ) : (
            <div style={{ display: 'grid', gap: '14px' }}>
              {availableRides.map(ride => (
                <div 
                  key={ride.id}
                  className="available-ride-card glass-panel"
                  style={{ 
                    padding: '16px', 
                    display: 'grid', 
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: '16px',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.3s ease',
                    _hover: { background: 'rgba(255,255,255,0.04)' }
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '4px' }}>👤</div>
                    <span style={{ fontWeight: 600, display: 'block' }}>{ride.driver_name}</span>
                    <span style={{ fontSize: '0.85rem', color: '#fbbf24' }}>⭐ {ride.rating}</span>
                  </div>

                  <div style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{ride.start}</span>
                      <span style={{ color: 'var(--text-muted)' }}>→</span>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>{ride.end}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      <span>⏰ {ride.time}</span>
                      <span>💺 {ride.seats} seats left</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#10b981', marginBottom: '8px' }}>₹{ride.price}</div>
                    <button 
                      onClick={() => navigateTransition(`/ride/${ride.id}`)}
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                    >
                      Join Ride
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* MY RIDES SECTIONS */}
        <div className="dashboard-sections-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
          {/* Rides driving list */}
          <section className="dashboard-section glass-panel" style={{ padding: '22px', borderRadius: '18px' }}>
            <h2 className="section-title" style={{ marginTop: 0 }}>🛡️ Routes You are Driving ({data.driving.length})</h2>
            {loading ? (
              <p>Loading routes...</p>
            ) : data.driving.length === 0 ? (
              <div className="dashboard-empty-state">
                <p>You haven't posted any rides yet.</p>
                <button onClick={() => navigateTransition('/post-ride')} className="btn btn-secondary" style={{ marginTop: '12px' }}>
                  Post a Ride now
                </button>
              </div>
            ) : (
              <div className="dashboard-rides-list" style={{ display: 'grid', gap: '12px' }}>
                {data.driving.map(ride => (
                  <div 
                    key={ride.id} 
                    className="dash-ride-card"
                    onClick={() => navigateTransition(`/ride/${ride.id}`)}
                    style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}
                  >
                    <div className="dash-ride-main" style={{ marginBottom: '8px' }}>
                      <span className="dash-ride-route" style={{ fontWeight: 600 }}>{ride.start_point} ➔ {ride.end_point}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <span>📅 {formatDate(ride.pickup_time)}</span>
                      <span>💺 {ride.available_seats} / {ride.total_seats} seats</span>
                      <span style={{ fontWeight: 600, color: '#10b981' }}>₹{ride.cost_per_seat.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Rides passenger list */}
          <section className="dashboard-section glass-panel" style={{ padding: '22px', borderRadius: '18px' }}>
            <h2 className="section-title" style={{ marginTop: 0 }}>🎒 Rides You are Booking ({data.booked.length})</h2>
            {loading ? (
              <p>Loading bookings...</p>
            ) : data.booked.length === 0 ? (
              <div className="dashboard-empty-state">
                <p>You haven't booked any seats yet.</p>
                <button onClick={() => navigateTransition('/')} className="btn btn-secondary" style={{ marginTop: '12px' }}>
                  Find a Ride now
                </button>
              </div>
            ) : (
              <div className="dashboard-rides-list" style={{ display: 'grid', gap: '12px' }}>
                {data.booked.map(booking => (
                  <div 
                    key={booking.id} 
                    className="dash-ride-card"
                    onClick={() => navigateTransition(`/ride/${booking.ride_id}`)}
                    style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}
                  >
                    <div className="dash-ride-main" style={{ marginBottom: '8px' }}>
                      <span className="dash-ride-route" style={{ fontWeight: 600 }}>
                        {booking.ride?.start_point} ➔ {booking.ride?.end_point}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>🧑‍✈️ {booking.ride?.driver_name}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className={`badge ${booking.payment_status === 'paid' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                          {booking.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                        </span>
                        {booking.payment_status === 'unpaid' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentBookingId(booking.id);
                              setPaymentOrderId(booking.razorpay_order_id);
                              setPaymentAmount(booking.payment_amount);
                              setShowPaymentModal(true);
                            }}
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '10px' }}
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      {showPaymentModal && (
        <RazorpayModal
          orderId={paymentOrderId}
          amount={paymentAmount}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}

function MyBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigateTransition = useTransitionNavigate();

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get('/api/bookings/me');
        setBookings(res.data || []);
      } catch (err) {
        setError('Unable to load your booked rides.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user]);

  const formatDate = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <div className="login-required-container glass-panel">
        <span className="unauth-emoji">🔐</span>
        <h2>Please sign in to view your bookings.</h2>
        <p>My Bookings are available once you log in with your student account.</p>
      </div>
    );
  }

  return (
    <div className="bookings-page-container" style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div className="dashboard-header glass-panel" style={{ marginBottom: '24px', padding: '26px' }}>
        <h1 className="dashboard-title" style={{ margin: 0 }}>My Bookings</h1>
        <p className="dashboard-subtitle" style={{ margin: '8px 0 0', color: 'var(--text-muted)' }}>
          Review your upcoming rides, payment status, and driver details in one place.
        </p>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <p>Loading your bookings...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger glass-panel" style={{ padding: '20px' }}>{error}</div>
      ) : bookings.length === 0 ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <h3>No bookings yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>Search for a ride and book your first seat.</p>
          <button onClick={(e) => navigateTransition('/', e)} className="btn btn-primary">Find a Ride</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '18px' }}>
          {bookings.map((booking) => (
            <div key={booking.id} className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{booking.ride?.start_point} → {booking.ride?.end_point}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Driver: {booking.ride?.driver_name || 'TBD'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#10b981' }}>₹{booking.payment_amount?.toFixed(2) || '0.00'}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{formatDate(booking.created_at)}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '14px', alignItems: 'center', marginTop: '18px' }}>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Pickup time</div>
                  <div>{formatDate(booking.ride?.pickup_time)}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Status</div>
                  <div>{booking.status || 'Confirmed'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                  <span className={`badge ${booking.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`} style={{ padding: '6px 10px' }}>
                    {booking.payment_status === 'paid' ? 'Paid' : 'Awaiting Payment'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateTransition(`/ride/${booking.ride_id}`, e);
                    }}
                    className="btn btn-secondary"
                    style={{ minWidth: '140px' }}
                  >
                    View Ride
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigateTransition = useTransitionNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        // Replace with a real backend endpoint when available.
        const mockData = [
          {
            id: 1,
            category: 'bookings',
            title: 'Booking request sent',
            message: 'Your booking request was sent successfully.',
            time: '19h ago'
          },
          {
            id: 2,
            category: 'rides',
            title: 'Driver confirmed your seat',
            message: 'Arjun K has confirmed your ride to Hitech City.',
            time: '2h ago'
          },
          {
            id: 3,
            category: 'system',
            title: 'System update available',
            message: 'Sharefare has released new chat improvements.',
            time: '1d ago'
          }
        ];
        setNotifications(mockData);
      } catch (err) {
        console.warn('Unable to load notifications', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchNotifications();
    } else {
      setLoading(false);
      setNotifications([]);
    }
  }, [user]);

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'bookings', label: 'Bookings' },
    { value: 'rides', label: 'Rides' },
    { value: 'system', label: 'System' }
  ];

  const filteredNotifications = activeTab === 'all'
    ? notifications
    : notifications.filter((item) => item.category === activeTab);

  return (
    <div className="notifications-page-container" style={{ padding: '24px', maxWidth: '1040px', margin: '0 auto' }}>
      <div className="notifications-header glass-panel" style={{ marginBottom: '24px', padding: '28px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem' }}>Notifications</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)' }}>All caught up</p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn btn-secondary"
          style={{ minWidth: '48px', minHeight: '48px', borderRadius: '16px' }}
        >
          🔄
        </button>
      </div>

      <div className="notifications-tabs glass-panel" style={{ display: 'flex', gap: '12px', padding: '12px', marginBottom: '24px' }}>
        {categories.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`notification-tab-button ${activeTab === tab.value ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <p>Loading notifications…</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="glass-panel" style={{ padding: '28px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>No notifications in this category.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredNotifications.map((item) => (
            <div key={item.id} className="notification-card glass-panel">
              <div className="notification-card-body">
                <div className="notification-card-left">
                  <div className="notification-card-icon">📩</div>
                  <div>
                    <h3 className="notification-card-title">{item.title}</h3>
                    <p className="notification-card-message">{item.message}</p>
                  </div>
                </div>
                <span className="notification-card-time">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// Public Live Ride Tracker Page (For Family Sharing)
// ----------------------------------------------------
function TrackRidePage() {
  const { bookingId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [simulatedProgress, setSimulatedProgress] = useState(35); // mock progress percent

  const fetchTrackingData = async () => {
    try {
      const res = await axios.get(`/api/bookings/track/${bookingId}`);
      setData(res.data.booking);
    } catch (err) {
      setError('Failed to fetch tracking details. Please verify the URL.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
    const interval = setInterval(fetchTrackingData, 6000);
    return () => clearInterval(interval);
  }, [bookingId]);

  // Simulate progress moving slowly for visual tracking progress demo
  useEffect(() => {
    const progInterval = setInterval(() => {
      setSimulatedProgress(prev => {
        if (prev >= 100) return 100;
        return prev + 1;
      });
    }, 4000);
    return () => clearInterval(progInterval);
  }, []);

  if (loading) {
    return (
      <div className="track-ride-loading glass-panel" style={{ padding: '80px', textAlign: 'center', marginTop: '40px' }}>
        <div className="spinner" style={{ margin: '0 auto 20px auto' }}></div>
        <p>Loading live tracking credentials...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="alert alert-danger glass-panel" style={{ padding: '40px', marginTop: '40px', textAlign: 'center' }}>
        <span style={{ fontSize: '3rem' }}>⚠️</span>
        <h3>Tracking Link Expired or Invalid</h3>
        <p>{error || 'This ride booking could not be located on our servers.'}</p>
      </div>
    );
  }

  const ride = data.ride;
  const isSos = ride?.sos_triggered;

  return (
    <div className="track-ride-container">
      <div className="track-ride-box glass-panel">
        <div className="track-header" style={{ textAlign: 'left', marginBottom: '24px' }}>
          <span className="live-pulse-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
            <span className="pulse-dot" style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'inline-block', animation: 'ping-dot 1.5s infinite' }}></span> LIVE RIDE TRACKING
          </span>
          <h2 className="track-title gradient-text" style={{ fontSize: '1.8rem', marginTop: '12px', marginBottom: '6px' }}>Shared Route Progress</h2>
          <p className="track-subtitle" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>This secure public page lets family members follow trip updates without registering an account.</p>
        </div>

        {isSos && (
          <div className="alert alert-danger sos-banner animate-pulse" style={{ background: '#ef4444', color: '#fff', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold' }}>
            🚨 EMERGENCY SIGNAL ACTIVE: Passenger or Driver triggered SOS alarm! Campus safety is notified.
          </div>
        )}

        <TrackRideMap startPoint={ride.start_point} endPoint={ride.end_point} progress={simulatedProgress} />

        <div className="track-route-display" style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
          <div className="track-points" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', textAlign: 'left' }}>
            <div className="track-point">
              <span className="point-label" style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>DEPARTURE POINT</span>
              <span className="point-value" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{ride.start_point}</span>
            </div>
            <div className="track-point" style={{ textAlign: 'right' }}>
              <span className="point-label" style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>DESTINATION ARRIVAL</span>
              <span className="point-value" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{ride.end_point}</span>
            </div>
          </div>

          {/* Animated Transit progress */}
          <div className="track-progress-bar-container" style={{ position: 'relative', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', margin: '40px 0 20px 0' }}>
            <div className="track-progress-fill" style={{ width: `${simulatedProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary) 0%, #10b981 100%)', borderRadius: '5px' }}></div>
            <div className="track-car-icon" style={{ left: `calc(${simulatedProgress}% - 15px)`, position: 'absolute', top: '-15px', fontSize: '18px', transition: 'left 0.4s ease' }}>
              🚗💨
            </div>
          </div>
          
          <div className="track-status-meta" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span>Telemetry: {simulatedProgress}% transit completed</span>
            <span>Status: {simulatedProgress >= 100 ? 'Arrived at Destination' : 'En Route'}</span>
          </div>
        </div>

        <div className="track-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', textAlign: 'left' }}>
          {/* Driver details */}
          <div className="track-detail-card glass-panel" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '1rem', marginTop: 0, marginBottom: '12px' }}>Host Driver</h3>
            <div className="track-user-info" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '2rem' }}>🧑‍✈️</span>
              <div>
                <h4 style={{ margin: 0 }}>{ride.driver_name} {ride.driver_is_verified && '🛡️'}</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ride.driver_email}</p>
                <span className="badge badge-success" style={{ fontSize: '9px', marginTop: '6px', display: 'inline-block' }}>🛡️ Verified Driver</span>
              </div>
            </div>
          </div>

          {/* Passenger details */}
          <div className="track-detail-card glass-panel" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '1rem', marginTop: 0, marginBottom: '12px' }}>Tracked Passenger</h3>
            <div className="track-user-info" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '2rem' }}>🧑‍🎓</span>
              <div>
                <h4 style={{ margin: 0 }}>{data.passenger_name} {data.passenger_is_verified && '🛡️'}</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Seat confirmed & paid</p>
                <span className="badge badge-primary" style={{ fontSize: '9px', marginTop: '6px', display: 'inline-block' }}>Verified Student</span>
              </div>
            </div>
          </div>
        </div>

        <div className="track-safety-hotlines" style={{ textAlign: 'left' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '10px' }}>Emergency Safety Hotline Coordination</h3>
          <div className="hotlines-grid" style={{ display: 'flex', gap: '12px' }}>
            <a href="tel:911" className="btn btn-danger" style={{ flex: 1, padding: '10px', background: '#ef4444' }}>📞 Call Police (911)</a>
            <a href="tel:555-0199" className="btn btn-secondary" style={{ flex: 1, padding: '10px' }}>📞 Call Campus Security</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Admin Control Center Portal
// ----------------------------------------------------
function AdminDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState(null);
  const [users, setUsers] = useState([]);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const navigateTransition = useTransitionNavigate();

  const fetchAdminData = async () => {
    if (!user || user.role !== 'admin') return;
    setLoading(true);
    try {
      const reportsRes = await axios.get('/api/admin/reports');
      setReports(reportsRes.data);

      const usersRes = await axios.get('/api/admin/users');
      setUsers(usersRes.data);

      const ridesRes = await axios.get('/api/admin/rides');
      setRides(ridesRes.data);
    } catch (err) {
      console.error("Admin dashboard fetch error:", err);
      setActionError('Failed to retrieve administrative data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="login-required-container glass-panel" style={{ padding: '80px', textAlign: 'center', marginTop: '40px' }}>
        <span className="unauth-emoji" style={{ fontSize: '3rem' }}>🚫</span>
        <h2>Access Denied</h2>
        <p>You do not have administrative credentials to view this moderation portal.</p>
        <button onClick={() => navigateTransition('/')} className="btn btn-primary" style={{ marginTop: '16px' }}>
          Return to Home
        </button>
      </div>
    );
  }

  const handleVerify = async (userId, status) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await axios.post(`/api/admin/users/${userId}/verify`, { status });
      setActionSuccess(res.data.message);
      fetchAdminData();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Verification update failed.');
    }
  };

  const handleBlock = async (userId) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await axios.post(`/api/admin/users/${userId}/block`);
      setActionSuccess(res.data.message);
      fetchAdminData();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Block update failed.');
    }
  };

  const handleResolveSos = async (rideId) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await axios.post(`/api/rides/${rideId}/sos/resolve`);
      setActionSuccess(res.data.message);
      fetchAdminData();
    } catch (err) {
      setActionError(err.response?.data?.message || 'SOS resolution failed.');
    }
  };

  const handleCancelRide = async (rideId) => {
    setActionError('');
    setActionSuccess('');
    if (!window.confirm("Are you sure you want to cancel this ride? All bookings will be automatically released.")) return;
    try {
      const res = await axios.post(`/api/admin/rides/${rideId}/cancel`);
      setActionSuccess(res.data.message);
      fetchAdminData();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Ride cancellation failed.');
    }
  };

  return (
    <div className="admin-container" style={{ textAlign: 'left', marginTop: '20px' }}>
      <div className="admin-header glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
        <h1 className="admin-title gradient-text" style={{ fontSize: '2rem', margin: 0 }}>🛡️ Administrator Control Center</h1>
        <p className="admin-subtitle" style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px', marginBottom: 0 }}>System metrics, safety escalations, passenger identity vetting, and platform moderation.</p>
      </div>

      {actionError && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{actionError}</div>}
      {actionSuccess && <div className="alert alert-success" style={{ marginBottom: '16px' }}>{actionSuccess}</div>}

      <div className="admin-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
        <button className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('reports')}>📊 Reports & Stats</button>
        <button className={`btn ${activeTab === 'vetting' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('vetting')}>🛡️ ID Vetting ({users.filter(u => u.id_proof_status === 'pending').length})</button>
        <button className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('users')}>👥 Users list</button>
        <button className={`btn ${activeTab === 'rides' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('rides')}>🚗 Active Rides ({rides.length})</button>
      </div>

      {loading ? (
        <div className="admin-loading glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 20px auto' }}></div>
          <p>Retrieving moderation systems status...</p>
        </div>
      ) : (
        <div className="admin-content-section">
          {activeTab === 'reports' && reports && (
            <div className="admin-reports-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <div className="report-card glass-panel" style={{ padding: '20px' }}>
                <span className="report-icon" style={{ fontSize: '2rem' }}>👥</span>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', margin: '10px 0 6px 0' }}>Total Members</h3>
                <p className="report-val" style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>{reports.total_users}</p>
                <span style={{ fontSize: '11px', color: '#10b981', display: 'block', marginTop: '6px' }}>Verified: {reports.verified_users} ({reports.total_users > 0 ? Math.round((reports.verified_users / reports.total_users)*100) : 0}%)</span>
              </div>
              <div className="report-card glass-panel" style={{ padding: '20px' }}>
                <span className="report-icon" style={{ fontSize: '2rem' }}>🚗</span>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', margin: '10px 0 6px 0' }}>Active Rides</h3>
                <p className="report-val" style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>{reports.active_rides}</p>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>Recurring Commutes: {reports.recurring_rides}</span>
              </div>
              <div className="report-card glass-panel alert-card-pulse" style={{ padding: '20px', border: reports.active_sos > 0 ? '1px solid #ef4444' : '', background: reports.active_sos > 0 ? 'rgba(239, 68, 68, 0.05)' : '' }}>
                <span className="report-icon" style={{ fontSize: '2rem' }}>🚨</span>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', margin: '10px 0 6px 0' }}>Active SOS Alerts</h3>
                <p className="report-val" style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0, color: reports.active_sos > 0 ? '#ef4444' : '' }}>{reports.active_sos}</p>
                <span style={{ fontSize: '11px', display: 'block', marginTop: '6px', color: reports.active_sos > 0 ? '#ef4444' : 'var(--text-muted)' }}>{reports.active_sos > 0 ? '⚠️ EMERGENCY DISPATCHING' : 'All systems normal'}</span>
              </div>
              <div className="report-card glass-panel" style={{ padding: '20px' }}>
                <span className="report-icon" style={{ fontSize: '2rem' }}>💵</span>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', margin: '10px 0 6px 0' }}>Transaction Volume</h3>
                <p className="report-val" style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>${reports.revenue_sum.toFixed(2)}</p>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>Total Bookings: {reports.total_bookings}</span>
              </div>
            </div>
          )}

          {activeTab === 'vetting' && (
            <div className="admin-table-container glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Pending Identity Vetting Queue</h3>
              {users.filter(u => u.id_proof_status === 'pending').length === 0 ? (
                <p className="no-records-text" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No pending identity proofs to audit.</p>
              ) : (
                <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                      <th style={{ padding: '12px' }}>User Name</th>
                      <th style={{ padding: '12px' }}>Email Address</th>
                      <th style={{ padding: '12px' }}>Document Filename</th>
                      <th style={{ padding: '12px' }}>Action Vetting</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter(u => u.id_proof_status === 'pending').map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '12px' }}>{u.name}</td>
                        <td style={{ padding: '12px' }}>{u.email}</td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', color: '#10b981' }}>📄 {u.id_proof_name}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleVerify(u.id, 'verified')} className="btn btn-sm btn-success" style={{ padding: '4px 10px', fontSize: '11px' }}>✓ Approve</button>
                            <button onClick={() => handleVerify(u.id, 'rejected')} className="btn btn-sm btn-danger" style={{ padding: '4px 10px', fontSize: '11px', background: '#ef4444' }}>✕ Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="admin-table-container glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px' }}>All Platform Users</h3>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>ID</th>
                    <th style={{ padding: '12px' }}>Name</th>
                    <th style={{ padding: '12px' }}>Email</th>
                    <th style={{ padding: '12px' }}>Role</th>
                    <th style={{ padding: '12px' }}>Verification Status</th>
                    <th style={{ padding: '12px' }}>Blocked status</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px' }}>{u.id}</td>
                      <td style={{ padding: '12px' }}>{u.name} {u.is_verified && '🛡️'}</td>
                      <td style={{ padding: '12px' }}>{u.email}</td>
                      <td style={{ padding: '12px' }}><span className="badge badge-primary" style={{ fontSize: '10px' }}>{u.role}</span></td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge ${u.id_proof_status === 'verified' ? 'badge-success' : u.id_proof_status === 'pending' ? 'badge-warning' : 'badge-secondary'}`} style={{ fontSize: '10px' }}>
                          {u.id_proof_status}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge ${u.is_blocked ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '10px' }}>
                          {u.is_blocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {u.id !== user.id ? (
                          <button 
                            onClick={() => handleBlock(u.id)} 
                            className={`btn btn-sm ${u.is_blocked ? 'btn-success' : 'btn-danger'}`}
                            style={{ padding: '4px 10px', fontSize: '11px', background: u.is_blocked ? '' : '#ef4444' }}
                          >
                            {u.is_blocked ? 'Unblock' : 'Block User'}
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', opacity: 0.6 }}>Self (Admin)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'rides' && (
            <div className="admin-table-container glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Active Platform Commutes</h3>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Driver</th>
                    <th style={{ padding: '12px' }}>Route</th>
                    <th style={{ padding: '12px' }}>Departure Time</th>
                    <th style={{ padding: '12px' }}>Recurrence</th>
                    <th style={{ padding: '12px' }}>SOS Flag</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rides.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: r.sos_triggered ? 'rgba(239,68,68,0.1)' : '' }}>
                      <td style={{ padding: '12px' }}>{r.driver_name}</td>
                      <td style={{ padding: '12px' }}>{r.start_point} ➔ {r.end_point}</td>
                      <td style={{ padding: '12px' }}>{new Date(r.pickup_time).toLocaleString()}</td>
                      <td style={{ padding: '12px' }}>
                        {r.is_recurring ? (
                          <span className="badge badge-success" style={{ fontSize: '10px' }}>🗓️ {r.recurrence_frequency}</span>
                        ) : (
                          <span className="badge badge-secondary" style={{ fontSize: '10px' }}>One-time</span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {r.sos_triggered ? (
                          <span className="badge badge-danger animate-pulse" style={{ fontSize: '10px', background: '#ef4444', animation: 'pulse-sos 1.5s infinite' }} title={r.sos_message}>⚠️ ACTIVE SOS</span>
                        ) : (
                          <span className="badge badge-success" style={{ fontSize: '10px' }}>Clear</span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {r.sos_triggered && (
                            <button onClick={() => handleResolveSos(r.id)} className="btn btn-sm btn-success" style={{ padding: '4px 10px', fontSize: '11px' }}>✓ Resolve SOS</button>
                          )}
                          <button onClick={() => handleCancelRide(r.id)} className="btn btn-sm btn-danger" style={{ padding: '4px 10px', fontSize: '11px', background: '#ef4444' }}>Cancel Ride</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [idProofFile, setIdProofFile] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [selfieDataUrl, setSelfieDataUrl] = useState('');
  const [identityUploadMessage, setIdentityUploadMessage] = useState('');
  const [identityUploadError, setIdentityUploadError] = useState('');
  const [stream, setStream] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileCollegeName, setProfileCollegeName] = useState('');
  const [profileCollegeId, setProfileCollegeId] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const profileFormRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigateTransition = useTransitionNavigate();

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone_number || '');
      setProfileCollegeName(user.college_name || '');
      setProfileCollegeId(user.college_id || '');
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by this browser.');
      }
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError(err.message || 'Unable to access the camera.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setCameraActive(false);
  };

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 360;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setSelfieDataUrl(dataUrl);
    stopCamera();
  };

  const dataURLtoBlob = (dataurl) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleIdentityUpload = async (e) => {
    e.preventDefault();
    setIdentityUploadError('');
    setIdentityUploadMessage('');

    if (!idProofFile) {
      setIdentityUploadError('Please upload your student ID or college proof image.');
      return;
    }
    if (!selfieDataUrl) {
      setIdentityUploadError('Please capture a live selfie using the camera.');
      return;
    }

    const formData = new FormData();
    formData.append('id_proof', idProofFile);
    formData.append('selfie', dataURLtoBlob(selfieDataUrl), `selfie_${user.email.split('@')[0]}.jpg`);
    formData.append('id_proof_name', idProofFile.name);

    try {
      const res = await axios.post('/api/users/verify-identity', formData);
      setIdentityUploadMessage(res.data.message || 'Verification documents uploaded.');
      setIdProofFile(null);
      setSelfieDataUrl('');
      stopCamera();
      if (refreshUser) await refreshUser();
    } catch (err) {
      setIdentityUploadError(err.response?.data?.message || 'Upload failed. Please try again.');
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileMessage('');
    setSavingProfile(true);

    try {
      const res = await axios.put('/api/users/profile', {
        name: profileName,
        phone_number: profilePhone,
        college_name: profileCollegeName,
        college_id: profileCollegeId
      });
      setProfileMessage(res.data.message || 'Profile updated successfully.');
      if (refreshUser) await refreshUser();
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Unable to update profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const scrollToProfileForm = () => {
    profileFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (!user) {
    return (
      <div className="login-required-container glass-panel">
        <span className="unauth-emoji">🔐</span>
        <h2>Profile Locked</h2>
        <p>Please sign in to manage your profile and complete identity verification.</p>
        <button onClick={() => navigateTransition('/login')} className="btn btn-primary btn-unauth-redirect">
          Sign In
        </button>
      </div>
    );
  }

  const profileScore = Math.min(
    100,
    (user.is_verified ? 40 : 15) +
    (user.phone_number ? 15 : 0) +
    (user.college_name ? 15 : 0) +
    (user.college_id ? 15 : 0) +
    (user.id_proof_url ? 10 : 0) +
    (user.face_match_status === 'matched' ? 15 : 0) +
    (user.emergency_name && user.emergency_phone ? 10 : 0)
  );

  const initials = user.name ? user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() : 'SF';

  return (
    <div className="profile-page-container" style={{ display: 'grid', gap: '24px' }}>
      <div className="profile-header-card glass-panel" style={{ overflow: 'hidden', borderRadius: '24px' }}>
        <div style={{ height: '140px', background: 'linear-gradient(135deg, #2563eb 0%, #8b5cf6 100%)', position: 'relative' }} />
        <div style={{ padding: '28px 26px', display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: '22px', alignItems: 'center' }}>
          <div style={{ width: '120px', height: '120px', borderRadius: '28px', background: 'rgba(255,255,255,0.08)', display: 'grid', placeItems: 'center', fontSize: '2.25rem', fontWeight: 700, color: '#fff' }}>
            {initials}
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <h1 className="dashboard-title" style={{ margin: 0, fontSize: '2rem' }}>{user.name}</h1>
              <span className="badge badge-success" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                Verified Student
              </span>
            </div>
            <div style={{ display: 'grid', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>@{user.email.split('@')[0]}</span>
              <span style={{ color: 'var(--text-muted)' }}>{user.college_name || 'MLR Institute Of Technology'}</span>
            </div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '12px' }}>
              <div style={{ minWidth: '120px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>College ID</div>
                <strong>{user.college_id || 'Not added yet'}</strong>
              </div>
              <div style={{ minWidth: '120px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Phone</div>
                <strong>{user.phone_number || 'N/A'}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={scrollToProfileForm} className="btn btn-primary" style={{ minWidth: '160px' }}>
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      <div ref={profileFormRef} className="profile-edit-panel glass-panel" style={{ padding: '26px', borderRadius: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '18px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: '0 0 10px 0' }}>Edit profile</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>Update your name, phone number, college name, and college ID.</p>
          </div>
          <span className={`badge ${profileScore === 100 ? 'badge-success' : 'badge-warning'}`} style={{ padding: '10px 14px', fontSize: '0.82rem' }}>
            {profileScore}% complete
          </span>
        </div>

        {profileMessage && <div className="alert alert-success">{profileMessage}</div>}
        {profileError && <div className="alert alert-danger">{profileError}</div>}

        <form onSubmit={handleProfileSave} style={{ display: 'grid', gap: '18px' }}>
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input
              type="text"
              className="form-input"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone number</label>
            <input
              type="text"
              className="form-input"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              placeholder="+91 12345 67890"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            <div className="form-group">
              <label className="form-label">College name</label>
              <input
                type="text"
                className="form-input"
                value={profileCollegeName}
                onChange={(e) => setProfileCollegeName(e.target.value)}
                placeholder="MLR Institute Of Technology"
              />
            </div>
            <div className="form-group">
              <label className="form-label">College ID</label>
              <input
                type="text"
                className="form-input"
                value={profileCollegeId}
                onChange={(e) => setProfileCollegeId(e.target.value)}
                placeholder="23R21A0584"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="profile-grid" style={{ display: 'grid', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '22px', borderRadius: '18px' }}>
          <h3 style={{ marginTop: 0 }}>🛡️ Identity Verification</h3>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 18px 0' }}>
            Upload your student ID card and capture a live selfie to verify your identity in real time.
          </p>

          {(user.id_proof_status === 'verified' || user.id_proof_status === 'pending') && (
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {user.id_proof_url && (
                  <div style={{ flex: '1 1 220px' }}>
                    <div style={{ marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>ID Proof</div>
                    <img src={`http://localhost:5001${user.id_proof_url}`} alt="ID proof" style={{ width: '100%', borderRadius: '12px' }} />
                  </div>
                )}
                {user.selfie_url && (
                  <div style={{ flex: '1 1 220px' }}>
                    <div style={{ marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Captured Selfie</div>
                    <img src={`http://localhost:5001${user.selfie_url}`} alt="Selfie" style={{ width: '100%', borderRadius: '12px' }} />
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gap: '14px' }}>
            <label style={{ display: 'grid', gap: '6px', fontSize: '0.95rem' }}>
              Student ID / College Proof
              <input
                type="file"
                accept="image/png, image/jpeg"
                className="form-input"
                onChange={(e) => setIdProofFile(e.target.files?.[0] || null)}
              />
            </label>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600 }}>Live selfie capture</span>
                <button type="button" onClick={cameraActive ? stopCamera : startCamera} className="btn btn-secondary" style={{ minWidth: '140px' }}>
                  {cameraActive ? 'Stop Camera' : 'Start Camera'}
                </button>
              </div>

              {cameraError && <div className="alert alert-danger">{cameraError}</div>}

              {cameraActive && (
                <div style={{ display: 'grid', gap: '10px' }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: '14px', background: '#111' }} />
                  <button type="button" onClick={captureSelfie} className="btn btn-primary">Capture Selfie</button>
                </div>
              )}

              {selfieDataUrl && (
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Selfie preview</div>
                  <img src={selfieDataUrl} alt="Selfie preview" style={{ width: '100%', borderRadius: '14px' }} />
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={handleIdentityUpload} className="btn btn-primary">Upload Verification</button>
                    <button type="button" onClick={() => { setSelfieDataUrl(''); startCamera(); }} className="btn btn-secondary">Retake Selfie</button>
                  </div>
                </div>
              )}

              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {identityUploadMessage && <div className="alert alert-success">{identityUploadMessage}</div>}
            {identityUploadError && <div className="alert alert-danger">{identityUploadError}</div>}
          </div>

          {user.face_match_status && (
            <div style={{ marginTop: '18px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span className={`badge ${user.face_match_status === 'matched' ? 'badge-success' : user.face_match_status === 'pending' ? 'badge-warning' : 'badge-secondary'}`}>
                Matching: {user.face_match_status}
              </span>
              <span className="badge badge-secondary">Match score: {user.face_match_score.toFixed(1)}%</span>
            </div>
          )}

          <div style={{ marginTop: '24px', background: 'rgba(255,255,255,0.04)', padding: '16px', borderRadius: '14px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Why this matters</h4>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              On-spot selfie capture plus student ID upload help verify that the identity on the ID card matches the person creating rides or joining a carpool.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Main App Component with Router
// ----------------------------------------------------
function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/post-ride" element={<PostRidePage />} />
          <Route path="/ride/:id" element={<RideDetailPage />} />
          <Route path="/my-rides" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/track-ride/:bookingId" element={<TrackRidePage />} />
          <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
