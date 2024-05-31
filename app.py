#!/usr/bin/env python3

import base64
import bcrypt
import hashlib
try:
    import config
except ModuleNotFoundError:
    raise FileNotFoundError('No such file or directory: \'config.py\'. Copy the example config file config.example.py to config.py')
import json
import re
import requests
import schema
import os
import time

# -- カスタム --
import traceback
import pprint
import pathlib
import shutil
import random
import datetime

import flask
import nkf
import tjaf

# ----

from functools import wraps
from flask import Flask, g, jsonify, render_template, request, abort, redirect, session, flash, make_response, send_from_directory
from flask_caching import Cache
from flask_session import Session
from flask_wtf.csrf import CSRFProtect, generate_csrf, CSRFError
from ffmpy import FFmpeg
from pymongo import MongoClient
from redis import Redis

def take_config(name, required=False):
    if hasattr(config, name):
        return getattr(config, name)
    elif required:
        raise ValueError('Required option is not defined in the config.py file: {}'.format(name))
    else:
        return None

app = Flask(__name__)
client = MongoClient(host=os.environ.get("TAIKO_WEB_MONGO_HOST") or take_config('MONGO', required=True)['host'])
basedir = take_config('BASEDIR') or '/'

app.secret_key = take_config('SECRET_KEY') or 'change-me'
app.config['SESSION_TYPE'] = 'redis'
redis_config = take_config('REDIS', required=True)
redis_config['CACHE_REDIS_HOST'] = os.environ.get("TAIKO_WEB_REDIS_HOST") or redis_config['CACHE_REDIS_HOST']
app.config['SESSION_REDIS'] = Redis(
    host=redis_config['CACHE_REDIS_HOST'],
    port=redis_config['CACHE_REDIS_PORT'],
    password=redis_config['CACHE_REDIS_PASSWORD'],
    db=redis_config['CACHE_REDIS_DB']
)
app.cache = Cache(app, config=redis_config)
sess = Session()
sess.init_app(app)
#csrf = CSRFProtect(app)

db = client[take_config('MONGO', required=True)['database']]
db.users.create_index('username', unique=True)
db.songs.create_index('id', unique=True)
db.scores.create_index('username')


class HashException(Exception):
    pass


def api_error(message):
    return jsonify({'status': 'error', 'message': message})


def generate_hash(id, form):
    md5 = hashlib.md5()
    if form['type'] == 'tja':
        urls = ['%s%s/main.tja' % (take_config('SONGS_BASEURL', required=True), id)]
    else:
        urls = []
        for diff in ['easy', 'normal', 'hard', 'oni', 'ura']:
            if form['course_' + diff]:
                urls.append('%s%s/%s.osu' % (take_config('SONGS_BASEURL', required=True), id, diff))

    for url in urls:
        if url.startswith("http://") or url.startswith("https://"):
            resp = requests.get(url)
            if resp.status_code != 200:
                raise HashException('Invalid response from %s (status code %s)' % (resp.url, resp.status_code))
            md5.update(resp.content)
        else:
            if url.startswith(basedir):
                url = url[len(basedir):]
            path = os.path.normpath(os.path.join("public", url))
            if not os.path.isfile(path):
                raise HashException("File not found: %s" % (os.path.abspath(path)))
            with open(path, "rb") as file:
                md5.update(file.read())

    return base64.b64encode(md5.digest())[:-2].decode('utf-8')


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('username'):
            return api_error('not_logged_in')
        return f(*args, **kwargs)
    return decorated_function


