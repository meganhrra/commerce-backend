module.exports = (err, req, res, next) => {
  console.error('Error:', err.message || err);

  // Error de trigger o procedimiento almacenado (SIGNAL SQLSTATE 45000)
  if (err.sqlState === '45000') {
    return res.status(400).json({ success: false, error: err.sqlMessage });
  }

  // Duplicado (violación de UNIQUE constraint)
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, error: 'El registro ya existe' });
  }

  // Error de CHECK constraint
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return res.status(400).json({ success: false, error: 'Los datos no cumplen las validaciones requeridas' });
  }

  // Error de multer (tamaño de archivo)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: 'El archivo excede el tamaño máximo de 2MB' });
  }

  // Error de multer (formato)
  if (err.message && err.message.includes('Formato no permitido')) {
    return res.status(400).json({ success: false, error: err.message });
  }

  // Error genérico (NUNCA exponer detalles internos al cliente)
  res.status(500).json({ success: false, error: 'Error interno del servidor' });
};
