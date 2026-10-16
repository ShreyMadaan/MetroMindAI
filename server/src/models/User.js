
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      minlength: 8,
      select: false,
      default: undefined,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
      default: undefined,
    },

    avatar: {
      type: String,
      default: "",
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
  },
  {
    timestamps: true,
  }
);

// Require a password for traditional accounts.
userSchema.pre("validate", function () {
  if (this.authProvider === "local" && !this.password) {
    this.invalidate(
      "password",
      "Password is required for email registration."
    );
  }

  if (this.authProvider === "google" && !this.googleId) {
    this.invalidate(
      "googleId",
      "Google ID is required for Google accounts."
    );
  }
});

module.exports = mongoose.model("User", userSchema);
