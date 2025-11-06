# Rent Management System

A full-stack MERN (MongoDB, Express, React, Node.js) application for managing rental properties, tenants, leases, and payments.

## Prerequisites

- Node.js (v14 or higher)
- SQL Server (2012 or higher)
- npm (comes with Node.js)

## Setup Instructions

### 1. Backend Setup

1. Navigate to the project root directory:
   ```bash
   cd rent-management-system
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following content (update with your SQL Server credentials):
   ```
   PORT=5000
   DB_SERVER=localhost
   DB_NAME=RentManagement
   DB_USER=your_username
   DB_PASSWORD=your_password
   ```

4. Run the SQL script to create the database and tables:
   - Open SQL Server Management Studio
   - Open the `database.sql` file
   - Execute the script to create the database schema

### 2. Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### 3. Running the Application

1. In the root directory, start both frontend and backend servers:
   ```bash
   npm run dev
   ```

2. The application will be available at:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## Project Structure

```
rent-management-system/
├── client/                 # Frontend React application
├── server.js               # Backend entry point
├── database.sql            # Database schema
├── .env                   # Environment variables
├── .gitignore
└── package.json
```

## Features

- Property Management
- Tenant Management
- Lease Management
- Rent Collection
- Maintenance Requests
- Payment Tracking
- Financial Reporting

## API Endpoints

- `GET /api/properties` - Get all properties
- `POST /api/properties` - Add a new property
- `GET /api/tenants` - Get all tenants
- `POST /api/tenants` - Add a new tenant
- `GET /api/leases` - Get all leases
- `POST /api/leases` - Create a new lease
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Record a new payment
- `GET /api/maintenance` - Get all maintenance requests
- `POST /api/maintenance` - Create a maintenance request

## Technologies Used

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express
- **Database**: SQL Server
- **Authentication**: JWT (JSON Web Tokens)

## License

This project is licensed under the MIT License.
