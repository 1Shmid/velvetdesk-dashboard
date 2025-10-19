"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, FileText, Pencil, Trash2, Plus, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

export default function AgentSetupPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Business Info
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  
  // Agent Personality
  const [agentName, setAgentName] = useState("");
  const [sex, setSex] = useState("female");
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("en");

  const [services, setServices] = useState<any[]>([]);
  const [hours, setHours] = useState<any[]>([]);
  const [hoursErrors, setHoursErrors] = useState<string[]>([]);
  const [instructions, setInstructions] = useState<any[]>([]);

  const [isAddingInstruction, setIsAddingInstruction] = useState(false);
  const [newInstruction, setNewInstruction] = useState("");
  const [editingInstructionIndex, setEditingInstructionIndex] = useState<number | null>(null);
  const [editingInstructionText, setEditingInstructionText] = useState("");
  
  // Add Service form
  const [isAddingService, setIsAddingService] = useState(false);
  const [newService, setNewService] = useState({ name: "", price: "", duration: "" });

  useEffect(() => {
    loadAgentData();
  }, []);
  
  const loadAgentData = async () => {
    try {
      const response = await fetch("/api/agent");
      
      if (!response.ok) {
        console.error("API error:", response.status);
        return;
      }
      
      const data = await response.json();
      
      // Pre-fill business info
      if (data.business) {
        setBusinessName(data.business.business_name || "");
        setPhone(data.business.phone || "");
        setEmail(data.business.email || "");
        setWebsite(data.business.website || "");
        setAddress(data.business.address || "");
      }
      
      // Pre-fill agent settings
      if (data.settings) {
        setAgentName(data.settings.agent_name || "");
        setSex(data.settings.sex || "female");
        setTone(data.settings.tone || "professional");
        setLanguage(data.settings.language || "en");
      }
      
      // Pre-fill services
      if (data.services) {
        setServices(data.services);
      }
      
      // Pre-fill hours
      if (data.hours) {
        setHours(data.hours);
      }
      
      // Pre-fill instructions
      if (data.instructions) {
        setInstructions(data.instructions);
      }
      
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveHours = async () => {
    const errors: string[] = [];
    hours.forEach(h => {
      if (!h.is_closed && h.open_time && h.close_time && h.open_time >= h.close_time) {
        errors.push(h.day);
      }
    });
    
    if (errors.length > 0) {
      setHoursErrors(errors);
      alert(`Error: Opening time must be before closing time on: ${errors.join(', ')}`);
      return;
    }
    
    setHoursErrors([]);
    
    try {
      const response = await fetch("/api/hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours })
      });
      
      if (response.ok) {
        alert("Hours saved!");
      }
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const addInstruction = async (text: string) => {
    try {
      const response = await fetch("/api/instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction_text: text })
      });
      
      if (response.ok) {
        const newInstruction = await response.json();
        setInstructions([...instructions, newInstruction]);
      }
    } catch (error) {
      console.error("Add error:", error);
    }
  };

  const updateInstruction = async (id: string, newText: string) => {
    try {
        const response = await fetch("/api/instructions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, instruction_text: newText })
        });
        
        if (response.ok) {
        setInstructions(instructions.map(inst => 
            inst.id === id ? { ...inst, instruction_text: newText } : inst
        ));
        }
    } catch (error) {
        console.error("Update error:", error);
    }
};

  const addService = async () => {
    if (!newService.name || !newService.price || !newService.duration) {
      alert("Please fill all fields");
      return;
    }

    try {
      const response = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newService.name,
          price: parseFloat(newService.price),
          duration: parseInt(newService.duration)
        })
      });
      
      if (response.ok) {
        const created = await response.json();
        setServices([...services, created]);
        setNewService({ name: "", price: "", duration: "" });
        setIsAddingService(false);
      }
    } catch (error) {
      console.error("Add service error:", error);
    }
  };

  const deleteInstruction = async (id: string) => {
    try {
      const response = await fetch(`/api/instructions?id=${id}`, { method: "DELETE" });
      if (response.ok) {
        setInstructions(instructions.filter(i => i.id !== id));
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const toggleDay = (day: string) => {
    setHours(hours.map(h => 
      h.day === day ? { ...h, is_closed: !h.is_closed } : h
    ));
  };

  const updateTime = (day: string, field: 'open_time' | 'close_time', value: string) => {
    setHoursErrors(hoursErrors.filter(d => d !== day));
    
    setHours(hours.map(h => 
      h.day === day ? { ...h, [field]: value } : h
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const response = await fetch("/api/agent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business: {
            business_name: businessName,
            phone,
            email,
            website,
            address
          },
          settings: {
            agent_name: agentName,
            sex,
            tone,
            language
          }
        })
      });
      
      if (response.ok) {
        alert("Settings saved successfully!");
      } else {
        alert("Failed to save settings");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (id: string) => {
    if (!confirm("Delete this service?")) return;
    
    try {
      const response = await fetch(`/api/services?id=${id}`, { method: "DELETE" });
      if (response.ok) {
        setServices(services.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Agent Setup</h1>
          <p className="text-muted-foreground mt-2">
            Configure your AI receptionist to perfectly represent your business
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* AI Agent Active Status */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-500 p-2">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-green-900">AI Agent Active</p>
              <p className="text-sm text-green-700">All systems operational</p>
            </div>
            <div className="ml-auto">
              <span className="inline-flex items-center rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white">
                Live
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Accordion */}
      <Accordion type="single" collapsible className="space-y-4">
        {/* Business Information */}
        <AccordionItem value="business" className="border rounded-lg px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <span className="text-lg">🏢</span>
              </div>
              <div className="text-left">
                <p className="font-medium">Business Information</p>
                <p className="text-sm text-muted-foreground">Company details and contact info</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Name</label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your Business Name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+34 612 345 678"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@business.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Website</label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourbusiness.com"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, City, Country"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Agent Personality */}
        <AccordionItem value="personality" className="border rounded-lg px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-pink-100 p-2">
                <span className="text-lg">✨</span>
              </div>
              <div className="text-left">
                <p className="font-medium">Agent Personality</p>
                <p className="text-sm text-muted-foreground">
                  {agentName || "Assistant"} • {sex === "female" ? "Female" : "Male"} • {language.toUpperCase()}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sex</label>
                <Select value={sex} onValueChange={setSex}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Agent Name</label>
                <Input
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Sofia"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tone</label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Language</label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                    <SelectItem value="es">🇪🇸 Spanish</SelectItem>
                    <SelectItem value="fr">🇫🇷 French</SelectItem>
                    <SelectItem value="de">🇩🇪 German</SelectItem>
                    <SelectItem value="it">🇮🇹 Italian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Services & Prices */}
        <AccordionItem value="services" className="border rounded-lg px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2">
                <span className="text-lg">💎</span>
              </div>
              <div className="text-left">
                <p className="font-medium">Services & Prices</p>
                <p className="text-sm text-muted-foreground">
                  {services.length} services configured
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            
            {/* Add Service Form */}
            {isAddingService && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 space-y-3">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Service Name</label>
                      <Input
                        placeholder="Haircut"
                        value={newService.name}
                        onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Price (€)</label>
                      <Input
                        type="number"
                        placeholder="45"
                        value={newService.price}
                        onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Duration (min)</label>
                      <Input
                        type="number"
                        placeholder="60"
                        value={newService.duration}
                        onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setIsAddingService(false);
                        setNewService({ name: "", price: "", duration: "" });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      onClick={addService}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Service
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Services List */}
            {services.map((service: any) => (
              <Card key={service.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        €{service.price} • {service.duration} min
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteService(service.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add Service Button */}
            {!isAddingService && (
              <Button 
                variant="outline" 
                className="w-full gap-2 h-12"
                onClick={() => setIsAddingService(true)}
              >
                <Plus className="h-4 w-4" />
                Add Service
              </Button>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Working Hours */}
        <AccordionItem value="hours" className="border rounded-lg px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-lg">🕐</span>
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Working Hours</h3>
                <p className="text-sm text-muted-foreground">When your business is available</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="space-y-3">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                const dayData = hours.find(h => h.day === day) || { day, is_closed: false, open_time: '09:00', close_time: '18:00' };
                return (
                  <div 
                    key={day} 
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                      dayData.is_closed 
                        ? "bg-red-50 border-red-200" 
                        : "bg-green-50 border-green-200"
                    }`}
                  >
                    {/* Radio Button Toggle */}
                    <button
                      onClick={() => toggleDay(day)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        dayData.is_closed 
                          ? "border-red-400" 
                          : "border-green-500"
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full transition-all ${
                        dayData.is_closed 
                          ? "bg-red-500" 
                          : "bg-green-500"
                      }`} />
                    </button>

                    {/* Day Name */}
                    <div className="w-28">
                      <p className="font-semibold capitalize text-base">{day}</p>
                    </div>

                    {/* Time Inputs or Closed Badge */}
                    <div className="flex-1">
                      {dayData.is_closed ? (
                        <div className="flex items-center justify-center">
                          <span className="bg-red-500 text-white px-6 py-2 text-base rounded-full font-medium">
                            Closed
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input 
                            type="time" 
                            value={dayData.open_time}
                            onChange={(e) => updateTime(day, 'open_time', e.target.value)}
                            className={`w-full bg-white ${hoursErrors.includes(day) ? 'border-red-500 border-2' : ''}`}
                          />
                          <Input 
                            type="time" 
                            value={dayData.close_time}
                            onChange={(e) => updateTime(day, 'close_time', e.target.value)}
                            className={`w-full bg-white ${hoursErrors.includes(day) ? 'border-red-500 border-2' : ''}`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" size="sm">Cancel</Button>
                <Button size="sm" onClick={saveHours}>
                  Save Schedule
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Agent Instructions */}
        <AccordionItem value="instructions" className="border rounded-lg px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Agent Instructions</h3>
                <p className="text-sm text-muted-foreground">{instructions.length} custom rules configured</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="space-y-4">
              
              {/* Info Banner */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Add custom instructions to guide your AI agent's behavior in specific situations. These rules will be applied during all conversations.
                </p>
              </div>

              {/* Add Instruction Form */}
              {isAddingInstruction && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">New Instruction</label>
                      <Textarea 
                        placeholder="Example: Always ask customer to confirm their name and phone number before booking"
                        value={newInstruction}
                        onChange={(e) => setNewInstruction(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setIsAddingInstruction(false);
                          setNewInstruction("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => {
                          if (newInstruction.trim()) {
                            addInstruction(newInstruction.trim());
                            setNewInstruction("");
                            setIsAddingInstruction(false);
                          }
                        }}
                        disabled={!newInstruction.trim()}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Instruction
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Instructions List with Scroll */}
              <div className="space-y-2">
                <div 
                  className="space-y-2 overflow-y-auto pr-2"
                  style={{ 
                    maxHeight: "400px",
                    minHeight: instructions.length > 0 ? "100px" : "0"
                  }}
                >
                  {instructions.map((instruction, index) => (
                    <div key={instruction.id}>
                      {editingInstructionIndex === index ? (
                        /* Edit Mode */
                        <Card className="bg-primary/5 border-primary/20">
                          <CardContent className="p-4 space-y-3">
                            <div>
                              <label className="text-sm font-medium mb-2 block">Edit Instruction #{index + 1}</label>
                              <Textarea 
                                value={editingInstructionText}
                                onChange={(e) => setEditingInstructionText(e.target.value)}
                                rows={3}
                                className="resize-none"
                                autoFocus
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setEditingInstructionIndex(null);
                                  setEditingInstructionText("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => {
                                    if (editingInstructionText.trim()) {
                                        updateInstruction(instruction.id, editingInstructionText.trim());
                                        setEditingInstructionIndex(null);
                                        setEditingInstructionText("");
                                    }
                                }}
                                disabled={!editingInstructionText.trim()}
                                className="gap-2"
                              >
                                <Save className="h-4 w-4" />
                                Save Changes
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        /* View Mode */
                        <div 
                          className="flex items-start gap-3 p-4 border rounded-lg bg-white hover:shadow-sm hover:border-primary/30 transition-all group cursor-pointer"
                          onClick={() => {
                            setEditingInstructionIndex(index);
                            setEditingInstructionText(instruction.instruction_text);
                          }}
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                            <span className="text-xs font-semibold text-primary">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-relaxed">{instruction.instruction_text}</p>
                            <p className="text-xs text-muted-foreground mt-2 hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity">
                              Click to edit
                            </p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingInstructionIndex(index);
                                setEditingInstructionText(instruction.instruction_text);
                              }}
                              className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Delete this instruction?")) {
                                  deleteInstruction(instruction.id);
                                }
                              }}
                              className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {instructions.length === 0 && !isAddingInstruction && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No instructions added yet</p>
                    <p className="text-xs mt-1">Click the button below to add your first instruction</p>
                  </div>
                )}
              </div>

              {/* Add Instruction Button */}
              {!isAddingInstruction && (
                <Button 
                  variant="outline" 
                  className="w-full gap-2 h-12"
                  onClick={() => setIsAddingInstruction(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Instruction
                </Button>
              )}

              <Separator />

                <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                    💡 Changes are saved automatically
                </p>
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={async () => {
                        if (confirm("Are you sure you want to delete all instructions? This action cannot be undone.")) {
                        // Удаляем каждую инструкцию из БД
                        for (const instruction of instructions) {
                            await deleteInstruction(instruction.id);
                        }
                        // Очищаем локальный state
                        setInstructions([]);
                        setIsAddingInstruction(false);
                        setEditingInstructionIndex(null);
                        setEditingInstructionText("");
                        }
                    }}
                    disabled={instructions.length === 0}
                    >
                    Reset to Default
                    </Button>
                </div>
            </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
}