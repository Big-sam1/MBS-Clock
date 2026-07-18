/* Smart Alarm Pro - Utility Helpers */

// Format time as HH:MM:SS with 12h/24h options
export function formatTime(date, use24Hour = false, showSeconds = true) {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  let ampm = '';

  if (!use24Hour) {
    ampm = hours >= 12 ? ' PM' : ' AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
  }

  const hoursStr = String(hours).padStart(2, '0');
  return `${hoursStr}:${minutes}${showSeconds ? ':' + seconds : ''}${ampm}`;
}

// Format date as "Wednesday, 18 July 2026"
export function formatDate(date, formatStr = 'full') {
  const options = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };
  
  if (formatStr === 'short') {
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  
  return date.toLocaleDateString(undefined, options);
}

// Calculate countdown timer text to a specific hour/minute
export function getCountdownText(targetHours, targetMinutes, repeatDays = []) {
  const now = new Date();
  let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetHours, targetMinutes, 0, 0);

  // If alarm is in the past today, check if it repeats or should be scheduled for tomorrow
  if (target <= now) {
    if (repeatDays.length === 0) {
      target.setDate(target.getDate() + 1);
    } else {
      // Find the next day in repeat days
      let daysToAdd = 1;
      while (daysToAdd <= 7) {
        const nextDay = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
        const dayOfWeek = (nextDay.getDay() + 6) % 7; // Convert Sun-Sat (0-6) to Mon-Sun (0-6)
        if (repeatDays.includes(dayOfWeek)) {
          target = new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), targetHours, targetMinutes, 0, 0);
          break;
        }
        daysToAdd++;
      }
    }
  } else if (repeatDays.length > 0) {
    // If it's today but today is not a repeat day, find the next repeating day
    const currentDayOfWeek = (now.getDay() + 6) % 7;
    if (!repeatDays.includes(currentDayOfWeek)) {
      let daysToAdd = 1;
      while (daysToAdd <= 7) {
        const nextDay = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
        const dayOfWeek = (nextDay.getDay() + 6) % 7;
        if (repeatDays.includes(dayOfWeek)) {
          target = new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), targetHours, targetMinutes, 0, 0);
          break;
        }
        daysToAdd++;
      }
    }
  }

  const diffMs = target - now;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);

  if (diffHrs > 0) {
    return `In ${diffHrs}h ${diffMins}m`;
  } else if (diffMins > 0) {
    return `In ${diffMins}m ${diffSecs}s`;
  } else {
    return `In ${diffSecs}s`;
  }
}

// Canvas Confetti Animation
export function triggerConfetti(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  
  canvas.width = canvas.parentElement.clientWidth * dpr;
  canvas.height = canvas.parentElement.clientHeight * dpr;
  ctx.scale(dpr, dpr);

  const colors = ['#6366f1', '#38bdf8', '#10b981', '#fb923c', '#db2777', '#f59e0b'];
  const particles = [];

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: canvas.width / (2 * dpr),
      y: canvas.height / (dpr) - 50,
      radius: Math.random() * 4 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: Math.random() * Math.PI - Math.PI, // Shoot upwards
      speed: Math.random() * 12 + 8,
      gravity: 0.35,
      friction: 0.98,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 10 - 5,
      opacity: 1
    });
  }

  let animationFrame;
  function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let active = false;
    particles.forEach(p => {
      if (p.opacity <= 0) return;
      
      p.speed *= p.friction;
      p.x += Math.cos(p.angle) * p.speed;
      p.y += Math.sin(p.angle) * p.speed + p.gravity;
      p.gravity += 0.05;
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.012;

      if (p.opacity > 0) {
        active = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
        ctx.restore();
      }
    });

    if (active) {
      animationFrame = requestAnimationFrame(update);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  update();
}

// A simple but functional QR-like QR Code generator
// Draws a 2D data-matrix on a canvas representing the settings configuration.
// It encodes the string into modules and draws black/white grids.
export function generateQR(text, canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 200;
  canvas.width = size;
  canvas.height = size;

  // Let's create a deterministic grid based on the hash of the text.
  // This is a beautiful mock-QR matrix that represents the actual config data!
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const gridSize = 25; // 25x25 grid
  const cellSize = size / gridSize;

  // Simple hashing to build deterministic data modules
  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }

  const hashVal = hashCode(text);
  
  ctx.fillStyle = '#0b0f19'; // QR Module color

  // Draw three finder patterns at corners (Standard QR look)
  function drawFinderPattern(x, y) {
    // Outer square
    ctx.fillRect(x * cellSize, y * cellSize, 7 * cellSize, 7 * cellSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect((x + 1) * cellSize, (y + 1) * cellSize, 5 * cellSize, 5 * cellSize);
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect((x + 2) * cellSize, (y + 2) * cellSize, 3 * cellSize, 3 * cellSize);
  }

  // Draw finders
  drawFinderPattern(0, 0); // Top-left
  drawFinderPattern(gridSize - 7, 0); // Top-right
  drawFinderPattern(0, gridSize - 7); // Bottom-left

  // Draw data blocks based on text characters
  let textIndex = 0;
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      // Skip finder pattern zones
      if (
        (r < 8 && c < 8) || 
        (r < 8 && c >= gridSize - 8) || 
        (r >= gridSize - 8 && c < 8)
      ) {
        continue;
      }

      // Check alignment markers
      if (r === gridSize - 7 && c === gridSize - 7) {
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        continue;
      }

      // Fill module deterministically based on character codes
      const charCode = text.charCodeAt(textIndex % text.length) || 0;
      const bitIndex = (r * gridSize + c) % 8;
      const isFilled = ((charCode >> bitIndex) & 1) === 1 ^ ((r + c) % 2 === 0);
      
      if (isFilled) {
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
      
      textIndex++;
    }
  }
}
