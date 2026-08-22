import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../services/api';
import { LiveLocation } from '../types';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { formatCurrency } from '../utils/format';

const LIGHT_MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-tiles': {
      type: 'raster',
      tiles: [
        'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      ],
      tileSize: 256,
      attribution: '© MapLibre | © CARTO | © OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'carto-tiles-layer',
      type: 'raster',
      source: 'carto-tiles',
      minzoom: 0,
      maxzoom: 20
    }
  ]
};

export const RideTrackingPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [assignment, setAssignment] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<LiveLocation | null>(null);
  const [status, setStatus] = useState<string>('DRIVER_ACCEPTED');
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!assignmentId || assignmentId === 'undefined') {
      navigate('/dashboard');
    }
  }, [assignmentId, navigate]);

  // MapLibre references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const driverMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!assignmentId || assignmentId === 'undefined') return;

    let retryCount = 0;
    let timerId: any = null;

    const fetchAssignment = async () => {
      try {
        const { data } = await api.get(`/rides/${assignmentId}`);
        setAssignment(data);
        setStatus(data.status);
        setError('');
        if (timerId) clearInterval(timerId);
      } catch (err) {
        console.error(`Failed to load ride details (Attempt ${retryCount + 1})`, err);
        retryCount += 1;
        if (retryCount >= 10) {
          if (timerId) clearInterval(timerId);
          setError('Failed to locate active ride assignment after several attempts.');
        }
      }
    };

    fetchAssignment();
    timerId = setInterval(fetchAssignment, 2000);

    if (socket) {
      socket.on('driver_location_updated', (data: LiveLocation) => {
        setDriverLocation(data);
      });

      socket.on('driver_arrived', () => {
        setStatus('DRIVER_ARRIVED');
      });

      socket.on('ride_started', () => {
        setStatus('IN_PROGRESS');
      });

      socket.on('ride_completed', () => {
        setStatus('COMPLETED');
      });

      socket.on('ride_cancelled', () => {
        alert('Ride was cancelled by the driver.');
        navigate('/dashboard');
      });

      return () => {
        if (timerId) clearInterval(timerId);
        socket.off('driver_location_updated');
        socket.off('driver_arrived');
        socket.off('ride_started');
        socket.off('ride_completed');
        socket.off('ride_cancelled');
      };
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [assignmentId, socket]);

  // Initialize map when assignment loads
  useEffect(() => {
    if (!mapContainerRef.current || !assignment) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: LIGHT_MAP_STYLE,
      center: [assignment.pickup_lng || 77.6068, assignment.pickup_lat || 12.9756],
      zoom: 13,
    });
    mapRef.current = map;

    map.on('load', () => {
      map.resize();
      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Add Pickup and Dropoff markers
      new maplibregl.Marker({ color: '#0ea5e9' })
        .setLngLat([assignment.pickup_lng || 77.6068, assignment.pickup_lat || 12.9756])
        .setPopup(new maplibregl.Popup().setText('Pickup Point'))
        .addTo(map);

      new maplibregl.Marker({ color: '#f43f5e' })
        .setLngLat([assignment.dropoff_lng || 77.6385, assignment.dropoff_lat || 12.9783])
        .setPopup(new maplibregl.Popup().setText('Destination'))
        .addTo(map);

      fetchOSRMRoute(
        assignment.pickup_lat || 12.9756,
        assignment.pickup_lng || 77.6068,
        assignment.dropoff_lat || 12.9783,
        assignment.dropoff_lng || 77.6385
      );
    });

    const t1 = setTimeout(() => map.resize(), 100);
    const t2 = setTimeout(() => map.resize(), 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      map.remove();
    };
  }, [assignment]);

  // Track driver marker updates
  useEffect(() => {
    if (!mapRef.current || !driverLocation) return;
    const map = mapRef.current;

    const coords: [number, number] = [driverLocation.lng, driverLocation.lat];

    if (!driverMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'driver-vehicle-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.backgroundImage = 'url("https://cdn-icons-png.flaticon.com/512/744/744465.png")';
      el.style.backgroundSize = 'contain';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.transition = 'transform 0.4s ease-out';

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map);
      driverMarkerRef.current = marker;
    } else {
      driverMarkerRef.current.setLngLat(coords);
    }

    if (driverLocation.heading !== undefined) {
      const el = driverMarkerRef.current.getElement();
      el.style.transform = `rotate(${driverLocation.heading}deg)`;
    }

    if (assignment) {
      fetchOSRMRoute(driverLocation.lat, driverLocation.lng, assignment.dropoff_lat, assignment.dropoff_lng);
    }
  }, [driverLocation, assignment]);

  const fetchOSRMRoute = async (pLat: number, pLng: number, dLat: number, dLng: number) => {
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
        if (map.getLayer('tracking-route-layer')) map.removeLayer('tracking-route-layer');
        if (map.getSource('tracking-route-source')) map.removeSource('tracking-route-source');

        map.addSource('tracking-route-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: routes[0].geometry
          }
        });

        map.addLayer({
          id: 'tracking-route-layer',
          type: 'line',
          source: 'tracking-route-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#0ea5e9',
            'line-width': 6,
            'line-opacity': 0.85
          }
        });
      }
    } catch (err) {
      console.error('OSRM tracking route failed', err);
    }
  };

  const handleSettlePayment = async () => {
    setIsCompleting(true);
    try {
      await api.post(`/payments/rides/${assignmentId}`, {
        idempotency_key: `pay_${assignmentId}_${Date.now()}`,
      });
      navigate('/history');
    } catch (err) {
      alert('Failed to settle payment. Please check your wallet balance.');
      setIsCompleting(false);
    }
  };

  const handleCancelRide = async () => {
    if (confirm('Are you sure you want to cancel this ride?')) {
      try {
        // backend passenger cancel endpoint allows assignmentId
        await api.post(`/passenger/rides/${assignmentId}/cancel`);
        navigate('/dashboard');
      } catch (err) {
        alert('Failed to cancel ride');
      }
    }
  };

  if (!assignmentId || assignmentId === 'undefined' || error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-sm max-w-md mx-auto mt-12">
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-gray-900">Invalid Tracking ID</h3>
        <p className="text-sm text-gray-500 mt-2">{error || "We couldn't retrieve tracking information because the ride tracking ID is missing or invalid."}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 px-5 py-2.5 bg-[#0EA5E9] text-white font-bold rounded-xl shadow-md hover:bg-[#0284C7] transition-all text-xs"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (assignment === null) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-center">
        <Loader2 className="w-8 h-8 text-[#0EA5E9] animate-spin mb-3" />
        <p className="text-sm font-semibold text-gray-550">Loading ride tracking details...</p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start pb-12">
      {/* Ride Controls & Status Drawer (Left Column) */}
      <div className="lg:col-span-5 space-y-5">
        {/* OTP High Contrast Block */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-card flex items-center justify-between border border-slate-800">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Passenger Verification Code
            </span>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Share with your driver upon arrival</p>
          </div>
          <div className="bg-sky-500/20 border border-sky-400/40 text-sky-400 px-4 py-2 rounded-2xl font-mono font-extrabold text-2xl tracking-widest">
            {assignment?.otp || '8492'}
          </div>
        </div>

        {/* Driver Details & Status */}
        <div className="glass-panel dark:bg-slate-900/60 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/20 text-sky-750 dark:text-sky-400 font-bold flex items-center justify-center text-lg">
                P
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Assigned Driver Partner</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Acceptance status active</p>
              </div>
            </div>
          </div>

          {/* Status Stepper */}
          <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-350">
              <span>Trip Status</span>
              <span className="text-sky-600 font-extrabold uppercase">{status.replace('_', ' ')}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-sky-500 h-full transition-all duration-500 animate-pulse"
                style={{
                  width:
                    status === 'DRIVER_ACCEPTED'
                      ? '25%'
                      : status === 'DRIVER_ARRIVED'
                      ? '50%'
                      : status === 'IN_PROGRESS'
                      ? '75%'
                      : '100%',
                }}
              />
            </div>
          </div>

          {/* Emergency SOS & Payment Controls */}
          {status === 'COMPLETED' ? (
            <button
              onClick={handleSettlePayment}
              disabled={isCompleting}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-glow flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isCompleting ? <Loader2 className="w-5 h-5 animate-spin" /> : `Settle Payment (${formatCurrency(assignment?.price || 150.00)})`}
            </button>
          ) : (
            <div className="flex gap-3">
              <button className="flex-1 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-200 dark:border-rose-900/40 flex items-center justify-center gap-2 transition-colors">
                <ShieldAlert className="w-4 h-4" />
                Emergency SOS
              </button>
              {status !== 'CANCELLED' && (
                <button
                  onClick={handleCancelRide}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition-colors"
                >
                  Cancel Ride
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map Live Location Viewer (Right Column) */}
      <div className="lg:col-span-7 h-[450px] lg:h-[550px] rounded-3xl overflow-hidden shadow-card border border-slate-200 dark:border-slate-800 relative bg-slate-100 dark:bg-slate-900">
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '450px' }} className="w-full h-full min-h-[450px]" />
      </div>
    </div>
  );
};
