let gameState = {
    money: 1000,
    hands: [],
    dealerHand: [],
    deck: [],
    currentHandIndex: 0,
    gamePhase: 'betting', // 'betting', 'playing', 'dealer', 'finished'
    gamesPlayed: 0,
    gamesWon: 0,
    totalBet: 0,
    currentBet: 5,
    numHands: 1
};

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
    const deck = [];
    for (let suit of suits) {
        for (let rank of ranks) {
            deck.push({
                suit: suit,
                rank: rank,
                value: getRankValue(rank),
                isRed: suit === '♥' || suit === '♦'
            });
        }
    }
    return shuffleDeck([...deck, ...deck, ...deck, ...deck]); // 4 decks
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function getRankValue(rank) {
    if (rank === 'A') return 11;
    if (['J', 'Q', 'K'].includes(rank)) return 10;
    return parseInt(rank);
}

function calculateHandValue(cards) {
    let value = 0;
    let aces = 0;

    for (let card of cards) {
        if (card.rank === 'A') {
            aces++;
            value += 11;
        } else {
            value += card.value;
        }
    }

    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }

    return value;
}

function setBet(amount) {
    gameState.currentBet = amount;

    // Update button states
    const buttons = document.querySelectorAll('.quick-bet-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === `$${amount}`) {
            btn.classList.add('active');
        }
    });
}

function setHands(num) {
    gameState.numHands = num;

    // Update button states
    const buttons = document.querySelectorAll('.hands-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === `${num} HAND${num > 1 ? 'S' : ''}`) {
            btn.classList.add('active');
        }
    });
}

function updateDisplay() {
    document.getElementById('money').textContent = `$${gameState.money}`;
    document.getElementById('totalBet').textContent = `$${gameState.totalBet}`;
    document.getElementById('handCount').textContent = gameState.hands.length || gameState.numHands;

    const winRate = gameState.gamesPlayed > 0 ?
        Math.round((gameState.gamesWon / gameState.gamesPlayed) * 100) : 0;
    document.getElementById('winRate').textContent = `${winRate}%`;

    // Update dealer
    const dealerValue = calculateHandValue(gameState.dealerHand);
    document.getElementById('dealerValue').textContent =
        gameState.gamePhase === 'betting' || gameState.gamePhase === 'playing' ?
            (gameState.dealerHand.length > 0 ? '?' : '0') : dealerValue;

    const dealerCardsEl = document.getElementById('dealerCards');
    dealerCardsEl.innerHTML = '';
    gameState.dealerHand.forEach((card, index) => {
        const cardEl = createCardElement(card,
            index === 1 && (gameState.gamePhase === 'betting' || gameState.gamePhase === 'playing'));
        dealerCardsEl.appendChild(cardEl);
    });

    // Update hands
    const container = document.getElementById('handsContainer');
    container.innerHTML = '';

    gameState.hands.forEach((hand, index) => {
        const handEl = document.createElement('div');
        handEl.className = `hand ${index === gameState.currentHandIndex ? 'active' : ''}`;

        const handValue = calculateHandValue(hand.cards);
        const isBusted = handValue > 21;
        const isBlackjack = handValue === 21 && hand.cards.length === 2;

        let statusText = '';
        if (hand.status === 'doubled') statusText = ' (DOUBLED)';
        else if (hand.status === 'surrendered') statusText = ' (SURRENDERED)';
        else if (hand.status === 'split') statusText = ' (SPLIT)';
        else if (isBlackjack && gameState.gamePhase !== 'betting') statusText = ' (BLACKJACK!)';
        else if (isBusted) statusText = ' (BUST!)';

        handEl.innerHTML = `
                    <div class="hand-header">
                        <div class="hand-title">HAND ${index + 1} - BET: $${hand.bet}${statusText}</div>
                        <div class="hand-value">${handValue}</div>
                    </div>
                    <div class="cards" id="handCards${index}"></div>
                    <div class="actions" id="handActions${index}"></div>
                `;

        const cardsEl = handEl.querySelector(`#handCards${index}`);
        hand.cards.forEach(card => {
            cardsEl.appendChild(createCardElement(card));
        });

        const actionsEl = handEl.querySelector(`#handActions${index}`);
        if (index === gameState.currentHandIndex && gameState.gamePhase === 'playing' &&
            !isBusted && !isBlackjack && hand.status === 'playing') {

            const canDouble = hand.cards.length === 2 && gameState.money >= hand.bet;
            const canSplit = hand.cards.length === 2 &&
                hand.cards[0].rank === hand.cards[1].rank &&
                gameState.money >= hand.bet && gameState.hands.length < 4;
            const canSurrender = hand.cards.length === 2;

            actionsEl.innerHTML = `
                        <button class="btn" onclick="hit()">HIT</button>
                        <button class="btn" onclick="stand()">STAND</button>
                        <button class="btn" onclick="doubleDown()" ${!canDouble ? 'disabled' : ''}>DOUBLE</button>
                        <button class="btn" onclick="surrender()" ${!canSurrender ? 'disabled' : ''}>SURRENDER</button>
                        <button class="btn" onclick="split()" ${!canSplit ? 'disabled' : ''}>SPLIT</button>
                    `;
        }

        container.appendChild(handEl);
    });

    // Update buttons
    const dealBtn = document.getElementById('dealBtn');
    const newGameBtn = document.getElementById('newGameBtn');

    if (gameState.gamePhase === 'betting') {
        dealBtn.style.display = 'inline-block';
        dealBtn.textContent = 'DEAL CARDS';
        dealBtn.disabled = false;
        newGameBtn.style.display = 'none';
    } else if (gameState.gamePhase === 'finished') {
        dealBtn.style.display = 'inline-block';
        dealBtn.textContent = 'NEXT HAND';
        dealBtn.disabled = false;
        newGameBtn.style.display = gameState.money < 5 ? 'inline-block' : 'none';
    } else {
        dealBtn.style.display = 'none';
        newGameBtn.style.display = 'none';
    }
}

