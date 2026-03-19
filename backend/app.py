from flask import Flask, request, jsonify, render_template, redirect, url_for
from flask_pymongo import PyMongo
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from bson import ObjectId
import jwt, os, re

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'phishing-secret-2024')
app.config['MONGO_URI']  = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/phishing_detector')

mongo = PyMongo(app)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ── JWT helpers ──────────────────────────────────────
def generate_token(user_id, email):
    return jwt.encode({
        'user_id': str(user_id), 'email': email,
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm='HS256')

def verify_token(token):
    try:
        return jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
    except:
        return None

def get_current_user():
    h = request.headers.get('Authorization', '')
    if h.startswith('Bearer '):
        p = verify_token(h[7:])
        if p:
            return mongo.db.users.find_one({'_id': ObjectId(p['user_id'])})
    return None

def require_auth(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Unauthorized. Please login.'}), 401
        return f(user, *args, **kwargs)
    return decorated

# ── Auth routes ──────────────────────────────────────
@app.route('/api/auth/register', methods=['POST'])
def register():
    d = request.get_json()
    name, email, password = d.get('name','').strip(), d.get('email','').strip().lower(), d.get('password','')
    if not name or not email or not password:
        return jsonify({'error': 'All fields required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        return jsonify({'error': 'Invalid email'}), 400
    if mongo.db.users.find_one({'email': email}):
        return jsonify({'error': 'Email already registered'}), 409
    uid = mongo.db.users.insert_one({
        'name': name, 'email': email,
        'password': generate_password_hash(password),
        'created_at': datetime.utcnow(),
        'total_scans': 0, 'threats_blocked': 0
    }).inserted_id
    token = generate_token(uid, email)
    return jsonify({'message': 'Account created', 'token': token,
                    'user': {'id': str(uid), 'name': name, 'email': email}}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    d = request.get_json()
    email, password = d.get('email','').strip().lower(), d.get('password','')
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    user = mongo.db.users.find_one({'email': email})
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error': 'Invalid email or password'}), 401
    token = generate_token(user['_id'], email)
    return jsonify({'message': 'Login successful', 'token': token,
                    'user': {'id': str(user['_id']), 'name': user['name'], 'email': email}})

@app.route('/api/auth/me', methods=['GET'])
@require_auth
def get_me(u):
    return jsonify({'id': str(u['_id']), 'name': u['name'], 'email': u['email'],
                    'created_at': u['created_at'].isoformat(),
                    'total_scans': u.get('total_scans', 0),
                    'threats_blocked': u.get('threats_blocked', 0)})

# ── Scan routes ──────────────────────────────────────
@app.route('/api/scans', methods=['POST'])
@require_auth
def save_scan(u):
    d = request.get_json()
    url, threats = d.get('url',''), d.get('threats',[])
    if not url:
        return jsonify({'error': 'URL required'}), 400
    sevs = [t.get('severity') for t in threats]
    status = 'critical' if 'critical' in sevs else 'high' if 'high' in sevs else 'medium' if 'medium' in sevs else 'low' if threats else 'safe'
    sid = mongo.db.scans.insert_one({
        'user_id': u['_id'], 'url': url, 'threats': threats,
        'threat_count': len(threats), 'status': status,
        'scanned_at': datetime.utcnow()
    }).inserted_id
    mongo.db.users.update_one({'_id': u['_id']}, {'$inc': {
        'total_scans': 1, 'threats_blocked': 1 if threats else 0}})
    return jsonify({'message': 'Scan saved', 'scan_id': str(sid)}), 201

@app.route('/api/scans', methods=['GET'])
@require_auth
def get_scans(u):
    page, limit = int(request.args.get('page',1)), int(request.args.get('limit',20))
    scans = list(mongo.db.scans.find({'user_id': u['_id']},
                 sort=[('scanned_at',-1)]).skip((page-1)*limit).limit(limit))
    total = mongo.db.scans.count_documents({'user_id': u['_id']})
    for s in scans:
        s['_id'] = str(s['_id']); s['user_id'] = str(s['user_id'])
        s['scanned_at'] = s['scanned_at'].isoformat()
    return jsonify({'scans': scans, 'total': total, 'page': page,
                    'pages': (total + limit - 1) // limit})

@app.route('/api/scans/stats', methods=['GET'])
@require_auth
def get_stats(u):
    uid = u['_id']
    total   = mongo.db.scans.count_documents({'user_id': uid})
    threats = mongo.db.scans.count_documents({'user_id': uid, 'threat_count': {'$gt': 0}})
    bd = {r['_id']: r['count'] for r in mongo.db.scans.aggregate([
        {'$match': {'user_id': uid}},
        {'$group': {'_id': '$status', 'count': {'$sum': 1}}}])}
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent = list(mongo.db.scans.aggregate([
        {'$match': {'user_id': uid, 'scanned_at': {'$gte': week_ago}}},
        {'$group': {'_id': {'$dateToString': {'format':'%Y-%m-%d','date':'$scanned_at'}},
                    'scans': {'$sum': 1},
                    'threats': {'$sum': {'$cond': [{'$gt':['$threat_count',0]},1,0]}}}},
        {'$sort': {'_id': 1}}]))
    return jsonify({'total_scans': total, 'threats_detected': threats,
                    'safe_sites': total - threats, 'breakdown': bd, 'recent_activity': recent})

@app.route('/api/scans/<scan_id>', methods=['DELETE'])
@require_auth
def delete_scan(u, scan_id):
    r = mongo.db.scans.delete_one({'_id': ObjectId(scan_id), 'user_id': u['_id']})
    if r.deleted_count == 0:
        return jsonify({'error': 'Scan not found'}), 404
    return jsonify({'message': 'Deleted'})

# ── Page routes ──────────────────────────────────────
@app.route('/')
def index(): return redirect(url_for('dashboard'))

@app.route('/login')
def login_page(): return render_template('login.html')

@app.route('/register')
def register_page(): return render_template('register.html')

@app.route('/dashboard')
def dashboard(): return render_template('dashboard.html')

@app.route('/history')
def history(): return render_template('history.html')

@app.route('/profile')
def profile(): return render_template('profile.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)