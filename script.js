document.addEventListener('DOMContentLoaded', () => {
    const booksGrid = document.getElementById('books-grid');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const categoryTitle = document.getElementById('current-category-title');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    const captionText = document.getElementById('modal-caption');
    const closeModal = document.querySelector('.close-modal');

    let allBooks = {};

    const shelfNames = {
        "000": "000 Generalità",
        "100": "100 Filosofia e psicologia",
        "200": "200 Religione",
        "300": "300 Scienze sociali",
        "400": "400 Scienze del linguaggio",
        "500": "500 Scienze naturali e matematica (scienze pure)",
        "600": "600 Tecnologia (scienze applicate)",
        "700": "700 Le arti",
        "800": "800 Letteratura e retorica",
        "900": "900 Geografia e storia"
    };

    // ---- CONFIGURAZIONE GOOGLE DRIVE ----
    // INSERISCI QUI I TUOI DATI
    const API_KEY = 'AIzaSyDnPURxUwGBfOw0MweRbAvAU3AG0auRVH8';
    const G_DRIVE_ROOT_FOLDER_ID = '1lfTyameWDUKxQjlVjt5TN2WjlDsuMY4F';

    // Funzione per caricare i libri da Google Drive
    async function loadBooks() {
        if (API_KEY === 'INSERISCI_QUI_LA_TUA_API_KEY_DI_GOOGLE_CLOUD' || G_DRIVE_ROOT_FOLDER_ID === 'INSERISCI_QUI_L_ID_DELLA_CARTELLA_PRINCIPALE') {
            booksGrid.innerHTML = '<div class="loading">Devi inserire la tua API Key e l\'ID della cartella principale nel file <strong>script.js</strong> per visualizzare i libri da Google Drive.</div>';
            return;
        }

        try {
            // 1. Trova tutte le sottocartelle (Categorie) nella cartella radice
            const urlFolders = `https://www.googleapis.com/drive/v3/files?q='${G_DRIVE_ROOT_FOLDER_ID}'+in+parents+and+mimeType%3D'application%2Fvnd.google-apps.folder'+and+trashed%3Dfalse&fields=files(id,name)&key=${API_KEY}`;
            const resFolders = await fetch(urlFolders);
            const dataFolders = await resFolders.json();

            if (dataFolders.error) {
                throw new Error(dataFolders.error.message);
            }

            const folders = dataFolders.files || [];
            allBooks = {};

            // 2. Per ogni cartella, preleva i file immagine all'interno
            const fetchPromises = folders.map(async (folder) => {
                const urlFiles = `https://www.googleapis.com/drive/v3/files?q='${folder.id}'+in+parents+and+mimeType+contains+'image%2F'+and+trashed%3Dfalse&fields=files(id,name,thumbnailLink)&key=${API_KEY}`;
                const resFiles = await fetch(urlFiles);
                const dataFiles = await resFiles.json();

                if (dataFiles.files && dataFiles.files.length > 0) {
                    allBooks[folder.name] = dataFiles.files; // Salva la lista di oggetti {id, name}
                } else {
                    allBooks[folder.name] = []; // Categoria vuota
                }
            });

            // Aspetta che tutte le chiamate API terminino
            await Promise.all(fetchPromises);

            // Genera i filtri dinamicamente in base alle cartelle trovate
            generateFilters();

            renderBooks('all');
        } catch (error) {
            console.error('Errore dettagliato nel caricamento da Google Drive:', error);
            const errorMessage = error.message || "Errore sconosciuto.";
            booksGrid.innerHTML = `<div class="loading" style="color: #f87171;">
                <strong>Impossibile caricare i dati.</strong><br>
                Motivo: ${errorMessage}<br><br>
                <small>Premi F12 (Strumenti per Sviluppatori) e apri la scheda "Console" per maggiori dettagli.</small>
            </div>`;
        }
    }

    // Funzione per generare i pulsanti e il dropdown di filtro
    function generateFilters() {
        const filtersContainer = document.getElementById('category-filters');

        // Rimuovi pulsanti esistenti (tranne fullscreen) e dropwdown precedenti
        const oldFilters = filtersContainer.querySelectorAll('.filter-btn, .shelves-select-container');
        oldFilters.forEach(f => f.remove());

        const categories = Object.keys(allBooks);
        const standardCats = categories.filter(cat => !/^\d+$/.test(cat));
        const numericalCats = categories.filter(cat => /^\d+$/.test(cat)).sort((a, b) => parseInt(a) - parseInt(b));

        // 1. Crea il pulsante "Tutti"
        const allBtn = document.createElement('button');
        allBtn.className = 'filter-btn active';
        allBtn.setAttribute('data-category', 'all');
        allBtn.textContent = 'Tutti';
        filtersContainer.prepend(allBtn);

        // 2. Aggiungi pulsanti per categorie testuali
        standardCats.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.setAttribute('data-category', category);
            btn.textContent = category;
            filtersContainer.insertBefore(btn, fullscreenBtn);
        });

        // 3. Aggiungi Dropdown per categorie numeriche (Scaffali)
        if (numericalCats.length > 0) {
            const selectContainer = document.createElement('div');
            selectContainer.className = 'shelves-select-container';

            const select = document.createElement('select');
            select.className = 'shelves-select';
            select.id = 'shelves-select';

            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.disabled = true;
            defaultOption.selected = true;
            defaultOption.textContent = "Scaffali ▼";
            select.appendChild(defaultOption);

            numericalCats.forEach(num => {
                const opt = document.createElement('option');
                opt.value = num;
                opt.textContent = shelfNames[num] || num;
                select.appendChild(opt);
            });

            selectContainer.appendChild(select);
            filtersContainer.insertBefore(selectContainer, fullscreenBtn);

            select.addEventListener('change', () => {
                const filterBtns = filtersContainer.querySelectorAll('.filter-btn');
                filterBtns.forEach(b => b.classList.remove('active'));
                const selectedCat = select.value;
                renderBooks(selectedCat);
            });
        }

        // 4. Gestione click pulsanti
        const filterBtns = filtersContainer.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const select = document.getElementById('shelves-select');
                if (select) select.selectedIndex = 0;

                const category = btn.getAttribute('data-category');
                renderBooks(category);
            });
        });
    }

    // Funzione per visualizzare i libri
    function renderBooks(categoryFilter) {
        booksGrid.innerHTML = '';

        let booksToShow = [];

        if (categoryFilter === 'all') {
            categoryTitle.textContent = 'Tutti i Libri';
            Object.keys(allBooks).forEach(cat => {
                allBooks[cat].forEach(fileData => {
                    booksToShow.push({ category: cat, file: fileData });
                });
            });
        } else {
            categoryTitle.textContent = shelfNames[categoryFilter] || categoryFilter;
            if (allBooks[categoryFilter]) {
                allBooks[categoryFilter].forEach(fileData => {
                    booksToShow.push({ category: categoryFilter, file: fileData });
                });
            }
        }

        if (booksToShow.length === 0) {
            booksGrid.innerHTML = '<div class="loading">Nessun libro trovato in questa categoria. Aggiungi delle foto alle cartelle!</div>';
            return;
        }

        booksToShow.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';

            const fileName = book.file.name;
            const fileId = book.file.id;

            // Usa il thumbnailLink fornito dall'API di Google Drive se disponibile
            // Rimuovendo =s220 alla fine per avere l'immagine a risoluzione più alta
            let imageUrl = '';
            if (book.file.thumbnailLink) {
                imageUrl = book.file.thumbnailLink.replace(/=s\d+$/, '=s800'); // Forza la larghezza a 800px per migliore qualità
            } else {
                imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`; // Fallback (spesso bloccato da Google di recente)
            }

            // Estrae il nome dalla foto (rimuove estensione e sostituisce underscore/trattini con spazi)
            const displayName = fileName.split('.')[0].replace(/[_-]/g, ' ');
            const displayCategory = shelfNames[book.category] || book.category;

            card.innerHTML = `
                <div class="book-img-container">
                    <img src="${imageUrl}" alt="${displayName}" loading="lazy">
                </div>
                <div class="book-info">
                    <div class="book-title" title="${displayName}">${displayName}</div>
                    <div class="book-category">${displayCategory}</div>
                </div>
            `;

            // Apertura modal al click
            card.addEventListener('click', () => {
                modal.style.display = "block";
                modalImg.src = imageUrl;
                captionText.innerHTML = displayName;
            });

            booksGrid.appendChild(card);
        });
    }

    // Nota: La gestione dei filtri è stata spostata in generateFilters per i pulsanti dinamici

    // Gestione chiusura modal
    closeModal.addEventListener('click', () => {
        modal.style.display = "none";
    });

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    });

    // Gestione Tasto ESC per chiudere modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });

    // Gestione Fullscreen
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Errore nel tentativo di attivare il fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });

    // Gestione Pulsante Torna Su
    const backToTopBtn = document.getElementById('back-to-top-btn');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });
        
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Avvio caricamento
    loadBooks();
});
