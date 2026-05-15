// Load and display the usage count when popup opens
document.addEventListener('DOMContentLoaded', () => {
  loadCounter();

  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Reset your CleanCopy counter to zero?')) {
      chrome.storage.local.set({ usageCount: 0 }, () => {
        animateNumber(0);
      });
    }
  });
});

function loadCounter() {
  chrome.storage.local.get(['usageCount'], (result) => {
    const count = result.usageCount || 0;
    animateNumber(count);
  });
}

// Animate the counter number for a nice effect
function animateNumber(target) {
  const el = document.getElementById('usageCount');
  const current = parseInt(el.textContent) || 0;
  const duration = 400;
  const steps = 20;
  const stepTime = duration / steps;
  const increment = (target - current) / steps;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    const value = Math.round(current + increment * step);
    el.textContent = value;
    if (step >= steps) {
      el.textContent = target;
      clearInterval(timer);
    }
  }, stepTime);
}

// Live update if counter changes while popup is open
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.usageCount) {
    animateNumber(changes.usageCount.newValue);
  }
});