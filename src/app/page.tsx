"use client";

import { useState, useEffect, useCallback } from "react";
import { GoogleMap, LoadScript, Marker, DirectionsService, DirectionsRenderer } from "@react-google-maps/api";
import { FiMapPin, FiFlag } from "react-icons/fi";
import { debounce } from "lodash";
import Image from "next/image"; // Added Next.js Image component

interface UserLocation {
  lat: number;
  lng: number;
}

interface PlaceResult {
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  name: string;
  vicinity: string;
  rating?: number;
  distance?: number;
}

const containerStyle = {
  width: "100%",
  height: "500px",
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; 
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function Home() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locations, setLocations] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<PlaceResult | null>(null);
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({
            lat: latitude,
            lng: longitude,
          });
        },
        () => { // Removed unused err parameter
          setError("Please enable location access to find nearby locations.");
        },
        {   enableHighAccuracy: true, // Requests GPS if available
          maximumAge: 0, // No cache, fresh position
          timeout: 10000 
         }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  };

  // Added useCallback for fetchLocations
  const fetchLocations = useCallback(debounce(async (lat: number, lng: number) => {
    if (isNaN(lat) || isNaN(lng)) {
      setError("Invalid coordinates received. Unable to fetch locations.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/places?lat=${lat}&lng=${lng}`);
      const data: PlaceResult[] = await response.json();

      const locationsWithDistance = data
        .map((location) => ({
          ...location,
          distance: calculateDistance(
            lat,
            lng,
            location.geometry.location.lat,
            location.geometry.location.lng
          ),
        }))
        .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

      setLocations(locationsWithDistance);
    } catch { // Removed unused err parameter
      setError("Failed to fetch locations.");
    } finally {
      setLoading(false);
    }
  }, 500), []);

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchLocations(userLocation.lat, userLocation.lng);
    }
  }, [userLocation, fetchLocations]); // Added fetchLocations to dependencies

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FF9933] via-white to-[#138808]">
      {/* Header Section */}
      <header className="bg-white shadow-md border-b-4 border-[#138808]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <FiFlag className="text-4xl text-[#FF9933]" />
              <div>
                <h1 className="text-2xl font-bold text-black">
                  <span className="text-[#FF9933]">Republic Day</span>{' '}
                  <span className="text-[#138808]">Flag Hoisting</span>
                </h1>
                <p className="text-sm text-black">Find nearest locations to hoist the Tiranga</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#FF9933] rounded-full"></div>
              {/* Ashoka Chakra in middle circle */}
              <div className="w-8 h-8 bg-white border-2 border-gray-800 rounded-full flex items-center justify-center">
                <Image 
                  src="https://upload.wikimedia.org/wikipedia/commons/1/17/Ashoka_Chakra.svg"
                  width={20}
                  height={20}
                  alt="Ashoka Chakra"
                />
              </div>
              <div className="w-8 h-8 bg-[#138808] rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {userLocation ? (
          <div className="space-y-8">
            {/* Map Section */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200">
              <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!}>
                <GoogleMap
                  mapContainerStyle={containerStyle}
                  center={userLocation}
                  zoom={14}
                >
                  <Marker
                    position={userLocation}
                    label="You"
                    icon={{
                      url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                    }}
                  />
                  {locations.map((location, index) => (
                    <Marker
                      key={index}
                      position={{
                        lat: location.geometry.location.lat,
                        lng: location.geometry.location.lng,
                      }}
                      icon={{
                        url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                      }}
                    />
                  ))}

                  {selectedLocation && userLocation && (
                    <DirectionsService
                      options={{
                        destination: {
                          lat: selectedLocation.geometry.location.lat,
                          lng: selectedLocation.geometry.location.lng
                        },
                        origin: userLocation,
                        travelMode: google.maps.TravelMode.DRIVING
                      }}
                      callback={(result, status) => {
                        if (status === 'OK') {
                          setDirectionsResult(result);
                        } else {
                          console.error('Directions request failed:', status);
                        }
                      }}
                    />
                  )}

                  {directionsResult && (
                    <DirectionsRenderer
                      options={{
                        directions: directionsResult,
                      }}
                    />
                  )}
                </GoogleMap>
              </LoadScript>
            </div>

            {/* Locations List */}
            <section className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
              <h2 className="text-2xl font-semibold mb-6 text-black flex items-center">
                <Image 
                  src="https://upload.wikimedia.org/wikipedia/commons/1/17/Ashoka_Chakra.svg" 
                  width={32}
                  height={32}
                  className="mr-3"
                  alt="Ashoka Chakra"
                />
                Nearby Potential Flag Hositing Locations.
              </h2>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF9933] border-t-[#138808] mx-auto"></div>
                  <p className="mt-4 text-black">Searching for nearby locations...</p>
                </div>
              ) : locations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {locations.map((location, index) => (
                    <div 
                      key={index}
                      className="group p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-[#138808] cursor-pointer"
                      onClick={() => setSelectedLocation(location)}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <FiMapPin className="w-6 h-6 text-[#FF9933]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-black">{location.name}</h3>
                          <p className="text-sm text-black mt-1">{location.vicinity}</p>
                          <div className="mt-3 space-y-1">
                            {location.distance && (
                              <p className="text-sm text-black">
                                <span className="text-[#138808] font-medium">Distance:</span>{' '}
                                {location.distance.toFixed(2)} km
                              </p>
                            )}
                            {location.rating && (
                              <p className="text-sm text-black">
                                <span className="text-[#FF9933] font-medium">Rating:</span>{' '}
                                {location.rating}/5
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-black">No educational institutions found in your area.</p>
                </div>
              )}
            </section>
          </div>
        ) : (
          !error && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF9933] border-t-[#138808] mx-auto"></div>
              <p className="mt-4 text-black">Detecting your location...</p>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#0C4B2F] text-white py-8 mt-16">
  <div className="text-center">
    <p className="text-xl font-semibold mb-2">
      Developed by <span className="text-[#FF9933]">Aditya Umale</span>
    </p>
    <div className="flex justify-center space-x-4">
      <div className="w-6 h-6 bg-[#FF9933] rounded-full"></div>
      <div className="w-6 h-6 bg-white rounded-full"></div>
      <div className="w-6 h-6 bg-[#138808] rounded-full"></div>
    </div>
  </div>
</footer>

    </div>
  );
}