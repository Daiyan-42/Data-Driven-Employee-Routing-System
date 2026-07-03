import React, { useEffect, useState } from "react";
import { Sidebar } from "../shared/Sidebar";
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Edit,
  Save,
  X,
  Loader2,
  CheckCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useAuth } from "../../context/AuthContext";
import { employeeApi } from "../../services/transportApi";
import type { EmployeeProfileResponse } from "../../types/api";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Fix default Leaflet marker icons for Vite (avoids broken icon URLs)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER: [number, number] = [23.8103, 90.4125]; // Dhaka

interface LocationPickerProps {
  position: [number, number] | null;
  onChange: (pos: [number, number]) => void;
}

const ClickHandler: React.FC<{ onChange: (pos: [number, number]) => void }> = ({
  onChange,
}) => {
  useMapEvents({
    click(e) {
      onChange([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

const LocationPicker: React.FC<LocationPickerProps> = ({
  position,
  onChange,
}) => {
  const center = position ?? DEFAULT_CENTER;
  return (
    <div
      className="rounded-lg overflow-hidden border border-gray-200"
      style={{ height: 280 }}
    >
      <MapContainer
        center={center}
        zoom={position ? 14 : 11}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ClickHandler onChange={onChange} />
        {position && (
          <Marker
            position={position}
            draggable
            eventHandlers={{
              dragend(e) {
                const marker = e.target;
                const latlng = marker.getLatLng();
                onChange([latlng.lat, latlng.lng]);
              },
            }}
          />
        )}
      </MapContainer>
      <p className="text-xs text-gray-500 mt-1 px-1">
        Click on the map or drag the marker to set your home location.
      </p>
    </div>
  );
};

export const EmployeeProfile: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [profile, setProfile] = useState<EmployeeProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPosition, setFormPosition] = useState<[number, number] | null>(
    null,
  );

  // Fetch profile on mount
  useEffect(() => {
    setLoading(true);
    employeeApi
      .getProfile()
      .then((data) => {
        setProfile(data);
        setFormName(data.name);
        setFormPhone(data.phone ?? "");
        if (data.home_lat != null && data.home_lng != null) {
          setFormPosition([data.home_lat, data.home_lng]);
        }
      })
      .catch(() => setError("Could not load profile. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const startEditing = () => {
    if (!profile) return;
    setFormName(profile.name);
    setFormPhone(profile.phone ?? "");
    setFormPosition(
      profile.home_lat != null && profile.home_lng != null
        ? [profile.home_lat, profile.home_lng]
        : null,
    );
    setSaveSuccess(false);
    setIsEditing(true);
  };

  const cancelEditing = () => setIsEditing(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await employeeApi.updateProfile({
        name: formName.trim() || undefined,
        phone: formPhone.trim() || undefined,
        home_lat: formPosition?.[0],
        home_lng: formPosition?.[1],
      });
      setProfile(updated);
      // Sync name/phone into AuthContext so Sidebar header updates
      updateUser({ name: updated.name, phone: updated.phone ?? undefined });
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  if (loading) {
    return (
      <Sidebar role="employee">
        <div className="p-6 flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Sidebar>
    );
  }

  if (error && !profile) {
    return (
      <Sidebar role="employee">
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-red-50 text-red-700 rounded-lg p-4">{error}</div>
        </div>
      </Sidebar>
    );
  }

  const displayProfile = profile!;

  return (
    <Sidebar role="employee">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-1">
              View and manage your account information
            </p>
          </div>
          {saveSuccess && (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Profile saved!</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-700 rounded-lg px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {/* Profile Card */}
        <Card className="border-0 shadow-lg mb-6">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 rounded-full w-20 h-20 flex items-center justify-center">
                <span className="text-white font-bold text-3xl">
                  {initials(displayProfile.name)}
                </span>
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">
                  {displayProfile.name}
                </CardTitle>
                <CardDescription className="text-base capitalize">
                  {displayProfile.role}
                </CardDescription>
              </div>
              {!isEditing && (
                <Button
                  onClick={startEditing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* View Mode */}
            {!isEditing && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <div className="bg-blue-100 rounded-lg p-2">
                        <UserIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Full Name</p>
                        <p className="font-semibold text-gray-900">
                          {displayProfile.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <div className="bg-green-100 rounded-lg p-2">
                        <Mail className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email Address</p>
                        <p className="font-semibold text-gray-900">
                          {displayProfile.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <div className="bg-orange-100 rounded-lg p-2">
                        <Phone className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Phone Number</p>
                        <p className="font-semibold text-gray-900">
                          {displayProfile.phone ?? "Not provided"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <div className="bg-purple-100 rounded-lg p-2">
                        <MapPin className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Home Location</p>
                        {displayProfile.home_lat != null &&
                        displayProfile.home_lng != null ? (
                          <p className="font-semibold text-gray-900 font-mono text-sm">
                            {displayProfile.home_lat.toFixed(6)},{" "}
                            {displayProfile.home_lng.toFixed(6)}
                          </p>
                        ) : (
                          <p className="font-semibold text-gray-500">Not set</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Home location map preview */}
                {displayProfile.home_lat != null &&
                  displayProfile.home_lng != null && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Home Location Map
                      </h3>
                      <div
                        className="rounded-lg overflow-hidden border border-gray-200"
                        style={{ height: 240 }}
                      >
                        <MapContainer
                          center={[
                            displayProfile.home_lat,
                            displayProfile.home_lng,
                          ]}
                          zoom={14}
                          style={{ height: "100%", width: "100%" }}
                          dragging={false}
                          zoomControl={false}
                          scrollWheelZoom={false}
                          doubleClickZoom={false}
                        >
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          />
                          <Marker
                            position={[
                              displayProfile.home_lat,
                              displayProfile.home_lng,
                            ]}
                          />
                        </MapContainer>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Edit Mode */}
            {isEditing && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Edit Profile
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Full Name</Label>
                    <Input
                      id="edit-name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone Number</Label>
                    <Input
                      id="edit-phone"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+880 1XXX-XXXXXX"
                    />
                  </div>
                </div>

                {/* Email is read-only */}
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                  <span className="font-medium">Email:</span>{" "}
                  {displayProfile.email}
                  <span className="ml-2 text-gray-400">
                    (cannot be changed)
                  </span>
                </div>

                {/* Map picker */}
                <div className="space-y-2">
                  <Label>Home Location</Label>
                  {formPosition && (
                    <p className="text-sm text-gray-500 font-mono">
                      Lat: {formPosition[0].toFixed(6)} &nbsp;|&nbsp; Lng:{" "}
                      {formPosition[1].toFixed(6)}
                    </p>
                  )}
                  <LocationPicker
                    position={formPosition}
                    onChange={setFormPosition}
                  />
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="space-y-1">
                      <Label htmlFor="lat-input" className="text-xs">
                        Latitude
                      </Label>
                      <Input
                        id="lat-input"
                        type="number"
                        step="any"
                        value={formPosition?.[0] ?? ""}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v))
                            setFormPosition([
                              v,
                              formPosition?.[1] ?? DEFAULT_CENTER[1],
                            ]);
                        }}
                        placeholder="e.g. 23.8103"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="lng-input" className="text-xs">
                        Longitude
                      </Label>
                      <Input
                        id="lng-input"
                        type="number"
                        step="any"
                        value={formPosition?.[1] ?? ""}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v))
                            setFormPosition([
                              formPosition?.[0] ?? DEFAULT_CENTER[0],
                              v,
                            ]);
                        }}
                        placeholder="e.g. 90.4125"
                      />
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-gray-100">
            <CardTitle>Account Status</CardTitle>
            <CardDescription>Your current account details</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Role</p>
                <p className="font-semibold text-gray-800 capitalize">
                  {displayProfile.role}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Account Status</p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    displayProfile.status === "Active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {displayProfile.status}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Transport Active</p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    displayProfile.is_active
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {displayProfile.is_active ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Sidebar>
  );
};