function createCardElement(card, faceDown = false) {
    const cardEl = document.createElement('div');
    cardEl.className = `card ${card.isRed ? 'red' : ''} ${faceDown ? 'card-back' : ''}`;

    if (!faceDown) {
        cardEl.innerHTML = `
                    <div class="card-value">${card.rank}</div>
                    <div class="card-suit">${card.suit}</div>
                `;
    } else {
        cardEl.innerHTML = `<div style="color: #ffffff; font-size: 14px;">?</div>`;
    }

    // Add drag functionality
    addCardDragBehavior(cardEl);

    return cardEl;
}

function addCardDragBehavior(cardEl) {
  // prevent touch scrolling while dragging
  cardEl.style.touchAction = 'none';

  let dragging = false;
  let pointerId = null;
  let offsetX = 0, offsetY = 0;
  let placeholder = null;
  let startParent = null;
  let startNextSibling = null;

  cardEl.addEventListener('pointerdown', onDown);

  function onDown(e) {
    e.preventDefault();
    dragging = true;
    pointerId = e.pointerId;
    cardEl.setPointerCapture(pointerId);

    const rect = cardEl.getBoundingClientRect();

    // where inside the card we grabbed
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    // keep layout spot with a placeholder
    placeholder = document.createElement('div');
    placeholder.style.width = rect.width + 'px';
    placeholder.style.height = rect.height + 'px';
    startParent = cardEl.parentNode;
    startNextSibling = cardEl.nextSibling;
    startParent.insertBefore(placeholder, startNextSibling);

    // move card to body so it's not affected by transforms/overflow
    document.body.appendChild(cardEl);

    // lock size and position to the page
    cardEl.style.position = 'absolute';
    cardEl.style.width = rect.width + 'px';
    cardEl.style.height = rect.height + 'px';
    cardEl.style.left = (e.pageX - offsetX) + 'px';
    cardEl.style.top  = (e.pageY - offsetY) + 'px';
    cardEl.style.zIndex = '10000';
    cardEl.classList.add('dragging');

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  }

  function onMove(e) {
    if (!dragging) return;
    // follow the pointer exactly
    cardEl.style.left = (e.pageX - offsetX) + 'px';
    cardEl.style.top  = (e.pageY - offsetY) + 'px';
  }

  function onUp(e) {
    if (!dragging) return;
    dragging = false;

    try { cardEl.releasePointerCapture(pointerId); } catch {}

    // snap back to original place in the DOM
    startParent.insertBefore(cardEl, placeholder);
    placeholder.remove();
    placeholder = null;

    // clean styles
    cardEl.classList.remove('dragging');
    cardEl.classList.add('snapping-back'); // if you have a CSS animation
    cardEl.style.position = '';
    cardEl.style.width = '';
    cardEl.style.height = '';
    cardEl.style.left = '';
    cardEl.style.top = '';
    cardEl.style.zIndex = '';

    window.removeEventListener('pointermove', onMove);

    // optional: remove the snap class after your CSS duration
    setTimeout(() => cardEl.classList.remove('snapping-back'), 400);
  }
}

