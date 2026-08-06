// ==========================================================================
// SIMULATION ENGINE STATE
// ==========================================================================
const state = {
  passenger: {
    view: 'home', // home, bid-room, active-ride, rating
    pickup: '123 Main St',
    dropoff: '456 Broadway Ave',
    category: 'ECONOMY',
    budget: 15.00,
    otp: '8492',
    activeBids: [],
    selectedBid: null,
  },
  driver: {
    view: 'offline', // offline, online, bid-console, ride-active
    online: false,
    earnings: 184.50,
    trips: 12,
    onlineTime: '5h 23m',
    balance: 324.50,
    bidSubmitted: null,
    tripState: 'idle', // idle, navigating-pickup, arrived, in-progress, completed
  },
  animationTimer: null,
  countdownTimer: null,
  countdownRemaining: 15,
};

// Map coordinates for mock animations (X, Y in SVG space)
const coords = {
  driverStart: { x: 100, y: 300 },
  pickup: { x: 100, y: 300 },
  intermediate: { x: 100, y: 100 },
  dropoff: { x: 300, y: 100 },
};

// Simulated Drivers database
const simulatedDriversList = [
  { id: 'sim_1', name: 'David S.', rating: '4.7', car: 'Hyundai Elantra (Silver)', price: 13.00, eta: 6, avatar: '👨🏼‍✈️' },
  { id: 'sim_2', name: 'Elena R.', rating: '4.9', car: 'Tesla Model 3 (Black)', price: 17.00, eta: 1, avatar: '👩🏻‍✈️' }
];

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initBudgetSlider();
  initOnlineSlider();
  initCategoryTabs();
  initBiddingTriggers();
  initDriverActions();
  initPassengerRating();
  resetAllViews();

  // Reset simulation hook
  document.getElementById('reset-simulation-btn').addEventListener('click', () => {
    location.reload();
  });
});

// ==========================================================================
// SCREEN UTILITIES
// ==========================================================================
function setPassengerView(viewId) {
  document.querySelectorAll('#passenger-screen-container .view').forEach(view => {
    view.classList.remove('active');
  });
  const activeView = document.getElementById(`p-view-${viewId}`);
  if (activeView) activeView.classList.add('active');
  state.passenger.view = viewId;
}

function setDriverView(viewId) {
  document.querySelectorAll('#driver-screen-container .view').forEach(view => {
    view.classList.remove('active');
  });
  const activeView = document.getElementById(`d-view-${viewId}`);
  if (activeView) activeView.classList.add('active');
  state.driver.view = viewId;
}

function resetAllViews() {
  setPassengerView('home');
  setDriverView('offline');
}

// Toast alerts
function showToast(message) {
  const toast = document.getElementById('toast-notif');
  document.getElementById('toast-message').innerText = message;
  toast.classList.add('active');
  setTimeout(() => {
    toast.classList.remove('active');
  }, 4000);
}

// ==========================================================================
// PASSENGER UI: BOOKING & BUDGET
// ==========================================================================
function initBudgetSlider() {
  const slider = document.getElementById('p-budget-slider');
  const display = document.getElementById('p-budget-val');
  const status = document.getElementById('p-gauge-status');
  const gauge = status.parentElement;

  slider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    state.passenger.budget = val;
    display.innerText = `$${val.toFixed(2)}`;

    // Color code slider responses
    if (val < 13.00) {
      status.innerText = 'Low chance of bids. Drivers may ignore.';
      gauge.className = 'budget-gauge low-chance';
      display.style.color = 'var(--brand-error)';
    } else if (val > 18.00) {
      status.innerText = 'Premium Speed. Fast bid responses!';
      gauge.className = 'budget-gauge';
      status.style.color = '#f97316'; // orange text
      display.style.color = '#f97316';
    } else {
      status.innerText = 'Sweet Spot ($13 - $18)';
      gauge.className = 'budget-gauge';
      status.style.color = 'var(--brand-success)';
      display.style.color = 'var(--pass-primary)';
    }
  });
}

