import { toast } from "sonner";
import { CheckCircle, AlertCircle, Info, XCircle } from "lucide-react";

export const showSuccessToast = (message: string, description?: string) => {
  toast.success(message, {
    description,
    icon: <CheckCircle className="w-5 h-5" />,
    duration: 4000,
    position: "top-right",
  });
};

export const showErrorToast = (message: string, description?: string) => {
  toast.error(message, {
    description,
    icon: <XCircle className="w-5 h-5" />,
    duration: 5000,
    position: "top-right",
  });
};

export const showInfoToast = (message: string, description?: string) => {
  toast.info(message, {
    description,
    icon: <Info className="w-5 h-5" />,
    duration: 4000,
    position: "top-right",
  });
};

export const showWarningToast = (message: string, description?: string) => {
  toast.warning(message, {
    description,
    icon: <AlertCircle className="w-5 h-5" />,
    duration: 4000,
    position: "top-right",
  });
};
