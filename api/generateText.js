// File: api/generateText.js
// Cần cài đặt @google/genai trong dependencies của package.json
const { GoogleGenAI } = require('@google/genai');

// Handler chính của serverless function
module.exports = async (req, res) => {
  // 1. Chỉ chấp nhận phương thức POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. Lấy API key từ biến môi trường trên server của Vercel
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured on the server.' });
    }

    // 3. Lấy prompt từ body của request mà frontend gửi lên
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    // 4. Gọi Gemini API một cách an toàn từ server
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    // 5. Trả về kết quả cho frontend
    res.status(200).json({ text: response.text });

  } catch (error) {
    console.error('Error in generateText function:', error);
    res.status(500).json({ error: 'Failed to generate content from the server.' });
  }
};