def admin_required(level):
    def decorated_function(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if not session.get('username'):
                return abort(403)
            
            user = db.users.find_one({'username': session.get('username')})
            if user['user_level'] < level:
                return abort(403)

            return f(*args, **kwargs)
        return wrapper
    return decorated_function


@app.errorhandler(CSRFError)
def handle_csrf_error(e):
    return api_error('invalid_csrf')


@app.before_request
def before_request_func():
    if session.get('session_id'):
        if not db.users.find_one({'session_id': session.get('session_id')}):
            session.clear()


def get_config(credentials=False):
    config_out = {
        'basedir': basedir,
        'songs_baseurl': take_config('SONGS_BASEURL', required=True),
        'assets_baseurl': take_config('ASSETS_BASEURL', required=True),
        'email': take_config('EMAIL'),
        'accounts': take_config('ACCOUNTS'),
        'custom_js': take_config('CUSTOM_JS'),
        'plugins': take_config('PLUGINS') and [x for x in take_config('PLUGINS') if x['url']],
        'preview_type': take_config('PREVIEW_TYPE') or 'mp3',
        'multiplayer_url': take_config('MULTIPLAYER_URL')
    }
    relative_urls = ['songs_baseurl', 'assets_baseurl']
    for name in relative_urls:
        if not config_out[name].startswith("/") and not config_out[name].startswith("http://") and not config_out[name].startswith("https://"):
            config_out[name] = basedir + config_out[name]
    if credentials:
        google_credentials = take_config('GOOGLE_CREDENTIALS')
        min_level = google_credentials['min_level'] or 0
        if not session.get('username'):
            user_level = 0
        else:
            user = db.users.find_one({'username': session.get('username')})
            user_level = user['user_level']
        if user_level >= min_level:
            config_out['google_credentials'] = google_credentials
        else:
            config_out['google_credentials'] = {
                'gdrive_enabled': False
            }

    if not config_out.get('songs_baseurl'):
        config_out['songs_baseurl'] = ''.join([request.host_url, 'songs']) + '/'
    if not config_out.get('assets_baseurl'):
        config_out['assets_baseurl'] = ''.join([request.host_url, 'assets']) + '/'

    config_out['_version'] = get_version()
    return config_out

def get_version():
    version = {'commit': None, 'commit_short': '', 'version': None, 'url': take_config('URL')}
    if os.path.isfile('version.json'):
        try:
            ver = json.load(open('version.json', 'r'))
        except ValueError:
            print('Invalid version.json file')
            return version

        for key in version.keys():
            if ver.get(key):
                version[key] = ver.get(key)

    return version

def get_db_don(user):
    don_body_fill = user['don_body_fill'] if 'don_body_fill' in user else get_default_don('body_fill')
    don_face_fill = user['don_face_fill'] if 'don_face_fill' in user else get_default_don('face_fill')
    return {'body_fill': don_body_fill, 'face_fill': don_face_fill}

def get_default_don(part=None):
    if part == None:
        return {
            'body_fill': get_default_don('body_fill'),
            'face_fill': get_default_don('face_fill')
        }
    elif part == 'body_fill':
        return '#5fb7c1'
    elif part == 'face_fill':
        return '#ff5724'

def is_hex(input):
    try:
        int(input, 16)
        return True
    except ValueError:
        return False


@app.route(basedir)
def route_index():
    version = get_version()
    return render_template('index.html', version=version, config=get_config())


@app.route(basedir + 'api/csrftoken')
def route_csrftoken():
    return jsonify({'status': 'ok', 'token': generate_csrf()})


@app.route(basedir + 'admin')
@admin_required(level=50)
def route_admin():
    return redirect(basedir + 'admin/songs')


@app.route(basedir + 'admin/songs')
@admin_required(level=50)
def route_admin_songs():
    songs = sorted(list(db.songs.find({})), key=lambda x: x['id'])
    categories = db.categories.find({})
    user = db.users.find_one({'username': session['username']})
    return render_template('admin_songs.html', songs=songs, admin=user, categories=list(categories), config=get_config())


@app.route(basedir + 'admin/songs/<int:id>')
@admin_required(level=50)
def route_admin_songs_id(id):
    song = db.songs.find_one({'id': id})
    if not song:
        return abort(404)

    categories = list(db.categories.find({}))
    song_skins = list(db.song_skins.find({}))
    makers = list(db.makers.find({}))
    user = db.users.find_one({'username': session['username']})

    return render_template('admin_song_detail.html',
        song=song, categories=categories, song_skins=song_skins, makers=makers, admin=user, config=get_config())


@app.route(basedir + 'admin/songs/new')
@admin_required(level=100)
def route_admin_songs_new():
    categories = list(db.categories.find({}))
    song_skins = list(db.song_skins.find({}))
    makers = list(db.makers.find({}))
    seq = db.seq.find_one({'name': 'songs'})
    seq_new = seq['value'] + 1 if seq else 1

    return render_template('admin_song_new.html', categories=categories, song_skins=song_skins, makers=makers, config=get_config(), id=seq_new)


@app.route(basedir + 'admin/songs/new', methods=['POST'])
@admin_required(level=100)
def route_admin_songs_new_post():
    output = {'title_lang': {}, 'subtitle_lang': {}, 'courses': {}}
    output['enabled'] = True if request.form.get('enabled') else False
    output['title'] = request.form.get('title') or None
    output['subtitle'] = request.form.get('subtitle') or None
    for lang in ['ja', 'en', 'cn', 'tw', 'ko']:
        output['title_lang'][lang] = request.form.get('title_%s' % lang) or None
        output['subtitle_lang'][lang] = request.form.get('subtitle_%s' % lang) or None

    for course in ['easy', 'normal', 'hard', 'oni', 'ura']:
        if request.form.get('course_%s' % course):
            output['courses'][course] = {'stars': int(request.form.get('course_%s' % course)),
                                         'branch': True if request.form.get('branch_%s' % course) else False}
        else:
            output['courses'][course] = None
    
    output['category_id'] = int(request.form.get('category_id')) or None
    output['type'] = request.form.get('type')
    output['music_type'] = request.form.get('music_type')
    output['offset'] = float(request.form.get('offset')) or None
    output['skin_id'] = int(request.form.get('skin_id')) or None
    output['preview'] = float(request.form.get('preview')) or None
    output['volume'] = float(request.form.get('volume')) or None
    output['maker_id'] = int(request.form.get('maker_id')) or None
    output['lyrics'] = True if request.form.get('lyrics') else False
    output['hash'] = request.form.get('hash')
    
    seq = db.seq.find_one({'name': 'songs'})
    seq_new = seq['value'] + 1 if seq else 1
    
    hash_error = False
    if request.form.get('gen_hash'):
        try:
            output['hash'] = generate_hash(seq_new, request.form)
        except HashException as e:
            hash_error = True
            flash('An error occurred: %s' % str(e), 'error')
    
    output['id'] = seq_new
    output['order'] = seq_new
    
    db.songs.insert_one(output)
    if not hash_error:
        flash('Song created.')
    
    db.seq.update_one({'name': 'songs'}, {'$set': {'value': seq_new}}, upsert=True)
    
    return redirect(basedir + 'admin/songs/%s' % str(seq_new))


@app.route(basedir + 'admin/songs/<int:id>', methods=['POST'])
@admin_required(level=50)
def route_admin_songs_id_post(id):
    song = db.songs.find_one({'id': id})
    if not song:
        return abort(404)

    user = db.users.find_one({'username': session['username']})
    user_level = user['user_level']

    output = {'title_lang': {}, 'subtitle_lang': {}, 'courses': {}}
    if user_level >= 100:
        output['enabled'] = True if request.form.get('enabled') else False

    output['title'] = request.form.get('title') or None
    output['subtitle'] = request.form.get('subtitle') or None
    for lang in ['ja', 'en', 'cn', 'tw', 'ko']:
        output['title_lang'][lang] = request.form.get('title_%s' % lang) or None
        output['subtitle_lang'][lang] = request.form.get('subtitle_%s' % lang) or None

    for course in ['easy', 'normal', 'hard', 'oni', 'ura']:
        if request.form.get('course_%s' % course):
            output['courses'][course] = {'stars': int(request.form.get('course_%s' % course)),
                                         'branch': True if request.form.get('branch_%s' % course) else False}
        else:
            output['courses'][course] = None
    
    output['category_id'] = int(request.form.get('category_id')) or None
    output['type'] = request.form.get('type')
    output['music_type'] = request.form.get('music_type')
    output['offset'] = float(request.form.get('offset')) or None
    output['skin_id'] = int(request.form.get('skin_id')) or None
    output['preview'] = float(request.form.get('preview')) or None
    output['volume'] = float(request.form.get('volume')) or None
    output['maker_id'] = int(request.form.get('maker_id')) or None
    output['lyrics'] = True if request.form.get('lyrics') else False
    output['hash'] = request.form.get('hash')
    
    hash_error = False
    if request.form.get('gen_hash'):
        try:
            output['hash'] = generate_hash(id, request.form)
        except HashException as e:
            hash_error = True
            flash('An error occurred: %s' % str(e), 'error')
    
    db.songs.update_one({'id': id}, {'$set': output})
    if not hash_error:
        flash('Changes saved.')
    
    return redirect(basedir + 'admin/songs/%s' % id)


@app.route(basedir + 'admin/songs/<int:id>/delete', methods=['POST'])
@admin_required(level=100)
def route_admin_songs_id_delete(id):
    song = db.songs.find_one({'id': id})
    if not song:
        return abort(404)

    db.songs.delete_one({'id': id})
    flash('Song deleted.')
    return redirect(basedir + 'admin/songs')


@app.route(basedir + 'admin/users')
@admin_required(level=50)
def route_admin_users():
    user = db.users.find_one({'username': session.get('username')})
    max_level = user['user_level'] - 1
    return render_template('admin_users.html', config=get_config(), max_level=max_level, username='', level='')


@app.route(basedir + 'admin/users', methods=['POST'])
@admin_required(level=50)
def route_admin_users_post():
    admin_name = session.get('username')
    admin = db.users.find_one({'username': admin_name})
    max_level = admin['user_level'] - 1
    
    username = request.form.get('username')
    try:
        level = int(request.form.get('level')) or 0
    except ValueError:
        level = 0
    
    user = db.users.find_one({'username_lower': username.lower()})
    if not user:
        flash('Error: User was not found.')
    elif admin['username'] == user['username']:
        flash('Error: You cannot modify your own level.')
    else:
        user_level = user['user_level']
        if level < 0 or level > max_level:
            flash('Error: Invalid level.')
        elif user_level > max_level:
            flash('Error: This user has higher level than you.')
        else:
            output = {'user_level': level}
            db.users.update_one({'username': user['username']}, {'$set': output})
            flash('User updated.')
    
    return render_template('admin_users.html', config=get_config(), max_level=max_level, username=username, level=level)


@app.route(basedir + 'api/preview')
@app.cache.cached(timeout=15, query_string=True)
def route_api_preview():
    song_id = request.args.get('id', None)
    if not song_id or not re.match('^[0-9]{1,9}$', song_id):
        abort(400)

    song_id = int(song_id)
    song = db.songs.find_one({'id': song_id})
    if not song:
        abort(400)

    song_type = song['type']
    song_ext = song['music_type'] if song['music_type'] else "mp3"
    prev_path = make_preview(song_id, song_type, song_ext, song['preview'])
    if not prev_path:
        return redirect(get_config()['songs_baseurl'] + '%s/main.%s' % (song_id, song_ext))

    return redirect(get_config()['songs_baseurl'] + '%s/preview.mp3' % song_id)


@app.route(basedir + 'api/songs')
@app.cache.cached(timeout=15)
def route_api_songs():
    songs = list(db.songs.find({'enabled': True}, {'_id': False, 'enabled': False}))
    for song in songs:
        if song['maker_id']:
            if song['maker_id'] == 0:
                song['maker'] = 0
            else:
                song['maker'] = db.makers.find_one({'id': song['maker_id']}, {'_id': False})
        else:
            song['maker'] = None
        del song['maker_id']

        if song['category_id']:
            song['category'] = db.categories.find_one({'id': song['category_id']})['title']
        else:
            song['category'] = None
        #del song['category_id']

        if song['skin_id']:
            song['song_skin'] = db.song_skins.find_one({'id': song['skin_id']}, {'_id': False, 'id': False})
        else:
            song['song_skin'] = None
        del song['skin_id']

    return cache_wrap(flask.jsonify(songs), 60)

@app.route(basedir + 'api/categories')
@app.cache.cached(timeout=15)
def route_api_categories():
    categories = list(db.categories.find({},{'_id': False}))
    return jsonify(categories)

@app.route(basedir + 'api/config')
@app.cache.cached(timeout=15)
def route_api_config():
    config = get_config(credentials=True)
    return jsonify(config)


@app.route(basedir + 'api/register', methods=['POST'])
def route_api_register():
    data = request.get_json()
    if not schema.validate(data, schema.register):
        return abort(400)

    if session.get('username'):
        session.clear()

    username = data.get('username', '')
    if len(username) < 3 or len(username) > 20 or not re.match('^[a-zA-Z0-9_]{3,20}$', username):
        return api_error('invalid_username')

    if db.users.find_one({'username_lower': username.lower()}):
        return api_error('username_in_use')

    password = data.get('password', '').encode('utf-8')
    if not 6 <= len(password) <= 5000:
        return api_error('invalid_password')

    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password, salt)
    don = get_default_don()
    
    session_id = os.urandom(24).hex()
    db.users.insert_one({
        'username': username,
        'username_lower': username.lower(),
        'password': hashed,
        'display_name': username,
        'don': don,
        'user_level': 1,
        'session_id': session_id
    })

    session['session_id'] = session_id
    session['username'] = username
    session.permanent = True
    return jsonify({'status': 'ok', 'username': username, 'display_name': username, 'don': don})


