

// Keep the service worker alive
const titles = [
    "Stay Hydrated! 💦",
    "Hydration Check ✅",
    "Time for a Water Break 🥤",
    "Drink Up! 🚰",
    "Keep Going! 🌊"
];



function printMessage(displayIntake, displayGoal, unit) {
    const messages = [
        `You're doing great! You've had ${displayIntake} ${unit} so far. Keep it up!`,
        `Hydration is key! You've reached ${displayIntake} ${unit}, aim for ${displayGoal} ${unit}!`,
        `Water is life! Stay on track with ${displayIntake} ${unit} out of ${displayGoal} ${unit}.`,
        `Small sips make a big difference! You're at ${displayIntake} ${unit} so far.`,
        `Time to refresh! You've had ${displayIntake} ${unit}, let's hit that ${displayGoal} ${unit} goal!`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
};

chrome.runtime.onStartup.addListener(() => {
    console.log("Extension restarted. Recreating alarms...");
    createAlarm();
    showNotification(); 
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed or updated");
    createAlarm();
    chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
});

// Event listener for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "waterReminder") {
        showNotification();
    } else if (alarm.name === "keepAlive") {
        console.log('Background script kept alive');
    }
});

function createAlarm() {
    chrome.storage.local.get(["notificationInterval"], (data) => {
        const interval = parseFloat(data.notificationInterval) || 60;
        chrome.alarms.create("waterReminder", {
            delayInMinutes: interval,
            periodInMinutes: interval
        });
    });
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "setAlarm") {
        createAlarm();
        sendResponse({ status: "Alarm set successfully" });
    } else if (request.action === "testNotification") {
        console.log("Test notification requested");
        showNotification();
        sendResponse({ status: "Test notification sent" });
    }
    return true;
});

function showNotification() {
    console.log("Showing notification");
    chrome.storage.local.get(["unit", "dailyGoal", "waterIntakes"], (data) => {
        const unit = data.unit || "mL";
        const dailyGoal = data.dailyGoal || 2000;
        const today = new Date().toLocaleDateString();
        const waterIntakes = data.waterIntakes || {};
        const todayIntake = waterIntakes[today] || 0;

        // Conversion factor: 1 cup = 240 mL
        const conversionFactor = 240;

        // Convert values for display based on the unit
        let displayIntake, displayGoal;

        if (unit === "cups") {
            displayIntake = (todayIntake / conversionFactor).toFixed(2);
            displayGoal = (dailyGoal / conversionFactor).toFixed(2);
        } else {
            displayIntake = todayIntake;
            displayGoal = dailyGoal;
        }
        const title = titles[Math.floor(Math.random() * titles.length)];
        const message = printMessage(displayIntake, displayGoal, unit);
        const messageText = `🚰 Time to drink water! You've had ${displayIntake} ${unit} out of ${displayGoal} ${unit}.`;
        const options = {
            type: "basic",
            title,
            iconUrl: chrome.runtime.getURL("src/assets/icon.png"),
            message,
            buttons: [
                { title: unit === "mL" ? "Add 200 mL" : "Add 1 cup" }, { title: "Intake Later" }
            ],
            priority: 2,
            requireInteraction: true 
        };

        chrome.notifications.create("waterReminder", options, (notificationId) => {
            if (chrome.runtime.lastError) {
                console.error("Notification creation failed:", chrome.runtime.lastError);
            } else {
               
            }
        });
        chrome.runtime.sendMessage({ action: "showAlert", message: messageText });
    });
}

// Event listener for notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    console.log("Notification button clicked:", notificationId, buttonIndex);
    if (notificationId === "waterReminder" && buttonIndex === 0) {
        addWaterIntake();
    }
});

function addWaterIntake() {
    console.log("here");

    const conversionFactor = 240; // 1 cup = 240 mL

    chrome.storage.local.get(["unit", "waterIntakes"], (data) => {
        const unit = data.unit || "mL";
        const waterIntakes = data.waterIntakes || {};

        const today = new Date().toLocaleDateString();
        let addAmount = 0; // Ensure it's initialized

        // 🔹 Fix: Assign `addAmount` correctly
        if (unit === "mL") {
            addAmount = 200; // Add 200 mL
        } else if (unit === "cups") {
            addAmount = conversionFactor; // Add 240 mL for 1 cup
        }

        // 🔹 Fix: Ensure `waterIntakes[today]` exists before adding
        waterIntakes[today] = (waterIntakes[today] || 0) + addAmount;

        // 🔹 Save updated intake
        chrome.storage.local.set({ waterIntakes }, () => {
            console.log("Water intake updated:", waterIntakes[today]);

            // 🔹 Send message to update popup UI
            chrome.runtime.sendMessage({ action: "updateIntake" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn("No receiver for updateIntake message:", chrome.runtime.lastError.message);
                } else {
                    console.log("Message sent successfully:", response);
                }
            });
        });
    });
}


function updateStreakAndCoins() {
    chrome.storage.local.get(["streak", "lastHydrationDate", "coins", "waterIntakes", "startDate"], (data) => {
        const today = new Date().toLocaleDateString();
        let streak = data.streak || 0;
        let lastHydrationDate = data.lastHydrationDate || null;
        let coins = data.coins || 0;
        let startDate = data.startDate || today; // Default to today if not set
        const waterIntakes = data.waterIntakes || {};
        const todayIntake = waterIntakes[today] || 0;

        // Calculate "Days Passed" since first hydration
        const startDateObj = new Date(startDate);
        const todayDateObj = new Date();
        const timeDiff = todayDateObj - startDateObj;
        const daysPassed = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1; // +1 to include today

        // Check if the user drank water today
        if (todayIntake > 0) {
            // If lastHydrationDate is yesterday, increase streak
            if (lastHydrationDate === getYesterdayDate()) {
                streak += 1;
            } else if (lastHydrationDate !== today) {
                // If the last hydration date is not yesterday and not today, reset streak
                streak = 1;
            }

            // Reward coins: 10 coins for each streak day
            coins += 10;

            // Save updated values
            chrome.storage.local.set({ 
                streak, 
                lastHydrationDate: today, 
                coins,
                startDate // Ensure startDate is saved
            }, () => {
                console.log(`📅 Streak: ${streak}, Coins: ${coins}, Days Passed: ${daysPassed}, Start Date: ${startDate}`);

                // ✅ Update the UI dynamically
                document.getElementById("streak-value").innerText = streak;
                document.getElementById("coins-value").innerText = coins;
                document.getElementById("total-intake-card").innerText = todayIntake + " mL"; 
                document.getElementById("days-passed").innerText = daysPassed; // ✅ Fixed "Days Passed"

                // ✅ Send message to update UI in case popup is open
                chrome.runtime.sendMessage({ action: "updateStreakCoins", streak, coins, intake: todayIntake, daysPassed }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn("No receiver for updateStreakCoins message:", chrome.runtime.lastError.message);
                    } else {
                        console.log("📩 Streak & coins update sent successfully:", response);
                    }
                });
            });
        }
    });
}

// Helper function to get yesterday's date
function getYesterdayDate() {
    let yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toLocaleDateString();
}