function initCategoryTabs() {
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      const activeTab = e.currentTarget;
      activeTab.classList.add('active');
      state.passenger.category = activeTab.dataset.category;
    });
  });
}

// ==========================================================================
// DRIVER UI: ONLINE/OFFLINE SWIPER
// ==========================================================================
function initOnlineSlider() {
  const thumb = document.getElementById('d-online-thumb');
  const track = document.getElementById('d-online-track');
  const prompt = document.getElementById('d-slider-prompt');
  let isDragging = false;
  let startX = 0;
  let maxDelta = track.clientWidth - thumb.clientWidth - 8;

  // Touch and Mouse support
  const onStart = (e) => {
    if (state.driver.online) return;
    isDragging = true;
    startX = (e.type === 'touchstart') ? e.touches[0].clientX : e.clientX;
    thumb.style.transition = 'none';
  };

  const onMove = (e) => {
    if (!isDragging) return;
    const currentX = (e.type === 'touchmove') ? e.touches[0].clientX : e.clientX;
    let delta = currentX - startX;
    if (delta < 0) delta = 0;
    if (delta > maxDelta) delta = maxDelta;
    thumb.style.left = `${delta + 4}px`;

    // Percentage opacity change for text
    const percentage = delta / maxDelta;
    prompt.style.opacity = 1 - percentage;
  };

  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    thumb.style.transition = 'left 0.2s ease-out';
    const finalLeft = parseInt(thumb.style.left);

    if (finalLeft >= maxDelta * 0.75) {
      // Snap to end & Go Online
      thumb.style.left = `${maxDelta + 4}px`;
      goOnline();
    } else {
      // Return to start
      thumb.style.left = '4px';
      prompt.style.opacity = 1;
    }
  };

  // Mouse Listeners
  thumb.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);

  // Touch Listeners
  thumb.addEventListener('touchstart', onStart);
  window.addEventListener('touchmove', onMove);
  window.addEventListener('touchend', onEnd);
}

function goOnline() {
  state.driver.online = true;
  
  // Update status UI
  const badge = document.getElementById('d-status-text-badge');
  badge.innerText = 'ONLINE';
  badge.className = 'driver-status-badge online-badge';
  
  // Unlock pilot stats on dashboard
  document.getElementById('d-today-earnings').classList.remove('locked-stat');
  document.getElementById('d-trips-count').classList.remove('locked-stat');
  document.getElementById('d-online-time').classList.remove('locked-stat');
  document.getElementById('d-balance-val').classList.remove('locked-stat');
  
  document.getElementById('d-today-earnings').innerText = `$${state.driver.earnings.toFixed(2)}`;
  document.getElementById('d-trips-count').innerText = state.driver.trips;
  document.getElementById('d-online-time').innerText = state.driver.onlineTime;
  document.getElementById('d-balance-val').innerText = `$${state.driver.balance.toFixed(2)}`;

  // Enable Cash Out button
  const cashout = document.getElementById('d-cashout-btn');
  cashout.classList.remove('disabled');
  cashout.removeAttribute('disabled');

  showToast('You are now Online! Searching for ride requests.');

  // Transition to Live online radar
  setTimeout(() => {
    setDriverView('online');
  }, 1000);
}

function goOffline() {
  state.driver.online = false;
  
  // Reset slider handle
  const thumb = document.getElementById('d-online-thumb');
  thumb.style.left = '4px';
  document.getElementById('d-slider-prompt').style.opacity = 1;

  // Lock status UI
  const badge = document.getElementById('d-status-text-badge');
  badge.innerText = 'OFFLINE';
  badge.className = 'driver-status-badge offline-badge';
  
  // Relock stats
  document.getElementById('d-today-earnings').classList.add('locked-stat');
  document.getElementById('d-trips-count').classList.add('locked-stat');
  document.getElementById('d-online-time').classList.add('locked-stat');
  document.getElementById('d-balance-val').classList.add('locked-stat');

  // Disable Cash Out button
  const cashout = document.getElementById('d-cashout-btn');
  cashout.classList.add('disabled');
  cashout.setAttribute('disabled', 'true');

  setDriverView('offline');
  showToast('You are now Offline.');
}

