"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Calendar, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Staff = {
  id: string;
  name: string;
  email: string | null;
  calendar_id: string;
  is_active: boolean;
  channel_id: string | null;
  channel_expires_at: string | null;
};

type Service = {
  id: string;
  name: string;
};

type StaffWithServices = Staff & {
  services: Service[];
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffWithServices[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffWithServices | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    calendar_id: "",
  });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    try {
      // Load staff
      const staffResponse = await fetch("/api/staff");
      if (staffResponse.ok) {
        const staffData = await staffResponse.json();
        setStaff(staffData);
      }

      // Load services
      const servicesResponse = await fetch("/api/services");
      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json();
        setServices(servicesData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const openDialog = (staffMember?: StaffWithServices) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setFormData({
        name: staffMember.name,
        email: staffMember.email || "",
        calendar_id: staffMember.calendar_id,
      });
      setSelectedServices(staffMember.services.map(s => s.id));
    } else {
      setEditingStaff(null);
      setFormData({ name: "", email: "", calendar_id: "" });
      setSelectedServices([]);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.calendar_id) {
      toast({
        title: "Error",
        description: "Name and Calendar ID are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const method = editingStaff ? "PUT" : "POST";
      const response = await fetch("/api/staff", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingStaff?.id,
          ...formData,
          service_ids: selectedServices,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save staff member");
      }

      toast({
        title: "Success",
        description: `Staff member ${editingStaff ? "updated" : "created"} successfully`,
      });

      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (staffMember: Staff) => {
    try {
      const response = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: staffMember.id,
          is_active: !staffMember.is_active,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle active status");
      }

      toast({
        title: "Success",
        description: `Staff member ${!staffMember.is_active ? "activated" : "deactivated"}`,
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteStaff = async (staffId: string) => {
    if (!confirm("Are you sure? This will remove the staff member and unassign all their bookings.")) {
      return;
    }

    try {
      const response = await fetch(`/api/staff?id=${staffId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete staff member");
      }

      toast({
        title: "Success",
        description: "Staff member deleted",
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleService = (serviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedServices([...selectedServices, serviceId]);
    } else {
      setSelectedServices(selectedServices.filter(id => id !== serviceId));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your team members and their assigned services
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingStaff ? "Edit Staff Member" : "Add Staff Member"}
              </DialogTitle>
              <DialogDescription>
                {editingStaff
                  ? "Update staff member details and services"
                  : "Add a new staff member to your team"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="María García"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="maria@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="calendar_id">
                  Google Calendar ID *
                  <span className="text-xs text-muted-foreground ml-2">
                    (e.g., "primary" or "user@gmail.com")
                  </span>
                </Label>
                <Input
                  id="calendar_id"
                  value={formData.calendar_id}
                  onChange={(e) => setFormData({ ...formData, calendar_id: e.target.value })}
                  placeholder="primary"
                />
              </div>

              <div className="space-y-2">
                <Label>Services this staff member can perform *</Label>
                <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={service.id}
                        checked={selectedServices.includes(service.id)}
                        onChange={(e) => toggleService(service.id, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <label
                        htmlFor={service.id}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {service.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingStaff ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {staff.map((staffMember) => (
          <Card key={staffMember.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {staffMember.name}
                    {!staffMember.is_active && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </CardTitle>
                  {staffMember.email && (
                    <CardDescription className="mt-1">
                      {staffMember.email}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDialog(staffMember)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteStaff(staffMember.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {staffMember.calendar_id}
                </code>
              </div>

              {staffMember.channel_expires_at && (
                <div className="text-xs text-muted-foreground">
                  Webhook expires: {new Date(staffMember.channel_expires_at).toLocaleDateString()}
                </div>
              )}

              <div>
                <div className="text-sm font-medium mb-2">Services ({staffMember.services.length}):</div>
                <div className="flex flex-wrap gap-1">
                  {staffMember.services.length > 0 ? (
                    staffMember.services.map((service) => (
                      <Badge key={service.id} variant="outline" className="text-xs">
                        {service.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No services assigned</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-medium">Active</span>
                <Switch
                  checked={staffMember.is_active}
                  onCheckedChange={() => toggleActive(staffMember)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {staff.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-muted-foreground mb-4">
              No staff members yet. Add your first team member to get started.
            </div>
            <Button onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}