@app.route(basedir + 'api/login', methods=['POST'])
def route_api_login():
    data = request.get_json()
    if not schema.validate(data, schema.login):
        return abort(400)

    if session.get('username'):
        session.clear()

    username = data.get('username', '')
    result = db.users.find_one({'username_lower': username.lower()})
    if not result:
        return api_error('invalid_username_password')

    password = data.get('password', '').encode('utf-8')
    if not bcrypt.checkpw(password, result['password']):
        return api_error('invalid_username_password')
    
    don = get_db_don(result)
    
    session['session_id'] = result['session_id']
    session['username'] = result['username']
    session.permanent = True if data.get('remember') else False

    return jsonify({'status': 'ok', 'username': result['username'], 'display_name': result['display_name'], 'don': don})


@app.route(basedir + 'api/logout', methods=['POST'])
@login_required
def route_api_logout():
    session.clear()
    return jsonify({'status': 'ok'})


@app.route(basedir + 'api/account/display_name', methods=['POST'])
@login_required
def route_api_account_display_name():
    data = request.get_json()
    if not schema.validate(data, schema.update_display_name):
        return abort(400)

    display_name = data.get('display_name', '').strip()
    if not display_name:
        display_name = session.get('username')
    elif len(display_name) > 25:
        return api_error('invalid_display_name')
    
    db.users.update_one({'username': session.get('username')}, {
        '$set': {'display_name': display_name}
    })

    return jsonify({'status': 'ok', 'display_name': display_name})