function startNewHand() {
    if (gameState.gamePhase === 'finished') {
        // Next hand
        gameState.hands = [];
        gameState.dealerHand = [];
        gameState.currentHandIndex = 0;
        gameState.gamePhase = 'betting';
        gameState.totalBet = 0;
        document.getElementById('message').textContent = '';
        document.getElementById('message').className = 'message';
    }

    const numHands = gameState.numHands;
    const betAmount = gameState.currentBet;
    const totalCost = numHands * betAmount;

    if (totalCost > gameState.money) {
        showMessage('Not enough money!', 'lose');
        return;
    }

    // Initialize deck if needed
    if (gameState.deck.length < 52) {
        gameState.deck = createDeck();
    }

    // Create hands
    gameState.hands = [];
    for (let i = 0; i < numHands; i++) {
        gameState.hands.push({
            cards: [],
            bet: betAmount,
            status: 'playing'
        });
    }

    gameState.money -= totalCost;
    gameState.totalBet = totalCost;
    gameState.dealerHand = [];
    gameState.currentHandIndex = 0;
    gameState.gamePhase = 'playing';

    // Deal initial cards
    for (let i = 0; i < 2; i++) {
        for (let hand of gameState.hands) {
            hand.cards.push(gameState.deck.pop());
        }
        gameState.dealerHand.push(gameState.deck.pop());
    }

    // Check for blackjacks
    checkForBlackjacks();

    updateDisplay();
}

function checkForBlackjacks() {
    const dealerBlackjack = calculateHandValue(gameState.dealerHand) === 21;

    for (let hand of gameState.hands) {
        const handValue = calculateHandValue(hand.cards);
        if (handValue === 21) {
            hand.status = 'blackjack';
        }
    }

    // If dealer has blackjack, resolve immediately
    if (dealerBlackjack) {
        gameState.gamePhase = 'finished';
        resolveHands();
        return;
    }

    // Move to next playable hand
    findNextHand();
}

function findNextHand() {
    while (gameState.currentHandIndex < gameState.hands.length) {
        const hand = gameState.hands[gameState.currentHandIndex];
        const handValue = calculateHandValue(hand.cards);

        if (hand.status === 'playing' && handValue < 21) {
            updateDisplay();
            return;
        }
        gameState.currentHandIndex++;
    }

    // All hands done, dealer plays
    gameState.gamePhase = 'dealer';
    setTimeout(() => dealerPlay(), 500); // Add slight delay for better UX
}

function hit() {
    const hand = gameState.hands[gameState.currentHandIndex];
    hand.cards.push(gameState.deck.pop());

    const handValue = calculateHandValue(hand.cards);
    if (handValue >= 21) {
        if (handValue > 21) hand.status = 'busted';
        else hand.status = 'stood';
        gameState.currentHandIndex++;
        setTimeout(() => findNextHand(), 300); // Add delay for better UX
    }

    updateDisplay();
}

function stand() {
    gameState.hands[gameState.currentHandIndex].status = 'stood';
    gameState.currentHandIndex++;
    setTimeout(() => findNextHand(), 300);
    updateDisplay();
}

function doubleDown() {
    const hand = gameState.hands[gameState.currentHandIndex];
    if (gameState.money >= hand.bet) {
        gameState.money -= hand.bet;
        gameState.totalBet += hand.bet;
        hand.bet *= 2;
        hand.cards.push(gameState.deck.pop());
        hand.status = 'doubled';
        gameState.currentHandIndex++;
        setTimeout(() => findNextHand(), 300);
        updateDisplay();
    }
}

