const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { getSessionToken } = require('../middleware/sessionAuth');
const {
  getAccountBySessionToken,
  loginAccount,
  logoutSession,
  registerAccount
} = require('../services/authService');

const router = express.Router();

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const result = await registerAccount(req.body);
    res.status(201).json({
      success: true,
      message: 'Đã đăng ký tài khoản.',
      data: result
    });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const result = await loginAccount(req.body);
    res.json({
      success: true,
      message: 'Đăng nhập thành công.',
      data: result
    });
  })
);

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const account = await getAccountBySessionToken(getSessionToken(req));

    if (!account) {
      res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập đã hết hạn.',
        errorCode: 'SESSION_EXPIRED'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        account
      }
    });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await logoutSession(getSessionToken(req));
    res.json({
      success: true,
      message: 'Đã đăng xuất.'
    });
  })
);

module.exports = router;
