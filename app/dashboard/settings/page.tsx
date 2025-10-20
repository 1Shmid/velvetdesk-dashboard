"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User, Bell, CreditCard, Trash2, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile state
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Notifications state
    const [emailNewCall, setEmailNewCall] = useState(true);
    const [emailBookingConfirmed, setEmailBookingConfirmed] = useState(true);
    const [emailBookingCancelled, setEmailBookingCancelled] = useState(true);
    const [emailAgentSettingsChanged, setEmailAgentSettingsChanged] = useState(true);
    const [emailBillingUpdates, setEmailBillingUpdates] = useState(true);
    const [emailMarketingNews, setEmailMarketingNews] = useState(false);
    const [smsEnabled, setSmsEnabled] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load profile
      const profileRes = await fetch("/api/profile");
      if (profileRes.ok) {
        const profile = await profileRes.json();
        setBusinessName(profile.business_name || "");
        setContactName(profile.contact_name || "");
        setEmail(profile.email || "");
        setPhone(profile.phone || "");
      }

      // Load notifications
      const notifRes = await fetch("/api/notifications");
      if (notifRes.ok) {
        const notif = await notifRes.json();
            setEmailNewCall(notif.email_new_call);
            setEmailBookingConfirmed(notif.email_booking_confirmed);
            setEmailBookingCancelled(notif.email_booking_cancelled);
            setEmailAgentSettingsChanged(notif.email_agent_settings_changed);
            setEmailBillingUpdates(notif.email_billing_updates);
            setEmailMarketingNews(notif.email_marketing_news);
            setSmsEnabled(notif.sms_enabled);
      }
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName,
          contact_name: contactName,
          phone
        })
      });

      if (response.ok) {
        alert("Profile updated successfully!");
      } else {
        alert("Failed to update profile");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert("New passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      if (response.ok) {
        alert("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to change password");
      }
    } catch (error) {
      console.error("Password error:", error);
      alert("Error changing password");
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email_new_call: emailNewCall,
            email_booking_confirmed: emailBookingConfirmed,
            email_booking_cancelled: emailBookingCancelled,
            email_agent_settings_changed: emailAgentSettingsChanged,
            email_billing_updates: emailBillingUpdates,
            email_marketing_news: emailMarketingNews,
            sms_enabled: smsEnabled
        })
      });

      if (response.ok) {
        alert("Notifications updated successfully!");
      } else {
        alert("Failed to update notifications");
      }
    } catch (error) {
      console.error("Notifications error:", error);
      alert("Error updating notifications");
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    const confirm1 = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );
    if (!confirm1) return;

    const confirm2 = window.confirm(
      "This will permanently delete all your data. Type 'DELETE' to confirm."
    );
    if (!confirm2) return;

    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (response.ok) {
        alert("Account deleted successfully");
        signOut({ callbackUrl: "/login" });
      } else {
        alert("Failed to delete account");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Error deleting account");
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Update your business information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business-name">Business Name</Label>
              <Input
                id="business-name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-name">Contact Name</Label>
              <Input
                id="contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={changePassword} disabled={saving || !currentPassword || !newPassword}>
              {saving ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2">
              <Bell className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage how you receive updates</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New Call Received</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when a new call is received
                </p>
              </div>
              <Switch
                checked={emailNewCall}
                onCheckedChange={setEmailNewCall}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Booking Confirmed</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when a booking is confirmed
                </p>
              </div>
              <Switch
                checked={emailBookingConfirmed}
                onCheckedChange={setEmailBookingConfirmed}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Booking Cancelled</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when a booking is cancelled
                </p>
              </div>
              <Switch
                checked={emailBookingCancelled}
                onCheckedChange={setEmailBookingCancelled}
              />
            </div>

            <Separator />
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label>Agent Settings Changed</Label>
                    <p className="text-sm text-muted-foreground">
                    Get notified when AI agent settings are modified
                    </p>
                </div>
            <Switch
                checked={emailAgentSettingsChanged}
                onCheckedChange={setEmailAgentSettingsChanged}
            />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label>Billing Updates</Label>
                    <p className="text-sm text-muted-foreground">
                    Get notified about payments and invoices
                    </p>
                </div>
            <Switch
                checked={emailBillingUpdates}
                onCheckedChange={setEmailBillingUpdates}
            />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label>Marketing & News</Label>
                    <p className="text-sm text-muted-foreground">
                    Receive updates about new features and tips
                    </p>
                </div>
            <Switch
                checked={emailMarketingNews}
                onCheckedChange={setEmailMarketingNews}
            />
            </div>

            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via SMS (coming soon)
                </p>
              </div>
              <Switch
                checked={smsEnabled}
                onCheckedChange={setSmsEnabled}
                disabled
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveNotifications} disabled={saving}>
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription & Billing */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle>Subscription & Billing</CardTitle>
              <CardDescription>Manage your subscription and payment details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Current Plan</Label>
              <p className="text-lg font-semibold">Pro Plan</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className="mt-1">
                <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700 border border-green-200">
                  Active
                </span>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Monthly Price</Label>
              <p className="text-lg font-semibold">€350/month</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Next Billing Date</Label>
              <p className="text-lg font-semibold">November 20, 2025</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Payment Method</Label>
              <p className="text-lg font-semibold">•••• •••• •••• 1234</p>
            </div>
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button variant="outline" disabled>
              Manage Subscription
              <span className="ml-2 text-xs text-muted-foreground">(Coming Soon)</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-2">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions for your account</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
            <div>
              <p className="font-medium text-red-900">Delete Account</p>
              <p className="text-sm text-red-700 mt-1">
                Once you delete your account, there is no going back. Please be certain.
              </p>
            </div>
            <Button variant="destructive" onClick={deleteAccount}>
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}