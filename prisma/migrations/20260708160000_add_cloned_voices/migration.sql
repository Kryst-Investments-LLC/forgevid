-- Voices cloned from the user's own recordings (ElevenLabs voice-add).
CREATE TABLE "cloned_voices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerVoiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cloned_voices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cloned_voices_userId_providerVoiceId_key" ON "cloned_voices"("userId", "providerVoiceId");
CREATE INDEX "cloned_voices_userId_idx" ON "cloned_voices"("userId");

ALTER TABLE "cloned_voices"
    ADD CONSTRAINT "cloned_voices_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