@app.route(basedir + 'api/account/don', methods=['POST'])
@login_required
def route_api_account_don():
    data = request.get_json()
    if not schema.validate(data, schema.update_don):
        return abort(400)
    
    don_body_fill = data.get('body_fill', '').strip()
    don_face_fill = data.get('face_fill', '').strip()
    if len(don_body_fill) != 7 or\
        not don_body_fill.startswith("#")\
        or not is_hex(don_body_fill[1:])\
        or len(don_face_fill) != 7\
        or not don_face_fill.startswith("#")\
        or not is_hex(don_face_fill[1:]):
        return api_error('invalid_don')
    
    db.users.update_one({'username': session.get('username')}, {'$set': {
        'don_body_fill': don_body_fill,
        'don_face_fill': don_face_fill,
    }})
    
    return jsonify({'status': 'ok', 'don': {'body_fill': don_body_fill, 'face_fill': don_face_fill}})


@app.route(basedir + 'api/account/password', methods=['POST'])
@login_required
def route_api_account_password():
    data = request.get_json()
    if not schema.validate(data, schema.update_password):
        return abort(400)

    user = db.users.find_one({'username': session.get('username')})
    current_password = data.get('current_password', '').encode('utf-8')
    if not bcrypt.checkpw(current_password, user['password']):
        return api_error('current_password_invalid')
    
    new_password = data.get('new_password', '').encode('utf-8')
    if not 6 <= len(new_password) <= 5000:
        return api_error('invalid_new_password')
    
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(new_password, salt)
    session_id = os.urandom(24).hex()

    db.users.update_one({'username': session.get('username')}, {
        '$set': {'password': hashed, 'session_id': session_id}
    })

    session['session_id'] = session_id
    return jsonify({'status': 'ok'})


