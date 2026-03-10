-- Drop DB-stored refresh tokens table (replaced by stateless JWT in httpOnly cookie)
DROP TABLE IF EXISTS "refresh_tokens";