document.getElementById('d-go-offline-btn').addEventListener('click', goOffline);

// ==========================================================================
// CORE SIMULATION FLOW: BIDDING ROOM & TIMERS
// ==========================================================================
function initBiddingTriggers() {
  document.getElementById('p-find-drivers-btn').addEventListener('click', startBidding);
  document.getElementById('p-cancel-request-btn').addEventListener('click', cancelBidding);
}

function startBidding() {
  setPassengerView('bid-room');
  state.passenger.activeBids = [];
  
  // Clear lists
  const container = document.getElementById('p-bids-list-container');
  container.innerHTML = `
    <div class="empty-bids-state" id="p-empty-bids">
      <p>Broadcasting your budget to nearby drivers...</p>
    </div>
  `;

  // Start simulated incoming bids from other automated drivers
  setTimeout(() => {
    injectSimulatedBid(simulatedDriversList[0]); // David S (Cheapest)
  }, 3000);

  setTimeout(() => {
    injectSimulatedBid(simulatedDriversList[1]); // Elena R (Fastest)
  }, 6000);

  // Trigger Driver App interaction if online!
  if (state.driver.online && state.driver.view === 'online') {
    setTimeout(() => {
      triggerDriverRequestConsole();
    }, 2000);
  } else {
    // Alert the user that they can go online on the right to participate!
    setTimeout(() => {
      showToast('Pilot app is offline. Slide to ONLINE on the right to bid!');
    }, 1500);
  }
}

function cancelBidding() {
  setPassengerView('home');
  showToast('Request cancelled.');
  // Return driver to online search if they were bidding
  if (state.driver.view === 'bid-console') {
    stopDriverCountdown();
    setDriverView('online');
  }
}

// Simulated automated bids helper
function injectSimulatedBid(driverInfo) {
  if (state.passenger.view !== 'bid-room') return;
  
  // Remove empty states
  const emptyState = document.getElementById('p-empty-bids');
  if (emptyState) emptyState.remove();

  const container = document.getElementById('p-bids-list-container');
  
  const card = document.createElement('div');
  card.className = 'bid-card';
  card.id = `bid-${driverInfo.id}`;
  card.innerHTML = `
    <div class="bid-driver-pic">${driverInfo.avatar}</div>
    <div class="bid-details">
      <div class="bid-driver-name">${driverInfo.name} &bull; ⭐ ${driverInfo.rating}</div>
      <div class="bid-car-info">${driverInfo.car}</div>
      <div class="bid-eta">${driverInfo.eta} min away</div>
    </div>
    <div class="bid-price-action">
      <div class="bid-amount font-outfit">$${driverInfo.price.toFixed(2)}</div>
      <button class="accept-bid-btn font-outfit" onclick="acceptBid('${driverInfo.id}', ${driverInfo.price}, '${driverInfo.name}', '${driverInfo.car}', '${driverInfo.rating}')">Accept</button>
    </div>
  `;
  container.appendChild(card);
}

// Trigger Request Sheet on the Driver Side
function triggerDriverRequestConsole() {
  setDriverView('bid-console');
  showToast('New Ride Request alert in your radar!');

  // Set Passenger budget displays
  document.getElementById('d-request-budget').innerText = `$${state.passenger.budget.toFixed(2)}`;
  document.getElementById('d-bid-match-val').innerText = `$${state.passenger.budget.toFixed(2)}`;
  
  // Set alternatives based on passenger budget
  const budget = state.passenger.budget;
  document.getElementById('d-bid-mid-val').innerText = `$${(budget + 2.50).toFixed(2)}`;
  document.getElementById('d-bid-high-val').innerText = `$${(budget + 5.00).toFixed(2)}`;

  // Start 15s countdown
  startDriverCountdown();
}

