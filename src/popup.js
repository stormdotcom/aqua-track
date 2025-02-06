document.addEventListener("DOMContentLoaded", function () {
  if (typeof flatpickr !== "undefined") {
    flatpickr("#date-picker", {
        dateFormat: "m/d/Y",
        onChange: function (selectedDates) {
            const selectedDate = selectedDates[0].toLocaleDateString();
            loadIntakeForDate(selectedDate);
        }
    });
} else {
    console.error("Flatpickr is not loaded");
}
updateStartDate();
loadStoredData();
  const form = document.getElementById("intake-form");
  const waterAmountInput = document.getElementById("water-amount");
  const totalIntakeElement = document.getElementById("total-intake");
  const goalIntakeElement = document.getElementById("goal-intake");
  const celebrationElement = document.getElementById("celebration");
  const selectedDateIntakeElement = document.getElementById("intake-for-date");
  const selectedDateElement = document.getElementById("selected-date");
  const selectedDateSection = document.getElementById("selected-date-intake");
  const progressBarFill = document.getElementById("progress-bar-fill");
  document.getElementById("copy-image").onclick = copyImageToClipboard;



  const conversionFactor = 240;
  let totalIntake = 0;
  let dailyGoal = 2000; 
  let unit = "mL";
  const today = new Date().toLocaleDateString();


  // Load saved intake, goal, and unit on load
  chrome.storage.local.get(["waterIntakes", "dailyGoal", "unit"], function (data) {
    const waterIntakes = data.waterIntakes || {};
    totalIntake = waterIntakes[today] || 0;
    dailyGoal = data.dailyGoal || 2000;
    unit = data.unit || "mL";
    updateTotalIntakeUI();
  });

  // Form submit to add intake
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const intakeAmount = parseInt(waterAmountInput.value);
    if (!isNaN(intakeAmount)) {
      totalIntake += unit === "cups" ? intakeAmount * conversionFactor : intakeAmount;
      saveIntake(today);
      updateTotalIntakeUI();
      loadStoredData();
      waterAmountInput.value = ""; // Clear input
      checkGoal(); // Check if the goal is met
    }
  });

  // Save water intake for a specific date
  function saveIntake(date) {
    chrome.storage.local.get(["waterIntakes"], function (data) {
      const waterIntakes = data.waterIntakes || {};
      waterIntakes[date] = totalIntake;
      chrome.storage.local.set({ waterIntakes });
    });
  }

  // Load intake for a specific date
  function loadIntakeForDate(date) {
    chrome.storage.local.get(["waterIntakes", "unit"], function (data) {
      const waterIntakes = data.waterIntakes || {};
      const intakeForDate = waterIntakes[date] || 0;
      const selectedUnit = data.unit || "mL";

      const displayIntake = selectedUnit === "cups" ? (intakeForDate / conversionFactor).toFixed(2) : intakeForDate;

      selectedDateIntakeElement.textContent = `${displayIntake} ${selectedUnit}`;
      selectedDateElement.textContent = date;
      selectedDateSection.classList.remove("hidden");
    });
  }

  // Check if the daily goal is met
  function checkGoal() {
    if (totalIntake >= dailyGoal) {
      celebrationElement.classList.remove("hidden");
      celebrationElement.classList.add("celebration-border");
      startCelebrationEffect(); 
    } else {
      celebrationElement.classList.add("hidden");
      celebrationElement.classList.remove("celebration-border"); // Remove animated border
        stopCelebrationEffect();
    }
  }

  // Update UI for today's intake and goal
  function updateTotalIntakeUI() {
    const displayIntake = unit === "cups" ? (totalIntake / conversionFactor).toFixed(2) : totalIntake;
    const displayGoal = unit === "cups" ? (dailyGoal / conversionFactor).toFixed(2) : dailyGoal;

    totalIntakeElement.textContent = `${displayIntake} ${unit}`;
    goalIntakeElement.textContent = `${displayGoal} ${unit}`;
    let progressPercentage = Math.min((totalIntake / dailyGoal) * 100, 100); // Ensures max is 100%

    // Update the progress bar width
    if (progressBarFill) {
      progressBarFill.style.width = `${progressPercentage}%`;
    }
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateIntake") {
      chrome.storage.local.get(["waterIntakes", "unit"], function (data) {
        const waterIntakes = data.waterIntakes || {};
        const today = new Date().toLocaleDateString();
        totalIntake = waterIntakes[today] || 0;
        unit = data.unit || "mL";
        updateTotalIntakeUI();
        checkGoal();
      });
    }
    if (request.action === "updateStreakCoins") {
      document.getElementById("streak-value").innerText = request.streak;
      document.getElementById("coins-value").innerText = request.coins;
  }
 
  });
});


