document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const suggestions = document.getElementById('suggestions');
    const results = document.getElementById('results');
    const error = document.getElementById('error');
    
    let allMoves = [];
    let abortController = new AbortController();

    // Initialize application
    async function initialize() {
        try {
            const response = await fetch('https://pokeapi.co/api/v2/move?limit=1000');
            if (!response.ok) throw new Error('Failed to fetch moves');
            const data = await response.json();
            allMoves = data.results.map(move => move.name);
            setupEventListeners();
        } catch (err) {
            showError('Failed to load moves. Please check your connection and refresh.');
        }
    }

    // Event listeners setup
    function setupEventListeners() {
        searchInput.addEventListener('input', debounce(handleSearchInput, 300));
        searchInput.addEventListener('keydown', handleSearchNavigation);
        suggestions.addEventListener('click', handleSuggestionClick);
    }

    // Debounce function
    function debounce(fn, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    }

    // Handle search input
    function handleSearchInput(e) {
        const input = e.target.value.trim();
        showSuggestions(input);
    }

    // Show suggestions
    function showSuggestions(input) {
        suggestions.innerHTML = '';
        if (!input) return;

        const filteredMoves = allMoves.filter(move =>
            move.toLowerCase().startsWith(input.toLowerCase())
        ).slice(0, 8);

        suggestions.setAttribute('role', 'listbox');
        searchInput.setAttribute('aria-expanded', filteredMoves.length > 0);

        filteredMoves.forEach(move => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = move;
            div.setAttribute('role', 'option');
            div.setAttribute('tabindex', '0');
            div.addEventListener('keydown', handleSuggestionKeyboard);
            suggestions.appendChild(div);
        });
    }

    // Handle suggestion click
    function handleSuggestionClick(e) {
        if (e.target.classList.contains('suggestion-item')) {
            selectMove(e.target.textContent);
        }
    }

    // Handle keyboard navigation
    function handleSearchNavigation(e) {
        const items = Array.from(suggestions.querySelectorAll('.suggestion-item'));
        
        if (e.key === 'ArrowDown' && items.length > 0) {
            e.preventDefault();
            items[0].focus();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            selectMove(searchInput.value.trim());
        }
    }

    // Handle suggestion keyboard events
    function handleSuggestionKeyboard(e) {
        const items = Array.from(suggestions.querySelectorAll('.suggestion-item'));
        const currentIndex = items.indexOf(e.target);

        switch (e.key) {
            case 'Enter':
                selectMove(e.target.textContent);
                break;
            case 'ArrowDown':
                e.preventDefault();
                items[(currentIndex + 1) % items.length].focus();
                break;
            case 'ArrowUp':
                e.preventDefault();
                items[(currentIndex - 1 + items.length) % items.length].focus();
                break;
            case 'Escape':
                suggestions.innerHTML = '';
                searchInput.focus();
                break;
        }
    }

    // Select move and fetch data
    async function selectMove(moveName) {
        abortController.abort();
        abortController = new AbortController();

        if (!moveName) return;

        searchInput.value = moveName;
        suggestions.innerHTML = '';
        error.textContent = '';
        results.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const moveResponse = await fetch(
                `https://pokeapi.co/api/v2/move/${moveName.toLowerCase()}`,
                { signal: abortController.signal }
            );

            if (!moveResponse.ok) throw new Error('Move not found');
            
            const moveData = await moveResponse.json();
            const pokemonList = moveData.learned_by_pokemon;

            if (pokemonList.length === 0) {
                throw new Error('No Pokémon can learn this move');
            }

            const pokemonDetails = await Promise.all(
                pokemonList.slice(0, 20).map(pokemon => 
                    fetch(pokemon.url, { signal: abortController.signal })
                        .then(res => res.json())
                )
            );

            displayResults(pokemonDetails);
        } catch (err) {
            if (err.name !== 'AbortError') {
                showError(err.message || 'An error occurred. Please try again.');
                results.innerHTML = '';
            }
        }
    }

    // Display results
    function displayResults(pokemonList) {
        results.innerHTML = pokemonList.map(pokemon => `
            <div class="pokemon-card" data-id="${pokemon.id}">
                <img class="pokemon-image" 
                     src="${pokemon.sprites.other['official-artwork']?.front_default || pokemon.sprites.front_default}" 
                     alt="${pokemon.name}"
                     loading="lazy">
                <h3>${pokemon.name}</h3>
                <div class="types-container">
                    ${pokemon.types.map(type => `
                        <div class="type-badge" style="background-color: ${getTypeColor(type.type.name)}">
                            ${type.type.name}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // Add hover delay for smooth animation
        const cards = document.querySelectorAll('.pokemon-card');
        cards.forEach(card => {
            card.style.transitionDelay = `${Math.random() * 0.2}s`;
        });
    }

    // Show error messages
    function showError(message) {
        error.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                ${message}
            </div>
        `;
    }

    // Get type color from CSS variables
    function getTypeColor(type) {
        const colorMap = {
            fire: 'var(--fire)',
            water: 'var(--water)',
            grass: 'var(--grass)',
            electric: 'var(--electric)',
            psychic: 'var(--psychic)',
            ice: 'var(--ice)',
            dragon: 'var(--dragon)',
            dark: 'var(--dark)',
            fairy: 'var(--fairy)',
            normal: 'var(--normal)',
            fighting: 'var(--fighting)',
            flying: 'var(--flying)',
            poison: 'var(--poison)',
            ground: 'var(--ground)',
            rock: 'var(--rock)',
            bug: 'var(--bug)',
            ghost: 'var(--ghost)',
            steel: 'var(--steel)'
        };
        return colorMap[type] || '#a8a878';
    }

    // Initialize the application
    initialize();
});