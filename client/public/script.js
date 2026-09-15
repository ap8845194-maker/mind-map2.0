/* =====================================================
   MIND MIRROR 2.0
   MAIN JAVASCRIPT
===================================================== */


/* =====================================================
   USER DATA
===================================================== */

let currentUser =
    JSON.parse(localStorage.getItem("mindMirrorUser")) || null;

let sessionToken =
    localStorage.getItem("mindMirrorToken") || null;

async function apiRequest(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
    }

    const response = await fetch(path, {
        ...options,
        headers
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.message || "Request failed");
    }

    return payload;
}

function setSession(payload) {
    currentUser = payload.user;
    sessionToken = payload.token;
    localStorage.setItem("mindMirrorUser", JSON.stringify(currentUser));
    localStorage.setItem("mindMirrorToken", sessionToken);
}

async function loadCloudData() {
    const [moods, study] = await Promise.all([
        apiRequest("/api/data/moods"),
        apiRequest("/api/data/study")
    ]);

    moodData = (moods.data || []).map(item => ({
        mood: item.mood,
        date: item.moodDate,
        time: item.moodTime
    }));

    studyData = (study.data || []).map(item => ({
        task: item.task,
        minutes: item.minutes,
        mood: item.mood,
        date: item.sessionDate
    }));

    localStorage.setItem("mindMirrorMoods", JSON.stringify(moodData));
    localStorage.setItem("mindMirrorStudy", JSON.stringify(studyData));
}


let studyData =
    JSON.parse(localStorage.getItem("mindMirrorStudy")) || [];


let moodData =
    JSON.parse(localStorage.getItem("mindMirrorMoods")) || [];


let currentMood = null;


/* =====================================================
   LOGIN / REGISTER
===================================================== */

function showLogin() {

    document
        .getElementById("loginForm")
        .classList.remove("hidden");

    document
        .getElementById("registerForm")
        .classList.add("hidden");

    document
        .getElementById("loginTab")
        .classList.add("active");

    document
        .getElementById("registerTab")
        .classList.remove("active");

}


function showRegister() {

    document
        .getElementById("registerForm")
        .classList.remove("hidden");

    document
        .getElementById("loginForm")
        .classList.add("hidden");

    document
        .getElementById("registerTab")
        .classList.add("active");

    document
        .getElementById("loginTab")
        .classList.remove("active");

}


/* REGISTER */

async function registerUser(event) {

    event.preventDefault();


    const name =
        document
            .getElementById("registerName")
            .value.trim();


    const email =
        document
            .getElementById("registerEmail")
            .value.trim();


    const password =
        document
            .getElementById("registerPassword")
            .value;


    try {
        const payload = await apiRequest("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({ name, email, password })
        });

        setSession(payload);
        moodData = [];
        studyData = [];
        alert("🎉 Account created successfully!");
        openApp();
    } catch (error) {
        alert(`❌ ${error.message}`);
    }

}


/* LOGIN */

async function loginUser(event) {

    event.preventDefault();


    const email =
        document
            .getElementById("loginEmail")
            .value.trim();


    const password =
        document
            .getElementById("loginPassword")
            .value;


    try {
        const payload = await apiRequest("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        setSession(payload);
        await loadCloudData();
        openApp();
    } catch (error) {
        alert(`❌ ${error.message}`);
    }

}


/* OPEN APP */

function openApp() {

    document
        .getElementById("loginPage")
        .classList.add("hidden");


    document
        .getElementById("app")
        .classList.remove("hidden");


    updateUserUI();

    updateDashboard();

    createCharts();

    updateHistory();

    updateYearAnalytics();

}


/* LOGOUT */

async function logoutUser() {

    try {
        await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (error) {
        console.warn("Logout request failed", error);
    }

    sessionToken = null;
    currentUser = null;
    localStorage.removeItem("mindMirrorToken");
    localStorage.removeItem("mindMirrorUser");

    document
        .getElementById("app")
        .classList.add("hidden");


    document
        .getElementById("loginPage")
        .classList.remove("hidden");

}


/* USER UI */

function updateUserUI() {

    if (!currentUser) {
        return;
    }


    document.getElementById(
        "userName"
    ).innerText =
        currentUser.name;


    document.getElementById(
        "welcomeName"
    ).innerText =
        currentUser.name;

}


/* =====================================================
   NAVIGATION
===================================================== */

function showSection(sectionId, button) {

    document
        .querySelectorAll(".page-section")
        .forEach(section => {

            section.classList.add("hidden");

        });


    document
        .getElementById(sectionId)
        .classList.remove("hidden");


    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.remove("active");

        });


    button.classList.add("active");


    const titles = {

        dashboard: "Dashboard",

        mood: "Mood Analysis",

        study: "Study Room",

        analytics: "1-Year Analytics",

        history: "History"

    };


    document.getElementById(
        "pageTitle"
    ).innerText =
        titles[sectionId];

}