function copyImageToClipboard() {
  const shareCard = document.querySelector("#share-card");
  const copyMessage = document.querySelector("#copy-message");

  if (!shareCard) {
      console.error("Element with ID 'share-card' not found!");
      return;
  }

  html2canvas(shareCard).then(canvas => {
      canvas.toBlob(blob => {
          if (blob) {
              const item = new ClipboardItem({ "image/png": blob });
              navigator.clipboard.write([item]).then(() => {
            
                  if (copyMessage) {
                    showClipboardNotification(); 
                      copyMessage.classList.remove("hidden");
                      setTimeout(function () {
                          copyMessage.classList.add("hidden");
                      }, 2000);
                  }
              }).catch(err => console.error("Clipboard write failed", err));
          }
      });
  }).catch(error => {
      console.error("Error capturing image:", error);
  });
}

function showClipboardNotification() {
  console.log("copy notification trigged")
  const options = {
      type: "basic",
      title: "✅ Image Copied!",
      iconUrl: chrome.runtime.getURL("src/assets/icon.png"), // Adjust path if needed
      message: "Your image has been copied to the clipboard. Paste it on social media!",
      priority: 2
  };

  chrome.notifications.create("clipboardSuccess", options, (notificationId) => {
      if (chrome.runtime.lastError) {
          console.error("Notification creation failed:", chrome.runtime.lastError);
      }
  });
}


function startCelebrationEffect() {
  console.log("🎉 Celebration effect triggered!");

  // Show the celebration container
  const celebrationContainer = document.getElementById("celebration");
  if (celebrationContainer) {
      celebrationContainer.classList.remove("hidden");
      celebrationContainer.classList.add("celebration-border"); // Apply animation
  }

  // Add balloons dynamically
  const balloonsContainer = document.getElementById("balloons-container");
  if (balloonsContainer) {
      balloonsContainer.innerHTML = ""; // Clear previous balloons
      for (let i = 0; i < 10; i++) {
          let balloon = document.createElement("div");
          balloon.classList.add("balloon");
          balloon.style.left = `${Math.random() * 100}%`;
          balloonsContainer.appendChild(balloon);
      }
  }

  // Hide celebration after 5 seconds
  setTimeout(() => {
      if (celebrationContainer) {
          celebrationContainer.classList.add("hidden");
      }
  }, 5000);
}

function loadStoredData() {
  chrome.storage.local.get(["waterIntakes", "dailyGoal", "unit", "streak", "coins"], function (data) {
      const today = new Date().toLocaleDateString();
      const waterIntakes = data.waterIntakes || {};
      const dailyGoal = data.dailyGoal || 2000;
      const unit = data.unit || "mL";
      const streak = data.streak || 0;
      const coins = data.coins || 0;
      const todayIntake = waterIntakes[today] || 0;

      // ✅ Update UI values
      document.getElementById("streak-value").innerText = streak;
      document.getElementById("coins-value").innerText = coins;
      document.getElementById("total-intake-card").innerText = `${todayIntake} ${unit}`;
      document.getElementById("goal-intake").innerText = `${dailyGoal} ${unit}`;

      console.log(`🔄 UI Updated: Streak = ${streak}, Coins = ${coins}, Intake = ${todayIntake} ${unit}`);
  });
}


function updateStartDate () {
  chrome.storage.local.get(["startDate"], function (data) {
    const today = new Date();
    const startDate = data.startDate || today.toLocaleDateString(); // Default to today if not set

    // Calculate days passed
    const startDateObj = new Date(startDate);
    const timeDiff = today - startDateObj;
    const daysPassed = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    // ✅ Update UI
    document.getElementById("days-passed").innerText = daysPassed;

    // ✅ Save start date if it's the user's first time
    if (!data.startDate) {
        chrome.storage.local.set({ startDate });
    }

    console.log(`📅 Days Passed: ${daysPassed} (Started from ${startDate})`);
});
}