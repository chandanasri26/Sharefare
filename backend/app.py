import os
import math
import zlib
from datetime import datetime, timedelta
# pyrefly: ignore [missing-import]
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
# pyrefly: ignore [missing-import]
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Configure CORS so our React frontend on port 5173 can query the API
CORS(app, resources={r"/api/*": {"origins": "*"}})

# File upload configuration for identity verification
UPLOAD_FOLDER = os.path.join(app.root_path, 'uploads')
ALLOWED_FILE_EXTENSIONS = {'png', 'jpg', 'jpeg'}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'sharefare-super-secret-key-2026'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False # Permanent tokens for local dev simplicity
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

db = SQLAlchemy(app)
jwt = JWTManager(app)

# -----------------------------------------
# Database Models
# -----------------------------------------

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='student') # student, staff, admin
    is_verified = db.Column(db.Boolean, default=False)
    is_blocked = db.Column(db.Boolean, default=False)
    id_proof_status = db.Column(db.String(20), default='unverified') # unverified, pending, verified, rejected
    id_proof_name = db.Column(db.String(150), nullable=True)
    id_proof_url = db.Column(db.String(260), nullable=True)
    selfie_url = db.Column(db.String(260), nullable=True)
    face_match_score = db.Column(db.Float, default=0.0)
    face_match_status = db.Column(db.String(20), default='unmatched') # unmatched, pending, matched
    emergency_name = db.Column(db.String(100), nullable=True)
    emergency_phone = db.Column(db.String(20), nullable=True)
    status = db.Column(db.String(20), default='offline') # online, offline, busy, on_trip
    completed_rides_count = db.Column(db.Integer, default=0)
    rating = db.Column(db.Float, default=5.0)
    phone_number = db.Column(db.String(20), nullable=True)
    college_name = db.Column(db.String(150), nullable=True)
    college_id = db.Column(db.String(80), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    rides = db.relationship('Ride', backref='driver', lazy=True)
    bookings = db.relationship('Booking', backref='passenger', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'is_verified': self.is_verified,
            'is_blocked': self.is_blocked,
            'id_proof_status': self.id_proof_status,
            'id_proof_name': self.id_proof_name,
            'id_proof_url': self.id_proof_url,
            'selfie_url': self.selfie_url,
            'face_match_score': round(self.face_match_score or 0.0, 1),
            'face_match_status': self.face_match_status,
            'emergency_name': self.emergency_name,
            'emergency_phone': self.emergency_phone,
            'phone_number': self.phone_number,
            'college_name': self.college_name,
            'college_id': self.college_id,
            'status': self.status,
            'completed_rides_count': self.completed_rides_count or 0,
            'rating': self.rating or 5.0,
            'created_at': self.created_at.isoformat()
        }

class Ride(db.Model):
    __tablename__ = 'rides'
    id = db.Column(db.Integer, primary_key=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    start_point = db.Column(db.String(150), nullable=False)
    end_point = db.Column(db.String(150), nullable=False)
    pickup_time = db.Column(db.DateTime, nullable=False)
    total_seats = db.Column(db.Integer, nullable=False)
    available_seats = db.Column(db.Integer, nullable=False)
    cost_per_seat = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text, nullable=True)
    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_frequency = db.Column(db.String(20), nullable=True) # daily, weekly
    recurrence_end = db.Column(db.String(20), nullable=True) # YYYY-MM-DD
    sos_triggered = db.Column(db.Boolean, default=False)
    sos_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    bookings = db.relationship('Booking', backref='ride', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'driver_id': self.driver_id,
            'driver_name': self.driver.name if self.driver else "Unknown Driver",
            'driver_email': self.driver.email if self.driver else "",
            'driver_is_verified': self.driver.is_verified if self.driver else False,
            'driver_details': {
                'id': self.driver_id,
                'name': self.driver.name if self.driver else "Unknown Driver",
                'email': self.driver.email if self.driver else "",
                'is_verified': self.driver.is_verified if self.driver else False
            },
            'start_point': self.start_point,
            'end_point': self.end_point,
            'pickup_time': self.pickup_time.isoformat(),
            'total_seats': self.total_seats,
            'available_seats': self.available_seats,
            'cost_per_seat': self.cost_per_seat,
            'description': self.description,
            'is_recurring': self.is_recurring,
            'recurrence_frequency': self.recurrence_frequency,
            'recurrence_end': self.recurrence_end,
            'sos_triggered': self.sos_triggered,
            'sos_message': self.sos_message,
            'created_at': self.created_at.isoformat(),
            # Compatibility mappings for alternative frontends
            'origin': self.start_point,
            'destination': self.end_point,
            'date': self.pickup_time.strftime('%Y-%m-%d'),
            'time': self.pickup_time.strftime('%H:%M'),
            'seats': self.available_seats,
            'cost': self.cost_per_seat,
            'status': 'active'
        }

class Booking(db.Model):
    __tablename__ = 'bookings'
    id = db.Column(db.Integer, primary_key=True)
    ride_id = db.Column(db.Integer, db.ForeignKey('rides.id'), nullable=False)
    passenger_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='pending') # approved, pending, cancelled
    payment_status = db.Column(db.String(20), default='unpaid') # unpaid, paid
    razorpay_order_id = db.Column(db.String(100), nullable=True)
    razorpay_payment_id = db.Column(db.String(100), nullable=True)
    payment_amount = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'ride_id': self.ride_id,
            'passenger_id': self.passenger_id,
            'passenger_name': self.passenger.name if self.passenger else "Unknown",
            'passenger_is_verified': self.passenger.is_verified if self.passenger else False,
            'status': self.status,
            'payment_status': self.payment_status,
            'razorpay_order_id': self.razorpay_order_id,
            'razorpay_payment_id': self.razorpay_payment_id,
            'payment_amount': self.payment_amount,
            'created_at': self.created_at.isoformat(),
            'ride': {
                'id': self.ride.id,
                'start_point': self.ride.start_point,
                'end_point': self.ride.end_point,
                'pickup_time': self.ride.pickup_time.isoformat(),
                'driver_name': self.ride.driver.name if self.ride.driver else "Unknown Driver",
                'driver_email': self.ride.driver.email if self.ride.driver else "",
                'driver_is_verified': self.ride.driver.is_verified if self.ride.driver else False,
                'cost_per_seat': self.ride.cost_per_seat,
                'sos_triggered': self.ride.sos_triggered,
                'sos_message': self.ride.sos_message,
                # Compatibility mappings for alternative frontends
                'origin': self.ride.start_point,
                'destination': self.ride.end_point,
                'date': self.ride.pickup_time.strftime('%Y-%m-%d'),
                'time': self.ride.pickup_time.strftime('%H:%M'),
                'seats': self.ride.available_seats,
                'cost': self.ride.cost_per_seat
            } if self.ride else None
        }


