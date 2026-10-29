const mongoose = require("mongoose");

const helpRequestSchema = new mongoose.Schema(
  {
    problem: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    answer: {
      type: String,
      required: true
    },
    provider: {
      type: String,
      default: "Ollama Cloud"
    },
    model: {
      type: String,
      default: "gemma4:cloud"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("HelpRequest", helpRequestSchema);
