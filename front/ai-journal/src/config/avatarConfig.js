/**
 * KONFIGURACJA AWATARÓW - SYSTEM MACIERZOWY (3x3x3)
 * * System dzieli statystyki na 3 Tiery (Poziomy):
 * 1. LOW (1)  = 0 - 39 pkt (Słaby / Leniwy / Chory)
 * 2. MID (2)  = 40 - 79 pkt (Przeciętny / Stabilny / Zdrowy)
 * 3. HIGH (3) = 80 - 100 pkt (Potężny / Nieugięty / Witalny)
 * * To daje unikalny klucz w formacie: "S-W-H" (np. "3-1-2" to Silny-Leniwy-Zdrowy).
 */

// Helper: Zamienia punkty (0-100) na Tier (1-3)
const getTier = (value) => {
    if (value < 40) return 1; // LOW
    if (value < 80) return 2; // MID
    return 3;                 // HIGH
};

export const getAvatarForScore = (S, W, H, isThinking = false) => {

    // --- 0. NADPISANIA SPECJALNE ---

    // A. AI MYŚLI (Terminal)
    if (isThinking) {
        return {
            image: '/assets/avatars/terminal.png', // Obrazek: Zielony terminal Fallouta z migającym kursorem
            label: 'PRZETWARZANIE...',
            desc: 'Łączenie z bazą danych Krypt...'
        };
    }

    // B. STAN KRYTYCZNY (Zdrowie < 20)
    // Nieważne jak silny jesteś, jak umierasz to umierasz.
    if (H < 20) {
        return {
            image: '/assets/avatars/pipboy_wrak.png', // Obrazek: PipBoy cały w bandażach, na wózku lub o kulach
            label: 'STAN KRYTYCZNY',
            desc: 'Wymagana natychmiastowa pomoc medyczna!'
        };
    }

    // --- 1. OBLICZANIE KLUCZA ---
    const tS = getTier(S || 0);
    const tW = getTier(W || 0);
    const tH = getTier(H || 0);
    const key = `${tS}-${tW}-${tH}`; // np. "3-1-2"

    // --- 2. MAPA AWATARÓW (27 MOŻLIWOŚCI) ---
    
    const avatarMap = {
        
        // ==================================================================================
        // TIER 1 SIŁY (Słaby fizycznie / Chudy)
        // ==================================================================================

        // S1 + W1 (Słaby i Leniwy)
        "1-1-1": { 
            img: 'pipboy_s1_w1_h1.png', // Obrazek: PipBoy leżący na ziemi, smutny, może z kroplówką
            label: 'WRAK CZŁOWIEKA', 
            desc: 'Brak siły, brak woli, brak zdrowia. Dno.' 
        },
        "1-1-2": { 
            img: 'pipboy_s1_w1_h2.png', // Obrazek: PipBoy siedzący na kanapie z chipsami (gruby/zapuszczony)
            label: 'KANAPOWIEC', 
            desc: 'Zdrowy, ale marnuje życie na kanapie.' 
        },
        "1-1-3": { 
            img: 'pipboy_s1_w1_h3.png', // Obrazek: PipBoy leży na hamaku, zrelaksowany, drink w ręku
            label: 'SZCZĘŚLIWY LENIWIEC', 
            desc: 'Tryska zdrowiem, ale palcem nie kiwnie.' 
        },

        // S1 + W2 (Słaby, ale Pracowity - "Korposzczur")
        "1-2-1": { 
            img: 'pipboy_s1_w2_h1.png', // Obrazek: PipBoy przy biurku, podkrążone oczy, kawa w ręku, wygląda na chrego
            label: 'BIUROWY ZOMBIE', 
            desc: 'Praca cię wykańcza. Zadbaj o siebie.' 
        },
        "1-2-2": { 
            img: 'pipboy_s1_w2_h2.png', // Obrazek: Zwykły PipBoy w garniturze lub koszuli (NPC)
            label: 'NORMIK / NPC', 
            desc: 'Przeciętny obywatel. Stabilnie.' 
        },
        "1-2-3": { 
            img: 'pipboy_s1_w2_h3.png', // Obrazek: PipBoy robiący jogę, bardzo chudy ale uśmiechnięty
            label: 'JOGIN AMATOR', 
            desc: 'Zdrowy duch w wątłym ciele.' 
        },

        // S1 + W3 (Słaby, ale Potężna Wola - "Nerd/Hacker")
        "1-3-1": { 
            img: 'pipboy_s1_w3_h1.png', // Obrazek: PipBoy podpięty do aparatury, wielka głowa/mózg
            label: 'MÓZG W SŁOIKU', 
            desc: 'Intelekt to wszystko co ci zostało.' 
        },
        "1-3-2": { 
            img: 'pipboy_s1_w3_h2.png', // Obrazek: PipBoy w okularach, z laptopem, typowy haker
            label: 'STUDENT IT', 
            desc: 'Wielki umysł, bicepsy nie istnieją.' 
        },
        "1-3-3": { 
            img: 'pipboy_s1_w3_h3.png', // Obrazek: PipBoy w fartuchu laboratoryjnym, trzymający fiolkę (Naukowic)
            label: 'GENIUSZ NAUKOWY', 
            desc: 'Szczyt intelektualny w zdrowym ciele.' 
        },


        // ==================================================================================
        // TIER 2 SIŁY (Przeciętna budowa / Fit)
        // ==================================================================================

        // S2 + W1 (Leniwy Średniak)
        "2-1-1": { 
            img: 'pipboy_s2_w1_h1.png', // Obrazek: PipBoy z papierosem, wygląda na cwaniaczka, lekko poturbowany
            label: 'CHORY BANDYTA', 
            desc: 'Masz potencjał, ale niszczysz go używkami.' 
        },
        "2-1-2": { 
            img: 'pipboy_s2_w1_h2.png', // Obrazek: PipBoy w stroju imprezowym, z piwem
            label: 'IMPREZOWICZ', 
            desc: 'Żyjesz chwilą, ćwiczysz tylko "czasami".' 
        },
        "2-1-3": { 
            img: 'pipboy_s2_w1_h3.png', // Obrazek: PipBoy oparty o ścianę, żujący gumę, wyluzowany (Greaser style)
            label: 'NATURALNY TALENT', 
            desc: 'Dobre geny, zerowa etyka pracy.' 
        },

        // S2 + W2 (Zbalansowany Średniak - "Bohater")
        "2-2-1": { 
            img: 'pipboy_s2_w2_h1.png', // Obrazek: PipBoy w brudnym stroju roboczym, zmęczony
            label: 'PRZEPRACOWANY', 
            desc: 'Robisz swoje, ale organizm mówi dość.' 
        },
        "2-2-2": { 
            img: 'pipboy_s2_w2_h2.png', // Obrazek: Klasyczny PipBoy z kciukiem w górę (Vault Boy)
            label: 'MIESZKANIEC KRYPTY', 
            desc: 'Złoty środek. Fundament społeczeństwa.' 
        },
        "2-2-3": { 
            img: 'pipboy_s2_w2_h3.png', // Obrazek: PipBoy w stroju Vault Secuirty (z pałką/pistoletem), wyprostowany
            label: 'STRAŻNIK', 
            desc: 'Gotowy na wszystko, zdyscyplinowany.' 
        },

        // S2 + W3 (Ambitny Średniak - "Lider")
        "2-3-1": { 
            img: 'pipboy_s2_w3_h1.png', // Obrazek: PipBoy nad mapami, wygląda na gorączkowego/szalonego
            label: 'FANATYK PRACY', 
            desc: 'Zajeździsz się na śmierć dla celu.' 
        },
        "2-3-2": { 
            img: 'pipboy_s2_w3_h2.png', // Obrazek: PipBoy w mundurze oficera, wskazujący palcem
            label: 'STRATEG', 
            desc: 'Planujesz każdy ruch. Umysł > Mięśnie.' 
        },
        "2-3-3": { 
            img: 'pipboy_s2_w3_h3.png', // Obrazek: PipBoy z flagą, w pełnym rynsztunku lekkim (Ranger)
            label: 'LIDER ODDZIAŁU', 
            desc: 'Kompetencja, siła i charyzma.' 
        },


        // ==================================================================================
        // TIER 3 SIŁY (Potężny / Kafar / Bestia)
        // ==================================================================================

        // S3 + W1 (Silny ale Leniwy/Głupi - "Mięśniak")
        "3-1-1": { 
            img: 'pipboy_s3_w1_h1.png', // Obrazek: PipBoy super-mutant lub bardzo napakowany ale z zieloną skórą/krostami
            label: 'TOKSYCZNY PAKER', 
            desc: 'Wielki, ale w środku wszystko gnije.' 
        },
        "3-1-2": { 
            img: 'pipboy_s3_w1_h2.png', // Obrazek: PipBoy prężący bicepsy przed lustrem, narcyz
            label: 'SIŁOWNIANY BRO', 
            desc: 'Tylko klata i biceps. Dzień nóg pomijany.' 
        },
        "3-1-3": { 
            img: 'pipboy_s3_w1_h3.png', // Obrazek: PipBoy z hantlami, uśmiechnięty, ale pusty wzrok
            label: 'BEZMÓZGI KAFAR', 
            desc: 'Czysta siła fizyczna. Niewiele więcej.' 
        },

        // S3 + W2 (Silny i Pracowity - "Wojownik")
        "3-2-1": { 
            img: 'pipboy_s3_w2_h1.png', // Obrazek: PipBoy z bliznami, w bandażach, ale stojący twardo (Weteran)
            label: 'WETERAN WOJENNY', 
            desc: 'Ciało połamane, ale duch walki został.' 
        },
        "3-2-2": { 
            img: 'pipboy_s3_w2_h2.png', // Obrazek: PipBoy niosący wielką skrzynię lub oponę (Strongman)
            label: 'STRONGMAN', 
            desc: 'Podnosisz traktory na śniadanie.' 
        },
        "3-2-3": { 
            img: 'pipboy_s3_w2_h3.png', // Obrazek: PipBoy w pancerzu wspomaganym (Power Armor) bez hełmu
            label: 'PALADYN BRACTWA', 
            desc: 'Elita fizyczna i mentalna.' 
        },

        // S3 + W3 (Perfekcja - "Giga Chad")
        "3-3-1": { 
            img: 'pipboy_s3_w3_h1.png', // Obrazek: PipBoy jako Ghul, ale wciąż potężny i mądry
            label: 'UPADŁY PÓŁBÓG', 
            desc: 'Niesamowita moc, ale czas cię dopada.' 
        },
        "3-3-2": { 
            img: 'pipboy_s3_w3_h2.png', // Obrazek: PipBoy cyborg / synth (pół maszyna)
            label: 'CYBORG T-800', 
            desc: 'Maszyna do osiągania celów. Bezbłędny.' 
        },
        "3-3-3": { 
            img: 'pipboy_s3_w3_h3.png', // Obrazek: PipBoy GIGA CHAD (kwadratowa szczęka, idealna sylwetka)
            label: 'GIGA CHAD', 
            desc: 'Szczyt ludzkiej ewolucji. Legenda.' 
        },
    };

    const config = avatarMap[key];

    // Fallback gdyby pliku nie było
    if (!config) {
        return {
            image: '/assets/avatars/pipboy_normik.png',
            label: `SYSTEM ERROR (${key})`,
            desc: 'Błąd w obliczeniach macierzy.'
        };
    }

    return {
        image: `/assets/avatars/${config.img}`, // Upewnij się, że pliki są w public/assets/avatars/
        label: config.label,
        desc: config.desc
    };
};