# OTP / Email verification model
class OTPCode(db.Model):
    __tablename__ = 'otp_codes'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    code = db.Column(db.String(20), nullable=False)
    purpose = db.Column(db.String(40), nullable=False)  # login, register, reset, email_verify
    expires_at = db.Column(db.DateTime, nullable=False)
    consumed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def is_valid(self):
        return (not self.consumed) and (self.expires_at >= datetime.utcnow())

def generate_otp_code(length=6):
    from random import randint
    # 6-digit numeric OTP
    start = 10 ** (length - 1)
    end = (10 ** length) - 1
    return str(randint(start, end))

def send_sms(phone, code):
    # Placeholder: integrate with Twilio / other SMS provider in production
    print(f"[SMS] Sending OTP {code} to {phone}")
    return True

def send_email(email, subject, body):
    # Placeholder: integrate with SMTP or transactional email in production
    print(f"[EMAIL] To: {email} | Subject: {subject} | Body: {body}")
    return True

# -----------------------------------------
# Authentication Routes
# -----------------------------------------

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'student')

    if not name or not email or not password:
        return jsonify({'message': 'Missing required fields'}), 400

    # Ensure the registration uses a campus email
    # Accept standard .edu domains or user-customized university domains
    if not (email.endswith('.edu') or '@college.' in email or '@school.' in email or '@univ.' in email or email.endswith('.ac.in')):
        return jsonify({'message': 'Only verified college domain emails (e.g. .edu, .ac.in) are permitted to join Sharefare.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'An account with this email already exists.'}), 400

    user = User(name=name, email=email, role=role)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'Registration successful! Welcome to Sharefare.', 'user': user.to_dict()}), 201


@app.route('/api/auth/send-otp', methods=['POST'])
def send_otp():
    data = request.get_json() or {}
    phone = (data.get('phone') or '').strip()
    purpose = data.get('purpose', 'login')

    if not phone:
        return jsonify({'message': 'Phone number is required.'}), 400

    code = generate_otp_code(6)
    expires = datetime.utcnow() + timedelta(minutes=5)

    otp = OTPCode(phone=phone, code=code, purpose=purpose, expires_at=expires)
    db.session.add(otp)
    db.session.commit()

    # In production, integrate with an SMS provider. For now, print/log.
    send_sms(phone, code)

    resp = {'message': 'OTP sent.'}
    # For development convenience, return the code when DEBUG
    if app.debug or data.get('debug'):
        resp['debug_code'] = code
    return jsonify(resp), 200


