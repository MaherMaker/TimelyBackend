# Timely Backend

Backend server for the Timely Alarm Application built with Node.js, Express, TypeScript, and Firebase.

## Setup

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Firebase project with admin credentials

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/MaherMaker/TimelyBackEnd.git
   cd TimelyBackEnd
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Setup Firebase and environment variables

   - Copy `.env.example` to `.env`
   - Fill in your Firebase credentials and other configuration values

   **First, set up Firebase credentials:**

   1. Download the Firebase service account key from the Firebase Console:

      - Go to [Firebase Console](https://console.firebase.google.com/)
      - Select your project
      - Go to Project Settings > Service accounts
      - Click "Generate new private key"
      - Save the JSON file to `/media/mahermaker/Data512/Codes/TimelyMaherEdition/BackEnd/src/config/firebase-service-account-key.json`

   2. Then choose one of these options for configuration:

   **Option 1:** Use environment variables (recommended for production)

   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-service-account-email
   FIREBASE_PRIVATE_KEY="your-private-key"
   ```

   **Option 2:** Use service account file (easier for development)

   ```
   # Use absolute path for reliability
   FIREBASE_SERVICE_ACCOUNT_PATH=/full/path/to/your/firebase-service-account-key.json
   ```

4. Initialize the database

   ```bash
   npm run migrate
   ```

5. Start the development server
   ```bash
   npm run dev
   ```

## API Endpoints

### Auth Routes

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify` - Verify JWT token
- `POST /api/auth/refresh-token` - Refresh JWT token
- `POST /api/auth/logout` - Logout user

### Alarm Routes

- `GET /api/alarms` - Get all alarms for a user
- `GET /api/alarms/:id` - Get alarm by ID
- `POST /api/alarms` - Create a new alarm
- `PUT /api/alarms/:id` - Update an alarm
- `DELETE /api/alarms/:id` - Delete an alarm
- `PATCH /api/alarms/:id/toggle` - Toggle alarm on/off
- `POST /api/alarms/sync` - Sync alarms

### Device Routes

- `POST /api/devices/register` - Register device token for push notifications

## Running Tests

```bash
npm test
```

## Building for Production

```bash
npm run build
npm start
```

## Security Notes

- Keep your Firebase service account credentials secure and never commit them to the repository
- For production deployment, use environment variables for all sensitive information
- The Firebase service account file is excluded from git tracking in `.gitignore`