@app.route(basedir + 'api/account/remove', methods=['POST'])
@login_required
def route_api_account_remove():
    data = request.get_json()
    if not schema.validate(data, schema.delete_account):
        return abort(400)

    user = db.users.find_one({'username': session.get('username')})
    password = data.get('password', '').encode('utf-8')
    if not bcrypt.checkpw(password, user['password']):
        return api_error('verify_password_invalid')

    db.scores.delete_many({'username': session.get('username')})
    db.users.delete_one({'username': session.get('username')})

    session.clear()
    return jsonify({'status': 'ok'})


@app.route(basedir + 'api/scores/save', methods=['POST'])
@login_required
def route_api_scores_save():
    data = request.get_json()
    if not schema.validate(data, schema.scores_save):
        return abort(400)

    username = session.get('username')
    if data.get('is_import'):
        db.scores.delete_many({'username': username})

    scores = data.get('scores', [])
    for score in scores:
        db.scores.update_one({'username': username, 'hash': score['hash']},
        {'$set': {
            'username': username,
            'hash': score['hash'],
            'score': score['score']
        }}, upsert=True)

    return jsonify({'status': 'ok'})


@app.route(basedir + 'api/scores/get')
@login_required
def route_api_scores_get():
    username = session.get('username')

    scores = []
    for score in db.scores.find({'username': username}):
        scores.append({
            'hash': score['hash'],
            'score': score['score']
        })

    user = db.users.find_one({'username': username})
    don = get_db_don(user)
    return jsonify({'status': 'ok', 'scores': scores, 'username': user['username'], 'display_name': user['display_name'], 'don': don})