function startDriverCountdown() {
  stopDriverCountdown();
  state.countdownRemaining = 15;
  const bar = document.getElementById('d-countdown-progress');
  const digits = document.getElementById('d-timer-digits');

  bar.style.transition = 'none';
  bar.style.width = '100%';

  state.countdownTimer = setInterval(() => {
    state.countdownRemaining--;
    digits.innerText = `${state.countdownRemaining}s`;
    
    // Animate progress bar width
    bar.style.transition = 'width 1s linear';
    bar.style.width = `${(state.countdownRemaining / 15) * 100}%`;

    // Alert color changes
    if (state.countdownRemaining <= 5) {
      bar.style.backgroundColor = 'var(--brand-error)';
      digits.style.backgroundColor = 'var(--brand-error-bg)';
      digits.style.color = 'var(--brand-error)';
    } else {
      bar.style.backgroundColor = 'var(--driver-primary)';
      digits.style.backgroundColor = 'var(--brand-success-bg)';
      digits.style.color = 'var(--driver-primary)';
    }

    if (state.countdownRemaining <= 0) {
      stopDriverCountdown();
      declineRequest();
    }
  }, 1000);
}

function stopDriverCountdown() {
  if (state.countdownTimer) {
    clearInterval(state.countdownTimer);
    state.countdownTimer = null;
  }
}

function declineRequest() {
  stopDriverCountdown();
  setDriverView('online');
  showToast('Request declined/timed out.');
}

// Bidding Console Interactions
function initDriverActions() {
  document.getElementById('d-decline-request-btn').addEventListener('click', declineRequest);
  
  // Bid matching button
  document.getElementById('d-bid-match-btn').addEventListener('click', () => {
    submitDriverBid(state.passenger.budget);
  });
  // Alternative bids
  document.getElementById('d-bid-mid-btn').addEventListener('click', () => {
    submitDriverBid(state.passenger.budget + 2.50);
  });
  document.getElementById('d-bid-high-btn').addEventListener('click', () => {
    submitDriverBid(state.passenger.budget + 5.00);
  });

  // Trip milestones
  document.getElementById('d-arrived-btn').addEventListener('click', driverArrives);
  document.getElementById('d-verify-otp-btn').addEventListener('click', verifyOTP);
  document.getElementById('d-complete-btn').addEventListener('click', completeRide);
}

function submitDriverBid(amount) {
  stopDriverCountdown();
  state.driver.bidSubmitted = amount;
  showToast(`Bid of $${amount.toFixed(2)} submitted! Waiting for passenger.`);
  
  // Transition driver to waiting state inside request feed
  setDriverView('online');

  // Inject bid onto the Passenger side!
  if (state.passenger.view === 'bid-room') {
    const emptyState = document.getElementById('p-empty-bids');
    if (emptyState) emptyState.remove();

    const container = document.getElementById('p-bids-list-container');
    const card = document.createElement('div');
    card.className = 'bid-card best-value-highlight';
    card.id = 'bid-driver-michael';
    card.innerHTML = `
      <div class="bid-driver-pic">👨🏻‍✈️</div>
      <div class="bid-details">
        <div class="bid-driver-name">Michael D. (You) &bull; ⭐ 4.9</div>
        <div class="bid-car-info">Toyota Camry (White)</div>
        <div class="bid-eta">2 min away</div>
      </div>
      <div class="bid-price-action">
        <div class="bid-amount font-outfit">$${amount.toFixed(2)}</div>
        <button class="accept-bid-btn font-outfit" onclick="acceptBid('driver-michael', ${amount}, 'Michael D.', 'Toyota Camry', '4.9')">Accept</button>
      </div>
    `;
    
    // Insert at top since it is our primary driver bid!
    container.insertBefore(card, container.firstChild);
    showToast('Your pilot bid is now visible to the passenger!');
  }
}