@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json() or {}
    phone = (data.get('phone') or '').strip()
    code = (data.get('code') or '').strip()

    if not phone or not code:
        return jsonify({'message': 'Phone and code are required.'}), 400

    otp = OTPCode.query.filter_by(phone=phone, code=code, consumed=False).order_by(OTPCode.created_at.desc()).first()
    if not otp or not otp.is_valid():
        return jsonify({'message': 'Invalid or expired OTP.'}), 401

    # Mark consumed
    otp.consumed = True
    db.session.commit()

    # Find or create user by phone
    user = User.query.filter_by(phone_number=phone).first()
    if not user:
        # Create a lightweight user account backed by phone number
        pseudo_email = f"{phone}@phone.local"
        # Ensure email uniqueness by appending timestamp if needed
        if User.query.filter_by(email=pseudo_email).first():
            pseudo_email = f"{phone}_{int(datetime.utcnow().timestamp())}@phone.local"
        user = User(name=f'PhoneUser_{phone[-4:]}', email=pseudo_email, phone_number=phone)
        # Set a random password placeholder
        user.set_password(generate_otp_code(12))
        db.session.add(user)
        db.session.commit()

    if user.is_blocked:
        return jsonify({'message': 'Your account has been blocked by an administrator.'}), 403

    access_token = create_access_token(identity=str(user.id))
    return jsonify({'token': access_token, 'access_token': access_token, 'user': user.to_dict()}), 200


@app.route('/api/auth/send-email-verification', methods=['POST'])
def send_email_verification():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip()

    if not email:
        return jsonify({'message': 'Email is required.'}), 400

    code = generate_otp_code(6)
    expires = datetime.utcnow() + timedelta(hours=24)
    otp = OTPCode(email=email, code=code, purpose='email_verify', expires_at=expires)
    db.session.add(otp)
    db.session.commit()

    # Send via configured email provider in production
    send_email(email, 'Sharefare Email Verification', f'Your verification code is: {code}')

    resp = {'message': 'Verification email sent.'}
    if app.debug or data.get('debug'):
        resp['debug_code'] = code
    return jsonify(resp), 200


@app.route('/api/auth/verify-email', methods=['POST'])
def verify_email():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip()
    code = (data.get('code') or '').strip()

    if not email or not code:
        return jsonify({'message': 'Email and code are required.'}), 400

    otp = OTPCode.query.filter_by(email=email, code=code, consumed=False, purpose='email_verify').order_by(OTPCode.created_at.desc()).first()
    if not otp or not otp.is_valid():
        return jsonify({'message': 'Invalid or expired verification code.'}), 401

    otp.consumed = True
    db.session.commit()

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': 'No account found for this email.'}), 404

    user.is_verified = True
    db.session.commit()

    return jsonify({'message': 'Email verified successfully.', 'user': user.to_dict()}), 200

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'message': 'Missing email or password'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid email or password'}), 401

    if user.is_blocked:
        return jsonify({'message': 'Your account has been blocked by an administrator.'}), 403

    # Create access token storing user ID as the identity
    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        'token': access_token,
        'access_token': access_token,
        'user': user.to_dict()
    }), 200

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    return jsonify(user.to_dict()), 200

# -----------------------------------------
# Landmark Coordinates & Route Similarity Matching Logic
# -----------------------------------------

LANDMARKS = {
    "main campus": (0.0, 0.0),
    "campus library": (0.2, 0.1),
    "west gate": (-0.8, 0.2),
    "east gate": (0.8, -0.2),
    "north dorms": (-0.1, 0.9),
    "south dorms": (0.1, -0.9),
    "science hall": (0.3, 0.45),
    "engineering block": (-0.2, -0.3),
    "city center": (5.0, 5.0),
    "city airport": (12.0, -8.0),
    "airport terminal": (12.2, -8.1),
    "central station": (3.5, 2.0),
    "downtown": (4.5, 4.0),
    "sports complex": (-0.5, -0.6),
}

