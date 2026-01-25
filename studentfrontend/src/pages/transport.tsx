import React, { useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/use-auth";
import { transportApi } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MapPin, Info, AlertTriangle, Home } from "lucide-react";
import ReactGa from 'react-ga4';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const DEFAULT_CENTER = { lat: 13.008563, lng: 80.003438 };

export default function TransportPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const markerRef = useRef<any>(null);
  const mapRef_instance = useRef<any>(null);
  const [busNo, setBusNo] = useState("");
  const [busNoError, setBusNoError] = useState("");
  const [boardingPointName, setBoardingPointName] = useState("");
  const [pincode, setPincode] = useState("");
  const [pincodeError, setPincodeError] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [selected, setSelected] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [confirmation, setConfirmation] = useState<any>(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpStatus, setOtpStatus] = useState<"pending" | "success" | "error">(
    "pending"
  );
  const [otpMessage, setOtpMessage] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [existingLocation, setExistingLocation] = useState<any>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isHostelStudent, setIsHostelStudent] = useState(false);
  const { data: userData } = useCurrentUser();
  const [isZoomingToPincode, setIsZoomingToPincode] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);


    useEffect(() => {
      ReactGa.send({
        hitType: "Transport Form Page",
        page: "/transport",
        title: "Transport Form Page",
      });
    }, []);

  // Load Google Maps and Places
  useEffect(() => {
    const w = window as any;
    if (!w.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.onload = () => {
        setIsGoogleMapsLoaded(true);
        console.log("Google Maps API loaded");
        initMap();
      };
      document.body.appendChild(script);
    } else {
      setIsGoogleMapsLoaded(true);
      console.log("Google Maps API already loaded");
      initMap();
    }
    // eslint-disable-next-line
  }, []);

  // Check for existing location (confirmed or unconfirmed)
  useEffect(() => {
    async function checkExistingLocation() {
      try {
        const res = await transportApi.getExistingLocation();
        const locationData = res.data;
        setExistingLocation(locationData);

        // If it's an unconfirmed location, pre-fill the form
        if (!locationData.confirmed) {
          setBusNo(locationData.bus_no || "");
          setBoardingPointName(locationData.boarding_point_name || "");
          setPincode(locationData.pincode || "");
          setSelectedLocation(locationData.address || "");
          setSelected({
            lat: locationData.latitude,
            lng: locationData.longitude,
            address: locationData.address,
          });
        }
      } catch (err: any) {
        // Check if it's a hostel student error
        if (
          err.response?.status === 403 &&
          err.response?.data?.is_hostel_student
        ) {
          setIsHostelStudent(true);
        }
        // No existing location found, which is fine
        console.log("No existing location found");
      } finally {
        setIsLoadingLocation(false);
      }
    }

    checkExistingLocation();
  }, []);

  // Re-initialize map when map is shown
  useEffect(() => {
    if (showMap) {
      setTimeout(() => {
        initMap();
      }, 0);
    }
    // eslint-disable-next-line
  }, [showMap]);

  
  useEffect(() => {
    if (showMap && !selected && /^\d{6}$/.test(pincode)) {
      setTimeout(() => {
        zoomToPincode(pincode);
      }, 300);
    }
  }, [showMap]);

  function initMap() {
    console.log("Initializing map...");
    const w = window as any;
    if (!mapRef.current) {
      console.log("Map ref not available");
      return;
    }

    // Set initial center based on existing location or default
    const initialCenter = selected
      ? { lat: selected.lat, lng: selected.lng }
      : DEFAULT_CENTER;
    console.log("Initial center:", initialCenter);

    const map = new w.google.maps.Map(mapRef.current, {
      center: initialCenter,
      zoom: 14,
      styles: [
        {
          featureType: "all",
          elementType: "geometry",
          stylers: [{ visibility: "simplified" }],
        },
        {
          featureType: "poi",
          stylers: [{ visibility: "off" }],
        },
        {
          featureType: "transit",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    // Store map instance
    mapRef_instance.current = map;
    console.log("Map instance stored");

    // Marker
    markerRef.current = new w.google.maps.Marker({
      map,
      draggable: true,
      position: initialCenter,
    });
    console.log("Main marker created");

    // On map click
    map.addListener("click", (e: any) => {
      const clickedLatLng = e.latLng;
      markerRef.current.setPosition(clickedLatLng);
      getAddress(clickedLatLng.lat(), clickedLatLng.lng());
    });

    // On marker drag end
    markerRef.current.addListener("dragend", (e: any) => {
      const draggedLatLng = e.latLng;
      getAddress(draggedLatLng.lat(), draggedLatLng.lng());
    });

    // Places Autocomplete
    if (searchInputRef.current) {
      const autocomplete = new w.google.maps.places.Autocomplete(
        searchInputRef.current
      );
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          map.setCenter({ lat, lng });
          markerRef.current.setPosition({ lat, lng });
          getAddress(lat, lng);
        }
      });
    }
  }

  async function getAddress(lat: number, lng: number) {
    try {
      const res = await transportApi.getAddress(lat, lng);
      const data = res.data;
      if (data.status === "OK" && data.results && data.results.length > 0) {
        const address = data.results[0].formatted_address;
        setSelected({ lat, lng, address });
        setSelectedLocation(address);
      } else {
        setSelected({ lat, lng, address: "" });
        setSelectedLocation("");
        alert("No address found for this location.");
      }
    } catch (err) {
      setSelected({ lat, lng, address: "" });
      setSelectedLocation("");
      alert("Failed to fetch address");
    }
  }

  function validateBusNumber(busNo: string): boolean {
    return true;
    if (busNo.length > 3) {
      setBusNoError("Bus number cannot be more than 3 characters");
      return false;
    }

    if (!/\d/.test(busNo)) {
      setBusNoError("Bus number must contain at least one number");
      return false;
    }

    for (let i = 0; i < busNo.length - 1; i++) {
      if (/[a-zA-Z]/.test(busNo[i]) && /\d/.test(busNo[i + 1])) {
        setBusNoError("Bus number cannot have a number after an alphabet");
        return false;
      }
    }

    setBusNoError("");
    return true;
  }

  function validatePincode(pincode: string): boolean {
    if (!/^\d{6}$/.test(pincode)) {
      setPincodeError("Pincode must be exactly 6 digits");
      return false;
    }

    setPincodeError("");
    return true;
  }

  function handleBusNoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setBusNo(value);
    if (value) {
      validateBusNumber(value);
    } else {
      setBusNoError("");
    }
  }

  function handlePincodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    console.log("=== handlePincodeChange called ===");
    console.log("Input value:", value);
    console.log("Value length:", value.length);

    setPincode(value);
    if (value) {
      validatePincode(value);
      // If pincode is valid (6 digits), zoom to that location
      if (/^\d{6}$/.test(value)) {
        zoomToPincode(value);
      }
    } else {
      setPincodeError("");
    }
  }

  async function zoomToPincode(pincode: string) {
    const w = window as any;
    if (!w.google || !w.google.maps || !mapRef_instance.current) {
      console.log("Google Maps not loaded or map not initialized");
      return;
    }

    setIsZoomingToPincode(true);

    try {
      // Use Google Geocoding API to get coordinates for the pincode
      const geocoder = new w.google.maps.Geocoder();
      geocoder.geocode(
        { address: pincode + ", India" },
        (results: any, status: any) => {
          if (status === "OK" && results && results.length > 0) {
            const location = results[0].geometry.location;
            const lat = location.lat();
            const lng = location.lng();

            mapRef_instance.current.setCenter({ lat, lng });
            mapRef_instance.current.setZoom(13);

            // Update marker position
            if (markerRef.current) {
              markerRef.current.setPosition({ lat, lng });
            }

            // Get and set the address
            getAddress(lat, lng);

            console.log(
              `Map zoomed to pincode: ${pincode} at coordinates: ${lat}, ${lng}`
            );
          } else {
            console.log(`Geocoding failed for pincode: ${pincode}`);
          }
          setIsZoomingToPincode(false);
        }
      );
    } catch (error) {
      console.error("Error zooming to pincode:", error);
      setIsZoomingToPincode(false);
    }
  }

  async function handleConfirmLocation() {
    if (!selected) {
      alert('Please select a location.');
      return;
    }
    // if (!busNo) {
    //   alert('Please enter a bus number.');
    //   return;
    // }
    if (!pincode) {
      alert('Please enter a pincode.');
      return;
    }
    // if (!boardingPointName) {
    //   alert('Please enter a boarding point name.');
    //   return;
    // }
    if (!validateBusNumber(busNo)) {
      return;
    }
    if (!validatePincode(pincode)) {
      return;
    }
    setIsSendingOtp(true);
    try {
      const res = await transportApi.requestLocation({
        latitude: selected.lat,
        longitude: selected.lng,
        address: selected.address,
        bus_no: busNo,
        boarding_point_name: boardingPointName,
        pincode: pincode,
      });
      setConfirmation(res.data);
      setShowOtpModal(true);
      setOtpStatus('pending');
      setOtpMessage('');
      setOtpInput('');
    } catch (err: any) {
      const data = err.response?.data;
      if (err.response?.status === 403) {
        alert('Hostel students do not need transport services. You are not eligible to register for transport.');
        setIsHostelStudent(true);
      } else {
        alert(data?.detail || 'Server error');
      }
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmation) return;
    try {
      const res = await transportApi.confirmOtp({
        id: confirmation.id,
        otp: otpInput,
      });
      setOtpStatus("success");
      setOtpMessage(
        "OTP verified successfully! Your location has been confirmed and stored. The location can no longer be changed."
      );
      setOtpInput("");
      // Update existing location and close modal after a short delay
      setTimeout(async () => {
        try {
          const locationRes = await transportApi.getExistingLocation();
          setExistingLocation(locationRes.data);
          setShowOtpModal(false);
          setOtpStatus("pending");
          setOtpMessage("");
          setConfirmation(null);
        } catch (err) {
          console.error("Error fetching updated location:", err);
        }
      }, 2000); // Show success message for 2 seconds before switching
    } catch (err: any) {
      const data = err.response?.data;
      if (err.response?.status === 403) {
        alert(
          "Hostel students do not need transport services. You are not eligible to confirm transport locations."
        );
        setIsHostelStudent(true);
      } else {
        setOtpStatus("error");
        setOtpMessage(data?.detail || "Invalid OTP. Please try again.");
        setOtpInput("");
      }
    }
  }

  function handleCloseModal() {
    setShowOtpModal(false);
    setOtpStatus("pending");
    setOtpMessage("");
    setOtpInput("");
    setConfirmation(null);
    if (otpStatus === "success") {
      setSelected(null);
      setBusNo("");
      setBoardingPointName("");
      setPincode("");
      setSelectedLocation("");
    }
  }

  function handleModalOpenChange(open: boolean) {
    if (!open && otpStatus !== "success") {
      // Don't allow closing if OTP verification is still pending or failed
      return;
    }
    if (!open) {
      handleCloseModal();
    }
  }

  function handlePickOnMap() {
    setShowMap(true);
    setTimeout(() => {
      const w = window as any;
      if (
        w.google &&
        w.google.maps &&
        mapRef_instance.current &&
        /^\d{6}$/.test(pincode)
      ) {
        const geocoder = new w.google.maps.Geocoder();
        const address = `${pincode}, India`;
        geocoder.geocode({ address }, (results: any, status: any) => {
          if (status === "OK" && results && results.length > 0) {
            const loc = results[0].geometry.location;
            const lat = loc.lat();
            const lng = loc.lng();
            mapRef_instance.current.setCenter({ lat, lng });
            mapRef_instance.current.setZoom(13);
            if (markerRef.current) {
              markerRef.current.setPosition({ lat, lng });
            }
            getAddress(lat, lng);
          } else {
            alert("Could not find the location for the entered pincode.");
          }
        });
      }
    }, 500);
  }

  function renderMapPicker() {
    return (
      <div className="w-full h-[50vh] flex flex-col items-center justify-center relative overflow-visible">
        <p className="text-gray-500 text-sm -mt-2">
              Please drop a pin on your Home.
        </p>
        <div className="w-full mb-4">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search for a location..."
            className="w-full"
          />
        </div>
        <div className="relative w-full h-full">
          <div
            ref={mapRef}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 12,
              boxShadow: "0 2px 8px #0001",
            }}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          className="absolute bottom-4 left-4 z-30"
          onClick={() => {
            const w = window as any;
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                if (w.google && w.google.maps && mapRef.current) {
                  const currentMap = new w.google.maps.Map(mapRef.current, {
                    center: { lat, lng },
                    zoom: 14,
                  });
                  markerRef.current = new w.google.maps.Marker({
                    map: currentMap,
                    draggable: true,
                    position: { lat, lng },
                  });
                  getAddress(lat, lng);
                }
              });
            } else {
              alert("Geolocation is not supported by this browser.");
            }
          }}
        >
          Use Current Location
        </Button>
        <Button
          className="absolute bottom-4 right-4 z-30"
          onClick={() => setShowMap(false)}
          variant="default"
        >
          Done
        </Button>
      </div>
    );
  }

  if (isLoadingLocation) {
    return (
      <div className="w-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md my-15">
          <CardContent className="p-6">
            <div className="text-center">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show hostel student message
  if (isHostelStudent) {
    return (
      <div className="w-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md my-15">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-6 w-6 text-green-600" />
              Hostel Life Perks: Your Campus Superpower!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {/* <Alert className="border-green-200 bg-green-50">
              <Home className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">
                No Transport Required
              </AlertTitle>
              <AlertDescription className="text-green-700">
                As a hostel student, you live on campus and do not need
                transport services. You can access all facilities within walking
                distance from your hostel.
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800 text-sm">
                <strong>Benefits of being a hostel student:</strong>
              </p>
              <ul className="text-blue-700 text-sm mt-2 space-y-1">
                <li>• No need to commute daily</li>
                <li>• Easy access to campus facilities</li>
                <li>• More time for studies and activities</li>
                <li>• Reduced transportation costs</li>
              </ul>
            </div> */}
            <Alert className="border-green-200 bg-green-50">
              <Home className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800"> The 5-Second Commute™ </AlertTitle>
              <AlertDescription className="text-green-700"> Your morning "rush hour" = Rolling out of bed 2 minutes before class. No buses, no traffic - just you vs. your alarm clock! ⏰ </AlertDescription>
              </Alert>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-blue-800 text-sm"> <strong>Why hostel students are secretly winning:</strong> </p>
                  <ul className="text-blue-700 text-sm mt-2 space-y-1"> <li>• <b>Pajama-friendly lifestyle:</b> Your dress code = "Whatever I slept in" 👕</li> <li>• <b>24/7 food access:</b> Mess food may be questionable, but it's always available 🍛</li> <li>• <b>Built-in social life:</b> Your friends live in the same building (whether you like it or not) 😂</li> </ul> </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show confirmed location
  if (existingLocation && existingLocation.confirmed) {
    return (
      <div className="w-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md my-15">
          <CardHeader>
            <CardTitle>Transport Location Confirmed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
          {
            /*
            <div className="space-y-2 mb-5">
              <Label className="mb-1 block">Bus Number:</Label>
              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                <span className="font-semibold text-blue-900 text-lg">{existingLocation.bus_no}</span>
              </div>
            </div>
            {existingLocation.boarding_point_name && (
              <div className="space-y-2 mb-5">
                <Label className="mb-1 block">Current Boarding Point:</Label>
                <div className="p-3 bg-indigo-50 rounded-md border border-indigo-200">
                  <span className="font-semibold text-indigo-900 text-lg">{existingLocation.boarding_point_name}</span>
                </div>
              </div>
            )}
            */
          }
            <div className="space-y-2 mb-5">
              <Label className="mb-1 block">Pincode:</Label>
              <div className="p-3 bg-orange-50 rounded-md border border-orange-200">
                <span className="font-semibold text-orange-900 text-lg">{existingLocation.pincode}</span>
              </div>
            </div>
            <div className="space-y-2 mb-5">
              <Label className="mb-1 block">Confirmed Location:</Label>
              <div className="p-3 bg-green-50 rounded-md border border-green-200">
                <span className="text-green-900 font-medium">{existingLocation.address}</span>
              </div>
            </div>
            {/* Show static map for confirmed location */}
            <Label className="mb-1 block">Location on Map:</Label>
            <div style={{ width: '100%', height: 300, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px #0001' }}>
              {isGoogleMapsLoaded ? (
                <ConfirmedLocationMap
                  lat={existingLocation.latitude}
                  lng={existingLocation.longitude}
                  address={existingLocation.address}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">Loading map...</div>
              )}
            </div>
            <div className="space-y-2 mb-5">
              <Label className="mb-1 block">Confirmed on:</Label>
              <div className="p-3 bg-purple-50 rounded-md border border-purple-200">
                <span className="text-purple-900 font-medium">{new Date(existingLocation.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-800 text-sm font-medium">
                Your transport location has been confirmed. You cannot change it once confirmed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // return (
  //   <div></div>
  // )
  // Show form for new location or unconfirmed location
  return (
    <div className="w-full flex flex-col lg:flex-row items-start justify-center p-4 gap-6 lg:gap-8">
      {/* Information sections */}
      <div className="w-full lg:w-1/2 lg:max-w-lg space-y-3 lg:flex lg:flex-col lg:justify-center lg:min-h-[400px]">
        {/* Information about transport route optimization */}
        <Alert>
          <Info className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700">
            Transport Route Optimization Initiative
          </AlertTitle>
          <AlertDescription>
            Our college is currently optimizing transport routes to improve
            efficiency. We're collecting boarding point data from all students
            to identify optimal pickup locations for each bus route. This will
            help reduce travel time and improve service for everyone.
          </AlertDescription>
        </Alert>

        {/* Student responsibility notice */}
        <Alert>
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-600">
            Important: Student Responsibility
          </AlertTitle>
          <AlertDescription>
            You are fully responsible for entering accurate bus number, pincode,
            and location data. You can select any location on the map - it
            doesn't need to be within your pincode area. Once confirmed with
            OTP, your location <strong>cannot be changed for any reason</strong>
            . Please double-check all information before confirming.
          </AlertDescription>
        </Alert>
        
        {/* Do and don't notice */}
        <Alert>
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertTitle className="text-red-600">
            Important: Do's and Don'ts
          </AlertTitle>
          <AlertDescription className="text-green-400 my-2">
            Do's:
            <ul>
              <li>1. Enter the correct bus number</li>
              <li>2. Enter the correct pincode</li>
              <li>3. Drop a pin on the location of your home</li>
            </ul>
          </AlertDescription>
          <AlertDescription className="text-red-400">
            Don'ts:
            <ul>
              <li>1. Do not select a location that is not your home address</li>
              <li>2. Do not select a location that is not accessible for pickup</li>
            </ul>
          </AlertDescription>
        </Alert>
        <Alert>
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertTitle className="text-red-600">
            For support: <a className="text-foreground text-sm" href="mailto:helpdesk.timetable@rajalakshmi.edu.in">helpdesk.timetable@rajalakshmi.edu.in</a>
          </AlertTitle>
        </Alert>
        
      </div>

      {/* Main form card */}
      <Card className="w-full lg:w-1/2 lg:max-w-md">
        <CardHeader>
          <CardTitle>
            {existingLocation && !existingLocation.confirmed
              ? "Update Transport Location"
              : "Transport Location Confirmation"}
          </CardTitle>
          {existingLocation && !existingLocation.confirmed && (
            <Alert className="mt-3">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-yellow-400">
                Unconfirmed Location Saved
              </AlertTitle>
              <AlertDescription>
                You have an unconfirmed location saved. You can modify the
                existing details and confirm with OTP.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent className="space-y-4 p-5 pt-2">
          {/* <div className="space-y-2 mb-5">
            <Label htmlFor="busNo" className="mb-5 block">
              Current Bus No:
            </Label>
            <p className="text-gray-500 text-sm -mt-2">
              Please enter your current bus route no.
            </p>
            <Input
              id="busNo"
              type="text"
              value={busNo}
              onChange={handleBusNoChange}
              placeholder="Enter your current bus number"
              required
              className={busNoError ? "border-red-500" : ""}
            />
            {busNoError && (
              <p className="text-red-500 text-sm mt-1">{busNoError}</p>
            )}
          </div>
          <div className="space-y-2 mb-5">
            <Label htmlFor="boardingPointName" className="mb-5 block">
              Current Boarding Point Name:
            </Label>
            <p className="text-gray-500 text-sm -mt-2">
              Enter the name of your current boarding point name
            </p>
            <Input
              id="boardingPointName"
              type="text"
              value={boardingPointName}
              onChange={(e) => setBoardingPointName(e.target.value)}
              placeholder="e.g., Anna Nagar Tower Park Metro, ICF"
              required
            />
          </div> */}
          <div className="space-y-2 mb-5">
            <Label htmlFor="pincode" className="mb-5 block">
              Pincode:
            </Label>
            <p className="text-gray-500 text-sm -mt-2">
              Please enter the pincode of the location where you would <b>prefer to be picked up</b>.(It doesn't have to match your current bus route, just enter the one that is most convenient for you)
            </p>
            <div className="relative">
              <Input
                id="pincode"
                type="text"
                value={pincode}
                onChange={handlePincodeChange}
                placeholder="Enter your preferred boarding pincode (6 digits)"
                maxLength={6}
                required
                className={`${pincodeError ? "border-red-500" : ""} ${
                  isZoomingToPincode ? "border-blue-500 bg-blue-50" : ""
                }`}
              />
              {isZoomingToPincode && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            {pincodeError && (
              <p className="text-red-500 text-sm mt-1">{pincodeError}</p>
            )}
          </div>
          <div className="space-y-2 mb-5">
            <Label htmlFor="location" className="mt-4 mb-5 block">
              Map Location:
            </Label>
            {showMap && renderMapPicker()}
            {!showMap && <p className="text-gray-500 text-sm -mt-2">
              Click <b>Pick on map </b>button below and drop a pin on the location of your home
            </p>}
            <div className="flex flex-col sm:flex-row gap-2">
                {!showMap && (
                  <div className="flex-1 flex-col mt-2">
                    <Button
                      id="pick-on-map-btn"
                      type="button"
                      onClick={handlePickOnMap}
                      disabled={!/^\d{6}$/.test(pincode)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      <span className="whitespace-nowrap">Pick on Map</span>
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Display selected address */}
              {selectedLocation && !showMap && (
                <div className="space-y-2 mt-4">
                  <Label className="text-sm font-medium text-gray-700">
                    Selected Address:
                  </Label>
                  <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                    <span className="text-gray-900 text-sm">{selectedLocation}</span>
                  </div>
                </div>
              )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={handleConfirmLocation}
            disabled={!pincode || !selected || otpStep || isSendingOtp}
          >
            {isSendingOtp ? 'Sending OTP...' : (existingLocation && !existingLocation.confirmed ? 'Update & Confirm' : 'Confirm')}
          </Button>
        </CardFooter>
      </Card>
      {/* OTP Verification Modal */}
      <AlertDialog open={showOtpModal} onOpenChange={handleModalOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>OTP Verification</AlertDialogTitle>
            <AlertDialogDescription>
              {otpStatus === "pending" &&
                "An OTP has been sent to your email address. Please enter it below to confirm your location."}
              {otpStatus === "error" &&
                "Please enter the correct OTP to verify your location."}
              {otpStatus === "success" &&
                "Your location has been successfully verified and stored."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {otpStatus === "success" ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 text-sm">{otpMessage}</p>
              </div>
              <AlertDialogFooter>
                <AlertDialogAction onClick={handleCloseModal}>
                  Close
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              {otpStatus === "error" && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-800 text-sm">{otpMessage}</p>
                </div>
              )}
              <div>
                <Label htmlFor="otpInput" className="text-sm font-medium">
                  Enter OTP
                </Label>
                <Input
                  id="otpInput"
                  type="text"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  maxLength={6}
                  className="mt-1 text-center text-lg tracking-widest"
                  placeholder="000000"
                  required
                  autoFocus
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleCloseModal}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction type="submit">Verify OTP</AlertDialogAction>
              </AlertDialogFooter>
            </form>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ConfirmedLocationMap({ lat, lng, address }: { lat: number; lng: number; address: string }) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const w = window as any;
    if (!w.google || !w.google.maps || !mapRef.current) return;
    const map = new w.google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 15,
      disableDefaultUI: true,
      draggable: false,
      scrollwheel: false,
      disableDoubleClickZoom: true,
    });
    new w.google.maps.Marker({
      map,
      position: { lat, lng },
      title: address,
    });
  }, [lat, lng, address]);
  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}