function surrender() {
    const hand = gameState.hands[gameState.currentHandIndex];
    hand.status = 'surrendered';
    gameState.money += Math.floor(hand.bet / 2);
    gameState.currentHandIndex++;
    setTimeout(() => findNextHand(), 300);
    updateDisplay();
}

function split() {
    const hand = gameState.hands[gameState.currentHandIndex];
    if (gameState.money >= hand.bet && gameState.hands.length < 4) {
        gameState.money -= hand.bet;
        gameState.totalBet += hand.bet;

        const newHand = {
            cards: [hand.cards.pop()],
            bet: hand.bet,
            status: 'playing'
        };

        hand.cards.push(gameState.deck.pop());
        newHand.cards.push(gameState.deck.pop());

        gameState.hands.splice(gameState.currentHandIndex + 1, 0, newHand);

        updateDisplay();
    }
}

function dealerPlay() {
    updateDisplay(); // Show dealer's hole card

    const dealCards = () => {
        if (calculateHandValue(gameState.dealerHand) < 17) {
            gameState.dealerHand.push(gameState.deck.pop());
            updateDisplay();
            setTimeout(dealCards, 800); // Dealer draws cards with delay
        } else {
            gameState.gamePhase = 'finished';
            resolveHands();
        }
    };

    setTimeout(dealCards, 500);
}

function resolveHands() {
    const dealerValue = calculateHandValue(gameState.dealerHand);
    const dealerBusted = dealerValue > 21;
    const dealerBlackjack = dealerValue === 21 && gameState.dealerHand.length === 2;

    let totalWinnings = 0;
    let handsWon = 0;
    let results = [];

    for (let hand of gameState.hands) {
        const handValue = calculateHandValue(hand.cards);
        const playerBlackjack = handValue === 21 && hand.cards.length === 2;
        const playerBusted = handValue > 21;

        if (hand.status === 'surrendered') {
            results.push('Surrendered');
            continue;
        }

        if (playerBusted) {
            results.push('Bust');
        } else if (dealerBusted) {
            if (playerBlackjack) {
                totalWinnings += hand.bet * 2.5;
                results.push('Blackjack Win!');
            } else {
                totalWinnings += hand.bet * 2;
                results.push('Win');
            }
            handsWon++;
        } else if (playerBlackjack && !dealerBlackjack) {
            totalWinnings += hand.bet * 2.5;
            results.push('Blackjack Win!');
            handsWon++;
        } else if (!playerBlackjack && dealerBlackjack) {
            results.push('Dealer Blackjack');
        } else if (playerBlackjack && dealerBlackjack) {
            totalWinnings += hand.bet;
            results.push('Push');
        } else if (handValue > dealerValue) {
            totalWinnings += hand.bet * 2;
            results.push('Win');
            handsWon++;
        } else if (handValue < dealerValue) {
            results.push('Lose');
        } else {
            totalWinnings += hand.bet;
            results.push('Push');
        }
    }

    gameState.money += totalWinnings;
    gameState.gamesPlayed++;
    if (handsWon > 0) gameState.gamesWon++;

    const resultText = results.join(' | ');
    const netWin = totalWinnings - gameState.totalBet;
    const messageClass = handsWon > 0 ? 'win' : (totalWinnings > 0 ? 'push' : 'lose');
    showMessage(`${resultText} | Net: ${netWin}`, messageClass);

    updateDisplay();
}

function showMessage(text, type = '') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
}

function resetGame() {
    gameState = {
        money: 1000,
        hands: [],
        dealerHand: [],
        deck: createDeck(),
        currentHandIndex: 0,
        gamePhase: 'betting',
        gamesPlayed: 0,
        gamesWon: 0,
        totalBet: 0,
        currentBet: 5,
        numHands: 1
    };
    document.getElementById('message').textContent = '';
    document.getElementById('message').className = 'message';

    // Reset bet button states
    document.querySelectorAll('.quick-bet-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.quick-bet-btn').classList.add('active'); // Default to $5

    // Reset hands button states
    document.querySelectorAll('.hands-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.hands-btn').classList.add('active'); // Default to 1 hand

    updateDisplay();
}

// Initialize game
gameState.deck = createDeck();
updateDisplay();