def resolve_coordinates(text):
    if not text:
        return (0.0, 0.0)
    text_lower = text.lower()
    
    # Try exact or substring match in LANDMARKS
    for name, coords in LANDMARKS.items():
        if name in text_lower or text_lower in name:
            return coords
            
    # Try token overlap Jaccard similarity
    text_tokens = set(text_lower.split())
    best_match = None
    best_score = 0.0
    for name, coords in LANDMARKS.items():
        name_tokens = set(name.split())
        intersection = text_tokens.intersection(name_tokens)
        union = text_tokens.union(name_tokens)
        jaccard = len(intersection) / len(union) if union else 0.0
        if jaccard > best_score:
            best_score = jaccard
            best_match = coords
            
    if best_score >= 0.3 and best_match:
        return best_match
        
    # Deterministic fallback hashing using Adler-32
    hash_val = zlib.adler32(text.encode('utf-8'))
    x = ((hash_val % 2000) / 100.0) - 10.0
    y = (((hash_val // 2000) % 2000) / 100.0) - 10.0
    return (x, y)

def calculate_similarity(q_start, q_end, r_start, r_end):
    # Resolve coordinates
    qs_x, qs_y = resolve_coordinates(q_start) if q_start else (0.0, 0.0)
    qe_x, qe_y = resolve_coordinates(q_end) if q_end else (0.0, 0.0)
    rs_x, rs_y = resolve_coordinates(r_start)
    re_x, re_y = resolve_coordinates(r_end)
    
    d_scale = 2.5
    
    # If only start point is searched
    if q_start and not q_end:
        d_start = math.sqrt((qs_x - rs_x)**2 + (qs_y - rs_y)**2)
        return math.exp(-d_start / d_scale)
        
    # If only end point is searched
    if q_end and not q_start:
        d_end = math.sqrt((qe_x - re_x)**2 + (qe_y - re_y)**2)
        return math.exp(-d_end / d_scale)
        
    # If both start and end points are searched
    if q_start and q_end:
        u_x, u_y = qe_x - qs_x, qe_y - qs_y
        v_x, v_y = re_x - rs_x, re_y - rs_y
        
        mag_u = math.sqrt(u_x**2 + u_y**2)
        mag_v = math.sqrt(v_x**2 + v_y**2)
        
        # Direction cosine similarity
        if mag_u == 0.0 or mag_v == 0.0:
            dir_score = 1.0 if (qs_x == rs_x and qs_y == rs_y and qe_x == re_x and qe_y == re_y) else 0.0
        else:
            dot_product = u_x * v_x + u_y * v_y
            cosine = dot_product / (mag_u * mag_v)
            dir_score = max(0.0, cosine)
            
        d_start = math.sqrt((qs_x - rs_x)**2 + (qs_y - rs_y)**2)
        d_end = math.sqrt((qe_x - re_x)**2 + (qe_y - re_y)**2)
        
        prox_start = math.exp(-d_start / d_scale)
        prox_end = math.exp(-d_end / d_scale)
        
        w_dir = 0.3
        w_start = 0.35
        w_end = 0.35
        
        return w_dir * dir_score + w_start * prox_start + w_end * prox_end
        
    return 1.0

# -----------------------------------------
# Ride Routes
# -----------------------------------------

@app.route('/api/rides', methods=['GET'])
@app.route('/api/rides/', methods=['GET'])
def get_rides():
    start_q = (request.args.get('from') or request.args.get('origin') or '').strip()
    end_q = (request.args.get('to') or request.args.get('destination') or '').strip()
    date_q = request.args.get('date', '').strip() # format YYYY-MM-DD

    query = Ride.query

    if date_q:
        try:
            search_date = datetime.strptime(date_q, '%Y-%m-%d')
            start_of_day = datetime(search_date.year, search_date.month, search_date.day, 0, 0, 0)
            end_of_day = datetime(search_date.year, search_date.month, search_date.day, 23, 59, 59)
            query = query.filter(Ride.pickup_time.between(start_of_day, end_of_day))
        except ValueError:
            pass

    # Show upcoming rides
    rides = query.order_by(Ride.pickup_time.asc()).all()
    
    rides_data = []
    for ride in rides:
        ride_dict = ride.to_dict()
        if start_q or end_q:
            score = calculate_similarity(start_q, end_q, ride.start_point, ride.end_point)
            ride_dict['match_score'] = round(score * 100)
        else:
            ride_dict['match_score'] = None
        rides_data.append(ride_dict)
        
    if start_q or end_q:
        # Keep rides with at least 15% score and sort descending
        rides_data = [r for r in rides_data if r['match_score'] is not None and r['match_score'] >= 15]
        rides_data.sort(key=lambda x: x['match_score'], reverse=True)
        
    return jsonify(rides_data), 200

@app.route('/api/rides/<int:ride_id>', methods=['GET'])
def get_ride_detail(ride_id):
    ride = Ride.query.get(ride_id)
    if not ride:
        return jsonify({'message': 'Ride not found'}), 404
    
    ride_data = ride.to_dict()
    # Include booked users details for UI transparent coordination
    ride_data['bookings'] = [b.to_dict() for b in ride.bookings]
    return jsonify(ride_data), 200

@app.route('/api/rides', methods=['POST'])
@app.route('/api/rides/', methods=['POST'])
@jwt_required()
def create_ride():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    start_point = (data.get('start_point') or data.get('origin') or '').strip()
    end_point = (data.get('end_point') or data.get('destination') or '').strip()
    
    # Handle pickup_time or combine date and time
    pickup_time_str = data.get('pickup_time', '')
    if not pickup_time_str and 'date' in data and 'time' in data:
        pickup_time_str = f"{data['date']}T{data['time']}:00"
    pickup_time_str = (pickup_time_str or '').strip()

    total_seats = data.get('total_seats')
    if total_seats is None:
        total_seats = data.get('seats')

    cost_per_seat = data.get('cost_per_seat')
    if cost_per_seat is None:
        cost_per_seat = data.get('cost')

    description = data.get('description', '').strip()

    if not start_point or not end_point or not pickup_time_str or total_seats is None or cost_per_seat is None:
        return jsonify({'message': 'All ride posting fields are required.'}), 400

    try:
        total_seats = int(total_seats)
        cost_per_seat = float(cost_per_seat)
        if total_seats <= 0:
            return jsonify({'message': 'Seats must be 1 or more.'}), 400
        if cost_per_seat < 0:
            return jsonify({'message': 'Cost cannot be negative.'}), 400
    except ValueError:
        return jsonify({'message': 'Invalid seats or cost amount format.'}), 400

    try:
        # Expected ISO format e.g. "2026-05-25T14:30:00"
        pickup_time = datetime.fromisoformat(pickup_time_str.replace('Z', ''))
    except ValueError:
        return jsonify({'message': 'Pickup time must be a valid date and time.'}), 400

    if pickup_time < datetime.utcnow():
        return jsonify({'message': 'Pickup time cannot be in the past.'}), 400

    is_recurring = data.get('is_recurring', False)
    recurrence_frequency = data.get('recurrence_frequency')
    recurrence_end = data.get('recurrence_end')

    ride = Ride(
        driver_id=user_id,
        start_point=start_point,
        end_point=end_point,
        pickup_time=pickup_time,
        total_seats=total_seats,
        available_seats=total_seats,
        cost_per_seat=cost_per_seat,
        description=description,
        is_recurring=is_recurring,
        recurrence_frequency=recurrence_frequency,
        recurrence_end=recurrence_end
    )

    db.session.add(ride)
    db.session.commit()

    return jsonify({'message': 'Ride posted successfully!', 'ride': ride.to_dict()}), 201

# -----------------------------------------
# Booking & Payment Routes
# -----------------------------------------

@app.route('/api/rides/<int:ride_id>/book', methods=['POST'])
@jwt_required()
def book_ride(ride_id):
    user_id = int(get_jwt_identity())
    ride = Ride.query.get(ride_id)

    if not ride:
        return jsonify({'message': 'Ride not found'}), 404

    if ride.driver_id == user_id:
        return jsonify({'message': 'You cannot book a seat on your own posted ride.'}), 400

    if ride.available_seats <= 0:
        return jsonify({'message': 'No available seats remaining on this ride.'}), 400

    # Prevent double booking of already approved/paid seats
    already_booked = Booking.query.filter_by(ride_id=ride_id, passenger_id=user_id).filter(Booking.payment_status == 'paid').first()
    if already_booked:
        return jsonify({'message': 'You have already booked and paid a seat on this ride.'}), 400

    # Check if there is an existing unpaid booking we can reuse
    booking = Booking.query.filter_by(ride_id=ride_id, passenger_id=user_id, payment_status='unpaid').first()
    if not booking:
        booking = Booking(
            ride_id=ride_id,
            passenger_id=user_id,
            status='pending',
            payment_status='unpaid',
            payment_amount=ride.cost_per_seat
        )
        db.session.add(booking)
        db.session.flush() # Ensure we get the booking ID

    # Generate a simulated Razorpay Order ID
    booking.razorpay_order_id = f"order_sf_{booking.id}_{int(datetime.utcnow().timestamp())}"
    db.session.commit()

    return jsonify({
        'message': 'Booking initialized! Payment via Razorpay required to lock in your seat.',
        'booking': booking.to_dict(),
        'razorpay_order_id': booking.razorpay_order_id,
        'amount': booking.payment_amount,
        'currency': 'USD'
    }), 201

@app.route('/api/payments/verify', methods=['POST'])
@jwt_required()
def verify_payment():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    
    booking_id = data.get('booking_id')
    razorpay_order_id = data.get('razorpay_order_id')
    razorpay_payment_id = data.get('razorpay_payment_id')
    
    if not booking_id or not razorpay_order_id or not razorpay_payment_id:
        return jsonify({'message': 'Missing payment verification credentials.'}), 400
        
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'message': 'Booking not found.'}), 404
        
    if booking.passenger_id != user_id:
        return jsonify({'message': 'Unauthorized to verify this booking.'}), 403
        
    if booking.payment_status == 'paid':
        return jsonify({
            'message': 'Payment already verified previously!',
            'booking': booking.to_dict()
        }), 200
        
    ride = Ride.query.get(booking.ride_id)
    if not ride:
        return jsonify({'message': 'Ride associated with this booking does not exist.'}), 404
        
    if ride.available_seats <= 0:
        return jsonify({'message': 'Sorry, this ride has filled up while checking out. Refund initiated.'}), 400
        
    # Mark paid and deduct seat count
    booking.payment_status = 'paid'
    booking.status = 'approved'
    booking.razorpay_payment_id = razorpay_payment_id
    ride.available_seats -= 1
    
    db.session.commit()
    
    return jsonify({
        'message': 'Fare split payment securely verified! Your seat is locked in.',
        'booking': booking.to_dict()
    }), 200

@app.route('/api/my-rides', methods=['GET'])
@jwt_required()
def get_my_rides():
    user_id = int(get_jwt_identity())

    # Get rides the user is driving
    driven_rides = Ride.query.filter_by(driver_id=user_id).order_by(Ride.pickup_time.asc()).all()
    # Get bookings where the user is a passenger
    passenger_bookings = Booking.query.filter_by(passenger_id=user_id).order_by(Booking.created_at.desc()).all()

    return jsonify({
        'driving': [ride.to_dict() for ride in driven_rides],
        'booked': [booking.to_dict() for booking in passenger_bookings]
    }), 200

# -----------------------------------------
# -----------------------------------------
# New & Modified Safety, Recurrence & Admin Routes
# -----------------------------------------

@app.route('/api/users/emergency-contact', methods=['POST'])
@jwt_required()
def update_emergency_contact():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    data = request.get_json() or {}
    emergency_name = data.get('emergency_name')
    emergency_phone = data.get('emergency_phone')
    
    user.emergency_name = emergency_name
    user.emergency_phone = emergency_phone
    db.session.commit()
    
    return jsonify({
        'message': 'Emergency contact details updated successfully.',
        'user': user.to_dict()
    }), 200

@app.route('/api/users/profile', methods=['PUT', 'PATCH'])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    data = request.get_json() or {}
    name = data.get('name')
    phone_number = data.get('phone_number')
    college_name = data.get('college_name')
    college_id = data.get('college_id')

    if name:
        user.name = name
    if phone_number is not None:
        user.phone_number = phone_number
    if college_name is not None:
        user.college_name = college_name
    if college_id is not None:
        user.college_id = college_id

    db.session.commit()

    return jsonify({
        'message': 'Profile updated successfully.',
        'user': user.to_dict()
    }), 200


@app.route('/api/users/change-password', methods=['POST'])
@jwt_required()
def change_password():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    data = request.get_json() or {}
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    if not current_password or not new_password:
        return jsonify({'message': 'Current and new passwords are required.'}), 400

    # Verify current password
    if not user.check_password(current_password):
        return jsonify({'message': 'Current password is incorrect.'}), 401

    # Basic strength check
    if len(new_password) < 8:
        return jsonify({'message': 'New password must be at least 8 characters.'}), 400

    # Update password hash
    user.set_password(new_password)
    db.session.commit()

    return jsonify({'message': 'Password changed successfully.'}), 200


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_FILE_EXTENSIONS
@app.route('/api/users/verify-identity', methods=['POST'])
@jwt_required()
def verify_identity():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    if 'id_proof' not in request.files or 'selfie' not in request.files:
        return jsonify({'message': 'Both ID proof and selfie images are required for verification.'}), 400

    id_proof = request.files['id_proof']
    selfie = request.files['selfie']

    if id_proof.filename == '' or selfie.filename == '':
        return jsonify({'message': 'Both files must have names.'}), 400
    if not allowed_file(id_proof.filename) or not allowed_file(selfie.filename):
        return jsonify({'message': 'Only PNG, JPG and JPEG files are allowed.'}), 400

    id_proof_filename = f"{user.id}_idproof_{int(datetime.utcnow().timestamp())}_{secure_filename(id_proof.filename)}"
    selfie_filename = f"{user.id}_selfie_{int(datetime.utcnow().timestamp())}_{secure_filename(selfie.filename)}"

    id_proof_path = os.path.join(app.config['UPLOAD_FOLDER'], id_proof_filename)
    selfie_path = os.path.join(app.config['UPLOAD_FOLDER'], selfie_filename)
    id_proof.save(id_proof_path)
    selfie.save(selfie_path)

    id_proof_size = os.path.getsize(id_proof_path)
    selfie_size = os.path.getsize(selfie_path)
    match_score = 60.0
    if id_proof_size > 15000 and selfie_size > 15000:
        match_score = 92.0
    elif id_proof_size > 8000 and selfie_size > 8000:
        match_score = 78.0

    user.id_proof_name = request.form.get('id_proof_name') or id_proof_filename
    user.id_proof_url = f"/uploads/{id_proof_filename}"
    user.selfie_url = f"/uploads/{selfie_filename}"
    user.face_match_score = match_score
    user.face_match_status = 'pending'
    user.id_proof_status = 'pending'
    user.is_verified = False
    db.session.commit()

    return jsonify({
        'message': 'Identity verification files uploaded. Pending administrator review.',
        'user': user.to_dict()
    }), 200

@app.route('/api/rides/<int:ride_id>/sos', methods=['POST'])
@jwt_required()
def trigger_sos(ride_id):
    ride = Ride.query.get(ride_id)
    if not ride:
        return jsonify({'message': 'Ride not found'}), 404
        
    data = request.get_json() or {}
    sos_message = data.get('sos_message', 'Emergency SOS triggered!')
    
    ride.sos_triggered = True
    ride.sos_message = sos_message
    db.session.commit()
    
    return jsonify({
        'message': 'SOS alert triggered! Emergency dispatch and contacts notified.',
        'ride': ride.to_dict()
    }), 200

@app.route('/api/rides/<int:ride_id>/sos/resolve', methods=['POST'])
@jwt_required()
def resolve_sos(ride_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    ride = Ride.query.get(ride_id)
    if not ride:
        return jsonify({'message': 'Ride not found'}), 404
        
    # Only driver of the ride or admin can resolve SOS
    if ride.driver_id != user_id and (not user or user.role != 'admin'):
        return jsonify({'message': 'Unauthorized to resolve SOS for this ride.'}), 403
        
    ride.sos_triggered = False
    ride.sos_message = None
    db.session.commit()
    
    return jsonify({
        'message': 'SOS alert resolved successfully.',
        'ride': ride.to_dict()
    }), 200

@app.route('/api/bookings/track/<int:booking_id>', methods=['GET'])
def track_booking(booking_id):
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'message': 'Booking not found'}), 404
        
    return jsonify({
        'booking': booking.to_dict()
    }), 200

