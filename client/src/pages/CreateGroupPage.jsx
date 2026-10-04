import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UtensilsCrossed,
  Compass,
  Sparkles,
  Plus,
  Trash2,
  ArrowRight,
  MapPin,
  Sliders,
  Check,
  Search,
  AlertCircle,
} from 'lucide-react';
import api from '../services/api.js';

const POPULAR_CHIPS = [
  'Goa',
  'Jaipur',
  'Manali',
  'Delhi',
  'Mumbai',
  'Bengaluru',
  'Rishikesh',
  'Udaipur',
];

// Pre-defined coordinates for popular chips
const POPULAR_COORDS = {
  Goa: { name: 'Goa', state: 'Goa', lat: 15.2993, lng: 74.124, bbox: [73.68, 14.89, 74.34, 15.8] },
  Jaipur: { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, bbox: [75.68, 26.78, 75.92, 27.02] },
  Manali: { name: 'Manali', state: 'Himachal Pradesh', lat: 32.2396, lng: 77.1887, bbox: [77.15, 32.2, 77.22, 32.28] },
  Delhi: { name: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209, bbox: [76.84, 28.4, 77.34, 28.88] },
  Mumbai: { name: 'Mumbai', state: 'Maharashtra', lat: 18.922, lng: 72.8347, bbox: [72.77, 18.89, 73.0, 19.27] },
  Bengaluru: { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, bbox: [77.46, 12.83, 77.74, 13.14] },
  Rishikesh: { name: 'Rishikesh', state: 'Uttarakhand', lat: 30.0869, lng: 78.2676, bbox: [78.22, 30.05, 78.33, 30.14] },
  Udaipur: { name: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lng: 73.7125, bbox: [73.65, 24.54, 73.76, 24.63] },
};

