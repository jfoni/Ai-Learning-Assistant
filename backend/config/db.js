import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
    console.error('MongoDB connection failed:');
    console.dir(error, { depth: 5 });
    throw error;
}
};

export default connectDB;