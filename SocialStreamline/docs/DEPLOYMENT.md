# Deployment Guide

## Deployment Options

### Option 1: Deploy via Replit

The easiest way to deploy ThreadSpire is directly from Replit:

1. Click the "Deploy" button in your Replit project
2. Follow the prompts to deploy your application
3. Your application will be accessible at a `.replit.app` domain

### Option 2: Deploy to a VPS/Cloud Provider

To deploy to a VPS or cloud provider like DigitalOcean, AWS, GCP, etc.:

1. Clone your repository to the server
   ```bash
   git clone https://github.com/yourusername/threadspire.git
   cd threadspire
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   Create a `.env` file with these required variables:
   ```
   DATABASE_URL=postgresql://username:password@hostname:port/database
   SESSION_SECRET=your_secret_key
   NODE_ENV=production
   ```

4. Build the application
   ```bash
   npm run build
   ```

5. Start the server
   ```bash
   npm start
   ```

6. Set up a reverse proxy (Nginx, Apache) to serve your application

#### Example Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 3: Deploy to Vercel/Netlify/Similar Platforms

For platforms that separate frontend and backend:

1. Configure your build settings to:
   - Build command: `npm run build`
   - Output directory: `dist/client`
   - Install command: `npm install`

2. Add environment variables in your platform settings

3. You may need to create a `vercel.json` or `netlify.toml` configuration file for proper API routing

## Database Considerations

For production environments, use a managed PostgreSQL service like:

- [Neon](https://neon.tech/)
- [Supabase](https://supabase.io/)
- [Amazon RDS](https://aws.amazon.com/rds/)
- [DigitalOcean Managed Databases](https://www.digitalocean.com/products/managed-databases-postgresql/)

Update your `DATABASE_URL` environment variable with the production database connection string.

## Security Recommendations

1. Use a strong, unique `SESSION_SECRET`
2. Ensure your PostgreSQL database is secured with strong passwords
3. Consider using environment-specific configuration files
4. Implement proper HTTPS/SSL in production