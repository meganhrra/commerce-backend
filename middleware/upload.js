const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: 'uploads/images/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    cb(null, `${req.params.id}_${uniqueSuffix}.${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato no permitido. Solo JPG, PNG y WEBP'), false);
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
});
