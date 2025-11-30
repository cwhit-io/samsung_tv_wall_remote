import React, { useState, useEffect } from 'react';
import { Power, Volume2, VolumeX, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RotateCcw, Wifi, WifiOff, Settings, Clock, CheckCircle, XCircle, Loader, Home as HomeIcon, Info as InfoIcon, Monitor, Zap, Cog } from 'lucide-react';
import Management from './Management';

interface TV {
  ip: string;
  name: string;
  mac?: string;
  model?: string;
}

interface CommandResult {
  ip: string;
  command: string;
  success: boolean;
  message: string;
  response_time: number;
}

interface BulkResult {
  results: CommandResult[];
  total_time: number;
  success_count: number;
  failure_count: number;
}

const API_BASE = 'http://192.168.96.138:8000';

const App = () => {
  const [tvs, setTvs] = useState<TV[]>([]);
  const [selectedTvs, setSelectedTvs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [availableCommands, setAvailableCommands] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentView, setCurrentView] = useState<'remote' | 'management'>('remote');

  // Load TVs and commands on startup
  useEffect(() => {
    loadTvs();
    loadCommands();
  }, []);

  const loadTvs = async () => {
    try {
      const response = await fetch(`${API_BASE}/tvs`);
      const data = await response.json();
      const tvList = Object.entries(data.tvs).map(([ip, info]: [string, any]) => ({
        ip,
        name: info.name || `TV ${ip}`,
        mac: info.mac,
        model: info.model
      }));
      setTvs(tvList);
    } catch (error) {
      console.error('Failed to load TVs:', error);
    }
  };

  const loadCommands = async () => {
    try {
      const response = await fetch(`${API_BASE}/commands`);
      const data = await response.json();
      setAvailableCommands(data.commands);
    } catch (error) {
      console.error('Failed to load commands:', error);
    }
  };

  const executeBulkCommand = async (command: string) => {
    if (selectedTvs.length === 0) {
      alert('Please select at least one TV');
      return;
    }

    setLoading(true);
    setBulkResult(null);

    try {
      const response = await fetch(`${API_BASE}/bulk-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ips: selectedTvs,
          command: command
        })
      });

      const result: BulkResult = await response.json();
      setBulkResult(result);
    } catch (error) {
      console.error('Bulk command failed:', error);
      setBulkResult({
        results: selectedTvs.map(ip => ({
          ip,
          command,
          success: false,
          message: 'Network error',
          response_time: 0
        })),
        total_time: 0,
        success_count: 0,
        failure_count: selectedTvs.length
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTvSelection = (ip: string) => {
    setSelectedTvs(prev => 
      prev.includes(ip) 
        ? prev.filter(tvIp => tvIp !== ip)
        : [...prev, ip]
    );
  };

  const selectAllTvs = () => {
    setSelectedTvs(tvs.map(tv => tv.ip));
  };

  const clearSelection = () => {
    setSelectedTvs([]);
  };

  const RemoteButton = ({ 
    onClick, 
    children, 
    className = "", 
    variant = "default",
    size = "default",
    disabled = false 
  }: {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
    variant?: "power-on" | "power-off" | "primary" | "secondary" | "number" | "default";
    size?: "small" | "default" | "large";
    disabled?: boolean;
  }) => {
    const baseClasses = "flex flex-col items-center justify-center rounded-2xl font-semibold transition-all duration-150 transform active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none";
    
    const variantClasses = {
      "power-on": "bg-gradient-to-b from-green-400 to-green-600 text-white hover:from-green-300 hover:to-green-500 shadow-green-200",
      "power-off": "bg-gradient-to-b from-red-400 to-red-600 text-white hover:from-red-300 hover:to-red-500 shadow-red-200",
      "primary": "bg-gradient-to-b from-blue-400 to-blue-600 text-white hover:from-blue-300 hover:to-blue-500 shadow-blue-200",
      "secondary": "bg-gradient-to-b from-gray-400 to-gray-600 text-white hover:from-gray-300 hover:to-gray-500 shadow-gray-200",
      "number": isDarkMode 
        ? "bg-gradient-to-b from-gray-700 to-gray-800 text-white hover:from-gray-600 hover:to-gray-700 border-2 border-gray-600 shadow-gray-700"
        : "bg-gradient-to-b from-gray-100 to-gray-200 text-gray-800 hover:from-gray-50 hover:to-gray-100 border-2 border-gray-300 shadow-gray-100",
      "default": "bg-gradient-to-b from-slate-400 to-slate-600 text-white hover:from-slate-300 hover:to-slate-500 shadow-slate-200"
    };

    const sizeClasses = {
      "small": "p-3 text-sm min-h-12",
      "default": "p-4 text-base min-h-16",
      "large": "p-6 text-lg min-h-20"
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled || loading || selectedTvs.length === 0}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      >
        {children}
      </button>
    );
  };

  const themeClasses = isDarkMode 
    ? "min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white"
    : "min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900";

  if (currentView === 'management') {
    return (
      <Management 
        isDarkMode={isDarkMode} 
        API_BASE={API_BASE} 
        onBack={() => setCurrentView('remote')} 
      />
    );
  }

  return (
    <div className={themeClasses}>
      <div className="max-w-6xl mx-auto p-4">
        {/* Modern Header */}
        <header className={`${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/80 border-gray-200'} backdrop-blur-md rounded-3xl shadow-2xl p-6 mb-6 border`}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                {currentView === 'remote' ? 'Blackhawk TV Remote' : 'TV Management'}
              </h1>
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-lg`}>
                {currentView === 'remote' 
                  ? 'Control multiple TVs simultaneously. ***If TV is off, use WOL first!***'
                  : 'Manage your Samsung TVs and remote control key mappings'
                }
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView(currentView === 'remote' ? 'management' : 'remote')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-all hover:scale-105 font-semibold ${
                  currentView === 'remote'
                    ? 'bg-purple-500 text-white'
                    : 'bg-blue-500 text-white'
                }`}
              >
                <Cog className="w-5 h-5" />
                {currentView === 'remote' ? 'Manage' : 'Remote'}
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-3 rounded-full ${isDarkMode ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-white'} transition-all hover:scale-110`}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </header>

        {/* Compact TV Selection Grid */}
        <div className={`${isDarkMode ? 'bg-gray-800/30 border-gray-700' : 'bg-white/60 border-gray-200'} backdrop-blur-md rounded-3xl shadow-2xl p-4 mb-6 border`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Monitor className="w-6 h-6 text-blue-400" />
              TV Wall ({tvs.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={selectAllTvs}
                className="px-4 py-1 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-full shadow-md hover:shadow-lg transition-all hover:scale-105 font-semibold text-sm"
              >
                All
              </button>
              <button
                onClick={clearSelection}
                className="px-4 py-1 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-full shadow-md hover:shadow-lg transition-all hover:scale-105 font-semibold text-sm"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Fixed Height 5x3 Grid */}
          <div className="grid grid-cols-5 gap-2 max-w-4xl mx-auto">
            {(() => {
              const gridNames = [
                ...Array(5).fill(0).map((_, i) => `T${i+1} TV`),
                ...Array(5).fill(0).map((_, i) => `M${i+1} TV`),
                ...Array(5).fill(0).map((_, i) => `B${i+1} TV`)
              ];
              const tvMap = Object.fromEntries(tvs.map(tv => [tv.name, tv]));
              
              return gridNames.map((name, idx) => {
                const tv = tvMap[name];
                
                if (tv) {
                  return (
                    <div
                      key={tv.ip}
                      onClick={() => toggleTvSelection(tv.ip)}
                      className={`relative p-3 rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg h-20 ${
                        selectedTvs.includes(tv.ip)
                          ? `${isDarkMode ? 'bg-gradient-to-br from-blue-500/40 to-purple-500/40 border-blue-400' : 'bg-gradient-to-br from-blue-200 to-purple-200 border-blue-500'} border-2 scale-105`
                          : `${isDarkMode ? 'bg-gray-700/60 border-gray-600 hover:bg-gray-600/60' : 'bg-white/90 border-gray-300 hover:bg-gray-50'} border`
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center h-full relative">
                        <Monitor className={`w-5 h-5 mb-1 ${selectedTvs.includes(tv.ip) ? 'text-blue-400' : isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                        <h3 className={`font-bold text-sm text-center leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {name.replace(' TV', '')}
                        </h3>
                        
                        {/* Overlay checkmark that doesn't affect layout */}
                        {selectedTvs.includes(tv.ip) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-blue-400 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={name}
                      className={`p-3 border border-dashed rounded-xl flex flex-col items-center justify-center opacity-30 h-20 ${isDarkMode ? 'border-gray-600 bg-gray-800/10' : 'border-gray-400 bg-gray-200/30'}`}
                    >
                      <Monitor className={`w-5 h-5 mb-1 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                      <h3 className={`font-bold text-sm text-center leading-tight ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        {name.replace(' TV', '')}
                      </h3>
                    </div>
                  );
                }
              });
            })()}
          </div>

          {selectedTvs.length > 0 && (
            <div className="mt-4 p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl text-center border border-blue-400/30">
              <p className="text-blue-300 font-bold flex items-center justify-center gap-2">
                <Zap className="w-5 h-5" />
                {selectedTvs.length} TV{selectedTvs.length > 1 ? 's' : ''} selected
              </p>
            </div>
          )}
        </div>

        {/* Modern Remote Control Interface */}
        <div className={`${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white/70 border-gray-200'} backdrop-blur-md rounded-3xl shadow-2xl p-8 mb-6 border`}>
          <h2 className="text-2xl font-bold mb-8 text-center flex items-center justify-center gap-3">
            <Settings className="w-8 h-8 text-purple-400" />
            Remote Control
          </h2>
          
          <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto">
            {/* Power Controls */}
            <div className="grid grid-cols-2 gap-6 w-full max-w-md">
              <RemoteButton
                onClick={() => executeBulkCommand('power-on')}
                variant="power-on"
                size="large"
              >
                <Power className="mb-2 w-6 h-6" />
                WOL
              </RemoteButton>
              <RemoteButton
                onClick={() => executeBulkCommand('power-off')}
                variant="power-off"
                size="large"
              >
                <Power className="mb-2 w-6 h-6" />
                Power ON/OFF
              </RemoteButton>
            </div>

            {/* Volume and Channel Controls */}
            <div className="grid grid-cols-4 gap-4 w-full max-w-lg">
              <RemoteButton
                onClick={() => executeBulkCommand('KEY_VOLUP')}
                variant="primary"
              >
                <ChevronUp className="mb-1 w-5 h-5" />
                Vol +
              </RemoteButton>
              <RemoteButton
                onClick={() => executeBulkCommand('KEY_VOLDOWN')}
                variant="primary"
              >
                <ChevronDown className="mb-1 w-5 h-5" />
                Vol -
              </RemoteButton>
              <RemoteButton
                onClick={() => executeBulkCommand('KEY_CHUP')}
                variant="secondary"
              >
                <ChevronUp className="mb-1 w-5 h-5" />
                Ch +
              </RemoteButton>
              <RemoteButton
                onClick={() => executeBulkCommand('KEY_CHDOWN')}
                variant="secondary"
              >
                <ChevronDown className="mb-1 w-5 h-5" />
                Ch -
              </RemoteButton>
            </div>

            {/* Mute Button */}
            <div className="w-32">
              <RemoteButton
                onClick={() => executeBulkCommand('KEY_MUTE')}
                variant="default"
                className="w-full bg-gradient-to-b from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 text-white"
              >
                <VolumeX className="mb-1 w-5 h-5" />
                Mute
              </RemoteButton>
            </div>

            {/* D-Pad Navigation */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
              <div></div>
              <RemoteButton
                onClick={() => executeBulkCommand('KEY_UP')}
                variant="secondary"
              >
                <ChevronUp className="w-6 h-6" />
              </RemoteButton>
              <div></div>
              <RemoteButton
                onClick={() => executeBulkCommand('KEY_LEFT')}
                variant="secondary"
              >
                <ChevronLeft className="w-6 h-6" />
              </RemoteButton>
              <RemoteButton
                onClick={() => executeBulkCommand('KEY_ENTER')}
                variant="primary"
                className="bg-gradient-to-b from-green-400 to-green-600 hover:from-green-300 hover:to-green-500 text-white"
              >
                <CheckCircle className="w-6 h-6" />
              </RemoteButton>
              <RemoteButton
                onClick={() => executeBulkCommand('KEY_RIGHT')}
                variant="secondary"
              >
                <ChevronRight className="w-6 h-6" />
              </RemoteButton>
              <div></div>
              <RemoteButton
                onClick={() => executeBulkCommand('KEY_DOWN')}
                variant="secondary"
              >
                <ChevronDown className="w-6 h-6" />
              </RemoteButton>
              <div></div>
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <RemoteButton
                  key={n}
                  onClick={() => executeBulkCommand(String(n))}
                  variant="number"
                  className="text-xl font-bold"
                >
                  {n}
                </RemoteButton>
              ))}
              <div></div>
              <RemoteButton
                onClick={() => executeBulkCommand('0')}
                variant="number"
                className="text-xl font-bold"
              >
                0
              </RemoteButton>
              <div></div>
            </div>

            {/* Function Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl">
              <RemoteButton
                onClick={() => executeBulkCommand('KEY_MENU')}
                variant="default"
              >
                <Settings className="mb-1 w-5 h-5" />
                Menu
              </RemoteButton>
              <RemoteButton
                onClick={() => executeBulkCommand('KEY_HOME')}
                variant="default"
              >
                <HomeIcon className="mb-1 w-5 h-5" />
                Home
              </RemoteButton>
              <RemoteButton
                onClick={() => executeBulkCommand('KEY_SOURCE')}
                variant="default"
              >
                <RotateCcw className="mb-1 w-5 h-5" />
                Source
              </RemoteButton>
              <RemoteButton
                onClick={() => executeBulkCommand('KEY_INFO')}
                variant="default"
              >
                <InfoIcon className="mb-1 w-5 h-5" />
                Info
              </RemoteButton>
            </div>

            {/* Exit Button */}
            <div className="w-32">
              <RemoteButton
                onClick={() => executeBulkCommand('KEY_EXIT')}
                variant="default"
                className="w-full bg-gradient-to-b from-red-400 to-red-600 hover:from-red-300 hover:to-red-500 text-white"
              >
                Exit
              </RemoteButton>
            </div>
          </div>
        </div>

        {/* Results Display */}
        {(loading || bulkResult) && (
          <div className={`${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/80 border-gray-200'} backdrop-blur-md rounded-3xl shadow-2xl p-6 border`}>
            <h2 className="text-2xl font-bold mb-6 flex items-center justify-center gap-3">
              {loading ? (
                <>
                  <Loader className="animate-spin w-6 h-6 text-blue-400" />
                  Executing Commands...
                </>
              ) : (
                <>
                  <Clock className="w-6 h-6 text-purple-400" />
                  Command Results
                </>
              )}
            </h2>
            
            {bulkResult && (
              <>
                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className={`text-center p-6 rounded-2xl ${isDarkMode ? 'bg-green-500/20 border-green-400/30' : 'bg-green-50 border-green-200'} border shadow-lg`}>
                    <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-green-400 mb-1">{bulkResult.success_count}</div>
                    <div className={`text-sm font-semibold ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>Successful</div>
                  </div>
                  <div className={`text-center p-6 rounded-2xl ${isDarkMode ? 'bg-red-500/20 border-red-400/30' : 'bg-red-50 border-red-200'} border shadow-lg`}>
                    <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-red-400 mb-1">{bulkResult.failure_count}</div>
                    <div className={`text-sm font-semibold ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>Failed</div>
                  </div>
                  <div className={`text-center p-6 rounded-2xl ${isDarkMode ? 'bg-blue-500/20 border-blue-400/30' : 'bg-blue-50 border-blue-200'} border shadow-lg`}>
                    <Clock className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-blue-400 mb-1">{bulkResult.total_time}s</div>
                    <div className={`text-sm font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>Total Time</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {bulkResult.results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl flex items-center justify-between transition-all hover:scale-[1.02] ${
                        result.success 
                          ? `${isDarkMode ? 'bg-green-500/10 border-green-400/30' : 'bg-green-50 border-green-200'} border-l-4 border-l-green-400 shadow-lg` 
                          : `${isDarkMode ? 'bg-red-500/10 border-red-400/30' : 'bg-red-50 border-red-200'} border-l-4 border-l-red-400 shadow-lg`
                      } border`}
                    >
                      <div className="flex items-center">
                        {result.success ? (
                          <CheckCircle className="w-6 h-6 text-green-400 mr-4" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-400 mr-4" />
                        )}
                        <div>
                          <span className="font-bold text-lg">{result.ip}</span>
                          <span className={`text-sm ml-3 px-2 py-1 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                            {result.command}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{result.message}</div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{result.response_time}s</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;