@app.route(basedir + 'privacy')
def route_api_privacy():
    last_modified = time.strftime('%d %B %Y', time.gmtime(os.path.getmtime('templates/privacy.txt')))
    integration = take_config('GOOGLE_CREDENTIALS')['gdrive_enabled'] if take_config('GOOGLE_CREDENTIALS') else False
    
    response = make_response(render_template('privacy.txt', last_modified=last_modified, config=get_config(), integration=integration))
    response.headers['Content-type'] = 'text/plain; charset=utf-8'
    return response


def make_preview(song_id, song_type, song_ext, preview):
    song_path = 'public/songs/%s/main.%s' % (song_id, song_ext)
    prev_path = 'public/songs/%s/preview.mp3' % song_id

    if os.path.isfile(song_path) and not os.path.isfile(prev_path):
        if not preview or preview <= 0:
            print('Skipping #%s due to no preview' % song_id)
            return False

        print('Making preview.mp3 for song #%s' % song_id)
        ff = FFmpeg(inputs={song_path: '-ss %s' % preview},
                    outputs={prev_path: '-codec:a libmp3lame -ar 32000 -b:a 92k -y -loglevel panic'})
        ff.run()

    return prev_path

error_pages = take_config('ERROR_PAGES') or {}

def create_error_page(code, url):
    if url.startswith("http://") or url.startswith("https://"):
        resp = requests.get(url)
        if resp.status_code == 200:
            app.register_error_handler(code, lambda e: (resp.content, code))
    else:
        if url.startswith(basedir):
            url = url[len(basedir):]
        path = os.path.normpath(os.path.join("public", url))
        if os.path.isfile(path):
            app.register_error_handler(code, lambda e: (send_from_directory(".", path), code))

for code in error_pages:
    if error_pages[code]:
        create_error_page(code, error_pages[code])

def cache_wrap(res_from, secs):
    res = flask.make_response(res_from)
    res.headers["Cache-Control"] = f"public, max-age={secs}, s-maxage={secs}"
    res.headers["CDN-Cache-Control"] = f"max-age={secs}"
    return res

@app.route(basedir + "src/<path:ref>")
def send_src(ref):
    return cache_wrap(flask.send_from_directory("public/src", ref), 3600)

@app.route(basedir + "assets/<path:ref>")
def send_assets(ref):
    return cache_wrap(flask.send_from_directory("public/assets", ref), 3600)

