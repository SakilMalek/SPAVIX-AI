# SPAVIX - AI Interior Design Transformation Platform

Transform your interior spaces with AI-powered design suggestions. Upload a room photo, select a style, and get instant professional design transformations.

## Features

### Core Features
- **AI-Powered Transformations** - Generate realistic interior design transformations using advanced AI
- **Multiple Design Styles** - Choose from Modern, Minimalist, Bohemian, Industrial, Scandinavian, and more
- **Customization Options** - Adjust wall colors, floor materials, lighting, and more
- **Project Management** - Organize transformations into projects for better workflow
- **Design History** - Keep track of all your transformations
- **Share Designs** - Generate shareable links to showcase designs to clients and friends

### Project Features
- Create multiple projects to organize designs
- Link transformations to specific projects
- Auto-link new designs when creating from a project
- Share entire projects with unique links
- AI chat assistant for design discussions

### User Features
- User authentication with email/password and Google Sign-In
- User profiles with customizable avatars
- Transformation history with download and share options
- Project-based organization

## Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **shadcn/ui** - Component library
- **Wouter** - Routing
- **React Query** - Data fetching and caching
- **Sonner** - Toast notifications

### Backend
- **Express.js** - Web framework
- **Node.js** - Runtime
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Multer** - File uploads
- **Google OAuth** - Social authentication

### AI/ML
- **Google Gemini API** - Image generation and AI chat

## Project Structure

```
SPAVIX-Vision/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── config/        # Configuration files
│   │   └── styles/        # Global styles
│   └── public/            # Static assets
├── server/                # Backend Express application
│   ├── routes/            # API route handlers
│   ├── middleware/        # Express middleware
│   └── db.ts              # Database connection and queries
├── shared/                # Shared types and utilities
└── package.json           # Dependencies and scripts
```

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL database
- Google OAuth credentials
- Google Gemini API key

### Installation

1. Clone the repository
```bash
git clone https://github.com/SakilMalek/SPAVIX-AI.git
cd SPAVIX-Vision
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env` file in the root directory:
```
DATABASE_URL=postgresql://user:password@localhost:5432/spavix
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=development
```

4. Start the development server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user

### Generations (Transformations)
- `POST /api/generations` - Create new transformation
- `GET /api/generations` - Get user's transformations
- `GET /api/generations/:id` - Get specific transformation
- `DELETE /api/generations/:id` - Delete transformation
- `PUT /api/generations/:id/project` - Link transformation to project

### Projects
- `POST /api/projects` - Create new project
- `GET /api/projects` - Get user's projects
- `GET /api/projects/:id` - Get specific project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/:id/transformations` - Get project's transformations
- `POST /api/projects/:id/share` - Generate share link

### Chat
- `POST /api/chat` - Send message to AI assistant

## Usage

### Creating a Transformation
1. Go to Dashboard
2. Upload a room image
3. Select a design style
4. Customize materials (wall color, floor type, etc.)
5. Click "Generate Transformation"
6. View before/after comparison

### Managing Projects
1. Go to Projects
2. Click "+" to create a new project
3. Enter project name and description
4. Click "New Design" to create transformations for the project
5. View all project transformations in the grid
6. Click "Share" to generate a shareable link

### Linking Existing Transformations
1. Go to History
2. Click the link icon on a transformation
3. Select a project from the dropdown
4. Click "Link" - linking happens instantly with optimistic updates

## Performance Optimizations

- **Optimistic UI Updates** - Instant feedback for user actions
- **React Query Caching** - Efficient data fetching and caching
- **Component Memoization** - Prevents unnecessary re-renders
- **Database Indexes** - Fast queries on frequently accessed columns
- **Image Optimization** - Compressed images for faster loading

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@spavix.com or open an issue on GitHub.

## Roadmap

- [ ] Advanced editing tools (inpainting, outpainting)
- [ ] AR preview for furniture placement
- [ ] Shopping integration for recommended products
- [ ] Team collaboration features
- [ ] Mobile app (iOS/Android)
- [ ] Advanced analytics and reporting

## Authors

- **Sakil Malek** - Initial work and development

## Acknowledgments

- Google Gemini API for AI image generation
- shadcn/ui for beautiful components
- React Query for data management
- All contributors and users
