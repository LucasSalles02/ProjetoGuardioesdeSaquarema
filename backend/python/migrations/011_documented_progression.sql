-- Reclassify future mission rewards; preserve earned XP and activity history.
UPDATE missions SET xp_recompensa = CASE
    WHEN xp_recompensa IN (10,20,30) THEN xp_recompensa
    WHEN xp_recompensa <= 40 THEN 10
    WHEN xp_recompensa <= 60 THEN 20
    ELSE 30 END;
ALTER TABLE missions ADD CONSTRAINT mission_documented_xp CHECK (xp_recompensa IN (10,20,30));
