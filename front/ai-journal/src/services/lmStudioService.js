// src/services/lmStudioService.js
//  PROSTY SERWIS DO LM STUDIO!

class LMStudioService {
  constructor() {
    this.baseURL = 'https://wackier-deliberately-leighann.ngrok-free.dev/v1';
    this.model = 'local-model'; // LM Studio używa tego jako default
  }

  // Analiza treningu
  async analyzeWorkout(workoutData) {
    try {
      const prompt = `
        Jesteś AI trenerem personalnym. Przeanalizuj poniższe dane treningowe:
        
        Data: ${workoutData.date}
        Ćwiczenia: ${JSON.stringify(workoutData.exercises)}
        Volume: ${workoutData.totalVolume}kg
        Sen poprzedniej nocy: ${workoutData.sleep}h
        Kalorie: ${workoutData.calories}kcal
        
        Odpowiedz po polsku w formacie JSON:
        {
          "ocena": "krótka ocena treningu",
          "strengths": ["co było dobre"],
          "improvements": ["co poprawić"],
          "fatigue_level": "low/medium/high",
          "recommendation": "rekomendacja na następny trening"
        }
      `;

      const response = await fetch(`${this.baseURL}/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          max_tokens: 500,
          temperature: 0.7,
          top_p: 0.9,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error('LM Studio nie odpowiada - sprawdź czy serwer działa!');
      }

      const data = await response.json();
      const aiResponse = data.choices[0].text;
      
      // Próbuj sparsować JSON z odpowiedzi
      try {
        // Wyciągnij JSON z odpowiedzi (czasem model dodaje tekst dookoła)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Nie mogę znaleźć JSON w odpowiedzi');
      } catch (parseError) {
        console.error('Parse error:', parseError);
        return {
          ocena: aiResponse,
          strengths: [],
          improvements: [],
          fatigue_level: 'unknown',
          recommendation: 'Sprawdź dane ręcznie'
        };
      }
    } catch (error) {
      console.error('LM Studio Error:', error);
      return {
        error: true,
        message: error.message,
        ocena: 'Brak połączenia z AI',
        strengths: [],
        improvements: [],
        fatigue_level: 'unknown', 
        recommendation: 'Uruchom LM Studio i spróbuj ponownie'
      };
    }
  }

  // Predykcja przeciążenia
  async predictOvertraining(weeklyData) {
    try {
      const prompt = `
        Analyze training week data for overtraining risk:
        ${JSON.stringify(weeklyData)}
        
        Return JSON:
        {
          "risk_level": "low/medium/high",
          "indicators": ["list of warning signs"],
          "advice": "recommendation"
        }
      `;

      const response = await fetch(`${this.baseURL}/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          max_tokens: 300,
          temperature: 0.5
        })
      });

      const data = await response.json();
      return this.parseAIResponse(data.choices[0].text);
    } catch (error) {
      console.error('Prediction Error:', error);
      return {
        risk_level: 'unknown',
        indicators: [],
        advice: 'Unable to analyze - check LM Studio connection'
      };
    }
  }

  // Personalizowane rekomendacje na bazie Gallup
  async getGallupBasedRecommendation(gallupStrengths, currentGoal) {
    try {
      const prompt = `
        Osoba ma następujące talenty Gallup:
        1. ${gallupStrengths[0]} - skupienie na celu
        2. ${gallupStrengths[1]} - chęć wyróżnienia się
        3. ${gallupStrengths[2]} - budowanie relacji
        4. ${gallupStrengths[3]} - ostrożność w decyzjach
        5. ${gallupStrengths[4]} - analityczne myślenie
        
        Obecny cel: ${currentGoal}
        
        Daj 3 konkretne porady treningowe dopasowane do tych talentów.
        Odpowiedz po polsku w formacie JSON:
        {
          "recommendations": [
            {"strength": "nazwa talentu", "advice": "konkretna rada"}
          ]
        }
      `;

      const response = await fetch(`${this.baseURL}/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          max_tokens: 400,
          temperature: 0.8
        })
      });

      const data = await response.json();
      return this.parseAIResponse(data.choices[0].text);
    } catch (error) {
      console.error('Gallup Recommendation Error:', error);
      return {
        recommendations: [
          {
            strength: "Ukierunkowanie",
            advice: "Ustaw jeden główny cel treningowy na tydzień i się go trzymaj"
          },
          {
            strength: "Analityk", 
            advice: "Analizuj dane z każdego treningu i szukaj wzorców"
          },
          {
            strength: "Poważanie",
            advice: "Dokumentuj postępy i dziel się nimi dla motywacji"
          }
        ]
      };
    }
  }

  // Helper do parsowania odpowiedzi AI
  parseAIResponse(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { raw_response: text };
    } catch (error) {
      console.error('Parse error:', error);
      return { raw_response: text, parse_error: true };
    }
  }

  // Sprawdź czy LM Studio działa
  async checkConnection() {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          connected: true,
          models: data.data || [],
          message: 'LM Studio połączone!'
        };
      }
      return {
        connected: false,
        message: 'LM Studio nie odpowiada'
      };
    } catch (error) {
      return {
        connected: false,
        message: 'Uruchom LM Studio i kliknij "Start Server"',
        error: error.message
      };
    }
  }
}

// Eksportuj instancję
const lmStudioService = new LMStudioService();
export default lmStudioService;