// server/server.js

// 1. Imports
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const rentalApplicationRoutes = require('./routes/rentalApplicationRoutes');
const paymentRoutes  = require('./routes/paymentRoutes');
const uploadRoutes   = require('./routes/uploadRoutes');
const mpesaRoutes         = require('./routes/mpesaRoutes');
const maintenanceRoutes   = require('./routes/maintenanceRoutes');
const { startReceiptCron } = require('./services/receiptCron');
const { backfillAccountNumbers } = require('./services/accountNumber');
const RentalApplication = require('./models/rentalApplicationModel');

// 2. Environment Config and Database Connection
dotenv.config();
connectDB().then(() =>
  backfillAccountNumbers(RentalApplication).catch((err) =>
    console.error('[Accounts] Backfill failed:', err.message)
  )
);

// 3. Initialize Express App
const app = express(); // <-- CREATE THE APP FIRST!

// 4. Middleware Setup
// IMPORTANT: These should come BEFORE your routes are defined.
app.use(cors()); // Allows your frontend to talk to your backend
app.use(express.json()); // Allows your app to accept JSON data in request bodies

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 5. API Routes
// Define a basic route to make sure the server is alive
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the MyRentPal API' });
});

// Use the dedicated router file for all user-related routes
app.use('/api/users', userRoutes);

// Use the dedicated router file for all property-related routes
app.use('/api/properties', propertyRoutes);

// Use the dedicated router file for all rental application routes
app.use('/api/applications', rentalApplicationRoutes);

// Use the dedicated router file for all payment routes
app.use('/api/payments', paymentRoutes);

// Use the dedicated router file for image uploads
app.use('/api/upload', uploadRoutes);

// M-Pesa STK Push + C2B webhook callbacks
app.use('/api/mpesa', mpesaRoutes);

// Maintenance requests
app.use('/api/maintenance', maintenanceRoutes);

// 6. Define Port and Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running in development mode on port ${PORT}`);
  // Start the monthly receipt cron job
  startReceiptCron();
});