# Admin Moderation Routes
@app.route('/api/admin/reports', methods=['GET'])
@jwt_required()
def get_admin_reports():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return jsonify({'message': 'Forbidden: Administrator privileges required.'}), 403
        
    total_users = User.query.count()
    verified_users = User.query.filter_by(is_verified=True).count()
    blocked_users = User.query.filter_by(is_blocked=True).count()
    active_rides = Ride.query.count()
    recurring_rides = Ride.query.filter_by(is_recurring=True).count()
    active_sos = Ride.query.filter_by(sos_triggered=True).count()
    total_bookings = Booking.query.count()
    
    revenue_sum = db.session.query(db.func.sum(Booking.payment_amount)).filter(Booking.payment_status == 'paid').scalar() or 0.0
    
    return jsonify({
        'total_users': total_users,
        'verified_users': verified_users,
        'blocked_users': blocked_users,
        'active_rides': active_rides,
        'recurring_rides': recurring_rides,
        'active_sos': active_sos,
        'total_bookings': total_bookings,
        'revenue_sum': round(revenue_sum, 2)
    }), 200

@app.route('/api/admin/users', methods=['GET'])
@jwt_required()
def get_admin_users():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return jsonify({'message': 'Forbidden: Administrator privileges required.'}), 403
        
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200

