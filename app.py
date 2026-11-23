from flask import Flask, jsonify, render_template, send_from_directory


app = Flask(__name__, template_folder="templates", static_folder="static")


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "app": "ImageShop"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
