const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");

const googleClient = new OAuth2Client();

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || "",
  authProvider: user.authProvider || "local",
});

const sendAuthResponse = (res, status, message, user) => {
  return res.status(status).json({
    success: true,
    message,
    token: generateToken(user._id),
    user: formatUser(user),
  });
};

// POST /api/auth/register
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 100 ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name (2–100 characters), email, and password (min 8 characters) are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      authProvider: "local",
    });

    return sendAuthResponse(
      res,
      201,
      "User registered successfully",
      user
    );
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    next(error);
  }
};

// POST /api/auth/login
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    // Google-only accounts have no local password.
    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isValidPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    return sendAuthResponse(
      res,
      200,
      "Login successful",
      user
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/google
const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body || {};

    if (
      typeof credential !== "string" ||
      !credential.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required",
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({
        success: false,
        message: "Google Sign-In is not configured",
      });
    }

    let ticket;

    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired Google credential",
      });
    }

    const payload = ticket.getPayload();

    if (
      !payload ||
      !payload.sub ||
      !payload.email ||
      payload.email_verified !== true
    ) {
      return res.status(401).json({
        success: false,
        message: "Google account verification failed",
      });
    }

    const googleId = payload.sub;
    const email = payload.email.trim().toLowerCase();

    let user = await User.findOne({ googleId });

    if (!user) {
      // Never automatically link accounts solely by email.
      const existingEmailUser = await User.findOne({
        email,
      });

      if (existingEmailUser) {
        return res.status(409).json({
          success: false,
          message:
            "An account with this email already exists. Sign in using your existing method. Google account linking is not available yet.",
        });
      }

      const googleName =
        typeof payload.name === "string" &&
        payload.name.trim().length >= 2
          ? payload.name.trim().slice(0, 100)
          : "Google User";

      user = await User.create({
        name: googleName,
        email,
        googleId,
        avatar:
          typeof payload.picture === "string"
            ? payload.picture
            : "",
        authProvider: "google",
      });
    }

    return sendAuthResponse(
      res,
      200,
      "Google authentication successful",
      user
    );
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email or Google identity already exists",
      });
    }

    next(error);
  }
};

// GET /api/auth/me
const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: formatUser(req.user),
  });
};

module.exports = {
  registerUser,
  loginUser,
  googleLogin,
  getCurrentUser,
};