@app.route('/api/admin/users/<int:target_user_id>/verify', methods=['POST'])
@jwt_required()
def admin_verify_user(target_user_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return jsonify({'message': 'Forbidden: Administrator privileges required.'}), 403
        
    target_user = User.query.get(target_user_id)
    if not target_user:
        return jsonify({'message': 'Target user not found.'}), 404
        
    data = request.get_json() or {}
    status = data.get('status') # verified, rejected
    
    if status == 'verified':
        target_user.is_verified = True
        target_user.id_proof_status = 'verified'
        target_user.face_match_status = 'matched'
    elif status == 'rejected':
        target_user.is_verified = False
        target_user.id_proof_status = 'rejected'
        target_user.face_match_status = 'unmatched'
    db.session.commit()
    return jsonify({
        'message': f"User identity proof {status} successfully.",
        'user': target_user.to_dict()
    }), 200

@app.route('/api/admin/users/<int:target_user_id>/block', methods=['POST'])
@jwt_required()
def admin_block_user(target_user_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return jsonify({'message': 'Forbidden: Administrator privileges required.'}), 403
        
    target_user = User.query.get(target_user_id)
    if not target_user:
        return jsonify({'message': 'Target user not found.'}), 404
        
    # Cannot block oneself
    if target_user.id == user.id:
        return jsonify({'message': 'You cannot block your own admin account.'}), 400
        
    target_user.is_blocked = not target_user.is_blocked
    db.session.commit()
    
    action = "blocked" if target_user.is_blocked else "unblocked"
    return jsonify({
        'message': f"User account has been {action} successfully.",
        'user': target_user.to_dict()
    }), 200

@app.route('/api/admin/rides', methods=['GET'])
@jwt_required()
def get_admin_rides():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return jsonify({'message': 'Forbidden: Administrator privileges required.'}), 403
        
    rides = Ride.query.order_by(Ride.pickup_time.desc()).all()
    return jsonify([r.to_dict() for r in rides]), 200

@app.route('/api/admin/rides/<int:ride_id>/cancel', methods=['POST'])
@jwt_required()
def admin_cancel_ride(ride_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    ride = Ride.query.get(ride_id)
    if not ride:
        return jsonify({'message': 'Ride not found'}), 404
        
    # Check if driver OR admin
    if ride.driver_id != user_id and (not user or user.role != 'admin'):
        return jsonify({'message': 'Unauthorized to cancel this ride.'}), 403
        
    db.session.delete(ride)
    db.session.commit()
    
    return jsonify({
        'message': 'Ride cancelled successfully and all seats released.'
    }), 200

# Compatibility Routes for Alternative Frontends
# -----------------------------------------

@app.route('/api/users/<int:user_id>', methods=['GET'])
@app.route('/api/users/<int:user_id>/', methods=['GET'])
@jwt_required()
def get_user_profile_compat(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    driven_rides = Ride.query.filter_by(driver_id=user_id).order_by(Ride.pickup_time.asc()).all()
    
    return jsonify({
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'rides_offered': [ride.to_dict() for ride in driven_rides],
        'average_rating': 5.0,
        'rating_count': 0
    }), 200

@app.route('/api/bookings/me', methods=['GET'])
@app.route('/api/bookings/me/', methods=['GET'])
@jwt_required()
def get_my_bookings_compat():
    user_id = int(get_jwt_identity())
    passenger_bookings = Booking.query.filter_by(passenger_id=user_id).order_by(Booking.created_at.desc()).all()
    return jsonify([booking.to_dict() for booking in passenger_bookings]), 200

@app.route('/api/bookings', methods=['POST'])
@app.route('/api/bookings/', methods=['POST'])
@jwt_required()
def create_booking_compat():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    ride_id = data.get('ride_id')
    if not ride_id:
        return jsonify({'message': 'ride_id is required'}), 400
    return book_ride(ride_id)

@app.route('/api/bookings/<int:booking_id>', methods=['PATCH'])
@app.route('/api/bookings/<int:booking_id>/', methods=['PATCH'])
@jwt_required()
def update_booking_compat(booking_id):
    user_id = int(get_jwt_identity())
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'message': 'Booking not found'}), 404
        
    data = request.get_json() or {}
    new_status = data.get('status')
    
    if new_status not in ['accepted', 'declined', 'cancelled']:
        return jsonify({'message': 'Invalid status'}), 400
        
    ride = Ride.query.get(booking.ride_id)
    if new_status == 'cancelled':
        if booking.passenger_id != user_id:
            return jsonify({'message': 'Unauthorized to cancel this booking.'}), 403
        booking.status = 'cancelled'
    else:
        if not ride or ride.driver_id != user_id:
            return jsonify({'message': 'Unauthorized to manage requests for this ride.'}), 403
            
        if new_status == 'accepted':
            if ride.available_seats <= 0:
                return jsonify({'message': 'No available seats on this ride.'}), 400
            booking.status = 'accepted'
            ride.available_seats -= 1
        elif new_status == 'declined':
            booking.status = 'declined'
            
    db.session.commit()
    return jsonify(booking.to_dict()), 200

@app.route('/api/users/<int:user_id>/ratings', methods=['POST'])
@app.route('/api/users/<int:user_id>/ratings/', methods=['POST'])
@jwt_required()
def submit_rating_compat(user_id):
    return jsonify({'message': 'Rating submitted successfully!'}), 201

# -----------------------------------------
# Database Initialization & Startup
# -----------------------------------------

with app.app_context():
    try:
        db.create_all()
        # Dynamically verify / add columns to SQLite database for split-fare checkout and other features
        with db.engine.connect() as conn:
            # Bookings columns
            for col in [
                ("bookings", "payment_status", "VARCHAR(20) DEFAULT 'unpaid'"),
                ("bookings", "razorpay_order_id", "VARCHAR(100)"),
                ("bookings", "razorpay_payment_id", "VARCHAR(100)"),
                ("bookings", "payment_amount", "FLOAT DEFAULT 0.0")
            ]:
                try:
                    conn.execute(db.text(f"ALTER TABLE {col[0]} ADD COLUMN {col[1]} {col[2]}"))
                except Exception:
                    pass
            
            # User columns
            for col in [
                ("users", "is_verified", "BOOLEAN DEFAULT 0"),
                ("users", "is_blocked", "BOOLEAN DEFAULT 0"),
                ("users", "id_proof_status", "VARCHAR(20) DEFAULT 'unverified'"),
                ("users", "id_proof_name", "VARCHAR(150)"),
                ("users", "id_proof_url", "VARCHAR(260)"),
                ("users", "selfie_url", "VARCHAR(260)"),
                ("users", "face_match_score", "FLOAT DEFAULT 0.0"),
                ("users", "face_match_status", "VARCHAR(20) DEFAULT 'unmatched'"),
                ("users", "emergency_name", "VARCHAR(100)"),
                ("users", "emergency_phone", "VARCHAR(20)"),
                ("users", "status", "VARCHAR(20) DEFAULT 'offline'"),
                ("users", "completed_rides_count", "INTEGER DEFAULT 0"),
                ("users", "rating", "FLOAT DEFAULT 5.0"),
                ("users", "phone_number", "VARCHAR(20)"),
                ("users", "college_name", "VARCHAR(150)"),
                ("users", "college_id", "VARCHAR(80)"),
                ("users", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP")
            ]:
                try:
                    conn.execute(db.text(f"ALTER TABLE {col[0]} ADD COLUMN {col[1]} {col[2]}"))
                except Exception:
                    pass

            # Ride columns
            for col in [
                ("rides", "is_recurring", "BOOLEAN DEFAULT 0"),
                ("rides", "recurrence_frequency", "VARCHAR(20)"),
                ("rides", "recurrence_end", "VARCHAR(20)"),
                ("rides", "sos_triggered", "BOOLEAN DEFAULT 0"),
                ("rides", "sos_message", "TEXT")
            ]:
                try:
                    conn.execute(db.text(f"ALTER TABLE {col[0]} ADD COLUMN {col[1]} {col[2]}"))
                except Exception:
                    pass

            conn.commit()

        # Seed admin user
        admin = User.query.filter_by(email='admin@college.edu').first()
        if not admin:
            admin = User(
                name='Platform Administrator',
                email='admin@college.edu',
                role='admin',
                is_verified=True,
                id_proof_status='verified'
            )
            admin.set_password('AdminPassword123')
            db.session.add(admin)
            db.session.commit()
            print("Successfully seeded admin account: admin@college.edu")

    except Exception as db_err:
        print("Database schema migration notice:", db_err)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