@app.route(basedir + "songs/<path:ref>")
def send_songs(ref):
    return cache_wrap(flask.send_from_directory("public/songs", ref), 604800)

@app.route(basedir + "manifest.json")
def send_manifest():
    return cache_wrap(flask.send_from_directory("public", "manifest.json"), 3600)

@app.route("/upload/", defaults={"ref": "index.html"})
@app.route("/upload/<path:ref>")
def send_upload(ref):
    return cache_wrap(flask.send_from_directory("public/upload", ref), 3600)

@app.route("/upload", methods=["POST"])
def upload_file():
    if client.taiko.songs.count_documents({}) >= 5000:
        return flask.jsonify({"error": "既に追加されている曲が多すぎます"})

    try:
        # POSTリクエストにファイルの部分がない場合
        if 'file_tja' not in flask.request.files or 'file_music' not in flask.request.files:
            return flask.jsonify({'error': 'リクエストにファイルの部分がありません'})

        file_tja = flask.request.files['file_tja']
        file_music = flask.request.files['file_music']

        # ファイルが選択されておらず空のファイルを受け取った場合
        if file_tja.filename == '' or file_music.filename == '':
            return flask.jsonify({'error': 'ファイルが選択されていません'})

        # TJAファイルをテキストUTF-8/LFに変換
        tja_data = nkf.nkf('-wd', file_tja.read())
        tja_text = tja_data.decode("utf-8")
        print("TJAのサイズ:",len(tja_text))
        # TJAファイルの内容を解析
        tja = tjaf.Tja(tja_text)
        # TJAファイルのハッシュ値を生成
        msg = hashlib.sha256()
        msg.update(tja_data)
        tja_hash = msg.hexdigest()
        print("TJA:",tja_hash)
        # 音楽ファイルのハッシュ値を生成
        music_data = file_music.read()
        msg2 = hashlib.sha256()
        msg2.update(music_data)
        music_hash = msg2.hexdigest()
        print("音楽:",music_hash)
        # IDを生成
        generated_id = f"{tja_hash}-{music_hash}"
        # MongoDBのデータも作成
        db_entry = tja.to_mongo(generated_id, time.time_ns())
        pprint.pprint(db_entry)

        # mongoDBにデータをぶち込む
        client['taiko']["songs"].insert_one(db_entry)

        # ディレクトリを作成
        target_dir = pathlib.Path(os.getenv("TAIKO_WEB_SONGS_DIR", "public/songs")) / generated_id
        target_dir.mkdir(parents=True,exist_ok=True)

        # TJAを保存
        (target_dir / "main.tja").write_bytes(tja_data)
        # 曲ファイルも保存
        (target_dir / f"main.{db_entry['music_type']}").write_bytes(music_data)
    except Exception as e:
        error_str = ''.join(traceback.TracebackException.from_exception(e).format())
        return flask.jsonify({'error': error_str})

    return flask.jsonify({'success': True})

@app.route("/api/delete", methods=["POST"])
def delete():
    rand = random.randint(0, 10)
    if (rand != 10):
        return flask.jsonify({ "success": False, "reason": str(rand) + " IS NOT 10" })

    id = flask.request.get_json().get('id')
    client["taiko"]["songs"].delete_one({ "id": id })

    parent_dir = pathlib.Path(os.getenv("TAIKO_WEB_SONGS_DIR", "public/songs"))
    target_dir = parent_dir / id
    if target_dir.resolve().relative_to(parent_dir.resolve()) == pathlib.Path("."):
        return flask.jsonify({ "success": False, "reason": "PARENT IS NOT ALLOWED" })

    shutil.rmtree(target_dir)

    return flask.jsonify({'success': True})

if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Run the taiko-web development server.')
    parser.add_argument('port', type=int, metavar='PORT', nargs='?', default=34801, help='Port to listen on.')
    parser.add_argument('-b', '--bind-address', default='localhost', help='Bind server to address.')
    parser.add_argument('-d', '--debug', action='store_true', help='Enable debug mode.')
    args = parser.parse_args()

    app.run(host=args.bind_address, port=args.port, debug=args.debug)

