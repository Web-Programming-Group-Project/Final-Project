# Final-Project
Web Programming Final Project

# Set Up Steps
1. Make sure npm is installed
2. clone repository
3. Run `npm install` in terminal to download packages
5. `cd` into the server directory 
6. Create a .env file and copy and paste this code into it:
    ```
    PORT=8080
    MONGODB_URI=mongodb+srv://convo_db_user:POkT9iC7EiEE1rcw@cluster0.bpzjy1i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
    JWT_SECRET=Yk+KJtpuSU0CfyjPzrNW2cL9XQm/JZxDKQ38bBdDuhM=
    CORS_ORIGIN=http://localhost:5173
    COOKIE_SECURE=false 
    ```
6. Run `npm install` in terminal to download server specific packages
7. Run `npm run dev` in root and server directory to locally host web app
