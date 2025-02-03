document.addEventListener("DOMContentLoaded", function () {
    const unitSelect = document.getElementById("unit");
    const dailyGoalInput = document.getElementById("daily-goal");
    const saveSettingsButton = document.getElementById("save-settings");
    const resetHistoryButton = document.getElementById("reset-history");
    const notificationIntervalInput = document.getElementById("notification-interval");

    const conversionFactor = 240; // 1 cup = 240 mL
    let currentUnit = "mL";
    let dailyGoal = 2000;

    // Load current settings
    chrome.storage.local.get(["unit", "dailyGoal", "notificationInterval"], function (data) {
        currentUnit = data.unit || "mL";
        dailyGoal = data.dailyGoal || 2000;
        const notificationInterval = data.notificationInterval || 60; // Default 60 minutes

        unitSelect.value = currentUnit;
        dailyGoalInput.value = currentUnit === "cups" ? (dailyGoal / conversionFactor).toFixed(2) : dailyGoal;
        notificationIntervalInput.value = notificationInterval;
    });

    // Save settings
    saveSettingsButton.addEventListener("click", function () {
        const selectedUnit = unitSelect.value;
        const newDailyGoal = parseInt(dailyGoalInput.value);
        const notificationInterval = parseInt(notificationIntervalInput.value);

        chrome.storage.local.set({
            unit: selectedUnit,
            dailyGoal: selectedUnit === "cups" ? newDailyGoal * conversionFactor : newDailyGoal,
            notificationInterval: notificationInterval
        }, function () {
            alert("Settings saved!");

            // Send a message to the background script to set the alarm
            chrome.runtime.sendMessage({ action: "setAlarm", interval: notificationInterval }, function (response) {
                if (chrome.runtime.lastError) {
                    console.error("Error sending message to background script:", chrome.runtime.lastError.message);
                } else {
                    console.log(response.status); // Should log "Alarm set successfully"
                }
            });
        });
    });

    // Reset water intake history
    resetHistoryButton.addEventListener("click", function () {
        chrome.storage.local.set({ waterIntakes: {} }, function () {
            alert("History Cleared!");

            // Optionally, send a message to update the popup UI
            chrome.runtime.sendMessage({ action: "historyReset" }, function (response) {
                if (chrome.runtime.lastError) {
                    console.error("Error sending message:", chrome.runtime.lastError.message);
                } else {
                    console.log("History reset message sent:", response);
                }
            });
        });
    });

});
