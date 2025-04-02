import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export const generateToken = (user: { userId: string; email: string; householdId?: string }) => {
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
    householdId: user.householdId // Include householdId if available
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Set your desired expiration time
  );
};
