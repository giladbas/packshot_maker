from flask import Flask, request, jsonify, send_file, render_template
from PIL import Image
from rembg import remove
import os

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "outputs"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

def remove_background_and_crop(image_path, output_path):
    try:
        with open(image_path, 'rb') as img_file:
            input_image = img_file.read()
        output_image = remove(input_image)

        temp_path = "temp.png"
        with open(temp_path, 'wb') as temp_file:
            temp_file.write(output_image)

        image = Image.open(temp_path).convert("RGBA")
        bbox = image.getbbox()
        if bbox:
            cropped_image = image.crop(bbox)
            cropped_image.save(output_path, "PNG")
        os.remove(temp_path)
    except Exception as e:
        raise RuntimeError(f"Error processing {image_path}: {e}")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/process", methods=["POST"])
def process_image():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    layout = request.form.get("layout", "6")

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    input_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(input_path)

    output_path = os.path.join(OUTPUT_FOLDER, f"processed_{file.filename}")

    try:
        if layout == "6":
            remove_background_and_crop(input_path, output_path)
        else:
            remove_background_and_crop(input_path, output_path)
        return send_file(output_path, as_attachment=True)
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)

if __name__ == "__main__":
    app.run(debug=True)
