// Status.tsx
import { useState, useEffect } from "react";
import { Building2, Users, FileText, CheckCircle2, CreditCard, XCircle, Clock, Eye, ThumbsUp, ThumbsDown, AlertCircle, Search, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BASE_URL } from "@/Service/api";

// Types based on backend response
interface OrganizationData {
  id: number;
  userId: number;
  organizationName: string;
  registrationNumber: string;
  pincode: string;
  state: string;
  district: string;
  orgEmail: string;
  orgPhone: string;
  status: number; // 1=pending, 2=approved, 3=rejected
  createdAt: string;
  updatedAt: string;
}

interface Member {
  id: number;
  name: string;
  email: string;
  role: string;
  organizationId: number;
  userId: number;
}

interface Document {
  id: number;
  registrationCertPath: string;
  teamLeadIdPath: string;
  nursingCouncilRegPath: string;
  userId: number;
  organizationId: string;
}

interface PaymentDetails {
  amount: number;
  status: "pending" | "success" | "failed";
  paymentId?: string;
  orderId?: string;
  createdAt: string;
}

interface StatusCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  type: "info" | "error" | "success" | "warning";
}

// Custom Dialog Component
const CustomDialog = ({ isOpen, onClose, title, message, type = "info" }: DialogState & { onClose: () => void }) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "error":
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      case "success":
        return <CheckCircle2 className="h-6 w-6 text-emerald-600" />;
      case "warning":
        return <AlertCircle className="h-6 w-6 text-amber-600" />;
      default:
        return <AlertCircle className="h-6 w-6 text-blue-600" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case "error":
        return "bg-red-100";
      case "success":
        return "bg-emerald-100";
      case "warning":
        return "bg-amber-100";
      default:
        return "bg-blue-100";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${getBgColor()} flex items-center justify-center`}>
                {getIcon()}
              </div>
              <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-600 mt-2">{message}</p>
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700">
              OK
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Detail Row Component
const DetailRow = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex justify-between border-b border-slate-200 pb-2">
    <span className="text-gray-500">{label}:</span>
    <span className="font-semibold text-gray-800">{value || "Not Provided"}</span>
  </div>
);

// Status Badge Component
const StatusBadge = ({ status }: { status: number }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 2:
        return { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2, label: "APPROVED" };
      case 3:
        return { color: "bg-red-100 text-red-800", icon: XCircle, label: "REJECTED" };
      default:
        return { color: "bg-amber-100 text-amber-800", icon: Clock, label: "PENDING" };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
};

// Main Status Component
const Status = () => {
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<OrganizationData[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [documents, setDocuments] = useState<Document | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterState, setFilterState] = useState("all");
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    title: "",
    message: "",
    type: "info"
  });
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const showDialog = (title: string, message: string, type: "info" | "error" | "success" | "warning" = "info") => {
    setDialog({ isOpen: true, title, message, type });
  };

  const closeDialog = () => {
    setDialog({ isOpen: false, title: "", message: "", type: "info" });
  };

  // Fetch all registrations
  const fetchAllRegistrations = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");

    if (!token) {
      showDialog("Authentication Error", "Please login again", "error");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/register/get/all`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("All registrations:", data);

      if (response.ok && data.success && data.data) {
        setOrganizations(data.data);
        
        // Calculate counts based on status (1=pending, 2=approved, 3=rejected)
        const counts = {
          total: data.data.length,
          pending: data.data.filter((org: OrganizationData) => org.status === 1).length,
          approved: data.data.filter((org: OrganizationData) => org.status === 2).length,
          rejected: data.data.filter((org: OrganizationData) => org.status === 3).length
        };
        setStatusCounts(counts);
      } else {
        showDialog("Error", data.message || "Failed to fetch registrations", "error");
      }
    } catch (err) {
      console.error("Error fetching registrations:", err);
      showDialog("Network Error", "Please check your connection and try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch team members by userId
  const fetchTeamMembers = async (userId: number) => {
    const token = localStorage.getItem("token");
    
    try {
      const response = await fetch(`${BASE_URL}/api/register/get/team/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      console.log("Team members:", data);
      
      if (response.ok && data.success && data.data) {
        setMembers(data.data);
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error("Error fetching team:", err);
      setMembers([]);
    }
  };

  // Fetch documents by userId
  const fetchDocuments = async (userId: number) => {
    const token = localStorage.getItem("token");
    
    try {
      const response = await fetch(`${BASE_URL}/api/register/get/documents/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      console.log("Documents:", data);
      
      if (response.ok && data.success && data.data) {
        setDocuments(data.data);
      } else {
        setDocuments(null);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
      setDocuments(null);
    }
  };

  // Fetch payment details (if you have payment endpoint)
  const fetchPaymentDetails = async (userId: number) => {
    // This endpoint may need to be created in your backend
    // For now, we'll set payment details as pending
    setPaymentDetails({
      amount: 2360,
      status: "pending",
      createdAt: new Date().toISOString()
    });
  };

  // Handle organization selection
  const handleSelectOrganization = async (org: OrganizationData) => {
    setSelectedOrg(org);
    await Promise.all([
      fetchTeamMembers(org.userId),
      fetchDocuments(org.userId),
      fetchPaymentDetails(org.userId)
    ]);
  };

  useEffect(() => {
    fetchAllRegistrations();
  }, []);

  // Filter organizations based on search and state filter
  const getFilteredOrganizations = () => {
    let filtered = organizations.filter(org => {
      if (activeTab === "pending") return org.status === 1;
      if (activeTab === "approved") return org.status === 2;
      if (activeTab === "rejected") return org.status === 3;
      return true;
    });
    
    if (searchTerm) {
      filtered = filtered.filter(org =>
        org.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.orgEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterState !== "all") {
      filtered = filtered.filter(org => org.state === filterState);
    }
    
    return filtered;
  };

  // Handle Approve
  const handleApprove = async (org: OrganizationData) => {
    setActionLoading(true);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${BASE_URL}/api/register/approve/${org.userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("Approve response:", data);

      if (response.ok && data.success) {
        showDialog("Success", `Registration for ${org.organizationName} has been approved!`, "success");
        await fetchAllRegistrations();
        if (selectedOrg?.userId === org.userId) {
          setSelectedOrg(null);
        }
      } else {
        showDialog("Error", data.message || "Failed to approve registration", "error");
      }
    } catch (err) {
      console.error("Error approving:", err);
      showDialog("Error", "Something went wrong!", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject
  const handleReject = async (org: OrganizationData) => {
    if (!rejectionReason.trim()) {
      showDialog("Validation Error", "Please provide a reason for rejection", "warning");
      return;
    }

    setActionLoading(true);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${BASE_URL}/api/register/reject/${org.userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          rejectionReason: rejectionReason 
        })
      });

      const data = await response.json();
      console.log("Reject response:", data);

      if (response.ok && data.success) {
        showDialog("Success", `Registration for ${org.organizationName} has been rejected!`, "success");
        await fetchAllRegistrations();
        if (selectedOrg?.userId === org.userId) {
          setSelectedOrg(null);
        }
        setShowRejectDialog(false);
        setRejectionReason("");
      } else {
        showDialog("Error", data.message || "Failed to reject registration", "error");
      }
    } catch (err) {
      console.error("Error rejecting:", err);
      showDialog("Error", "Something went wrong!", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Get unique states for filter
  const uniqueStates = [...new Set(organizations.map(org => org.state).filter(Boolean))];

  // Helper function to get status text
  const getStatusText = (status: number) => {
    switch (status) {
      case 1: return "pending";
      case 2: return "approved";
      case 3: return "rejected";
      default: return "pending";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading registrations...</p>
        </div>
      </div>
    );
  }

  const filteredOrgs = getFilteredOrganizations();

  return (
    <>
      <CustomDialog
        isOpen={dialog.isOpen}
        onClose={closeDialog}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
      />

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this registration application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedOrg && handleReject(selectedOrg)}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? "Processing..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-4 sm:py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Registration Management</h1>
            <p className="text-gray-500 mt-2">View, review, and manage all organization registrations</p>
          </div>

          {/* Stats Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 lg:mb-8 lg:gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">Total Registrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">{statusCounts.total}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-700">Pending Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-900">{statusCounts.pending}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700">Approved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-900">{statusCounts.approved}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-700">Rejected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-900">{statusCounts.rejected}</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid gap-5 lg:grid-cols-3 lg:gap-8">
            {/* Left Side - List View */}
            <div className="lg:col-span-1">
              <Card className="lg:sticky lg:top-8">
                <CardHeader>
                  <CardTitle>Registrations</CardTitle>
                  <CardDescription>Click on any registration to view details</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Tabs */}
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="pending" className="text-amber-600">
                        Pending
                      </TabsTrigger>
                      <TabsTrigger value="approved" className="text-emerald-600">
                        Approved
                      </TabsTrigger>
                      <TabsTrigger value="rejected" className="text-red-600">
                        Rejected
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Search and Filter */}
                  <div className="space-y-3 mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by name, reg number, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    
                    {uniqueStates.length > 0 && (
                      <Select value={filterState} onValueChange={setFilterState}>
                        <SelectTrigger>
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Filter by state" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All States</SelectItem>
                          {uniqueStates.map(state => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Registration List */}
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {filteredOrgs.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No registrations found
                      </div>
                    ) : (
                      filteredOrgs.map((org) => (
                        <div
                          key={org.id}
                          onClick={() => handleSelectOrganization(org)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                            selectedOrg?.userId === org.userId
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-gray-200 hover:border-emerald-300"
                          }`}
                        >
                        <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-gray-900">{org.organizationName}</h3>
                              <p className="text-sm text-gray-500">{org.registrationNumber}</p>
                            </div>
                            <StatusBadge status={org.status} />
                          </div>
                          <div className="text-sm text-gray-600 mt-2">
                            <p>{org.district}, {org.state}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Registered: {new Date(org.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Details View */}
            <div className="lg:col-span-2">
              {selectedOrg ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  {/* Organization Details */}
                  <Card>
                    <CardHeader className="bg-slate-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-emerald-600" />
                          <CardTitle>Organization Details</CardTitle>
                        </div>
                        <StatusBadge status={selectedOrg.status} />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                        <DetailRow label="Name" value={selectedOrg.organizationName} />
                        <DetailRow label="Reg. Number" value={selectedOrg.registrationNumber} />
                        <DetailRow label="Email" value={selectedOrg.orgEmail} />
                        <DetailRow label="Phone" value={selectedOrg.orgPhone} />
                        <DetailRow label="Location" value={`${selectedOrg.district}, ${selectedOrg.state} (${selectedOrg.pincode})`} />
                        <DetailRow label="Registration Date" value={new Date(selectedOrg.createdAt).toLocaleDateString()} />
                        <DetailRow label="User ID" value={selectedOrg.userId} />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Team Members */}
                  <Card>
                    <CardHeader className="bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        <CardTitle>Team Composition</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {members.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">No team members found</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-500 border-b border-slate-200">
                                <th className="pb-2">Member Name</th>
                                <th className="pb-2">Email</th>
                                <th className="pb-2">Role</th>
                              </tr>
                            </thead>
                            <tbody>
                              {members.map((member, index) => (
                                <tr key={member.id || index} className="border-b border-slate-100 last:border-0">
                                  <td className="py-3 font-medium">{member.name}</td>
                                  <td className="py-3 text-gray-600">{member.email}</td>
                                  <td className="py-3">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs capitalize">
                                      {member.role}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Documents */}
                  <Card>
                    <CardHeader className="bg-slate-50">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-amber-600" />
                        <CardTitle>Uploaded Documents</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {documents ? (
                        <ul className="space-y-3">
                          <li className="flex items-center justify-between p-3 bg-white rounded-lg border">
                            <span className="text-gray-600">Registration Certificate</span>
                            {documents.registrationCertPath ? (
                              <a 
                                href={`${BASE_URL}${documents.registrationCertPath}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                              >
                                <Eye className="h-4 w-4" /> View
                              </a>
                            ) : (
                              <span className="text-red-500 text-xs">Not uploaded</span>
                            )}
                          </li>
                          <li className="flex items-center justify-between p-3 bg-white rounded-lg border">
                            <span className="text-gray-600">Team Lead ID Proof</span>
                            {documents.teamLeadIdPath ? (
                              <a 
                                href={`${BASE_URL}${documents.teamLeadIdPath}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                              >
                                <Eye className="h-4 w-4" /> View
                              </a>
                            ) : (
                              <span className="text-red-500 text-xs">Not uploaded</span>
                            )}
                          </li>
                          <li className="flex items-center justify-between p-3 bg-white rounded-lg border">
                            <span className="text-gray-600">Nursing Council Registration</span>
                            {documents.nursingCouncilRegPath ? (
                              <a 
                                href={`${BASE_URL}${documents.nursingCouncilRegPath}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                              >
                                <Eye className="h-4 w-4" /> View
                              </a>
                            ) : (
                              <span className="text-red-500 text-xs">Not uploaded</span>
                            )}
                          </li>
                        </ul>
                      ) : (
                        <p className="text-gray-400 text-center py-4">No documents found</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Payment Details */}
                  <Card>
                    <CardHeader className="bg-slate-50">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-emerald-600" />
                        <CardTitle>Payment Details</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {paymentDetails ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                            <span className="text-gray-600">Amount Paid</span>
                            <span className="font-bold text-emerald-700 text-xl">₹{paymentDetails.amount}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-600">Payment Status</span>
                            <StatusBadge status={paymentDetails.status === "success" ? 2 : 1} />
                          </div>
                          {paymentDetails.paymentId && (
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-600">Payment ID</span>
                              <span className="font-mono text-sm">{paymentDetails.paymentId}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-600">Payment Date</span>
                            <span>{new Date(paymentDetails.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-400 text-center py-4">Payment details not available</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Action Buttons - Only show for pending registrations (status = 1) */}
                  {selectedOrg.status === 1 && (
                    <div className="flex gap-4 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowRejectDialog(true);
                        }}
                        disabled={actionLoading}
                        className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => handleApprove(selectedOrg)}
                        disabled={actionLoading}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Approve Registration
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Card className="h-full flex items-center justify-center min-h-[400px]">
                  <CardContent className="text-center py-12">
                    <Building2 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Registration Selected</h3>
                    <p className="text-gray-400">Click on any registration from the list to view details</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Status;
