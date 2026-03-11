const mongoose = require("mongoose");

const conversation_logs = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      default: "default",
    },

    session_id: {
      type: String,
      required: true,
    },

    user_message: {
      type: String,
      required: true,
    },

    agent_response: {
      type: String,
      required: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    crisis_detected: {
      type: Boolean,
      default: false,
    },

    therapy_mode: {
      type: String,
      enum: ["cbt", "dbt", "act", "mindfulness", "none"],
      default: "cbt",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", conversation_logs,"conversation_logs");