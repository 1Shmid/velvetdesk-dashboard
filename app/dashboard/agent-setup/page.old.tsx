"use client";

import { useState } from "react";
import { 
  Building2, 
  Briefcase, 
  Clock, 
  Sparkles, 
  FileText,
  Save,
  Plus,
  Pencil,
  Trash2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Моковые данные (будут из onboarding анкеты)
const mockBusinessData = {
  name: "Bella Vista Salon",
  phone: "+34 965 123 456",
  email: "info@bellavista.es",
  address: "Calle Mayor 15, Elche, Alicante",
  website: "www.bellavista.es",
};

const mockServices = [
  { id: "1", name: "Haircut", price: 25, duration: "45 min" },
  { id: "2", name: "Hair Coloring", price: 65, duration: "2 hours" },
  { id: "3", name: "Highlights", price: 85, duration: "2.5 hours" },
  { id: "4", name: "Styling", price: 35, duration: "30 min" },
];

const mockWorkingHours = {
  monday: { open: "09:00", close: "18:00", closed: false },
  tuesday: { open: "09:00", close: "18:00", closed: false },
  wednesday: { open: "09:00", close: "18:00", closed: false },
  thursday: { open: "09:00", close: "18:00", closed: false },
  friday: { open: "09:00", close: "18:00", closed: false },
  saturday: { open: "10:00", close: "14:00", closed: false },
  sunday: { open: "", close: "", closed: true },
};

const mockPersonality = {
  sex: "female",
  name: "Marta",
  tone: "friendly",
  language: "es",
};

const mockInstructions = [
  "Always ask customer to confirm their name and phone number before booking",
  "When mentioning prices, always include tax information",
  "If customer seems unsure, offer to send details via email or SMS",
];

// Список языков
const languages = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
];

