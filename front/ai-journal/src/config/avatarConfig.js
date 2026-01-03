// src/config/avatarConfig.js

/* INSTRUKCJA:
  1. Wygeneruj ikony w AI.
  2. Zapisz je jako pliki .png w folderze public/assets/avatars/
  3. Dodaj wpis poniżej.
  
  System wybiera ikonę na podstawie ŚREDNIEJ (Average) ze statystyk S.W.H.
  lub możesz ustawić logikę per statystyka (np. inna ikona jak jesteś silny ale głupi).
*/

export const AVATAR_TIERS = [
  {
    minScore: 0,
    maxScore: 19,
    image: '/assets/avatars/pipboy_wrak.png', // User wygląda jak gówno
    label: 'Wrak Człowieka'
  },
  {
    minScore: 20,
    maxScore: 39,
    image: '/assets/avatars/pipboy_słaby.png',
    label: 'Początkujący'
  },
  {
    minScore: 40,
    maxScore: 59,
    image: '/assets/avatars/pipboy_normik.png',
    label: 'Przeciętniak'
  },
  {
    minScore: 60,
    maxScore: 79,
    image: '/assets/avatars/pipboy_fit.png',
    label: 'Dyscyplina'
  },
  {
    minScore: 80,
    maxScore: 94,
    image: '/assets/avatars/pipboy_chad.png',
    label: 'Giga Chad'
  },
  {
    minScore: 95,
    maxScore: 1000,
    image: '/assets/avatars/pipboy_god.png', // Złoty, świecący
    label: 'Transhumanizm'
  }
];

export const getAvatarForScore = (strength, willpower, health) => {
  // Prosta średnia - możesz to zmienić na ważoną
  const avg = (strength + willpower + health) / 3;
  
  const tier = AVATAR_TIERS.find(t => avg >= t.minScore && avg <= t.maxScore);
  return tier || AVATAR_TIERS[0]; // Fallback do najgorszego
};