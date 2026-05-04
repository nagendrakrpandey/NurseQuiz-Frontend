import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  CheckCircle2,
  Building2,
  Users,
  FileUp,
  CreditCard,
  PartyPopper,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Upload,
  X,
  AlertCircle
} from "lucide-react";
import { BASE_URL } from "@/Service/api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const steps = [
  { icon: Building2, label: "Organization" },
  { icon: Users, label: "Team" },
  { icon: FileUp, label: "Documents" },
  { icon: CreditCard, label: "Payment" },
  { icon: PartyPopper, label: "Confirmation" },
];

interface RegisterFormData {
  organizationName: string;
  registrationNumber: string;
  pincode: string;
  state: string;
  district: string;
  address: string;
  orgEmail: string;
  orgPhone: string;
}

interface Member {
  name: string;
  email: string;
  role: string;
}

interface Documents {
  registrationCert: File | string | null;
  teamLeadId: File | string | null;
  nursingCouncilReg: File | string | null;
}

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  type: "info" | "error" | "success";
}

interface RoleOption {
  value: string;
  label: string;
}

const CustomDialog = ({
  isOpen,
  onClose,
  title,
  message,
  type = "info"
}: DialogState & { onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {type === "error" ? (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              ) : type === "success" ? (
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-blue-600" />
                </div>
              )}

              <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-gray-600 mt-2">{message}</p>

          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700">
              OK
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const RegisterPage = () => {
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [pageLoading, setPageLoading] = useState<boolean>(true);

  const [registrationId, setRegistrationId] = useState<string>("");
  const [enrollmentNumber, setEnrollmentNumber] = useState<string>("");

  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    title: "",
    message: "",
    type: "info"
  });

  const [formData, setFormData] = useState<RegisterFormData>({
    organizationName: "",
    registrationNumber: "",
    address: "",
    pincode: "",
    state: "",
    district: "",
    orgEmail: "",
    orgPhone: ""
  });

  const [members, setMembers] = useState<Member[]>([
    { name: "", email: "", role: "" }
  ]);

  const [documents, setDocuments] = useState<Documents>({
    registrationCert: null,
    teamLeadId: null,
    nursingCouncilReg: null
  });

  const [paymentCompleted, setPaymentCompleted] = useState<boolean>(false);
  const [paymentProcessing, setPaymentProcessing] = useState<boolean>(false);

  const showDialog = (
    title: string,
    message: string,
    type: "info" | "error" | "success" = "info"
  ) => {
    setDialog({ isOpen: true, title, message, type });
  };

  const closeDialog = () => {
    setDialog({ isOpen: false, title: "", message: "", type: "info" });
  };

  useEffect(() => {
    const fetchExistingData = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setPageLoading(false);
        return;
      }

      try {
        const response = await fetch(`${BASE_URL}/api/register/get`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const text = await response.text();
        const data = text ? JSON.parse(text) : null;

        console.log("Fetched existing data:", data);

        if (response.ok && data && data.id) {
          setFormData({
            organizationName: data.organizationName || "",
            registrationNumber: data.registrationNumber || "",
            pincode: data.pincode || "",
            state: data.state || "",
            district: data.district || "",
            address: data.address || "",
            orgEmail: data.orgEmail || "",
            orgPhone: data.orgPhone || "",
          });

          if (data.registrationId) {
            setRegistrationId(data.registrationId);
          }

          if (data.enrollmentNumber) {
            setEnrollmentNumber(data.enrollmentNumber);
          }
        } else {
          setFormData(prev => ({
            ...prev,
            orgEmail: ""
          }));
        }
      } catch (err) {
        console.error("Error fetching existing data:", err);
      } finally {
        setPageLoading(false);
      }
    };

    fetchExistingData();
  }, []);

  useEffect(() => {
    if (formData.pincode.length === 6 && /^\d{6}$/.test(formData.pincode)) {
      const fetchLocation = async () => {
        try {
          const response = await fetch(
            `https://api.postalpincode.in/pincode/${formData.pincode}`
          );
          const data = await response.json();

          if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
            const postOffice = data[0].PostOffice[0];

            setFormData(prev => ({
              ...prev,
              state: postOffice.State || "",
              district: postOffice.District || ""
            }));
          } else {
            setFormData(prev => ({
              ...prev,
              state: "",
              district: ""
            }));
          }
        } catch (err) {
          console.error("Error fetching location:", err);
        }
      };

      fetchLocation();
    }
  }, [formData.pincode]);

  useEffect(() => {
    const fetchTeam = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${BASE_URL}/api/register/get/team`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await res.json();
        console.log("Fetched team:", data);

        if (res.ok && data.data && data.data.length > 0) {
          setMembers(data.data);
        } else {
          setMembers([{ name: "", email: "", role: "" }]);
        }
      } catch (err) {
        console.error("Error fetching team:", err);
      }
    };

    if (step === 1) {
      fetchTeam();
    }
  }, [step]);

  useEffect(() => {
    const fetchDocuments = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${BASE_URL}/api/register/get/documents`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await res.json();
        console.log("Fetched documents:", data);

        if (res.ok && data.data) {
          setDocuments({
            registrationCert: data.data.registrationCertPath || null,
            teamLeadId: data.data.teamLeadIdPath || null,
            nursingCouncilReg: data.data.nursingCouncilRegPath || null
          });
        }
      } catch (err) {
        console.error("Error fetching documents:", err);
      }
    };

    if (step === 2) {
      fetchDocuments();
    }
  }, [step]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMemberChange = (
    index: number,
    field: keyof Member,
    value: string
  ) => {
    const updatedMembers = [...members];
    updatedMembers[index][field] = value;
    setMembers(updatedMembers);
  };

  const addMember = () => {
    if (members.length >= 3) return;
    setMembers([...members, { name: "", email: "", role: "" }]);
  };

  const removeMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, idx) => idx !== index));
    }
  };

  const validateZipFile = (file: File): boolean => {
    if (!file) return false;

    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const isValidExt = fileExt === "zip";
    const isValidSize = file.size <= 10 * 1024 * 1024;

    if (!isValidExt) {
      showDialog("Invalid File Type", "Only ZIP files are allowed for document upload.", "error");
      return false;
    }

    if (!isValidSize) {
      showDialog("File Too Large", "File size must be less than 10MB.", "error");
      return false;
    }

    return true;
  };

  const handleFileUpload = (docType: keyof Documents, file: File | null) => {
    if (file && validateZipFile(file)) {
      setDocuments(prev => ({
        ...prev,
        [docType]: file
      }));
    }
  };

  const handleSaveOrganization = async () => {
    if (!formData.organizationName || formData.organizationName.trim() === "") {
      showDialog("Warning Error", "Please enter organization name", "error");
      return;
    }

    if (!formData.registrationNumber || formData.registrationNumber.trim() === "") {
      showDialog("Warning Error", "Please enter registration number", "error");
      return;
    }

    if (!formData.address || formData.address.trim() === "") {
      showDialog("Warning Error", "Please enter address", "error");
      return;
    }

    const wordCount = formData.address.trim().split(/\s+/).length;
    if (wordCount > 200) {
      showDialog("Warning Error", "Address must be less than 200 words", "error");
      return;
    }

    if (!formData.pincode || !/^\d{6}$/.test(formData.pincode)) {
      showDialog("Warning Error", "Please enter valid 6-digit pincode", "error");
      return;
    }

    if (!formData.orgEmail) {
      showDialog("Warning Error", "Please enter contact email", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.orgEmail)) {
      showDialog("Warning Error", "Please enter a valid email address", "error");
      return;
    }

    if (!formData.orgPhone || !/^\d{10}$/.test(formData.orgPhone)) {
      showDialog("Warning Error", "Please enter valid 10-digit phone number", "error");
      return;
    }

    setLoading(true);

    const token = localStorage.getItem("token");

    if (!token) {
      showDialog("Authentication Error", "Please login again", "error");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/register/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        showDialog("Success", "Organization details saved successfully!", "success");
        setStep(prev => prev + 1);
      } else {
        showDialog("Error", data.message || "Failed to save organization details", "error");
      }
    } catch (err) {
      console.error("Error saving organization:", err);
      showDialog("Network Error", "Please check your connection and try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTeam = async () => {
    if (members.length !== 3) {
      showDialog("Warning Error", "Please add exactly 3 team members", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (let i = 0; i < members.length; i++) {
      if (!members[i].name || members[i].name.trim() === "") {
        showDialog("Warning Error", `Please enter name for member ${i + 1}`, "error");
        return;
      }

      if (!members[i].email || members[i].email.trim() === "") {
        showDialog("Warning Error", `Please enter email for member ${i + 1}`, "error");
        return;
      }

      if (!emailRegex.test(members[i].email)) {
        showDialog("Warning Error", `Please enter valid email for member ${i + 1}`, "error");
        return;
      }

      if (!members[i].role) {
        showDialog("Warning Error", `Please select role for member ${i + 1}`, "error");
        return;
      }
    }

    setLoading(true);

    const token = localStorage.getItem("token");

    if (!token) {
      showDialog("Authentication Error", "Please login again", "error");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/register/team`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(members)
      });

      const data = await response.json();

      if (response.ok) {
        showDialog("Success", "Team members saved successfully!", "success");
        setStep(prev => prev + 1);
      } else {
        showDialog("Error", data.message || "Failed to save team members", "error");
      }
    } catch (err) {
      console.error("Error saving team:", err);
      showDialog("Network Error", "Please check your connection and try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDocuments = async () => {
    if (!documents.registrationCert) {
      showDialog("Warning Error", "Please upload Organization Registration Certificate (ZIP file only)", "error");
      return;
    }

    if (!documents.teamLeadId) {
      showDialog("Warning Error", "Please upload Team's Members ID Proof (ZIP file only)", "error");
      return;
    }

    if (!documents.nursingCouncilReg) {
      showDialog("Warning Error", "Please upload Nursing Council Registration (ZIP file only)", "error");
      return;
    }

    setLoading(true);

    const token = localStorage.getItem("token");

    if (!token) {
      showDialog("Authentication Error", "Please login again", "error");
      setLoading(false);
      return;
    }

    try {
      const formDataObj = new FormData();

      formDataObj.append("registrationCert", documents.registrationCert as File);
      formDataObj.append("teamLeadId", documents.teamLeadId as File);
      formDataObj.append("nursingCouncilReg", documents.nursingCouncilReg as File);
      formDataObj.append("organizationId", formData.registrationNumber);

      const response = await fetch(`${BASE_URL}/api/register/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formDataObj
      });

      const data = await response.json();

      if (response.ok) {
        showDialog("Success", "Documents uploaded successfully!", "success");
        setStep(prev => prev + 1);
      } else {
        showDialog("Error", data.message || "Failed to upload documents", "error");
      }
    } catch (err) {
      console.error("Error uploading documents:", err);
      showDialog("Network Error", "Please check your connection and try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      showDialog("Authentication Error", "Please login again", "error");
      return;
    }

    try {
      setPaymentProcessing(true);

      const orderRes = await fetch(`${BASE_URL}/api/payment/create-order`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const orderData = await orderRes.json();
      console.log("Order:", orderData);

      const order = orderData.data;

      if (!order) {
        showDialog("Error", "Invalid order response", "error");
        setPaymentProcessing(false);
        return;
      }

      if (!window.Razorpay) {
        showDialog("Error", "Razorpay SDK not loaded", "error");
        setPaymentProcessing(false);
        return;
      }

      const options = {
        key: "rzp_test_9OwkUMPPNDnk7f",
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: "Nurse Quiz",
        description: "Registration Payment",

        handler: async function (response: any) {
          console.log("Razorpay Response:", response);

          try {
            const verifyRes = await fetch(`${BASE_URL}/api/payment/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                amount: order.amount / 100,
                organizationId: formData.registrationNumber
              })
            });

            const verifyData = await verifyRes.json();
            console.log("Verify Response:", verifyData);

            if (verifyRes.ok && verifyData.success) {
              setPaymentCompleted(true);

              setRegistrationId(
                verifyData.registrationId ||
                verifyData.data?.registrationId ||
                `NQ-2026-${Math.floor(Math.random() * 10000)}`
              );

              // ✅ Enrollment number directly field se bhi lega,
              // ✅ data object se bhi lega,
              // ✅ aur backend message string se bhi extract karega.
              const enrollmentFromMessage =
                typeof verifyData.message === "string"
                  ? verifyData.message.match(/ENR_\d+/)?.[0] || ""
                  : "";

              const finalEnrollmentNumber =
                verifyData.enrollmentNumber ||
                verifyData.data?.enrollmentNumber ||
                verifyData.enrollmentNo ||
                verifyData.enrollment_number ||
                enrollmentFromMessage ||
                "";

              console.log("Final Enrollment Number:", finalEnrollmentNumber);

              setEnrollmentNumber(finalEnrollmentNumber);

              showDialog(
                "Payment Successful",
                "Payment completed successfully!",
                "success"
              );

              setStep(prev => prev + 1);
            } else {
              showDialog(
                "Verification Failed",
                verifyData.message || "Payment verification failed",
                "error"
              );
            }
          } catch (err) {
            console.error("Error in payment verification:", err);

            showDialog(
              "Error",
              "Something went wrong during payment verification!",
              "error"
            );
          } finally {
            setPaymentProcessing(false);
          }
        },

        prefill: {
          email: formData.orgEmail,
          contact: formData.orgPhone
        },

        theme: {
          color: "#059669"
        },

        modal: {
          ondismiss: function () {
            setPaymentProcessing(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (response: any) {
        console.error("Payment Failed:", response);

        showDialog(
          "Payment Failed",
          response.error?.description || "Payment failed. Please try again.",
          "error"
        );

        setPaymentProcessing(false);
      });

      rzp.open();
    } catch (err) {
      console.error("Payment Error:", err);

      showDialog(
        "Error",
        "Something went wrong! Please try again.",
        "error"
      );

      setPaymentProcessing(false);
    }
  };

  const handleNext = () => {
    if (step === 0) {
      handleSaveOrganization();
    } else if (step === 1) {
      handleSaveTeam();
    } else if (step === 2) {
      handleSaveDocuments();
    } else if (step === 3) {
      handlePayment();
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(0, prev - 1));
  };

  const roles: RoleOption[] = [
    { value: "OT", label: "OT" },
    { value: "ICCU", label: "ICCU" },
    { value: "CSSD", label: "CSSD" }
  ];

  const getAvailableRoles = (currentIndex: number): RoleOption[] => {
    const selectedRoles = members
      .map((m, i) => (i !== currentIndex ? m.role : null))
      .filter(Boolean);

    return roles.filter(role => !selectedRoles.includes(role.value));
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading registration data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <CustomDialog
        isOpen={dialog.isOpen}
        onClose={closeDialog}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
      />

      <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex-1 py-6 sm:py-12">
          <div className="mx-auto w-full max-w-4xl px-3 sm:px-4">
            <div className="mb-8 flex items-center justify-between overflow-x-auto pb-2 sm:mb-10">
              {steps.map((s, i) => (
                <div key={s.label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${i <= step
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-200 text-gray-500"
                        }`}
                    >
                      {i < step ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <s.icon className="h-5 w-5" />
                      )}
                    </div>

                    <span className="text-xs mt-2 text-gray-600 hidden sm:block">
                      {s.label}
                    </span>
                  </div>

                  {i < steps.length - 1 && (
                    <div
                      className={`mx-1 h-0.5 w-7 transition-colors sm:mx-2 sm:w-16 ${i < step ? "bg-emerald-600" : "bg-gray-200"
                        }`}
                    />
                  )}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="rounded-2xl bg-white p-4 shadow-xl sm:p-6 lg:p-8"
              >
                {step === 0 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Organization Details
                    </h2>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-700">Organization Name *</Label>
                        <Input
                          name="organizationName"
                          value={formData.organizationName}
                          onChange={handleChange}
                          placeholder="e.g. City Hospital"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-gray-700">Registration Number *</Label>
                        <Input
                          name="registrationNumber"
                          value={formData.registrationNumber}
                          onChange={handleChange}
                          placeholder="REG-XXXXX"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-gray-700">Contact Email *</Label>
                        <Input
                          type="email"
                          name="orgEmail"
                          value={formData.orgEmail}
                          onChange={handleChange}
                          placeholder="Enter your email address"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-gray-700">Contact Phone *</Label>
                        <Input
                          name="orgPhone"
                          value={formData.orgPhone}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");

                            if (val.length <= 10) {
                              handleChange({
                                target: { name: "orgPhone", value: val }
                              } as React.ChangeEvent<HTMLInputElement>);
                            }
                          }}
                          maxLength={10}
                          placeholder="10 digit number"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-gray-700">Pincode *</Label>
                        <Input
                          name="pincode"
                          value={formData.pincode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");

                            if (val.length <= 6) {
                              handleChange({
                                target: { name: "pincode", value: val }
                              } as React.ChangeEvent<HTMLInputElement>);
                            }
                          }}
                          placeholder="Enter Pincode"
                          maxLength={6}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-gray-700">State *</Label>
                        <Input
                          value={formData.state}
                          readOnly
                          placeholder="Auto-filled from pincode"
                          className="mt-1 bg-gray-50"
                        />
                      </div>

                      <div>
                        <Label className="text-gray-700">District *</Label>
                        <Input
                          value={formData.district}
                          readOnly
                          placeholder="Auto-filled from pincode"
                          className="mt-1 bg-gray-50"
                        />
                      </div>

                      <div>
                        <Label className="text-gray-700">Address *</Label>
                        <Input
                          name="address"
                          value={formData.address}
                          onChange={(e) => {
                            const value = e.target.value;
                            const words = value.trim() ? value.trim().split(/\s+/) : [];

                            if (words.length <= 200) {
                              handleChange(e);
                            }
                          }}
                          placeholder="Enter full address (max 200 words)"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-gray-900">
                        Team Members
                      </h2>

                      {members.length < 3 && (
                        <Button variant="outline" size="sm" onClick={addMember}>
                          <Plus className="h-4 w-4 mr-1" /> Add Member
                        </Button>
                      )}
                    </div>

                    <p className="text-sm text-gray-600">
                      Add your team members who will have access to the system.
                    </p>

                    {members.map((member, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-lg border border-gray-200 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Member {i + 1}
                          </span>

                          {members.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMember(i)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid md:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-gray-700">Full Name *</Label>
                            <Input
                              placeholder="Enter name"
                              value={member.name}
                              onChange={(e) =>
                                handleMemberChange(i, "name", e.target.value)
                              }
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label className="text-gray-700">Email *</Label>
                            <Input
                              type="email"
                              placeholder="Enter email"
                              value={member.email}
                              onChange={(e) =>
                                handleMemberChange(i, "email", e.target.value)
                              }
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label className="text-gray-700">Role *</Label>
                            <Select
                              value={member.role}
                              onValueChange={(value) =>
                                handleMemberChange(i, "role", value)
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>

                              <SelectContent>
                                {getAvailableRoles(i).map(role => (
                                  <SelectItem key={role.value} value={role.value}>
                                    {role.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Upload Documents
                    </h2>

                    <p className="text-sm text-gray-600">
                      Please upload the required documents for verification.{" "}
                      <span className="font-semibold text-amber-600">
                        Only ZIP files are allowed (Max 10MB).
                      </span>
                    </p>

                    {[
                      {
                        key: "registrationCert" as const,
                        label: "Organization Registration Certificate",
                        required: true
                      },
                      {
                        key: "teamLeadId" as const,
                        label: "Team's Document's Proof",
                        required: true
                      },
                      {
                        key: "nursingCouncilReg" as const,
                        label: "Nursing Council Registration",
                        required: false
                      }
                    ].map((doc) => (
                      <div key={doc.key} className="relative">
                        <input
                          type="file"
                          id={doc.key}
                          className="hidden"
                          accept=".zip"
                          onChange={(e) =>
                            handleFileUpload(doc.key, e.target.files?.[0] || null)
                          }
                        />

                        <label
                          htmlFor={doc.key}
                        className="block cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-4 text-center transition-colors hover:border-emerald-500 sm:p-8"
                        >
                          <Upload className="h-8 w-8 mx-auto text-gray-400 mb-3" />

                          <p className="font-medium text-gray-700">
                            {doc.label} {doc.required && "*"}
                          </p>

                          <p className="text-sm text-gray-500 mt-1">
                            Only ZIP files allowed (Max 10MB)
                          </p>

                          {documents[doc.key] && (
                            <p className="text-sm text-emerald-600 mt-2 flex items-center justify-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />

                              {typeof documents[doc.key] === "string"
                                ? (documents[doc.key] as string).split("/").pop()
                                : (documents[doc.key] as File).name}
                            </p>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Payment</h2>

                    <div className="bg-emerald-50 rounded-lg p-6 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Registration Fee</span>
                        <span className="font-semibold text-gray-900">₹3,000</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">GST (18%)</span>
                        <span className="font-semibold text-gray-900">₹540</span>
                      </div>

                      <div className="border-t border-emerald-200 pt-3 flex justify-between">
                        <span className="font-semibold text-gray-900">Total</span>
                        <span className="text-lg font-bold text-emerald-600">
                          ₹3,540
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Registration Complete!
                    </h2>

                    <p className="text-gray-600 mb-6">
                      Your organization has been registered successfully.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                      <div className="inline-block w-full rounded-lg bg-emerald-50 p-4 sm:min-w-[220px] sm:w-auto">
                        <p className="text-sm text-gray-600">Registration ID:</p>
                        <p className="font-mono font-semibold text-emerald-700 text-lg">
                          {registrationId || "N/A"}
                        </p>
                      </div>

                      <div className="inline-block w-full rounded-lg bg-emerald-50 p-4 sm:min-w-[220px] sm:w-auto">
                        <p className="text-sm text-gray-600">Enrollment Number:</p>
                        <p className="font-mono font-semibold text-emerald-700 text-lg">
                          {enrollmentNumber || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-8">
                      <Button
                        onClick={() => {
                          window.location.href = "/dashboard";
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        Go to Dashboard
                      </Button>
                    </div>
                  </div>
                )}

                {step < 4 && (
                  <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      disabled={step === 0 || loading || paymentProcessing}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>

                    <Button
                      onClick={handleNext}
                      disabled={loading || paymentProcessing}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {loading || paymentProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {paymentProcessing ? "Processing..." : "Saving..."}
                        </>
                      ) : (
                        <>
                          {step === 3 ? "Complete Registration" : "Next"}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;