function showSectionById(id) {

    document
        .querySelectorAll(".page-section")
        .forEach(section => {

            section.classList.add("hidden");

        });


    document
        .getElementById(id)
        .classList.remove("hidden");


    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.remove("active");

        });


    const nav =
        document.querySelector(
            `.nav-item[onclick*="${id}"]`
        );


    if (nav) {

        nav.classList.add("active");

    }


    const titles = {

        dashboard: "Dashboard",

        mood: "Mood Analysis",

        study: "Study Room",

        analytics: "1-Year Analytics",

        history: "History"

    };


    document.getElementById(
        "pageTitle"
    ).innerText =
        titles[id];

}


/* =====================================================
   DARK MODE
===================================================== */

function toggleTheme() {

    document
        .body
        .classList
        .toggle("dark");


    const dark =
        document
            .body
            .classList
            .contains("dark");


    localStorage.setItem(
        "mindMirrorDark",
        dark
    );


    document.getElementById(
        "themeIcon"
    ).innerText =
        dark ? "☀️" : "🌙";


    createCharts();

}


function loadTheme() {

    const dark =
        localStorage.getItem(
            "mindMirrorDark"
        ) === "true";


    if (dark) {

        document
            .body
            .classList
            .add("dark");


        document.getElementById(
            "themeIcon"
        ).innerText = "☀️";

    }

}


/* =====================================================
   MOOD AI
===================================================== */

const moodRecommendations = {

    Happy: {

        emoji: "😄",

        title: "High Energy Detected",

        analysis:
            "Your mood suggests good energy and motivation.",

        recommendation:
            "This is a great time for challenging tasks, programming, problem solving or difficult chapters.",

        strategy:
            "Try a 25-minute deep-focus session."

    },


    Normal: {

        emoji: "🙂",

        title: "Balanced State Detected",

        analysis:
            "Your current state appears balanced and suitable for regular learning.",

        recommendation:
            "Continue your normal study routine, revision and assignments.",

        strategy:
            "Use a structured 25-minute study session."

    },


    Tired: {

        emoji: "😴",

        title: "Low Energy Detected",

        analysis:
            "Your mood indicates that your energy may be lower than usual.",

        recommendation:
            "Choose light revision, reading notes or easier topics instead of highly demanding work.",

        strategy:
            "Study for 15–20 minutes and take a short break."

    },


    Stressed: {

        emoji: "😟",

        title: "Stress Level Appears Elevated",

        analysis:
            "Your selected mood suggests that you may benefit from reducing study pressure.",

        recommendation:
            "Break your work into a small, manageable task instead of trying to complete everything at once.",

        strategy:
            "Start with just 10 minutes of focused work."

    },


    Frustrated: {

        emoji: "😤",

        title: "Reset Recommended",

        analysis:
            "Your current mood suggests that continuing with a difficult task may feel overwhelming.",

        recommendation:
            "Take a short reset, then switch to an easier topic or revise something you already understand.",

        strategy:
            "Reset → revise → return to the difficult task."

    }

};