export const CreateGroupPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Initial pack selection from URL or default
  const defaultPack = searchParams.get('pack') || 'food';

  const [title, setTitle] = useState('');
  const [packId, setPackId] = useState(defaultPack);
  const [organizerName, setOrganizerName] = useState('');
  const [strategy, setStrategy] = useState('utilitarian');

  // Destination state (restricted to India)
  const [destination, setDestination] = useState(POPULAR_COORDS['Delhi']);
  const [destinationQuery, setDestinationQuery] = useState('Delhi');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchingDestinations, setSearchingDestinations] = useState(false);

  const dropdownRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Custom Pack options with INR amounts
  const [customOptions, setCustomOptions] = useState([
    { id: 'custom-1', name: 'Inception (Sci-Fi Movie Night)', description: 'Mind-bending dream architecture classic', cost: 350, tags: ['movie', 'sci-fi', 'indoor'] },
    { id: 'custom-2', name: 'Board Game Cafe & Snacks', description: 'Catan, Secret Hitler & artisanal coffee', cost: 450, tags: ['games', 'cafe', 'lively'] },
    { id: 'custom-3', name: 'Rooftop Barbeque & Mocktails', description: 'Sunset grilled feast with friends', cost: 850, tags: ['food', 'rooftop', 'social'] },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search-as-you-type using Photon geocoder via backend
  useEffect(() => {
    const q = destinationQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        setSearchingDestinations(true);
        // Call backend destination search (Photon geocoder with India bbox)
        const res = await fetch(`/api/destinations/search?q=${encodeURIComponent(q)}&limit=8`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const results = await res.json();
          setSuggestions(results);
          setShowDropdown(results.length > 0);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Destination search error:', err);
        }
      } finally {
        setSearchingDestinations(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [destinationQuery]);

  const handleSelectDestination = (dest) => {
    setDestination({
      name: dest.name,
      state: dest.state || '',
      lat: dest.lat,
      lng: dest.lng,
      bbox: dest.bbox || [],
    });
    setDestinationQuery(dest.name);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleSelectPopularChip = (chipName) => {
    const coords = POPULAR_COORDS[chipName] || {
      name: chipName,
      state: '',
      lat: 28.6139,
      lng: 77.209,
      bbox: [],
    };
    setDestination(coords);
    setDestinationQuery(chipName);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const addCustomOption = () => {
    const nextId = `custom-${customOptions.length + 1}`;
    setCustomOptions([
      ...customOptions,
      { id: nextId, name: '', description: '', cost: 400, tags: ['custom'] },
    ]);
  };

  const removeCustomOption = (index) => {
    if (customOptions.length <= 2) return;
    setCustomOptions(customOptions.filter((_, i) => i !== index));
  };

  const updateCustomOption = (index, field, value) => {
    const updated = [...customOptions];
    updated[index][field] = value;
    setCustomOptions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please provide a title for your group decision.');
      return;
    }

    if (!organizerName.trim()) {
      setError('Please provide your name as organizer.');
      return;
    }

    if (packId !== 'custom' && (!destination || !destination.name)) {
      setError('Please select a valid destination in India.');
      return;
    }

    if (packId === 'custom') {
      const validOptions = customOptions.filter((o) => o.name.trim().length > 0);
      if (validOptions.length < 2) {
        setError('Please provide at least 2 valid candidate options for the custom pack.');
        return;
      }
    }

    try {
      setLoading(true);

      const payload = {
        title: title.trim(),
        packId,
        organizerName: organizerName.trim(),
        strategy,
        destination:
          packId !== 'custom'
            ? {
                name: destination.name,
                state: destination.state || '',
                lat: destination.lat,
                lng: destination.lng,
                bbox: destination.bbox || [],
              }
            : undefined,
        packConfig: {
          city: destination?.name || 'Delhi',
          centerLocation: destination ? { lat: destination.lat, lng: destination.lng } : undefined,
          customOptions: packId === 'custom' ? customOptions : [],
        },
      };

      const res = await api.createGroup(payload);

      // Store organizer guestToken and organizerToken in localStorage
      if (res.guestToken) {
        localStorage.setItem('gp_member_token', res.guestToken);
      }
      if (res.organizerToken) {
        localStorage.setItem('gp_organizer_token', res.organizerToken);
      }
      localStorage.setItem(`gp_org_${res.group.code}`, 'true');

      // Navigate to Group Lobby
      navigate(`/lobby/${res.group.code}`);
    } catch (err) {
      setError(err.message || 'Failed to create group decision');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="space-y-10"
      >
        <div className="text-left space-y-2">
          <span className="text-xs uppercase tracking-widest font-extrabold text-tomato">
            New Group Decision
          </span>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink dark:text-ink-dark tracking-tight">
            Start deciding with your group.
          </h1>
          <p className="text-base text-muted dark:text-muted-dark max-w-xl">
            Pick a decision pack, set your destination in India, and get a single link to share. No accounts or app installs required.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-btn bg-tomato-soft/60 border border-tomato/30 text-ink text-sm font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-tomato shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 1. Pack Selection */}
          <div className="space-y-3">
            <label className="block font-display font-bold text-base text-ink dark:text-ink-dark">
              1. Choose a Decision Pack
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Food Pack */}
              <div
                onClick={() => setPackId('food')}
                className={`cursor-pointer p-5 rounded-card border transition-all flex flex-col justify-between ${
                  packId === 'food'
                    ? 'border-2 border-tomato bg-surface dark:bg-surface-dark shadow-soft'
                    : 'border-line dark:border-line-dark bg-surface dark:bg-surface-dark hover:border-tomato/40'
                }`}
              >
                <div>
                  <div className={`w-11 h-11 rounded-btn flex items-center justify-center mb-3 ${
                    packId === 'food' ? 'bg-tomato text-white' : 'bg-tomato-soft text-tomato'
                  }`}>
                    <UtensilsCrossed className="w-5 h-5" />
                  </div>
                  <h4 className="font-display font-bold text-base text-ink dark:text-ink-dark">
                    Food & Dining
                  </h4>
                  <p className="text-xs text-muted dark:text-muted-dark mt-1 leading-relaxed">
                    Where to eat: pure veg, halal, dhabas, cafes, and restaurants.
                  </p>
                </div>
                {packId === 'food' && (
                  <div className="mt-4 flex items-center text-xs font-bold text-tomato">
                    <Check className="w-4 h-4 mr-1 stroke-[3]" /> Selected
                  </div>
                )}
              </div>

              {/* Trip Pack */}
              <div
                onClick={() => setPackId('trip')}
                className={`cursor-pointer p-5 rounded-card border transition-all flex flex-col justify-between ${
                  packId === 'trip'
                    ? 'border-2 border-tomato bg-surface dark:bg-surface-dark shadow-soft'
                    : 'border-line dark:border-line-dark bg-surface dark:bg-surface-dark hover:border-tomato/40'
                }`}
              >
                <div>
                  <div className={`w-11 h-11 rounded-btn flex items-center justify-center mb-3 ${
                    packId === 'trip' ? 'bg-tomato text-white' : 'bg-tomato-soft text-tomato'
                  }`}>
                    <Compass className="w-5 h-5" />
                  </div>
                  <h4 className="font-display font-bold text-base text-ink dark:text-ink-dark">
                    Trip & Route
                  </h4>
                  <p className="text-xs text-muted dark:text-muted-dark mt-1 leading-relaxed">
                    Stays, viewpoints, heritage forts, and ordered daily itineraries.
                  </p>
                </div>
                {packId === 'trip' && (
                  <div className="mt-4 flex items-center text-xs font-bold text-tomato">
                    <Check className="w-4 h-4 mr-1 stroke-[3]" /> Selected
                  </div>
                )}
              </div>

              {/* Custom Pack */}
              <div
                onClick={() => setPackId('custom')}
                className={`cursor-pointer p-5 rounded-card border transition-all flex flex-col justify-between ${
                  packId === 'custom'
                    ? 'border-2 border-tomato bg-surface dark:bg-surface-dark shadow-soft'
                    : 'border-line dark:border-line-dark bg-surface dark:bg-surface-dark hover:border-tomato/40'
                }`}
              >
                <div>
                  <div className={`w-11 h-11 rounded-btn flex items-center justify-center mb-3 ${
                    packId === 'custom' ? 'bg-tomato text-white' : 'bg-tomato-soft text-tomato'
                  }`}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h4 className="font-display font-bold text-base text-ink dark:text-ink-dark">
                    Custom Pack
                  </h4>
                  <p className="text-xs text-muted dark:text-muted-dark mt-1 leading-relaxed">
                    Movies, gifts, games, or offsites. Add your own options to vote on.
                  </p>
                </div>
                {packId === 'custom' && (
                  <div className="mt-4 flex items-center text-xs font-bold text-tomato">
                    <Check className="w-4 h-4 mr-1 stroke-[3]" /> Selected
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Group Title, Organizer Name, & Destination */}
          <div className="bg-surface dark:bg-surface-dark border border-line dark:border-line-dark rounded-card p-6 sm:p-7 space-y-6 shadow-soft">
            <h3 className="font-display font-bold text-base text-ink dark:text-ink-dark">
              2. Decision Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted dark:text-muted-dark mb-1.5">
                  Group Event Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Friday Flatmates Dinner or Goa Sights"
                  className="w-full min-h-[48px] px-4 py-3 rounded-btn border border-line dark:border-line-dark bg-paper dark:bg-surface-dark text-ink dark:text-ink-dark text-sm focus:border-tomato focus:ring-1 focus:ring-tomato outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted dark:text-muted-dark mb-1.5">
                  Your Name (Organizer)
                </label>
                <input
                  type="text"
                  required
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  placeholder="e.g. Aarav"
                  className="w-full min-h-[48px] px-4 py-3 rounded-btn border border-line dark:border-line-dark bg-paper dark:bg-surface-dark text-ink dark:text-ink-dark text-sm focus:border-tomato focus:ring-1 focus:ring-tomato outline-none transition-colors"
                />
              </div>
            </div>

            {/* Destination Selection for Food and Trip packs */}
            {packId !== 'custom' && (
              <div className="pt-2 space-y-3 relative" ref={dropdownRef}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted dark:text-muted-dark">
                  Where are you going?
                </label>

                {/* Search-as-you-type input with Photon typeahead */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted dark:text-muted-dark">
                    <Search className="w-4 h-4 text-tomato" />
                  </div>
                  <input
                    type="text"
                    value={destinationQuery}
                    onChange={(e) => setDestinationQuery(e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowDropdown(true);
                    }}
                    placeholder="Search any place in India (e.g. Pushkar, Manali, Goa, Kochi...)"
                    className="w-full min-h-[48px] pl-10 pr-10 py-3 rounded-btn border border-line dark:border-line-dark bg-paper dark:bg-surface-dark text-ink dark:text-ink-dark text-sm focus:border-tomato focus:ring-1 focus:ring-tomato outline-none transition-colors"
                  />
                  {searchingDestinations && (
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <div className="w-4 h-4 border-2 border-tomato border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showDropdown && suggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-[74px] mt-1 bg-surface dark:bg-surface-dark border border-line dark:border-line-dark rounded-btn shadow-card overflow-hidden max-h-60 overflow-y-auto">
                    {suggestions.map((s, idx) => (
                      <button
                        key={`${s.name}-${s.lat}-${idx}`}
                        type="button"
                        onClick={() => handleSelectDestination(s)}
                        className="w-full text-left px-4 py-2.5 hover:bg-paper dark:hover:bg-surface-dark/80 transition-colors flex items-center justify-between border-b border-line/40 dark:border-line-dark/40 last:border-b-0 cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5">
                          <MapPin className="w-4 h-4 text-tomato shrink-0" />
                          <div>
                            <span className="text-sm font-bold text-ink dark:text-ink-dark block">
                              {s.name}
                            </span>
                            <span className="text-xs text-muted dark:text-muted-dark">
                              {s.state ? `${s.state}, India` : 'India'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-muted dark:text-muted-dark">
                          {s.lat.toFixed(2)}, {s.lng.toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Destination Badge */}
                {destination && (
                  <div className="flex items-center space-x-2 text-xs text-muted dark:text-muted-dark bg-tomato-soft/30 dark:bg-tomato-soft/10 border border-tomato/20 rounded-btn px-3 py-1.5">
                    <span className="font-bold text-tomato">Selected:</span>
                    <span className="font-semibold text-ink dark:text-ink-dark">{destination.name}</span>
                    {destination.state && <span>({destination.state})</span>}
                    <span className="text-[11px] text-muted dark:text-muted-dark">
                      [{destination.lat.toFixed(3)}, {destination.lng.toFixed(3)}]
                    </span>
                  </div>
                )}

                {/* Popular in India Chips */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted dark:text-muted-dark block">
                    Popular in India:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_CHIPS.map((chipName) => {
                      const isSelected = destination?.name?.toLowerCase() === chipName.toLowerCase();
                      return (
                        <button
                          key={chipName}
                          type="button"
                          onClick={() => handleSelectPopularChip(chipName)}
                          className={`min-h-[36px] py-1.5 px-3 rounded-btn text-xs font-bold border flex items-center space-x-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-2 border-tomato bg-tomato-soft text-tomato dark:bg-tomato/20 shadow-soft'
                              : 'border-line dark:border-line-dark text-muted dark:text-muted-dark hover:border-tomato/50 hover:text-ink dark:hover:text-ink-dark'
                          }`}
                        >
                          <MapPin className={`w-3 h-3 ${isSelected ? 'text-tomato' : 'text-muted dark:text-muted-dark'}`} />
                          <span>{chipName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Custom Options Configurator (If Custom Pack) */}
          {packId === 'custom' && (
            <div className="bg-surface dark:bg-surface-dark border border-line dark:border-line-dark rounded-card p-6 sm:p-7 space-y-4 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-base text-ink dark:text-ink-dark">
                    3. Custom Options to Vote On
                  </h3>
                  <p className="text-xs text-muted dark:text-muted-dark mt-0.5">
                    Add candidate options with estimated costs in INR and tags.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addCustomOption}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-btn border border-line dark:border-line-dark hover:border-tomato text-tomato text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Option</span>
                </button>
              </div>

              <div className="space-y-3">
                {customOptions.map((opt, idx) => (
                  <div
                    key={opt.id || idx}
                    className="p-3.5 rounded-btn border border-line dark:border-line-dark bg-paper dark:bg-surface-dark/50 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        required
                        value={opt.name}
                        onChange={(e) => updateCustomOption(idx, 'name', e.target.value)}
                        placeholder={`Option ${idx + 1} Name (e.g. Board Game Night)`}
                        className="flex-1 px-3 py-2 rounded-btn border border-line dark:border-line-dark bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark text-sm focus:border-tomato focus:ring-1 focus:ring-tomato outline-none"
                      />
                      <div className="w-32 flex items-center space-x-1">
                        <span className="text-xs text-muted dark:text-muted-dark font-medium">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={opt.cost}
                          onChange={(e) => updateCustomOption(idx, 'cost', parseFloat(e.target.value) || 0)}
                          placeholder="Cost"
                          className="w-full px-2 py-2 rounded-btn border border-line dark:border-line-dark bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark text-sm text-center focus:border-tomato focus:ring-1 focus:ring-tomato outline-none"
                        />
                      </div>
                      {customOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeCustomOption(idx)}
                          className="p-2 text-muted dark:text-muted-dark hover:text-tomato transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Social Choice Aggregation Strategy */}
          <div className="bg-surface dark:bg-surface-dark border border-line dark:border-line-dark rounded-card p-6 sm:p-7 space-y-4 shadow-soft">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-tomato" />
              <label className="font-display font-bold text-base text-ink dark:text-ink-dark">
                4. Consensus Strategy
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {[
                { id: 'utilitarian', label: 'Utilitarian (Sum)', desc: 'Maximizes aggregate total group happiness' },
                { id: 'maximin', label: 'Maximin (Rawlsian)', desc: 'Maximizes happiness of the least-satisfied member' },
                { id: 'nash', label: 'Nash Welfare (Product)', desc: 'Balances equality and total group satisfaction' },
                { id: 'borda', label: 'Borda Count', desc: 'Positional scoring for ranked member preferences' },
              ].map((strat) => (
                <div
                  key={strat.id}
                  onClick={() => setStrategy(strat.id)}
                  className={`cursor-pointer p-4 rounded-btn border transition-all ${
                    strategy === strat.id
                      ? 'border-2 border-tomato bg-tomato-soft/60 text-tomato dark:bg-tomato/20 font-bold'
                      : 'border-line dark:border-line-dark text-muted dark:text-muted-dark hover:border-tomato/50'
                  }`}
                >
                  <div className="font-display font-bold text-ink dark:text-ink-dark mb-1">{strat.label}</div>
                  <div className="text-[11px] text-muted dark:text-muted-dark leading-snug">{strat.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] py-4 rounded-btn bg-tomato hover:bg-tomato-hover text-white font-display font-bold text-base shadow-soft flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
          >
            <span>{loading ? 'Creating Group & Finding Places...' : 'Create Group & Share Link'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateGroupPage;