// Global window hook for inline Accept button calls
window.acceptBid = function(bidId, amount, name, car, rating) {
  state.passenger.selectedBid = { bidId, amount, name, car, rating };
  
  // Set tracking UI displays
  document.getElementById('p-driver-name').innerText = name;
  document.getElementById('p-driver-car').innerText = car;
  document.getElementById('p-driver-rating').innerText = rating;
  document.getElementById('p-ride-cost-pill').innerText = `$${amount.toFixed(2)}`;
  
  // Trigger OTP displays
  const randomizedOTP = Math.floor(1000 + Math.random() * 9000).toString();
  state.passenger.otp = randomizedOTP;
  document.getElementById('p-otp-display').innerText = randomizedOTP;

  // Transition Passenger View
  setPassengerView('active-ride');

  // If the accepted bid was our pilot (Michael D)
  if (bidId === 'driver-michael') {
    showToast('Bid accepted! Commencing navigation to pickup.');
    
    // Prepare Driver UI for trip
    setDriverView('ride-active');
    document.getElementById('d-ride-action-title').innerText = 'Navigate to Pickup';
    document.getElementById('d-ride-price-badge').innerText = `$${amount.toFixed(2)}`;
    document.getElementById('d-active-trip-banner').innerText = 'Distance to Pickup: 0.5 miles';
    document.getElementById('d-arrived-btn').style.display = 'block';
    document.getElementById('d-otp-form').style.display = 'none';
    document.getElementById('d-complete-btn').style.display = 'none';
    state.driver.tripState = 'navigating-pickup';

    // Start simulated vehicle movement towards pickup (X:100, Y:300)
    animateVehicle('d-car-marker', coords.driverStart, coords.pickup, 3000, () => {
      showToast('You have arrived at the pickup location.');
    });
    
    // Sync Passenger vehicle marker
    animateVehicle('p-driver-marker', coords.driverStart, coords.pickup, 3000);
  } else {
    // Accepted automated driver
    showToast(`Assigned to ${name}. Simulated trip beginning.`);
    // Return our active driver to Online dashboard search
    setDriverView('online');
    
    // Animate map tracking coordinates
    animateVehicle('p-driver-marker', {x: 100, y: 100}, coords.pickup, 2000, () => {
      document.getElementById('p-verification-banner').innerText = 'Driver has arrived!';
      document.getElementById('p-verification-banner').style.backgroundColor = 'var(--brand-success)';
      
      // Simulate passenger boarding and automatically starting the trip (in a real app, this happens when OTP is entered)
      setTimeout(() => {
        document.getElementById('p-ride-status-title').innerText = 'Trip In Progress';
        document.getElementById('p-verification-banner').style.display = 'none';
        document.getElementById('p-otp-box').style.display = 'none';
        
        // Drive to dropoff (X:300, Y:100)
        animateVehicle('p-driver-marker', coords.pickup, coords.dropoff, 5000, () => {
          // Trip ends
          setPassengerView('rating');
          document.getElementById('p-rating-driver-name').innerText = name;
        });
      }, 3000);
    });
  }
};

// Driver Arrived milestone
function driverArrives() {
  state.driver.tripState = 'arrived';
  document.getElementById('d-ride-action-title').innerText = 'Verify Passenger';
  document.getElementById('d-arrived-btn').style.display = 'none';
  document.getElementById('d-otp-form').style.display = 'flex';
  document.getElementById('d-active-trip-banner').innerText = 'Passenger Boarding...';

  // Sync passenger notification banner
  document.getElementById('p-verification-banner').innerText = 'Driver has arrived! Provide OTP to begin.';
  document.getElementById('p-verification-banner').style.backgroundColor = 'var(--brand-success)';

  // Autofill OTP helper for review testing
  showToast(`Boarding jane. Passenger OTP code is: ${state.passenger.otp}`);
  
  // Set focus on first OTP box
  document.getElementById('d-otp-1').focus();
  setupOTPDigitInputs();
}

