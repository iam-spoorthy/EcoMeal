const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const { protect } = require('../middleware/auth.middleware');

/**
 * @route   GET /api/ai/recommendations
 * @desc    Get AI recommendations for expiring ingredients using Groq API
 * @access  Private
 */
router.get('/recommendations', protect, async (req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    // Fetch items expiring within the next 7 days, sorted by expiry date
    const expiringItems = await Inventory.find({
      expiryDate: { $lte: sevenDaysFromNow },
      quantity: { $gt: 0 },
    })
      .sort({ expiryDate: 1 })
      .limit(10);

    // Extract unique names
    const ingredientNames = [...new Set(expiringItems.map(item => item.name.split(' (Batch')[0]))];

    // Fallback Mock Recipes in case Groq API fails, is down, or has no key
    const getFallbackRecipes = (ingredients) => {
      const itemsList = ingredients.length > 0 ? ingredients : ['Mushroom', 'Paneer', 'Tomato', 'Spinach'];
      return [
        {
          name: `Eco-Chef ${itemsList[0] || 'Ingredient'} Medley`,
          ingredientsUsed: itemsList.slice(0, 3),
          wasteReduction: 'High (saves expiring stock)',
          usagePriority: 'Urgent',
          instructions: `Sauté ${itemsList.slice(0, 3).join(', ')} together in a warm skillet. Add garlic and olive oil, cook for 8-10 minutes until tender. Season to taste.`
        },
        {
          name: `${itemsList[1] || 'Fresh Vegetable'} & Garlic Toss`,
          ingredientsUsed: itemsList.slice(1, 4),
          wasteReduction: 'Medium',
          usagePriority: 'High',
          instructions: `Blanch ${itemsList[1] || 'greens'} and toss with garlic, butter, and olive oil. Perfect side dish to utilize leftover produce.`
        }
      ];
    };

    if (ingredientNames.length === 0) {
      return res.status(200).json({
        success: true,
        source: 'cache_stub',
        message: 'No ingredients are expiring in the next 7 days. Excellent kitchen management!',
        data: [
          {
            name: "Kitchen Special Soup",
            ingredientsUsed: ["General Produce"],
            wasteReduction: "Low",
            usagePriority: "Routine",
            instructions: "Use standard stock to make a hearty vegetable broth."
          }
        ]
      });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.startsWith('gsk_your_groq_api_key')) {
      console.log('[AI Route]: Groq API Key missing/placeholder. Returning fallback mock recipes.');
      return res.status(200).json({
        success: true,
        source: 'local_fallback',
        data: getFallbackRecipes(ingredientNames)
      });
    }

    console.log(`[AI Route]: Calling Groq API with ingredients: ${ingredientNames.join(', ')}`);
    
    // Prepare prompt
    const prompt = `You are a professional restaurant chef specializing in zero-waste kitchen management.
We have the following ingredients that are expiring soon: ${ingredientNames.join(', ')}.
Generate 3 creative and realistic restaurant dishes (Chef Specials) that prioritize using these expiring ingredients to minimize food waste.

Return your response strictly as a JSON array of objects. Do not write any markdown code blocks, introductory text, or explanatory footnotes. The output must be pure valid JSON array.
Each object in the array must have exactly the following structure:
{
  "name": "Name of the dish",
  "ingredientsUsed": ["ingredient 1", "ingredient 2"],
  "wasteReduction": "High / Medium / Low",
  "usagePriority": "Urgent / High / Medium / Low",
  "instructions": "Brief cooking instructions (1-2 sentences)"
}`;

    // Call Groq API via standard Fetch (Node 18+ native support)
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192', // Standard fast Groq model
          messages: [
            {
              role: 'system',
              content: 'You are a helpful kitchen operations assistant. You only output valid JSON arrays of recipe recommendations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API request failed with status: ${response.status}`);
      }

      const resData = await response.json();
      const rawText = resData.choices[0].message.content.trim();

      // Clean response text from any markdown formatting wraps if any
      let cleanJsonText = rawText;
      if (rawText.startsWith('```json')) {
        cleanJsonText = rawText.split('```json')[1].split('```')[0].trim();
      } else if (rawText.startsWith('```')) {
        cleanJsonText = rawText.split('```')[1].split('```')[0].trim();
      }

      const recipes = JSON.parse(cleanJsonText);
      
      return res.status(200).json({
        success: true,
        source: 'groq_api',
        data: recipes,
      });
    } catch (apiErr) {
      console.error('[AI Route]: Groq API call error:', apiErr.message);
      // Fallback safe return
      return res.status(200).json({
        success: true,
        source: 'api_fallback',
        data: getFallbackRecipes(ingredientNames)
      });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
