import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { MapPin, Navigation, KeyRound, Loader2, Volume2 } from 'lucide-react';
import { formatCurrency } from '../utils/format';

const DARK_MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
        'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'
      ],
      tileSize: 256,
      attribution: '© MapLibre | © CARTO | © OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 20
    }
  ]
};

export const ActiveRidePage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [assignment, setAssignment] = useState<any>(null);
  const [status, setStatus] = useState<string>('DRIVER_ACCEPTED');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Simulated GPS position
  const [driverPos, setDriverPos] = useState({ lat: 12.9716, lng: 77.5946 });
  const [heading, setHeading] = useState(0.0);

  // MapLibre references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const driverMarkerRef = useRef<maplibregl.Marker | null>(null);
  const targetMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Voice Guidance Speech Engine
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (!assignmentId || assignmentId === 'undefined') return;

    const fetchAssignment = async () => {
      try {
        const { data } = await api.get(`/rides/${assignmentId}`);
        setAssignment(data);
        setStatus(data.status);
        setDriverPos({ lat: data.pickup_lat - 0.015, lng: data.pickup_lng - 0.015 });
        speak("New route assigned. Proceed to pickup location.");
      } catch (err) {
        console.error('Failed to load ride assignment details', err);
      }
    };
    fetchAssignment();
  }, [assignmentId]);

  useEffect(() => {
    if (!socket) return;
    const handleCancelled = () => {
      speak("Ride has been cancelled by the passenger.");
      alert('The passenger has cancelled the ride.');
      navigate('/dashboard');
    };
    socket.on('ride_cancelled', handleCancelled);
    return () => {
      socket.off('ride_cancelled', handleCancelled);
    };
  }, [socket, navigate]);

  useEffect(() => {
    if (!assignmentId || assignmentId === 'undefined' || !assignment) return;

    const interval = setInterval(() => {
      setDriverPos((prev) => {
        const targetLat = status === 'DRIVER_ACCEPTED' ? assignment.pickup_lat : assignment.dropoff_lat;
        const targetLng = status === 'DRIVER_ACCEPTED' ? assignment.pickup_lng : assignment.dropoff_lng;
        
        const latDiff = targetLat - prev.lat;
        const lngDiff = targetLng - prev.lng;
        const dist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

        if (dist < 0.0005) {
          return prev;
        }

        const rawHeading = (Math.atan2(lngDiff, latDiff) * 180) / Math.PI;
        const newHeading = ((rawHeading % 360) + 360) % 360;
        setHeading(newHeading);

        const step = 0.001;
        const nextLat = prev.lat + (latDiff / dist) * step;
        const nextLng = prev.lng + (lngDiff / dist) * step;

        api.post(`/rides/${assignmentId}/location`, {
          lat: nextLat,
          lng: nextLng,
          speed: 40.0,
          heading: newHeading,
        }).catch(() => {});

        return { lat: nextLat, lng: nextLng };
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [assignmentId, status, assignment]);

  useEffect(() => {
    if (status === 'DRIVER_ARRIVED') {
      speak("You have arrived at the pickup point. Verify the customer verification code to start trip.");
    } else if (status === 'IN_PROGRESS') {
      speak("Trip commenced. Proceed to dropoff destination.");
    } else if (status === 'COMPLETED') {
      speak("Trip completed. Payment has been settled.");
    }
  }, [status]);

  useEffect(() => {
    if (!mapContainerRef.current || !assignment) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: DARK_MAP_STYLE,
      center: [driverPos.lng, driverPos.lat],
      zoom: 14,
    });
    mapRef.current = map;

    map.on('load', () => {
      map.resize();
      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      const el = document.createElement('div');
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.backgroundImage = 'url("https://cdn-icons-png.flaticon.com/512/744/744465.png")';
      el.style.backgroundSize = 'contain';
      el.style.transition = 'transform 0.3s ease-out';

      const dMarker = new maplibregl.Marker({ element: el })
        .setLngLat([driverPos.lng, driverPos.lat])
        .addTo(map);
      driverMarkerRef.current = dMarker;

      const targetLat = status === 'DRIVER_ACCEPTED' ? assignment.pickup_lat : assignment.dropoff_lat;
      const targetLng = status === 'DRIVER_ACCEPTED' ? assignment.pickup_lng : assignment.dropoff_lng;

      const tMarker = new maplibregl.Marker({ color: '#10b981' })
        .setLngLat([targetLng, targetLat])
        .addTo(map);
      targetMarkerRef.current = tMarker;

      fetchRoute(driverPos.lat, driverPos.lng, targetLat, targetLng);
    });

    const t1 = setTimeout(() => map.resize(), 100);
    const t2 = setTimeout(() => map.resize(), 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      map.remove();
    };
  }, [assignment]);

  useEffect(() => {
    if (!mapRef.current || !assignment) return;
    const map = mapRef.current;

    const targetLat = status === 'DRIVER_ACCEPTED' ? assignment.pickup_lat : assignment.dropoff_lat;
    const targetLng = status === 'DRIVER_ACCEPTED' ? assignment.pickup_lng : assignment.dropoff_lng;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat([driverPos.lng, driverPos.lat]);
      const el = driverMarkerRef.current.getElement();
      el.style.transform = `rotate(${heading}deg)`;
    }

    if (targetMarkerRef.current) {
      targetMarkerRef.current.setLngLat([targetLng, targetLat]);
    }

    map.panTo([driverPos.lng, driverPos.lat]);
    fetchRoute(driverPos.lat, driverPos.lng, targetLat, targetLng);
  }, [driverPos, status, assignment]);

  const fetchRoute = async (pLat: number, pLng: number, dLat: number, dLng: number) => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const { data } = await axios.get(`https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}`, {
        params: {
          overview: 'full',
          geometries: 'geojson'
        }
      });
      const routes = data.routes;
      if (routes && routes.length > 0) {
        if (map.getLayer('driver-route-layer')) map.removeLayer('driver-route-layer');
        if (map.getSource('driver-route-source')) map.removeSource('driver-route-source');

        map.addSource('driver-route-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: routes[0].geometry
          }
        });

        map.addLayer({
          id: 'driver-route-layer',
          type: 'line',
          source: 'driver-route-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#10b981',
            'line-width': 6,
            'line-opacity': 0.85
          }
        });
      }
    } catch (err) {
      console.error('OSRM route failed for driver', err);
    }
  };

  const handleMarkArrived = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/rides/${assignmentId}/arrived`);
      setStatus('DRIVER_ARRIVED');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to mark arrival');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtpAndStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await api.post(`/rides/${assignmentId}/start`, { otp: otpInput });
      setStatus('IN_PROGRESS');
      setShowOtpModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid passenger verification OTP code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteRide = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/rides/${assignmentId}/complete`, {
        distance_miles: 4.2,
        duration_seconds: 720,
      });
      setStatus('COMPLETED');
      alert('Trip completed! Payment credited to your wallet.');
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAssignment = async () => {
    if (confirm('Are you sure you want to cancel this ride assignment? This will notify the passenger.')) {
      setIsSubmitting(true);
      try {
        await api.post(`/rides/${assignmentId}/cancel`);
        alert('Ride assignment cancelled.');
        navigate('/dashboard');
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to cancel assignment');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!assignmentId || assignmentId === 'undefined') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl max-w-md mx-auto mt-12 text-white">
        <KeyRound className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold">Invalid Assignment ID</h3>
        <p className="text-sm text-slate-400 mt-2">Active ride tracking ID is missing or invalid. Please check your dashboard.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl shadow-md hover:bg-emerald-400 transition-all text-xs"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (assignment === null) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-center text-white bg-slate-950 min-h-screen">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-400">Loading ride assignment details...</p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start pb-12">
      {/* Controls & Trip Stepper (Left Column) */}
      <div className="lg:col-span-5 space-y-5">
        <div className="glass-panel-dark p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                ACTIVE TRIP STATUS
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5 uppercase">
                {status.replace('_', ' ')}
              </h3>
            </div>
            <span className="text-2xl font-extrabold text-emerald-400 font-display">
              {formatCurrency(assignment?.price || 150.00)}
            </span>
          </div>

          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate max-w-[300px]">{assignment?.pickup_address || 'Pickup address loading...'}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Navigation className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="truncate max-w-[300px]">{assignment?.dropoff_address || 'Drop-off address loading...'}</span>
            </div>
          </div>

          {/* Audio Navigation Voice Indicator */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-850 p-3 rounded-2xl text-xs text-slate-400 font-semibold">
            <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Voice Guided Navigation Active (en-IN)</span>
          </div>

          {/* Action Triggers based on state machine */}
          {['ACCEPTED', 'DRIVER_ACCEPTED'].includes(status) && (
            <button
              onClick={handleMarkArrived}
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shadow-emerald-glow flex items-center justify-center gap-2 transition-all"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Mark Arrived at Pickup'}
            </button>
          )}

          {['ARRIVED', 'DRIVER_ARRIVED'].includes(status) && (
            <button
              onClick={() => setShowOtpModal(true)}
              className="w-full py-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold shadow-glow flex items-center justify-center gap-2 transition-all"
            >
              <KeyRound className="w-5 h-5" />
              Verify Passenger OTP to Start
            </button>
          )}

          {status === 'IN_PROGRESS' && (
            <button
              onClick={handleCompleteRide}
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shadow-emerald-glow flex items-center justify-center gap-2 transition-all"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Trip & Collect Payment'}
            </button>
          )}

          {['ACCEPTED', 'DRIVER_ACCEPTED', 'ARRIVED', 'DRIVER_ARRIVED'].includes(status) && (
            <button
              onClick={handleCancelAssignment}
              disabled={isSubmitting}
              className="w-full py-3 mt-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold flex items-center justify-center gap-2 transition-all"
            >
              Cancel Ride
            </button>
          )}
        </div>
      </div>

      {/* Map Container (Right Column) */}
      <div className="lg:col-span-7 h-[450px] lg:h-[550px] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 relative bg-slate-900">
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '450px' }} className="w-full h-full min-h-[450px]" />
      </div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-dark max-w-sm w-full p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white font-display">Enter Passenger OTP</h3>
            <p className="text-xs text-slate-400 font-medium">Ask passenger for their 4-digit verification code.</p>

            {error && (
              <div className="bg-rose-500/10 text-rose-400 text-xs p-3 rounded-xl border border-rose-500/20">
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyOtpAndStart} className="space-y-4">
              <input
                type="text"
                maxLength={4}
                placeholder="8492"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 text-center tracking-[0.5em] font-mono text-2xl rounded-2xl bg-slate-900 border border-slate-800 text-white font-extrabold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                required
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-emerald-glow hover:bg-emerald-400"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Start Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
