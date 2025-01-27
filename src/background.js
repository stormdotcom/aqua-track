console.log("Background script starting...");

// Keep the service worker alive
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed or updated");
    createAlarm();
    chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
});

// Event listener for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log("Alarm fired:", alarm.name);
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
        console.log(`Alarm created with interval: ${interval} minutes`);
    });
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received in background:", request);
    if (request.action === "setAlarm") {
        createAlarm();
        sendResponse({ status: "Alarm set successfully" });
    } else if (request.action === "testNotification") {
        console.log("Test notification requested");
        showNotification();
        sendResponse({ status: "Test notification sent" });
    }
    return true; // Keeps the message channel open for asynchronous responses
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

        const options = {
            type: "basic",
            iconUrl: chrome.runtime.getURL("icon.png"),
            title: "Water Reminder",
            message: `Time to drink water! You've had ${displayIntake} ${unit} out of ${displayGoal} ${unit} today.`,
            buttons: [
                { title: unit === "mL" ? "Add 250 mL" : "Add 1 cup" }
            ],
            priority: 2,
            requireInteraction: true // Keep the notification visible until the user interacts
        };

        chrome.notifications.create("waterReminder", options, (notificationId) => {
            if (chrome.runtime.lastError) {
                console.error("Notification creation failed:", chrome.runtime.lastError);
            } else {
                console.log("Notification created:", notificationId);
            }
        });
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
    const conversionFactor = 240; // 1 cup = 240 mL
    chrome.storage.local.get(["unit", "waterIntakes"], (data) => {
        const unit = data.unit || "mL";
        const waterIntakes = data.waterIntakes || {};
        const today = new Date().toLocaleDateString();
        let addAmount;

        if (unit === "mL") {
            addAmount = 250; // Add 250 mL
        } else if (unit === "cups") {
            addAmount = conversionFactor; // Add 240 mL for 1 cup
        }

        waterIntakes[today] = (waterIntakes[today] || 0) + addAmount;
        chrome.storage.local.set({ waterIntakes }, () => {
            console.log("Water intake updated:", waterIntakes[today]);
            // Send message to update the popup UI, if it's open
            chrome.runtime.sendMessage({ action: "updateIntake" }, (response) => {
                if (chrome.runtime.lastError) {
                    // No receivers, ignore the error
                    console.warn("No receiver for updateIntake message:", chrome.runtime.lastError.message);
                } else {
                    console.log("Message sent successfully:", response);
                }
            });
        });
    });
}


console.log("Background script loaded successfully");
