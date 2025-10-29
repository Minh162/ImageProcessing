const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const Jimp = require('jimp');
const cors = require('cors');

const app = express();
app.use(cors());

const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(express.json());
app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOAD_DIR));

// Serve pipeline version at root
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Serve old version at /old (removed - using single version)

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  }
});
const upload = multer({ storage });

app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ filename: req.file.filename, url: `/uploads/${req.file.filename}` });
});

// processing endpoint
app.post('/process', async (req, res) => {
  try {
    const { filename, option } = req.body;
    if (!filename || !option) return res.status(400).json({ error: 'Missing filename or option' });

    const inputPath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(inputPath)) return res.status(404).json({ error: 'File not found' });

    const image = await Jimp.read(inputPath);

    // Placeholder algorithms — you can replace these with your own implementations
    switch (option) {
      case 'grayscale':
        image.grayscale();
        break;
      case 'invert':
        image.invert();
        break;
      case 'blur':
        image.blur(5);
        break;
      case 'edge':
        // simple edge detection kernel
        image.convolute([
          [-1, -1, -1],
          [-1, 8, -1],
          [-1, -1, -1]
        ]);
        break;
      default:
        // no-op
        break;
    }

    const outName = `processed-${Date.now()}-${filename}`;
    const outPath = path.join(UPLOAD_DIR, outName);
    await image.writeAsync(outPath);

    res.json({ filename: outName, url: `/uploads/${outName}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Processing failed', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
