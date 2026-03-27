import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UseMyLocationButtonProps {
  onLocationFound: (location: string) => void;
  className?: string;
}

const UseMyLocationButton = ({ onLocationFound, className = "" }: UseMyLocationButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported on this device");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const parts = [addr.suburb, addr.town || addr.city, addr.county].filter(Boolean);
          const location = parts.join(", ") || data.display_name?.split(",").slice(0, 3).join(",") || `${pos.coords.latitude}, ${pos.coords.longitude}`;
          onLocationFound(location);
          toast.success("Location detected!");
        } catch {
          onLocationFound(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        } finally {
          setLoading(false);
        }
      },
      () => {
        toast.error("Location permission denied. Enter location manually.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <Button type="button" variant="outline" size="sm" className={`rounded-xl gap-1.5 text-xs ${className}`} onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
      Use My Location
    </Button>
  );
};

export default UseMyLocationButton;
