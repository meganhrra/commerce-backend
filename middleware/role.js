module.exports = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ success: false, error: 'No tiene permisos para esta acción' });
    }
    next();
  };
};
