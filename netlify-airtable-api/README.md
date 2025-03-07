# Netlify Airtable API

This project provides a serverless API using Netlify Functions to interact with an Airtable backend for managing attendees and check-ins.

## Project Structure

```
netlify-airtable-api
├── src
│   ├── functions
│   │   ├── checkin.js        # Netlify function for handling check-in requests
│   │   └── utils
│   │       └── airtable.js   # Utility functions for Airtable interactions
│   └── types
│       └── index.d.ts        # TypeScript types and interfaces
├── netlify.toml              # Netlify configuration file
├── package.json               # npm configuration file
└── README.md                  # Project documentation
```

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd netlify-airtable-api
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up your Airtable API key and base ID in your environment variables. You can create a `.env` file in the root directory with the following content:
   ```
   AIRTABLE_API_KEY=your_api_key
   AIRTABLE_BASE_ID=your_base_id
   ```

## API Usage

### Check-in API

- **Endpoint**: `/api/checkin`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "attendee@example.com"
  }
  ```

- **Description**: This endpoint checks if an attendee with the provided email exists. If the attendee exists, a new check-in entry is created. If not, a new attendee is created first, followed by the check-in entry.

## License

This project is licensed under the MIT License. See the LICENSE file for details.