export default function AgentSetupPage() {
  const [businessData, setBusinessData] = useState(mockBusinessData);
  const [services, setServices] = useState(mockServices);
  const [workingHours, setWorkingHours] = useState(mockWorkingHours);
  const [personality, setPersonality] = useState(mockPersonality);
  const [instructions, setInstructions] = useState(mockInstructions);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [newService, setNewService] = useState({ name: "", price: "", duration: "" });
  const [isAddingInstruction, setIsAddingInstruction] = useState(false);
  const [newInstruction, setNewInstruction] = useState("");
  const [editingInstructionIndex, setEditingInstructionIndex] = useState<number | null>(null);
  const [editingInstructionText, setEditingInstructionText] = useState("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Agent Setup</h1>
        <p className="text-muted-foreground mt-1">
          Configure your AI receptionist to perfectly represent your business
        </p>
      </div>

      {/* Status Badge */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold">AI Agent Active</p>
                <p className="text-sm text-muted-foreground">All systems operational</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800">Live</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Accordion Sections */}
      <Accordion type="single" collapsible defaultValue="business" className="space-y-4">
        
        {/* 1. Business Information */}
        <AccordionItem value="business" className="border rounded-lg px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Business Information</h3>
                <p className="text-sm text-muted-foreground">Company details and contact info</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Business Name</label>
                  <Input 
                    value={businessData.name} 
                    onChange={(e) => setBusinessData({...businessData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Phone Number</label>
                  <Input 
                    value={businessData.phone}
                    onChange={(e) => setBusinessData({...businessData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Input 
                    type="email"
                    value={businessData.email}
                    onChange={(e) => setBusinessData({...businessData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Website</label>
                  <Input 
                    value={businessData.website}
                    onChange={(e) => setBusinessData({...businessData, website: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Address</label>
                <Input 
                  value={businessData.address}
                  onChange={(e) => setBusinessData({...businessData, address: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm">Cancel</Button>
                <Button size="sm" className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2. Services & Prices */}
        <AccordionItem value="services" className="border rounded-lg px-6">
        <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-left">
                <h3 className="font-semibold">Services & Prices</h3>
                <p className="text-sm text-muted-foreground">{services.length} services configured</p>
            </div>
            </div>
        </AccordionTrigger>
        <AccordionContent className="pt-4">
            <div className="space-y-4">
            {/* Add Service Form */}
            {isAddingService && (
                <Card className="bg-muted/50">
                <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="text-xs font-medium mb-1 block">Service Name</label>
                        <Input 
                        placeholder="e.g. Haircut"
                        value={newService.name}
                        onChange={(e) => setNewService({...newService, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1 block">Price (€)</label>
                        <Input 
                        type="number"
                        placeholder="25"
                        value={newService.price}
                        onChange={(e) => setNewService({...newService, price: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1 block">Duration</label>
                        <Input 
                        placeholder="45 min"
                        value={newService.duration}
                        onChange={(e) => setNewService({...newService, duration: e.target.value})}
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
                        onClick={() => {
                        if (newService.name && newService.price && newService.duration) {
                            setServices([...services, {
                            id: String(services.length + 1),
                            name: newService.name,
                            price: Number(newService.price),
                            duration: newService.duration
                            }]);
                            setNewService({ name: "", price: "", duration: "" });
                            setIsAddingService(false);
                        }
                        }}
                        disabled={!newService.name || !newService.price || !newService.duration}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Service
                    </Button>
                    </div>
                </CardContent>
                </Card>
            )}

            {/* Services List */}
            <div className="space-y-2">
                {services.map((service) => (
                <div key={service.id}>
                    {editingService === service.id ? (
                    <Card className="bg-muted/50">
                        <CardContent className="p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                            <label className="text-xs font-medium mb-1 block">Service Name</label>
                            <Input 
                                value={service.name}
                                onChange={(e) => {
                                setServices(services.map(s => 
                                    s.id === service.id ? {...s, name: e.target.value} : s
                                ));
                                }}
                            />
                            </div>
                            <div>
                            <label className="text-xs font-medium mb-1 block">Price (€)</label>
                            <Input 
                                type="number"
                                value={service.price}
                                onChange={(e) => {
                                setServices(services.map(s => 
                                    s.id === service.id ? {...s, price: Number(e.target.value)} : s
                                ));
                                }}
                            />
                            </div>
                            <div>
                            <label className="text-xs font-medium mb-1 block">Duration</label>
                            <Input 
                                value={service.duration}
                                onChange={(e) => {
                                setServices(services.map(s => 
                                    s.id === service.id ? {...s, duration: e.target.value} : s
                                ));
                                }}
                            />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingService(null)}
                            >
                            Cancel
                            </Button>
                            <Button 
                            size="sm"
                            onClick={() => setEditingService(null)}
                            >
                            <Save className="h-4 w-4 mr-2" />
                            Save
                            </Button>
                        </div>
                        </CardContent>
                    </Card>
                    ) : (
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                            €{service.price} • {service.duration}
                        </p>
                        </div>
                        <div className="flex gap-2">
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setEditingService(service.id)}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setServices(services.filter(s => s.id !== service.id))}
                        >
                            <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                        </div>
                    </div>
                    )}
                </div>
                ))}
            </div>

            {/* Add Service Button */}
            {!isAddingService && (
                <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => setIsAddingService(true)}
                >
                <Plus className="h-4 w-4" />
                Add Service
                </Button>
            )}
            </div>
        </AccordionContent>
        </AccordionItem>

       
        {/* 3. Working Hours */}
        <AccordionItem value="hours" className="border rounded-lg px-6">
        <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-left">
                <h3 className="font-semibold">Working Hours</h3>
                <p className="text-sm text-muted-foreground">When your business is available</p>
            </div>
            </div>
        </AccordionTrigger>
        <AccordionContent className="pt-4">
            <div className="space-y-3">
            {Object.entries(workingHours).map(([day, hours]) => (
                <div 
                key={day} 
                className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                    hours.closed 
                    ? "bg-red-50 border-red-200" 
                    : "bg-green-50 border-green-200"
                }`}
                >
                {/* Radio Button Toggle */}
                <button
                    onClick={() => {
                    setWorkingHours({
                        ...workingHours,
                        [day]: { ...hours, closed: !hours.closed }
                    });
                    }}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    hours.closed 
                        ? "border-red-400" 
                        : "border-green-500"
                    }`}
                >
                    <div className={`w-3 h-3 rounded-full transition-all ${
                    hours.closed 
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
                    {hours.closed ? (
                    <div className="flex items-center justify-center">
                        <Badge className="bg-red-500 text-white px-6 py-2 text-base">
                        Closed
                        </Badge>
                    </div>
                    ) : (
                    <div className="space-y-2">
                        <Input 
                        type="time" 
                        value={hours.open}
                        onChange={(e) => {
                            setWorkingHours({
                            ...workingHours,
                            [day]: { ...hours, open: e.target.value }
                            });
                        }}
                        className="w-full bg-white"
                        />
                        <Input 
                        type="time" 
                        value={hours.close}
                        onChange={(e) => {
                            setWorkingHours({
                            ...workingHours,
                            [day]: { ...hours, close: e.target.value }
                            });
                        }}
                        className="w-full bg-white"
                        />
                    </div>
                    )}
                </div>
                </div>
            ))}
            <Separator />
            <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" size="sm">Cancel</Button>
                <Button size="sm" className="gap-2">
                <Save className="h-4 w-4" />
                Save Schedule
                </Button>
            </div>
            </div>
        </AccordionContent>
        </AccordionItem>

        {/* 4. Agent Personality */}
        <AccordionItem value="personality" className="border rounded-lg px-6">
        <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-pink-600" />
            </div>
            <div className="text-left">
                <h3 className="font-semibold">Agent Personality</h3>
                <p className="text-sm text-muted-foreground">
                {personality.name} • {personality.sex === "male" ? "Male" : "Female"} • {personality.language.toUpperCase()}
                </p>
            </div>
            </div>
        </AccordionTrigger>
        <AccordionContent className="pt-4">
            <div className="space-y-6">
            
            {/* Sex Selection */}
            <div>
                <label className="text-sm font-medium mb-3 block">Sex</label>
                <div className="grid grid-cols-2 gap-3">
                <Button 
                    variant={personality.sex === "male" ? "default" : "outline"}
                    onClick={() => setPersonality({...personality, sex: "male"})}
                    className="h-12"
                >
                    Male
                </Button>
                <Button 
                    variant={personality.sex === "female" ? "default" : "outline"}
                    onClick={() => setPersonality({...personality, sex: "female"})}
                    className="h-12"
                >
                    Female
                </Button>
                </div>
            </div>

            <Separator />

            {/* Agent Name */}
            <div>
                <label className="text-sm font-medium mb-3 block">Agent Name</label>
                <Input 
                placeholder="e.g. Marta, Sofia, Carlos..."
                value={personality.name}
                onChange={(e) => setPersonality({...personality, name: e.target.value})}
                className="h-12"
                />
                <p className="text-xs text-muted-foreground mt-2">
                The name your AI agent will use when greeting customers
                </p>
            </div>

            <Separator />

            {/* Tone Selection */}
            <div>
                <label className="text-sm font-medium mb-3 block">Tone</label>
                <div className="grid grid-cols-2 gap-3">
                <Button 
                    variant={personality.tone === "professional" ? "default" : "outline"}
                    onClick={() => setPersonality({...personality, tone: "professional"})}
                    className="h-12"
                >
                    Professional
                </Button>
                <Button 
                    variant={personality.tone === "friendly" ? "default" : "outline"}
                    onClick={() => setPersonality({...personality, tone: "friendly"})}
                    className="h-12"
                >
                    Friendly
                </Button>
                </div>
            </div>

            <Separator />

            {/* Language Selection */}
            <div>
            <label className="text-sm font-medium mb-3 block">Primary Language</label>
            <Select 
                value={personality.language} 
                onValueChange={(value) => setPersonality({...personality, language: value})}
            >
                <SelectTrigger className="h-12">
                <SelectValue placeholder="Select language">
                    {languages.find(lang => lang.code === personality.language) && (
                    <span className="flex items-center gap-2">
                        <span className="text-xl">
                        {languages.find(lang => lang.code === personality.language)?.flag}
                        </span>
                        {languages.find(lang => lang.code === personality.language)?.name}
                    </span>
                    )}
                </SelectValue>
                </SelectTrigger>
                <SelectContent>
                {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                    <span className="flex items-center gap-2">
                        <span className="text-xl">{lang.flag}</span>
                        {lang.name}
                    </span>
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
                The primary language your AI agent will use
            </p>
            </div>

            <Separator />

            <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm">Cancel</Button>
                <Button size="sm" className="gap-2">
                <Save className="h-4 w-4" />
                Save Personality
                </Button>
            </div>
            </div>
        </AccordionContent>
        </AccordionItem>

        {/* 5. Agent Instructions */}
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
                            setInstructions([...instructions, newInstruction.trim()]);
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
            <div key={index}>
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
                        setInstructions(instructions.map((inst, i) => 
                            i === index ? editingInstructionText.trim() : inst
                        ));
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
                setEditingInstructionText(instruction);
            }}
            >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <span className="text-xs font-semibold text-primary">{index + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed">{instruction}</p>
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
                    setEditingInstructionText(instruction);
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
                    setInstructions(instructions.filter((_, i) => i !== index));
                }}
                className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                >
                <Trash2 className="h-4 w-4 text-red-600" />
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

            <div className="flex justify-end gap-2">
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                    if (confirm("Are you sure you want to delete all instructions? This action cannot be undone.")) {
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
                <Button size="sm" className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Instructions
                </Button>
                </div>
            </div>
        </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
}