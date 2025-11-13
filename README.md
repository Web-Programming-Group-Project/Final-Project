# Final-Project
Web Programming Final Project

# Local Development
1. Install dependencies: `npm install`.
2. Create a `.env` file in the project root and add your Mongo connection string:
   ```
   MONGODB_URI=mongodb+srv://convo_db_user:POkT9iC7EiEE1rcw@cluster0.bpzjy1i.mongodb.net/retryWrites=true&w=majority&appName=Cluster0
   ```
   (The same variable must be configured in Netlify’s environment settings before deploying.)
3. Start the unified frontend + API dev server: `npm run dev`.  
   Netlify Dev will serve the Vite app and proxy the serverless API at `http://localhost:8888/.netlify/functions/api/*`.
4. Visit `http://localhost:8888` in your browser for the full experience. Press `Ctrl+C` to stop.

# Build
- `npm run build` – generate the production bundle in `dist/`.
- `npm run preview` – preview the built app locally.
