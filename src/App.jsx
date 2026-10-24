import React, { useState, useEffect } from "react";
import {
  Droplet,
  Sun,
  AlertTriangle,
  Bell,
  Settings,
  Flame,
  Award,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  ShieldAlert,
  Activity,
  GlassWater,
  Package,
  Container,
  Crown,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export default function App() {
  // State Management
  const [activeTab, setActiveTab] = useState("dashboard");
  const [weight, setWeight] = useState(
    () => Number(localStorage.getItem("ehap_weight")) || 70,
  );
  const [dailyGoal, setDailyGoal] = useState(
    () => Number(localStorage.getItem("ehap_goal")) || 2500,
  );
  const [waterLogs, setWaterLogs] = useState(() => {
    const saved = localStorage.getItem("ehap_water_logs");
    return saved ? JSON.parse(saved) : [];
  });
  const [streak, setStreak] = useState(
    () => Number(localStorage.getItem("ehap_streak")) || 1,
  );
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [customAmount, setCustomAmount] = useState("");

  // Weather & Heat State
  const [weather, setWeather] = useState({
    temp: 34,
    humidity: 65,
    location: "Detecting Location...",
    loading: false,
    error: null,
  });

  // Countdown Timer State
  const [timerMinutes, setTimerMinutes] = useState(45);
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [timerActive, setTimerActive] = useState(false);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem("ehap_weight", weight);
    localStorage.setItem("ehap_goal", dailyGoal);
    localStorage.setItem("ehap_water_logs", JSON.stringify(waterLogs));
    localStorage.setItem("ehap_streak", streak);
  }, [weight, dailyGoal, waterLogs, streak]);

  // Recalculate baseline goal based on weight
  useEffect(() => {
    const calculatedGoal = Math.round(weight * 35);
    setDailyGoal(calculatedGoal);
  }, [weight]);

  // Audio Synthesizer Engine
  const playChime = (type = "water") => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "water") {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "alert") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.log("Audio Context restricted");
    }
  };

  // Timer Countdown Logic
  useEffect(() => {
    let interval = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      playChime("alert");
      if (Notification.permission === "granted") {
        new Notification("EHAP Hydration Alert! 💧", {
          body: `Keep your ${streak}-day streak alive! Drink a sachet or bottle of water to beat the heat!`,
          icon: "/favicon.ico",
        });
      }
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, streak]);

  // Calculate Today's Total Intake
  const todayStr = new Date().toISOString().split("T")[0];
  const todayLogs = waterLogs.filter((log) => log.date === todayStr);
  const currentIntake = todayLogs.reduce((sum, item) => sum + item.amount, 0);
  const progressPercent = Math.min(
    Math.round((currentIntake / dailyGoal) * 100),
    100,
  );

  // Heat Index Calculation
  const calculateHeatIndex = (tempC, humidity) => {
    const tempF = (tempC * 9) / 5 + 32;
    const hiF =
      -42.379 +
      2.04901523 * tempF +
      10.14333127 * humidity -
      0.22475541 * tempF * humidity -
      0.00683783 * tempF * tempF -
      0.05481717 * humidity * humidity +
      0.00122874 * tempF * tempF * humidity +
      0.00085282 * tempF * humidity * humidity -
      0.00000199 * tempF * tempF * humidity * humidity;
    return Math.round(((hiF - 32) * 5) / 9);
  };

  const heatIndex = calculateHeatIndex(weather.temp, weather.humidity);

  const getHeatRiskLevel = (hi) => {
    if (hi >= 54)
      return {
        label: "Extreme Danger",
        color: "bg-red-950 text-red-400 border-red-800",
      };
    if (hi >= 41)
      return {
        label: "Danger",
        color: "bg-orange-950 text-orange-400 border-orange-800",
      };
    if (hi >= 32)
      return {
        label: "Extreme Caution",
        color: "bg-amber-950 text-amber-400 border-amber-800",
      };
    return {
      label: "Caution",
      color: "bg-blue-950 text-blue-400 border-blue-800",
    };
  };

  const risk = getHeatRiskLevel(heatIndex);

  // Fetch Weather Data
  const fetchWeather = () => {
    setWeather((prev) => ({ ...prev, loading: true, error: null }));
    if (!navigator.geolocation) {
      setWeather((prev) => ({
        ...prev,
        loading: false,
        error: "Geolocation not supported",
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,relative_humidity_2m`,
          );
          const data = await res.json();
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            humidity: data.current.relative_humidity_2m,
            location: "Current Location",
            loading: false,
            error: null,
          });
        } catch (err) {
          setWeather((prev) => ({
            ...prev,
            loading: false,
            error: "Failed to fetch weather",
          }));
        }
      },
      () => {
        setWeather((prev) => ({
          ...prev,
          loading: false,
          error: "Location permission denied",
        }));
      },
    );
  };

  const addWater = (amount, itemName) => {
    const newLog = {
      id: Date.now(),
      amount,
      name: itemName,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: todayStr,
    };
    setWaterLogs([newLog, ...waterLogs]);
    playChime("water");
  };

  // Everyday Drinking Container Options
  const drinkPresets = [
    {
      label: "Glass / Cup",
      amount: 250,
      sub: "1 Glass",
      icon: GlassWater,
      color: "text-cyan-400",
    },
    {
      label: "Pure Water",
      amount: 500,
      sub: "1 Sachet",
      icon: Package,
      color: "text-blue-400",
    },
    {
      label: "Small Bottle",
      amount: 600,
      sub: "60cl Bottle",
      icon: Droplet,
      color: "text-teal-400",
    },
    {
      label: "Big Bottle",
      amount: 1500,
      sub: "1.5L Bottle",
      icon: Container,
      color: "text-indigo-400",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-md mx-auto shadow-2xl border-x border-slate-800">
      {/* App Header */}
      <header className="p-4 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Droplet className="w-6 h-6 text-white fill-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              EHAP
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-tight">
              El Niño Hydration & Heat Alert
            </p>
          </div>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
        >
          {soundEnabled ? (
            <Volume2 className="w-5 h-5 text-cyan-400" />
          ) : (
            <VolumeX className="w-5 h-5 text-slate-500" />
          )}
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto pb-24">
        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <>
            {/* Heat Index Triage Card */}
            <div
              className={`p-4 rounded-2xl border ${risk.color} flex justify-between items-center shadow-lg`}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Flame className="w-5 h-5 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Heat Index Triage
                  </span>
                </div>
                <div className="text-xl font-black">
                  {heatIndex}°C Feels Like
                </div>
                <p className="text-xs opacity-80">
                  {weather.temp}°C Air Temp | {weather.humidity}% Humidity
                </p>
              </div>
              <div className="text-right space-y-1">
                <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-slate-900/60 border border-current">
                  {risk.label}
                </span>
                <button
                  onClick={fetchWeather}
                  disabled={weather.loading}
                  className="flex items-center text-[10px] text-slate-300 hover:text-white mt-2 space-x-1 ml-auto"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${weather.loading ? "animate-spin" : ""}`}
                  />
                  <span>{weather.loading ? "Updating..." : "GPS Sync"}</span>
                </button>
              </div>
            </div>

            {/* Main Visual Progress Card */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="88"
                    cy="88"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    className="text-slate-800"
                    fill="transparent"
                  />
                  <circle
                    cx="88"
                    cy="88"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    className="text-cyan-400 transition-all duration-700 ease-out"
                    fill="transparent"
                    strokeDasharray={440}
                    strokeDashoffset={440 - (440 * progressPercent) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center space-y-1">
                  <span className="text-3xl font-extrabold text-white">
                    {currentIntake}
                  </span>
                  <span className="text-xs text-slate-400 block">
                    / {dailyGoal} mL Goal
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {progressPercent}% Complete
                  </span>
                </div>
              </div>

              {/* Intuitive Everyday Drinking Presets */}
              <div className="w-full mt-6 space-y-2">
                <div className="text-xs font-bold text-slate-400 text-left">
                  Quick Log What You Drank:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {drinkPresets.map((item, idx) => {
                    const IconComp = item.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => addWater(item.amount, item.label)}
                        className="p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-cyan-500 rounded-2xl flex items-center space-x-3 transition text-left active:scale-95"
                      >
                        <div
                          className={`p-2 bg-slate-900 rounded-xl ${item.color}`}
                        >
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            {item.label}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.sub} (+{item.amount}mL)
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Streak & Stats Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center space-x-3">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Daily Streak</div>
                  <div className="text-lg font-bold">{streak} Days 🔥</div>
                </div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center space-x-3">
                <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Hydration Status</div>
                  <div className="text-xs font-bold text-cyan-400">
                    {progressPercent >= 100
                      ? "Fully Hydrated!"
                      : "Sip More Water"}
                  </div>
                </div>
              </div>
            </div>

        
         
          </>
        )}

        {/* REMINDERS TAB */}
        {activeTab === "reminders" && (
          <div className="space-y-4">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4 shadow-xl">
              <h2 className="text-lg font-bold text-slate-200">
                Hydration Interval Timer
              </h2>

              <div className="text-5xl font-black text-cyan-400 font-mono tracking-wider">
                {Math.floor(timeLeft / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(timeLeft % 60).toString().padStart(2, "0")}
              </div>

              <div className="flex justify-center space-x-2">
                {[20, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => {
                      setTimerMinutes(mins);
                      setTimeLeft(mins * 60);
                      setTimerActive(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${timerMinutes === mins ? "bg-cyan-500 text-white" : "bg-slate-800 text-slate-400"}`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>

              <div className="flex justify-center space-x-3 pt-2">
                <button
                  onClick={() => setTimerActive(!timerActive)}
                  className={`px-6 py-3 rounded-xl font-bold flex items-center space-x-2 transition ${timerActive ? "bg-amber-600 text-white" : "bg-cyan-600 text-white hover:bg-cyan-500"}`}
                >
                  {timerActive ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Start Timer</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setTimerActive(false);
                    setTimeLeft(timerMinutes * 60);
                  }}
                  className="p-3 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold">Push Notifications</h3>
                <p className="text-xs text-slate-400">
                  Get alerts to save your {streak}-day streak!
                </p>
              </div>
              <button
                onClick={() => Notification.requestPermission()}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-xs font-bold rounded-lg text-cyan-400 hover:bg-slate-700"
              >
                Enable
              </button>
            </div>
          </div>
        )}

        {/* SYMPTOMS TRIAGE TAB */}
        {activeTab === "symptoms" && (
          <div className="space-y-3">
            <h2 className="text-md font-bold text-slate-300">
              Heat-Related Illness Diagnostic
            </h2>
            {[
              {
                level: "Mild Heat Exhaustion",
                desc: "Heavy sweating, dizziness, fatigue, fast pulse.",
                action: "Move to shade, sip cool water slowly.",
                border: "border-amber-800 bg-amber-950/40",
              },
              {
                level: "Severe Heat Exhaustion",
                desc: "Nausea, muscle cramps, headache, fainting.",
                action:
                  "Loosen tight clothing, apply cold wet cloths, drink electrolytes/water.",
                border: "border-orange-800 bg-orange-950/40",
              },
              {
                level: "Heat Stroke (EMERGENCY)",
                desc: "Body temp >103°F (39.4°C), confusion, rapid hot red skin, loss of consciousness.",
                action:
                  "CALL EMERGENCY SERVICES IMMEDIATELY. Cool body with ice/cold water.",
                border: "border-red-800 bg-red-950/60",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border ${item.border} space-y-1.5`}
              >
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-slate-200" />
                  <span className="font-bold text-sm">{item.level}</span>
                </div>
                <p className="text-xs text-slate-300">{item.desc}</p>
                <div className="text-[11px] font-semibold text-cyan-300 bg-slate-900/60 p-2 rounded-lg mt-2">
                  Action: {item.action}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SETTINGS & EHAP PRO TAB */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
              <h2 className="text-md font-bold text-slate-200">
                Personal Hydration Profile
              </h2>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-medium">
                  Body Weight: {weight} kg
                </label>
                <input
                  type="range"
                  min="30"
                  max="150"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">
                  Calculated Daily Target
                </div>
                <div className="text-xl font-bold text-cyan-400">
                  {dailyGoal} mL / day
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Equivalent to ~{Math.round(dailyGoal / 500)} Pure Water
                  Sachets or Bottles daily.
                </p>
              </div>
            </div>

            {/* FREEMIUM / MONETIZATION UPGRADE CARD */}
            <div className="p-5 bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-500/40 rounded-3xl space-y-3">
              <div className="flex items-center space-x-2 text-amber-400">
                <Crown className="w-5 h-5" />
                <span className="font-bold text-sm">Upgrade to EHAP Pro</span>
              </div>
              <p className="text-xs text-slate-300">
                Get offline SMS heat alarms for family members, custom reminder
                sounds, and PDF health export reports.
              </p>
              <button className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold rounded-xl text-xs hover:brightness-110 transition">
                Unlock EHAP Pro
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Floating Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 px-6 py-3 flex justify-between items-center z-50">
        {[
          { id: "dashboard", label: "Dashboard", icon: Droplet },
          { id: "reminders", label: "Reminders", icon: Bell },
          { id: "symptoms", label: "Symptoms", icon: AlertTriangle },
          { id: "settings", label: "Settings", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center space-y-1 transition ${isActive ? "text-cyan-400 scale-105" : "text-slate-500 hover:text-slate-300"}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
