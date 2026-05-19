from PIL import Image, ImageEnhance, ImageFilter
import pytesseract

# TESSERACT PATH
pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

IMAGE_PATH = "test.jpg"

# LOAD
img = Image.open(IMAGE_PATH)

# UPSCALE IMAGE
img = img.resize(
    (img.width * 2, img.height * 2)
)

# GRAYSCALE
img = img.convert("L")

# SHARPEN
img = img.filter(ImageFilter.SHARPEN)

# CONTRAST BOOST
enhancer = ImageEnhance.Contrast(img)
img = enhancer.enhance(2)

# OCR
text = pytesseract.image_to_string(img)

print("\n========== OCR RESULT ==========\n")

if text.strip():
    print(text)
else:
    print("NO TEXT FOUND")