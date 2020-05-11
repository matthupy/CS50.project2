import os, requests, flask_login, datetime

# Flask imports
from flask import flash, Flask, jsonify, redirect, render_template, request, session, url_for
from flask_session import Session
from flask_socketio import SocketIO, emit

# SQLAlchemy imports
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker

# Werkzeug imports
from werkzeug.security import generate_password_hash, check_password_hash

# Internal imports
from user import *

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# Check for environment variable
if not os.getenv("DATABASE_URL"):
    # Default the database URL to a known-good
    databaseURL = "postgres://qiflivokjqvfvq:3945485a49f77a2a3ebc6aee847bba02726fce0577777cb0a91ec49cc47aed77@ec2-52-71-55-81.compute-1.amazonaws.com:5432/d27sm6v7611uug"
    print("Warning: DATABASE_URL is not set!")
else:
    databaseURL = os.getenv("DATABASE_URL")

# Configure session to use filesystem
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

login_manager = flask_login.LoginManager(app)
login_manager.init_app(app)

# Set up database
engine = create_engine(databaseURL)
db = scoped_session(sessionmaker(bind=engine))

# Initialize global lists

#### User Management ####

@login_manager.user_loader
def load_user(username):
    curr_user = User()
    curr_user.id = username
    return curr_user

@login_manager.request_loader
def request_loader(request):
    username = request.form.get("username")
    sSQL = "select * from users where username = :username"
    user_exists = db.execute(sSQL, {"username": username}).fetchone()
    if user_exists is None:
        return

    user = User()
    user.id = username

    try:
        if check_password_hash(user_exists.password, request.form.get("password")):
            return user
        else:
            return
    except:
        return


@login_manager.unauthorized_handler
def unauthorized():
    flash("You must be logged in to view that page")
    return render_template("login.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    """ Attempt to log a user in """

    error = None
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        # Make sure that the username exists
        sSQL = f"select * from users where username = :username"
        user = db.execute(sSQL, {"username": username}).fetchone()

        if (user is None) or (not check_password_hash(user.password, password)):
            flash("Invalid credentials. Please try again.", category="error")

        else:
            user = User()
            user.id = username
            flask_login.login_user(user)
            return redirect(url_for("index"))

    return render_template("login.html", error=error, user=None)

@app.route("/logout")
@flask_login.login_required
def logout():
    """ Attempt to log a user out """
    flask_login.logout_user()
    flash("Logged out successfully", category="info")
    return redirect(url_for('login'))

@app.route("/create_account", methods=["GET", "POST"])
def create_account():
    """ Attempt to create a new user account """

    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        password2 = request.form.get("password2")

        # Make sure the passwords match
        if not (password == password2):
            flash("Passwords do not match!", category="error")
            return render_template("create_account.html", user=None)

        if (
            (username is None)
            or (len(username) == 0)
            or (password is None)
            or (len(password) == 0)
        ):
            flash(
                "Invalid username/password entered. Please enter both a username and a password.",
                category="error",
            )
            return render_template("create_account.html", user=None)

        # make sure that the username doesn't already exist
        sSQL = f"select * from users where username = :username"
        user = db.execute(sSQL, {"username": username}).fetchone()

        if user is not None:
            flash("Username is taken. Please enter a new username.", category="error")
            return render_template("create_account.html", user=None)

        # If we've gotten to this point, the username exists and there is a password. Create the account.
        hashed_password = generate_password_hash(password, method="sha256")
        sSQL = f"insert into users (username, password) values (:username, :hashed_password)"
        db.execute(sSQL, {"username": username, "hashed_password": hashed_password})
        db.commit()

        flash(f"User {username} created! Please log in.", "info")
    elif request.method == "GET":
        return render_template("create_account.html", user=None)

    return render_template("login.html", user=None)


#### Application Routes ####

@app.route("/")
@flask_login.login_required
def index():
    sSQL = f"select * from channels order by name"
    channels = db.execute(sSQL).fetchall()
    return render_template("home.html", user=flask_login.current_user, channels=channels)

@app.route("/add_channel", methods=["POST"])


@socketio.on("add channel")
def add_channel(data):
    """ Add a new channel """

    new_channel = data["channel"]
    #new_channel = request.form.get("channelName").strip()

    # Check if the channel exists
    sSQL = f"select * from channels where upper(name) = upper(:name)"
    exists = db.execute(sSQL, {"name":new_channel}).fetchone()

    if (exists is None):
        # Channel name is not taken, make a new channel
        sSQL = f"insert into channels (name) values (:name)"
        db.execute(sSQL, {"name":new_channel})
        db.commit()
        data = {"channel": new_channel}
        emit("channels refresh", new_channel, broadcast=True)
    else:
        # Channel name is taken, log an error
        data = {"error": "Channel name is already taken, please select a unique channel name"}
        emit("channel exists", data)

    return redirect(url_for('index'))

@socketio.on("send message")
def send_message(data):
    channel = data["channel"]
    message = data["message"]
    username = flask_login.current_user

    try:
        # Try to insert the message into the database
        sSQL = f"insert into messages (channel_name, username, message) values (:channel, :message, :username)"
        db.execute(sSQL, {"channel":channel, "message":message, "username":username})
        db.commit()

        # Set up emit event to update the socket
        data = {"channel":channel, "message":message, "username":username}
        emit('incoming message', data)
    except:
        raise Exception


if __name__ == "__main__":
    app.run()
