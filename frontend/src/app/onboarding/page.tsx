"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  updateProfile,
  uploadAvatar,
  savePrompts,
  completeOnboarding,
} from "@/lib/api";
import { Camera, ChevronRight, Check } from "lucide-react";

const PROMPT_QUESTIONS = [
  "Mon endroit favori à Ouagadougou / Bobo-Dioulasso",
  "Ce qui me fait sourire chaque matin",
  "Ma passion secrète",
  "Mon plat burkinabè préféré",
  "Ce que je cherche vraiment",
  "La qualité que j'admire le plus chez l'autre",
  "Mon weekend idéal",
  "Un rêve que j'ai pour l'avenir",
];

const STEPS = ["Photo", "Profil", "Préférences", "Prompts"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 0 - Photo
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Step 1 - Bio
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [birthdate, setBirthdate] = useState("");

  // Step 2 - Preferences
  const [lookingFor, setLookingFor] = useState("relation_serieuse");
  const [gender, setGender] = useState("homme");
  const [interestedIn, setInterestedIn] = useState("femme");

  // Step 3 - Prompts
  const [prompts, setPrompts] = useState([
    { question: PROMPT_QUESTIONS[0], answer: "" },
    { question: PROMPT_QUESTIONS[4], answer: "" },
  ]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleNext() {
    setLoading(true);
    try {
      if (step === 0) {
        if (avatarFile) await uploadAvatar(avatarFile);
        setStep(1);
      } else if (step === 1) {
        await updateProfile({ bio, city, birthdate });
        setStep(2);
      } else if (step === 2) {
        await updateProfile({
          gender,
          interested_in: interestedIn,
          looking_for_type: lookingFor,
        });
        setStep(3);
      } else if (step === 3) {
        const filtered = prompts.filter((p) => p.answer.trim().length > 0);
        if (filtered.length > 0) await savePrompts(filtered);
        await completeOnboarding();
        router.push("/discover");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-900 via-blue-800 to-blue-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i < step ? "bg-green-500 text-white" : i === step ? "bg-white text-blue-900" : "bg-white/20 text-white/50"}`}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-xs ${i === step ? "text-white" : "text-white/40"}`}
              >
                {s}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
          {/* Step 0: Photo */}
          {step === 0 && (
            <div className="text-center space-y-6">
              <h2 className="text-xl font-bold text-white">
                Ajoutez votre photo
              </h2>
              <p className="text-white/70 text-sm">
                Une belle photo augmente vos chances de 5x !
              </p>
              <div className="flex justify-center">
                <label className="cursor-pointer">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-white/10 border-4 border-dashed border-white/30 flex items-center justify-center hover:border-blue-400 transition">
                    {avatarPreview ? (
                      <Image
                        src={avatarPreview}
                        alt="Preview"
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="w-10 h-10 text-white/50" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-white/50 text-xs">
                Cliquez pour choisir une photo
              </p>
            </div>
          )}

          {/* Step 1: Bio */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Présentez-vous</h2>
              <div>
                <label className="block text-white/80 text-sm mb-1">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Parlez de vous en quelques mots..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">
                  Ville
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="">Choisir...</option>
                  <option value="Ouagadougou">Ouagadougou</option>
                  <option value="Bobo-Dioulasso">Bobo-Dioulasso</option>
                  <option value="Koudougou">Koudougou</option>
                  <option value="Banfora">Banfora</option>
                  <option value="Ouahigouya">Ouahigouya</option>
                </select>
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">
                  Date de naissance
                </label>
                <input
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
          )}

          {/* Step 2: Preferences */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Vos préférences</h2>
              <div>
                <label className="block text-white/80 text-sm mb-1">
                  Je suis
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="homme">Un homme</option>
                  <option value="femme">Une femme</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">
                  Je cherche
                </label>
                <select
                  value={interestedIn}
                  onChange={(e) => setInterestedIn(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="femme">Des femmes</option>
                  <option value="homme">Des hommes</option>
                  <option value="tout">Tout le monde</option>
                </select>
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">
                  Type de relation
                </label>
                <select
                  value={lookingFor}
                  onChange={(e) => setLookingFor(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="relation_serieuse">Relation sérieuse</option>
                  <option value="amitie">Amitié</option>
                  <option value="casual">Casual</option>
                  <option value="mariage">Mariage</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Prompts */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Vos prompts</h2>
              <p className="text-white/70 text-sm">
                Répondez à ces questions pour vous démarquer.
              </p>
              {prompts.map((p, i) => (
                <div key={i} className="space-y-2">
                  <select
                    value={p.question}
                    onChange={(e) => {
                      const updated = [...prompts];
                      updated[i] = { ...updated[i], question: e.target.value };
                      setPrompts(updated);
                    }}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
                  >
                    {PROMPT_QUESTIONS.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={p.answer}
                    maxLength={200}
                    onChange={(e) => {
                      const updated = [...prompts];
                      updated[i] = { ...updated[i], answer: e.target.value };
                      setPrompts(updated);
                    }}
                    placeholder="Votre réponse..."
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                  />
                </div>
              ))}
              {prompts.length < 3 && (
                <button
                  onClick={() =>
                    setPrompts([
                      ...prompts,
                      {
                        question:
                          PROMPT_QUESTIONS[prompts.length + 1] ||
                          PROMPT_QUESTIONS[0],
                        answer: "",
                      },
                    ])
                  }
                  className="text-sm text-blue-300 hover:text-white"
                >
                  + Ajouter un prompt
                </button>
              )}
            </div>
          )}

          <div className="mt-8 flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 bg-white/10 text-white font-medium py-3 rounded-xl hover:bg-white/20 transition"
              >
                Retour
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={loading}
              className="flex-1 bg-linear-to-r from-blue-600 to-blue-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                "..."
              ) : step === 3 ? (
                "Terminer "
              ) : (
                <>
                  <span>Suivant</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {step < 3 && (
            <button
              onClick={() => setStep(step + 1)}
              className="mt-3 w-full text-center text-white/40 hover:text-white/70 text-sm"
            >
              Passer cette étape
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
