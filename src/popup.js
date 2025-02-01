document.addEventListener("DOMContentLoaded", function () {
  console.log("Popup script loaded");
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
  const form = document.getElementById("intake-form");
  const waterAmountInput = document.getElementById("water-amount");
  const totalIntakeElement = document.getElementById("total-intake");
  const goalIntakeElement = document.getElementById("goal-intake");
  const celebrationElement = document.getElementById("celebration");
  const selectedDateIntakeElement = document.getElementById("intake-for-date");
  const selectedDateElement = document.getElementById("selected-date");
  const selectedDateSection = document.getElementById("selected-date-intake");
  const progressBarFill = document.getElementById("progress-bar-fill");

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
    } else {
      celebrationElement.classList.add("hidden");
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
    if (request.action === "showAlert") {
      alert(request.message);  
  }
  });
});
