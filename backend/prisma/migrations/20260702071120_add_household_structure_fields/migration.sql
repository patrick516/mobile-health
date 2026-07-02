-- CreateEnum
CREATE TYPE "WallMaterial" AS ENUM ('BRICK', 'MUD_CLAY', 'WOOD_TIMBER', 'IRON_SHEET', 'OTHER');

-- CreateEnum
CREATE TYPE "RoofMaterial" AS ENUM ('IRON_SHEET', 'GRASS_THATCH', 'TILES', 'PLASTIC_TARPAULIN', 'OTHER');

-- CreateEnum
CREATE TYPE "FloorType" AS ENUM ('CEMENT', 'MUD_EARTH', 'TILES', 'OTHER');

-- AlterEnum
ALTER TYPE "WaterSource" ADD VALUE 'RAIN_WATER';

-- AlterTable
ALTER TABLE "households" ADD COLUMN     "floor_type" "FloorType",
ADD COLUMN     "has_electricity" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roof_material" "RoofMaterial",
ADD COLUMN     "wall_material" "WallMaterial";
