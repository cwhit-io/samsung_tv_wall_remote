import React, { useState, useEffect } from 'react';
import { Monitor, Key, Plus, Edit, Trash2, Save, X, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

interface TV {
  ip: string;
  name: string;
  model: string;
  mac: string;
  token: string;
  paired_client_mac: string;
  last_updated?: string;
}

interface TokenMapping {
  name: string;
  token: string;
}

interface ManagementProps {
  isDarkMode: boolean;
  API_BASE: string;
  onBack: () => void;
}

const Management: React.FC<ManagementProps> = ({ isDarkMode, API_BASE, onBack }) => {
  const [tvs, setTvs] = useState<TV[]>([]);
  const [tokens, setTokens] = useState<TokenMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tvs' | 'tokens'>('tvs');
  
  // TV form state
  const [showTVForm, setShowTVForm] = useState(false);
  const [editingTV, setEditingTV] = useState<TV | null>(null);
  const [tvForm, setTVForm] = useState({
    ip: '',
    name: '',
    model: '',
    mac: '',
    token: '',
    paired_client_mac: ''
  });

  // Token form state
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [editingToken, setEditingToken] = useState<TokenMapping | null>(null);
  const [tokenForm, setTokenForm] = useState({
    name: '',
    token: ''
  });

  // Load data
  useEffect(() => {
    loadTvs();
    loadTokens();
  }, []);

  const loadTvs = async () => {
    try {
      const response = await fetch(`${API_BASE}/tvs`);
      const data = await response.json();
      const tvList = Object.entries(data.tvs).map(([ip, info]: [string, any]) => ({
        ip,
        ...info
      }));
      setTvs(tvList);
    } catch (error) {
      console.error('Failed to load TVs:', error);
    }
  };

  const loadTokens = async () => {
    try {
      const response = await fetch(`${API_BASE}/tokens`);
      const data = await response.json();
      const tokenList = Object.entries(data.tokens).map(([name, token]: [string, any]) => ({
        name,
        token
      }));
      setTokens(tokenList);
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  };

  // TV CRUD operations
  const handleAddTV = () => {
    setEditingTV(null);
    setTVForm({
      ip: '',
      name: '',
      model: '',
      mac: '',
      token: '',
      paired_client_mac: ''
    });
    setShowTVForm(true);
  };

  const handleEditTV = (tv: TV) => {
    setEditingTV(tv);
    setTVForm({
      ip: tv.ip,
      name: tv.name,
      model: tv.model,
      mac: tv.mac,
      token: tv.token,
      paired_client_mac: tv.paired_client_mac
    });
    setShowTVForm(true);
  };

  const handleSaveTV = async () => {
    setLoading(true);
    try {
      const method = editingTV ? 'PUT' : 'POST';
      const url = editingTV ? `${API_BASE}/tvs/${editingTV.ip}` : `${API_BASE}/tvs`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tvForm)
      });

      if (response.ok) {
        await loadTvs();
        setShowTVForm(false);
      } else {
        alert('Failed to save TV');
      }
    } catch (error) {
      console.error('Error saving TV:', error);
      alert('Error saving TV');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTV = async (ip: string) => {
    if (window.confirm('Are you sure you want to delete this TV?')) {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/tvs/${ip}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          await loadTvs();
        } else {
          alert('Failed to delete TV');
        }
      } catch (error) {
        console.error('Error deleting TV:', error);
        alert('Error deleting TV');
      } finally {
        setLoading(false);
      }
    }
  };

  // Token CRUD operations
  const handleAddToken = () => {
    setEditingToken(null);
    setTokenForm({
      name: '',
      token: ''
    });
    setShowTokenForm(true);
  };

  const handleEditToken = (token: TokenMapping) => {
    setEditingToken(token);
    setTokenForm({
      name: token.name,
      token: token.token
    });
    setShowTokenForm(true);
  };

  const handleSaveToken = async () => {
    setLoading(true);
    try {
      const method = editingToken ? 'PUT' : 'POST';
      const url = editingToken ? `${API_BASE}/tokens/${editingToken.name}` : `${API_BASE}/tokens`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenForm)
      });

      if (response.ok) {
        await loadTokens();
        setShowTokenForm(false);
      } else {
        alert('Failed to save token');
      }
    } catch (error) {
      console.error('Error saving token:', error);
      alert('Error saving token');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteToken = async (name: string) => {
    if (window.confirm('Are you sure you want to delete this token?')) {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/tokens/${name}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          await loadTokens();
        } else {
          alert('Failed to delete token');
        }
      } catch (error) {
        console.error('Error deleting token:', error);
        alert('Error deleting token');
      } finally {
        setLoading(false);
      }
    }
  };

  const themeClasses = isDarkMode 
    ? "bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white"
    : "bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900";

  const cardClasses = isDarkMode 
    ? 'bg-gray-800/50 border-gray-700'
    : 'bg-white/80 border-gray-200';

  return (
    <div className={themeClasses}>
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <header className={`${cardClasses} backdrop-blur-md rounded-3xl shadow-2xl p-6 mb-6 border`}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                TV & Key Management
              </h1>
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-lg`}>
                Manage your Samsung TVs and authentication tokens
              </p>
            </div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-105 font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Remote
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className={`${cardClasses} backdrop-blur-md rounded-3xl shadow-2xl p-4 mb-6 border`}>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('tvs')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'tvs'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : `${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
              }`}
            >
              <Monitor className="w-5 h-5" />
              TVs ({tvs.length})
            </button>
            <button
              onClick={() => setActiveTab('tokens')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'tokens'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : `${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
              }`}
            >
              <Key className="w-5 h-5" />
              Tokens ({tokens.length})
            </button>
          </div>
        </div>

        {/* TV Management */}
        {activeTab === 'tvs' && (
          <div className={`${cardClasses} backdrop-blur-md rounded-3xl shadow-2xl p-6 border`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Monitor className="w-6 h-6 text-blue-400" />
                TV Management
              </h2>
              <button
                onClick={handleAddTV}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-105 font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add TV
              </button>
            </div>

            {/* TV List */}
            <div className="space-y-4">
              {tvs.map((tv) => (
                <div
                  key={tv.ip}
                  className={`p-4 rounded-xl border transition-all hover:scale-[1.02] ${
                    isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold">{tv.name}</h3>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        IP: {tv.ip} | Model: {tv.model || 'N/A'}
                      </p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        MAC: {tv.mac || 'N/A'} | Token: {tv.token ? 'Set' : 'Not set'}
                      </p>
                      {tv.last_updated && (
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          Last updated: {tv.last_updated}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditTV(tv)}
                        className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTV(tv.ip)}
                        className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Token Management */}
        {activeTab === 'tokens' && (
          <div className={`${cardClasses} backdrop-blur-md rounded-3xl shadow-2xl p-6 border`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Key className="w-6 h-6 text-purple-400" />
                Token Management
              </h2>
              <button
                onClick={handleAddToken}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-105 font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add Token
              </button>
            </div>

            {/* Token List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tokens.map((tokenMapping) => (
                <div
                  key={tokenMapping.name}
                  className={`p-4 rounded-xl border transition-all hover:scale-[1.02] ${
                    isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold">{tokenMapping.name}</h3>
                      <p className={`text-sm font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {tokenMapping.token}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditToken(tokenMapping)}
                        className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteToken(tokenMapping.name)}
                        className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TV Form Modal */}
        {showTVForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className={`${cardClasses} rounded-3xl shadow-2xl p-6 w-full max-w-md border`}>
              <h3 className="text-xl font-bold mb-4">
                {editingTV ? 'Edit TV' : 'Add New TV'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">IP Address</label>
                  <input
                    type="text"
                    value={tvForm.ip}
                    onChange={(e) => setTVForm({...tvForm, ip: e.target.value})}
                    className={`w-full p-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    placeholder="192.168.1.100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={tvForm.name}
                    onChange={(e) => setTVForm({...tvForm, name: e.target.value})}
                    className={`w-full p-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    placeholder="Living Room TV"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Model</label>
                  <input
                    type="text"
                    value={tvForm.model}
                    onChange={(e) => setTVForm({...tvForm, model: e.target.value})}
                    className={`w-full p-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    placeholder="QN75QN90DAFXZA"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">MAC Address</label>
                  <input
                    type="text"
                    value={tvForm.mac}
                    onChange={(e) => setTVForm({...tvForm, mac: e.target.value})}
                    className={`w-full p-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    placeholder="28:AF:42:4D:39:8E"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Token</label>
                  <input
                    type="text"
                    value={tvForm.token}
                    onChange={(e) => setTVForm({...tvForm, token: e.target.value})}
                    className={`w-full p-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    placeholder="10132873"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleSaveTV}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowTVForm(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Token Form Modal */}
        {showTokenForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className={`${cardClasses} rounded-3xl shadow-2xl p-6 w-full max-w-md border`}>
              <h3 className="text-xl font-bold mb-4">
                {editingToken ? 'Edit Token' : 'Add New Token'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Token Name</label>
                  <input
                    type="text"
                    value={tokenForm.name}
                    onChange={(e) => setTokenForm({...tokenForm, name: e.target.value})}
                    className={`w-full p-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    placeholder="API Token"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Token Value</label>
                  <input
                    type="text"
                    value={tokenForm.token}
                    onChange={(e) => setTokenForm({...tokenForm, token: e.target.value})}
                    className={`w-full p-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    placeholder="your-secret-token"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleSaveToken}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowTokenForm(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Management;