function analyzeMood(mood, element) {

    currentMood = mood;


    document
        .querySelectorAll(".mood-option")
        .forEach(button => {

            button.classList.remove("selected");

        });


    element.classList.add("selected");


    const data =
        moodRecommendations[mood];


    document.getElementById(
        "aiResult"
    ).innerHTML = `

        <div class="ai-animation">
            ${data.emoji}
        </div>

        <div>

            <span class="ai-label">
                MIND MIRROR AI
            </span>

            <h2>
                ${data.title}
            </h2>

            <p>
                ${data.analysis}
            </p>

            <p>
                <strong>
                    Recommendation:
                </strong>
                ${data.recommendation}
            </p>

            <p>
                <strong>
                    Study Strategy:
                </strong>
                ${data.strategy}
            </p>

        </div>

    `;


    document.getElementById(
        "dashboardMood"
    ).innerText =
        data.emoji;


    document.getElementById(
        "dashboardMoodText"
    ).innerText =
        mood;


    document.getElementById(
        "dashboardMoodAdvice"
    ).innerText =
        data.recommendation;


    saveMood(mood);

}


/* SAVE MOOD */

function saveMood(mood) {

    const entry = {

        mood: mood,

        date:
            new Date()
                .toISOString()
                .split("T")[0],

        time:
            new Date()
                .toLocaleTimeString()

    };


    moodData.push(entry);


    localStorage.setItem(
        "mindMirrorMoods",
        JSON.stringify(moodData)
    );

    if (sessionToken) {
        apiRequest("/api/data/moods", {
            method: "POST",
            body: JSON.stringify(entry)
        }).catch(error => console.warn("Mood sync failed", error));
    }


    updateHistory();

}


/* =====================================================
   STUDY TIMER
===================================================== */

let timerSeconds = 25 * 60;

let timerInterval = null;

let timerRunning = false;


function updateTimerDisplay() {

    const minutes =
        Math.floor(timerSeconds / 60);


    const seconds =
        timerSeconds % 60;


    document.getElementById(
        "studyTimer"
    ).innerText =

        String(minutes).padStart(2, "0")
        + ":"
        +
        String(seconds).padStart(2, "0");

}


function startTimer() {

    if (timerRunning) {
        return;
    }


    timerRunning = true;


    document.getElementById(
        "timerStatus"
    ).innerText =
        "🔥 Focus mode active";


    timerInterval =
        setInterval(() => {

            if (timerSeconds > 0) {

                timerSeconds--;

                updateTimerDisplay();

            }

            else {

                completeSession();

            }

        }, 1000);

}


function pauseTimer() {

    clearInterval(timerInterval);

    timerRunning = false;


    document.getElementById(
        "timerStatus"
    ).innerText =
        "⏸ Timer paused";

}


function resetTimer() {

    clearInterval(timerInterval);

    timerRunning = false;

    timerSeconds = 25 * 60;

    updateTimerDisplay();


    document.getElementById(
        "timerStatus"
    ).innerText =
        "Ready to focus";

}


/* =====================================================
   STUDY SESSION
===================================================== */

function setTask(task) {

    document.getElementById(
        "studyTask"
    ).value = task;

}


function startStudySession() {

    const task =
        document
            .getElementById("studyTask")
            .value
            .trim();


    if (!task) {

        alert(
            "Please enter a study task."
        );

        return;

    }


    if (!currentMood) {

        alert(
            "Please select your mood first."
        );

        showSectionById("mood");

        return;

    }


    showSectionById("study");


    startTimer();


    document.getElementById(
        "timerStatus"
    ).innerText =
        "🔥 Studying: " + task;

}


function completeSession() {

    clearInterval(timerInterval);

    timerRunning = false;


    const task =
        document
            .getElementById("studyTask")
            .value
            .trim()
            || "Study Session";


    const entry = {

        task: task,

        minutes: 25,

        mood:
            currentMood || "Normal",

        date:
            new Date()
                .toISOString()
                .split("T")[0]

    };


    studyData.push(entry);


    localStorage.setItem(
        "mindMirrorStudy",
        JSON.stringify(studyData)
    );

    if (sessionToken) {
        apiRequest("/api/data/study", {
            method: "POST",
            body: JSON.stringify(entry)
        }).catch(error => console.warn("Study sync failed", error));
    }


    timerSeconds = 25 * 60;

    updateTimerDisplay();


    document.getElementById(
        "timerStatus"
    ).innerText =
        "🎉 Session completed!";


    updateDashboard();

    updateHistory();

    updateYearAnalytics();

    createCharts();


    alert(
        "🎉 Great work! Your 25-minute study session has been recorded."
    );

}


