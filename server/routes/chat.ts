import { Router, Response } from 'express';
import { Database } from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const chatRoutes = Router();

interface ChatRequest {
  projectId: string;
  message: string;
}

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// POST send chat message
chatRoutes.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { projectId, message } = req.body as ChatRequest;

    if (!projectId || !message || !message.trim()) {
      res.status(400).json({ error: 'Project ID and message are required' });
      return;
    }

    // Verify project belongs to user
    const project = await Database.getProjectById(projectId, req.user.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Save user message to database
    await Database.saveChatMessage(projectId, req.user.id, 'user', message);

    console.log('Chat message received for project:', projectId, 'from user:', req.user.id);

    // Get project transformations for context
    const transformations = await Database.getGenerationsByProjectId(projectId, req.user.id);
    
    // Generate AI response using Gemini
    let botResponse: string;
    try {
      botResponse = await generateGeminiResponse(message, project, transformations);
    } catch (error) {
      console.error('Gemini API error:', error);
      // Fallback to placeholder response if Gemini fails
      botResponse = generateBotResponse(message, project);
    }

    // Save bot response to database
    await Database.saveChatMessage(projectId, req.user.id, 'bot', botResponse);

    console.log('Bot response generated for project:', projectId);

    res.json({ success: true, response: botResponse });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// GET chat history for a project
chatRoutes.get('/project/:projectId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Verify project belongs to user
    const project = await Database.getProjectById(req.params.projectId, req.user.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const messages = await Database.getChatMessages(req.params.projectId, req.user.id);

    console.log('Returning chat history for project:', req.params.projectId, 'with', messages.length, 'messages');

    res.json(messages);
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Generate response using Gemini API
async function generateGeminiResponse(userMessage: string, project: any, transformations: any[]): Promise<string> {
  // Build context about the project
  const transformationContext = transformations.length > 0
    ? `\nProject transformations:\n${transformations.map((t: any) => 
        `- ${t.room_type} in ${t.style} style`
      ).join('\n')}`
    : '\nNo transformations yet in this project.';

  const systemPrompt = `You are an expert interior design assistant helping with a project called "${project.name}". 
${project.description ? `Project description: ${project.description}` : ''}
${transformationContext}

Provide helpful, specific design advice based on the project context. Be conversational and friendly. Keep responses concise (2-3 sentences max).`;

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: systemPrompt + '\n\nUser message: ' + userMessage
            }
          ]
        }
      ]
    });

    const response = result.response;
    const text = response.text();
    return text || generateBotResponse(userMessage, project);
  } catch (error) {
    console.error('Gemini generation error:', error);
    throw error;
  }
}

// Helper function to generate bot responses (fallback)
function generateBotResponse(userMessage: string, project: any): string {
  const lowerMessage = userMessage.toLowerCase();

  // Simple keyword-based responses (fallback if Gemini fails)
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return `Hello! I'm here to help with your "${project.name}" project. What would you like to know about your transformations or design?`;
  }

  if (lowerMessage.includes('style') || lowerMessage.includes('design')) {
    return `Great question about design! For your "${project.name}" project, I can help you explore different styles and materials. What specific aspect would you like to discuss?`;
  }

  if (lowerMessage.includes('material') || lowerMessage.includes('color')) {
    return `Materials and colors are crucial for your project! I can help you choose complementary materials and colors for your "${project.name}" transformations. What's your preference?`;
  }

  if (lowerMessage.includes('transformation') || lowerMessage.includes('design')) {
    return `Your "${project.name}" project has some amazing transformations! Would you like suggestions for improving them or exploring new design directions?`;
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('advice')) {
    return `I'm here to help! For your "${project.name}" project, I can assist with:\n• Design suggestions\n• Material recommendations\n• Color coordination\n• Style inspiration\n\nWhat would you like help with?`;
  }

  // Default response
  return `That's an interesting question about your "${project.name}" project! I can help with design suggestions, material recommendations, and style inspiration. Feel free to ask me anything specific!`;
}