function setupOTPDigitInputs() {
  const inputs = document.querySelectorAll('.otp-digit-input');
  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      if (e.target.value.length === 1 && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && e.target.value.length === 0 && index > 0) {
        inputs[index - 1].focus();
      }
    });
  });
}

// OTP Validation
function verifyOTP() {
  const digit1 = document.getElementById('d-otp-1').value;
  const digit2 = document.getElementById('d-otp-2').value;
  const digit3 = document.getElementById('d-otp-3').value;
  const digit4 = document.getElementById('d-otp-4').value;
  const enteredOTP = `${digit1}${digit2}${digit3}${digit4}`;

  if (enteredOTP === state.passenger.otp) {
    showToast('OTP code verified! Starting ride.');
    
    // Transition Driver view to active ride
    state.driver.tripState = 'in-progress';
    document.getElementById('d-ride-action-title').innerText = 'Trip In Progress';
    document.getElementById('d-otp-form').style.display = 'none';
    document.getElementById('d-complete-btn').style.display = 'block';
    document.getElementById('d-active-trip-banner').innerText = 'Navigating to Broadway Ave';

    // Update Passenger view status
    document.getElementById('p-ride-status-title').innerText = 'Trip In Progress';
    document.getElementById('p-verification-banner').style.display = 'none';
    document.getElementById('p-otp-box').style.display = 'none';

    // Animate both maps to drop-off (X:300, Y:100)
    animateVehicle('d-car-marker', coords.pickup, coords.dropoff, 6000, () => {
      document.getElementById('d-active-trip-banner').innerText = 'Arrived at Destination!';
      showToast('You have reached the destination. Complete the ride to collect fare.');
    });
    animateVehicle('p-driver-marker', coords.pickup, coords.dropoff, 6000);

  } else {
    showToast('Error: Incorrect OTP. Please try again.');
    // Clear digits
    document.querySelectorAll('.otp-digit-input').forEach(i => i.value = '');
    document.getElementById('d-otp-1').focus();
  }
}

// Complete Trip
function completeRide() {
  state.driver.tripState = 'completed';
  
  const fare = state.driver.bidSubmitted;
  const netEarnings = fare * 0.85; // 15% commission deduction
  
  // Update Driver financials
  state.driver.earnings += netEarnings;
  state.driver.balance += netEarnings;
  state.driver.trips += 1;

  document.getElementById('d-today-earnings').innerText = `$${state.driver.earnings.toFixed(2)}`;
  document.getElementById('d-balance-val').innerText = `$${state.driver.balance.toFixed(2)}`;
  document.getElementById('d-trips-count').innerText = state.driver.trips;
  document.getElementById('d-online-earnings-display').innerText = `$${state.driver.earnings.toFixed(2)}`;

  // Redraw daily sparkline with positive upward bump!
  updateSparklineGraph();

  showToast(`Trip complete! Earned $${netEarnings.toFixed(2)} (Net of fees)`);

  // Return Driver to Radar/Dashboard search
  setDriverView('online');

  // Transition Passenger to Ratings sheet
  setPassengerView('rating');
  document.getElementById('p-rating-driver-name').innerText = 'Michael D.';
}

// Redraw Sparkline Graph with new data
function updateSparklineGraph() {
  const svg = document.getElementById('d-sparkline');
  svg.innerHTML = `
    <svg class="sparkline-svg" viewBox="0 0 100 30">
      <path class="sparkline-path" d="M0,25 L20,22 L40,18 L60,15 L80,10 L100,3" />
    </svg>
  `;
}