/* =====================================================
   DASHBOARD
===================================================== */

function updateDashboard() {

    const totalMinutes =
        studyData.reduce(
            (sum, item) =>
                sum + Number(item.minutes),
            0
        );


    const totalSessions =
        studyData.length;


    const streak =
        calculateStreak();


    const goal =
        Math.min(
            100,
            Math.round(
                (totalMinutes % 120) / 120 * 100
            )
        );


    document.getElementById(
        "dashMinutes"
    ).innerText =
        totalMinutes;


    document.getElementById(
        "dashSessions"
    ).innerText =
        totalSessions;


    document.getElementById(
        "dashStreak"
    ).innerText =
        streak;


    document.getElementById(
        "dashGoal"
    ).innerText =
        goal + "%";


    document.getElementById(
        "goalPercentage"
    ).innerText =
        goal + "%";


    document.getElementById(
        "goalMinutes"
    ).innerText =
        totalMinutes % 120;


    document.getElementById(
        "goalProgressBar"
    ).style.width =
        goal + "%";

}


/* =====================================================
   STREAK
===================================================== */

function calculateStreak() {

    if (studyData.length === 0) {
        return 0;
    }


    const dates =
        [
            ...new Set(
                studyData.map(
                    item => item.date
                )
            )
        ]
        .sort()
        .reverse();


    let streak = 1;


    for (let i = 0; i < dates.length - 1; i++) {

        const current =
            new Date(dates[i]);


        const previous =
            new Date(dates[i + 1]);


        const difference =
            Math.round(
                (
                    current - previous
                )
                /
                (1000 * 60 * 60 * 24)
            );


        if (difference === 1) {

            streak++;

        }

        else {

            break;

        }

    }


    return streak;

}


/* =====================================================
   CHARTS
===================================================== */

let weeklyChart = null;

let yearChart = null;


/* WEEKLY CHART */

function createCharts() {

    createWeeklyChart();

    createYearChart();

}


function createWeeklyChart() {

    const canvas =
        document.getElementById(
            "weeklyChart"
        );


    if (!canvas) {
        return;
    }


    if (weeklyChart) {

        weeklyChart.destroy();

    }


    const labels = [];

    const values = [];


    for (let i = 6; i >= 0; i--) {

        const date =
            new Date();


        date.setDate(
            date.getDate() - i
        );


        const dateString =
            date
                .toISOString()
                .split("T")[0];


        labels.push(
            date.toLocaleDateString(
                "en-US",
                {
                    weekday: "short"
                }
            )
        );


        const total =
            studyData
                .filter(
                    item =>
                        item.date === dateString
                )
                .reduce(
                    (sum, item) =>
                        sum + Number(item.minutes),
                    0
                );


        values.push(total);

    }


    weeklyChart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [{

                        label:
                            "Study Minutes",

                        data: values,

                        borderWidth: 3,

                        tension: 0.4,

                        fill: true

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: false
                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true

                        }

                    }

                }

            }
        );

}


/* =====================================================
   YEAR CHART
===================================================== */

function createYearChart() {

    const canvas =
        document.getElementById(
            "yearChart"
        );


    if (!canvas) {
        return;
    }


    if (yearChart) {

        yearChart.destroy();

    }


    const monthNames = [

        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"

    ];


    const values = [];


    for (let month = 0; month < 12; month++) {

        let total = 0;


        studyData.forEach(item => {

            const date =
                new Date(item.date);


            if (
                date.getMonth() === month
            ) {

                total +=
                    Number(item.minutes);

            }

        });


        values.push(total);

    }


    yearChart =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels: monthNames,

                    datasets: [{

                        label:
                            "Study Minutes",

                        data: values,

                        borderWidth: 1,

                        borderRadius: 7

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: true
                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true

                        }

                    }

                }

            }
        );

}


