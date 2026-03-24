require('dotenv').config();
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Exists' : 'Missing');
console.log('PORT:', process.env.PORT);