// Passenger Ratings trigger
function initPassengerRating() {
  const stars = document.querySelectorAll('.star');
  let selectedRating = 0;

  stars.forEach(star => {
    star.addEventListener('mouseover', (e) => {
      const rating = parseInt(e.target.dataset.rating);
      highlightStars(rating);
    });
    star.addEventListener('mouseout', () => {
      highlightStars(selectedRating);
    });
    star.addEventListener('click', (e) => {
      selectedRating = parseInt(e.target.dataset.rating);
      highlightStars(selectedRating);
    });
  });

  document.getElementById('p-submit-rating-btn').addEventListener('click', () => {
    if (selectedRating === 0) {
      showToast('Please select a star rating first.');
      return;
    }
    showToast('Feedback submitted! Thank you for choosing Bid2Ride.');
    
    // Reset simulation completely back to homeexplore state
    setTimeout(() => {
      // Clean up values
      document.getElementById('p-feedback-text').value = '';
      resetStars();
      setPassengerView('home');
      
      // Reset markers on map
      resetMapMarkers();
    }, 1500);
  });

  function highlightStars(rating) {
    stars.forEach(star => {
      const idx = parseInt(star.dataset.rating);
      if (idx <= rating) {
        star.classList.add('selected');
      } else {
        star.classList.remove('selected');
      }
    });
  }

  function resetStars() {
    selectedRating = 0;
    stars.forEach(star => star.classList.remove('selected'));
  }
}

function resetMapMarkers() {
  const pMarker = document.getElementById('p-driver-marker');
  const dMarker = document.getElementById('d-car-marker');
  
  pMarker.setAttribute('transform', 'translate(-100,-100)');
  dMarker.setAttribute('transform', 'translate(100,300)');
  
  // Reset verification banner text
  document.getElementById('p-verification-banner').innerText = 'Share OTP with driver to start ride';
  document.getElementById('p-verification-banner').style.backgroundColor = 'var(--brand-error)';
  document.getElementById('p-verification-banner').style.display = 'block';
  document.getElementById('p-otp-box').style.display = 'flex';
  document.getElementById('p-ride-status-title').innerText = 'En Route';
}

// ==========================================================================
// VEHICLE TELEMETRY ANIMATOR
// ==========================================================================
function animateVehicle(elementId, startCoords, endCoords, duration, callback) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const startTime = performance.now();
  
  // Calculate intermediate segment values (since it's a grid route: X1,Y1 -> X1,Y2 -> X2,Y2)
  const isSegmented = (startCoords.x !== endCoords.x && startCoords.y !== endCoords.y);

  function updatePosition(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing linear mapping
    let currentX, currentY;
    let angle = 0;

    if (isSegmented) {
      // First move vertically/horizontally to intermediate (100, 300) -> (100, 100) -> (300, 100)
      if (progress < 0.5) {
        // First segment (Y transition)
        const segmentProgress = progress * 2;
        currentX = startCoords.x;
        currentY = startCoords.y + (coords.intermediate.y - startCoords.y) * segmentProgress;
        angle = (coords.intermediate.y < startCoords.y) ? 0 : 180; // Facing Up/Down
      } else {
        // Second segment (X transition)
        const segmentProgress = (progress - 0.5) * 2;
        currentX = coords.intermediate.x + (endCoords.x - coords.intermediate.x) * segmentProgress;
        currentY = endCoords.y;
        angle = (endCoords.x > coords.intermediate.x) ? 90 : -90; // Facing Right/Left
      }
    } else {
      currentX = startCoords.x + (endCoords.x - startCoords.x) * progress;
      currentY = startCoords.y + (endCoords.y - startCoords.y) * progress;
    }

    // Apply SVG translation and rotation
    el.setAttribute('transform', `translate(${currentX}, ${currentY}) rotate(${angle})`);

    if (progress < 1) {
      requestAnimationFrame(updatePosition);
    } else if (callback) {
      callback();
    }
  }

  requestAnimationFrame(updatePosition);
}