/* =====================================================
   1-YEAR ANALYTICS
===================================================== */

function updateYearAnalytics() {

    const total =
        studyData.reduce(
            (sum, item) =>
                sum + Number(item.minutes),
            0
        );


    const activeDays =
        new Set(
            studyData.map(
                item => item.date
            )
        ).size;


    const average =
        studyData.length
            ? Math.round(
                total / studyData.length
            )
            : 0;


    document.getElementById(
        "yearMinutes"
    ).innerText =
        total;


    document.getElementById(
        "activeDays"
    ).innerText =
        activeDays;


    document.getElementById(
        "averageMinutes"
    ).innerText =
        average;


    document.getElementById(
        "bestStreak"
    ).innerText =
        calculateStreak();


    createMonthlyCards();

}


/* MONTHLY CARDS */

function createMonthlyCards() {

    const container =
        document.getElementById(
            "monthlyGrid"
        );


    if (!container) {
        return;
    }


    const months = [

        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"

    ];


    container.innerHTML = "";


    months.forEach(
        (month, index) => {

            let total = 0;


            studyData.forEach(item => {

                const date =
                    new Date(item.date);


                if (
                    date.getMonth() === index
                ) {

                    total +=
                        Number(item.minutes);

                }

            });


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "month-card";


            card.innerHTML = `

                <strong>
                    ${month}
                </strong>

                <span>
                    ${total} minutes
                </span>

            `;


            container.appendChild(card);

        }
    );

}


/* =====================================================
   HISTORY
===================================================== */

function updateHistory() {

    const moodContainer =
        document.getElementById(
            "moodHistoryList"
        );


    const taskContainer =
        document.getElementById(
            "taskHistoryList"
        );


    if (!moodContainer || !taskContainer) {
        return;
    }


    /* MOOD */

    if (moodData.length === 0) {

        moodContainer.innerHTML =
            "<p>No mood history yet.</p>";

    }

    else {

        moodContainer.innerHTML = "";


        moodData
            .slice()
            .reverse()
            .slice(0,20)
            .forEach(item => {

                const div =
                    document.createElement(
                        "div"
                    );


                div.className =
                    "history-item";


                div.innerHTML = `

                    <strong>
                        ${getEmoji(item.mood)}
                        ${item.mood}
                    </strong>

                    <small>
                        ${item.date}
                        •
                        ${item.time}
                    </small>

                `;


                moodContainer.appendChild(
                    div
                );

            });

    }


    /* STUDY */

    if (studyData.length === 0) {

        taskContainer.innerHTML =
            "<p>No study sessions yet.</p>";

    }

    else {

        taskContainer.innerHTML = "";


        studyData
            .slice()
            .reverse()
            .slice(0,20)
            .forEach(item => {

                const div =
                    document.createElement(
                        "div"
                    );


                div.className =
                    "history-item";


                div.innerHTML = `

                    <strong>
                        📚 ${item.task}
                    </strong>

                    <small>
                        ${item.minutes}
                        minutes
                        •
                        ${getEmoji(item.mood)}
                        ${item.mood}
                        •
                        ${item.date}
                    </small>

                `;


                taskContainer.appendChild(
                    div
                );

            });

    }

}


/* =====================================================
   EMOJI
===================================================== */

function getEmoji(mood) {

    const emojis = {

        Happy: "😄",

        Normal: "🙂",

        Tired: "😴",

        Stressed: "😟",

        Frustrated: "😤"

    };


    return emojis[mood] || "🙂";

}


/* =====================================================
   INITIALIZATION
===================================================== */

async function initialize() {

    loadTheme();

    updateTimerDisplay();


    if (currentUser && sessionToken) {
        try {
            const payload = await apiRequest("/api/auth/me");
            currentUser = payload.user;
            await loadCloudData();
            openApp();
        } catch (error) {
            console.warn("Session restore failed", error);
            sessionToken = null;
            currentUser = null;
            localStorage.removeItem("mindMirrorToken");
            localStorage.removeItem("mindMirrorUser");
        }
    }

}


initialize();
