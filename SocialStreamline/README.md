# ThreadSpire

A platform for creating, sharing, and organizing thoughtful long-form content in thread format.

## What is ThreadSpire?

ThreadSpire is a platform dedicated to creating and sharing long-form "wisdom threads" - structured, thoughtful content as an alternative to traditional social media. The platform allows users to:

- Create linked posts that form coherent threads
- React to others' content with emojis
- Bookmark favorite threads
- Organize content into collections
- Remix/fork threads

It aims to be a "social knowledge" platform rather than typical social media, focusing on depth and thoughtfulness.

## Features

- **Thread Creation**: Write and publish interconnected thoughts with rich text formatting
- **Reactions**: Express your response with various reaction types (🧠 🔥 👏 👀 ⚠️)
- **Collections**: Organize threads into personal collections
- **Bookmarks**: Save your favorite threads for later reading
- **User Profiles**: Showcase your authored threads and collections
- **Thread Remixing**: Build upon others' ideas by forking their threads

## Tech Stack

- **Frontend**: React with Typescript, TailwindCSS, shadcn/ui
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Editor**: TipTap-based rich text editor

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL database

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/threadspire.git
   cd threadspire
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   Create a `.env` file in the root directory with the following variables:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/threadspire
   SESSION_SECRET=your_secret_here
   ```

4. Set up the database
   ```
   npm run db:push
   ```

5. Start the development server
   ```
   npm run dev
   ```

## License

MIT
