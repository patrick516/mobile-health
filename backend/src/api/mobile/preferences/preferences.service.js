// src/api/mobile/preferences/preferences.service.js

import prisma from "../../../config/db.js";

export const getPreferences = async (userId) => {
  const preferences = await prisma.discoveryPreference.findUnique({
    where: { userId },
  });

  // Return defaults if not set yet
  if (!preferences) {
    return {
      lookingFor: "everyone",
      minAge: 18,
      maxAge: 99,
      maxDistanceKm: 100,
      smoking: null,
      alcohol: null,
      children: null,
      relationshipGoal: null,
      exercise: null,
      diet: null,
      religion: null,
      education: null,
      interests: [],
    };
  }

  return preferences;
};

export const updatePreferences = (userId, body) => {
  const {
    looking_for,
    min_age,
    max_age,
    max_distance_km,
    smoking,
    alcohol,
    children,
    relationship_goal,
    exercise,
    diet,
    religion,
    education,
    interests,
  } = body;

  // Build update data — only include fields that were actually sent
  const data = {
    ...(looking_for && { lookingFor: looking_for }),
    ...(min_age && { minAge: Number(min_age) }),
    ...(max_age && { maxAge: Number(max_age) }),
    ...(max_distance_km && { maxDistanceKm: Number(max_distance_km) }),
    ...(smoking && { smoking }),
    ...(alcohol && { alcohol }),
    ...(children && { children }),
    ...(relationship_goal && { relationshipGoal: relationship_goal }),
    ...(exercise && { exercise }),
    ...(diet && { diet }),
    ...(religion && { religion }),
    ...(education && { education }),
    ...(interests && { interests }),
  };

  return prisma.discoveryPreference.upsert({
    where: { userId },
    create: { userId, ...data },
    update: { ...data },
  });
};
