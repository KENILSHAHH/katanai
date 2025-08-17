// test-gemini.js
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyC4PciTAb3HiwJdm2xfoe3Vy-2zijq4G-Q");

(async () => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const resp = await model.generateContent(
      "Hello Gemini! Can you confirm you are working?"
    );
    console.log("Gemini says:", resp.response.text());
  } catch (e) {
    console.error("Gemini error:", e.message || e);
    process.exit(1);
  }
})();
