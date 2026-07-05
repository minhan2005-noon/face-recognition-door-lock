function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: 'Không tìm thấy endpoint.',
    errorCode: 'NOT_FOUND'
  });
}

module.exports = notFound;
