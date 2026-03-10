-- AlterTable: add unique constraint to User.name
ALTER TABLE "users" ADD CONSTRAINT "users_name_key" UNIQUE ("name");
