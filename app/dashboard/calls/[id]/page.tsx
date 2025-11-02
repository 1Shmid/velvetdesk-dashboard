"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Calendar, User, ChevronDown, ChevronUp, Check, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// Утилиты для парсинга
  const parseBookingPhone = (transcript: string): string | null => {
    // Паттерны для разных языков: español, english, русский
    const phonePatterns = [
      /n[úu]mero/i,  // número, numero (ES)
      /number/i,      // number (EN)
      /номер/i        // номер (RU)
    ];
    
    const lines = transcript.split('\n');
    
    // Ищем строку с ключевым словом "номер/número/number"
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      
      for (const pattern of phonePatterns) {
        if (pattern.test(line)) {
          // Извлекаем текст после ключевого слова
          const afterKeyword = line.split(pattern)[1] || '';
          const digits = afterKeyword.replace(/\D/g, '');
          
          // Если нашли 9+ цифр, берём последние 9
          if (digits.length >= 9) {
            return digits.slice(0, 9);
          }
        }
      }
    }
    
    // Fallback: ищем любую строку с 9-12 цифрами в последних 5 строках
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
      const digits = lines[i].replace(/\D/g, '');
      if (digits.length >= 9 && digits.length <= 12) {
        return digits.slice(0, 9);
      }
    }
    
    return null;
  };

  const parseService = (transcript: string): string | null => {
    const services = ['manicura', 'pedicura', 'corte', 'tinte', 'haircut', 'coloring'];
    const lower = transcript.toLowerCase();
    
    for (const service of services) {
      if (lower.includes(service)) {
        return service.charAt(0).toUpperCase() + service.slice(1);
      }
    }
    return null;
  };

// Типы
type CallStatus = "completed" | "missed" | "in-progress";

interface Call {
  id: string;
  customerName: string;
  phoneNumber: string;
  duration: string;
  status: CallStatus;
  timestamp: string;
}

interface TranscriptMessage {
  speaker: "AI Agent" | "Customer";
  text: string;
  timestamp: string;
}

// Моковые данные
const mockCalls: Record<string, Call> = {
  "1": {
    id: "1",
    customerName: "María García",
    phoneNumber: "+34 612 345 678",
    duration: "5:32",
    status: "completed",
    timestamp: "2025-10-15 14:30",
  },
  "2": {
    id: "2",
    customerName: "John Smith",
    phoneNumber: "+34 623 456 789",
    duration: "2:15",
    status: "completed",
    timestamp: "2025-10-15 12:15",
  },
  "3": {
    id: "3",
    customerName: "Ana López",
    phoneNumber: "+34 634 567 890",
    duration: "0:00",
    status: "missed",
    timestamp: "2025-10-15 10:45",
  },
  "4": {
    id: "4",
    customerName: "Carlos Rodríguez",
    phoneNumber: "+34 645 678 901",
    duration: "8:45",
    status: "completed",
    timestamp: "2025-10-14 16:20",
  },
  "5": {
    id: "5",
    customerName: "Laura Martínez",
    phoneNumber: "+34 656 789 012",
    duration: "3:20",
    status: "completed",
    timestamp: "2025-10-10 09:15",
  },
  "6": {
    id: "6",
    customerName: "Pedro Sánchez",
    phoneNumber: "+34 667 890 123",
    duration: "0:00",
    status: "missed",
    timestamp: "2025-10-08 18:45",
  },
};

const mockTranscript: TranscriptMessage[] = [
  {
    speaker: "AI Agent",
    text: "¡Hola! Bienvenido a VelvetDesk. Mi nombre es Marta, ¿en qué puedo ayudarte hoy?",
    timestamp: "00:00",
  },
  {
    speaker: "Customer",
    text: "Hola, me gustaría reservar una cita para un corte de pelo.",
    timestamp: "00:05",
  },
  {
    speaker: "AI Agent",
    text: "Por supuesto, estaré encantada de ayudarte. ¿Qué día y hora te vendría mejor?",
    timestamp: "00:12",
  },
  {
    speaker: "Customer",
    text: "¿Tienes disponibilidad el viernes por la tarde?",
    timestamp: "00:18",
  },
  {
    speaker: "AI Agent",
    text: "Déjame verificar... Sí, tengo disponibilidad el viernes a las 15:00 y a las 17:00. ¿Cuál prefieres?",
    timestamp: "00:22",
  },
  {
    speaker: "Customer",
    text: "Las 17:00 me viene perfecto.",
    timestamp: "00:30",
  },
  {
    speaker: "AI Agent",
    text: "Perfecto. He reservado tu cita para el viernes a las 17:00. ¿Podrías confirmarme tu nombre y número de teléfono?",
    timestamp: "00:35",
  },
  {
    speaker: "Customer",
    text: "Sí, soy María García y mi número es el 612 345 678.",
    timestamp: "00:42",
  },
  {
    speaker: "AI Agent",
    text: "Excelente, María. Tu cita está confirmada para el viernes a las 17:00. Recibirás un SMS de recordatorio el día anterior. ¿Hay algo más en lo que pueda ayudarte?",
    timestamp: "00:50",
  },
  {
    speaker: "Customer",
    text: "No, eso es todo. ¡Gracias!",
    timestamp: "01:00",
  },
  {
    speaker: "AI Agent",
    text: "De nada, María. ¡Nos vemos el viernes! Que tengas un buen día.",
    timestamp: "01:03",
  },
];

const quickTemplates = [
  "Always ask customer to confirm their name and phone number before booking",
  "When mentioning prices, always include tax information",
  "If customer seems unsure, offer to send details via email or SMS",
];

export default function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { toast } = useToast();
  
  const [isInstructionExpanded, setIsInstructionExpanded] = useState(false);
  const [instruction, setInstruction] = useState("");

  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/calls?id=${resolvedParams.id}`)
      .then(res => res.json())
      .then(data => {
        setCall(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [resolvedParams.id]);

  const bookingPhone = call?.transcript ? parseBookingPhone(call.transcript) : null;
  const service = call?.transcript ? parseService(call.transcript) : null;

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!call) {
  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={() => router.push("/dashboard/calls")}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Calls
      </Button>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Phone className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Call not found</h2>
          <p className="text-muted-foreground mb-4">
            The call you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => router.push("/dashboard/calls")}>
            ← Back to Calls
          </Button>
        </CardContent>
      </Card>
    </div>
    );
    }


  const handleSaveInstruction = () => {
    if (!instruction.trim()) return;
    
    // TODO: Отправить в API
    console.log("Saving instruction:", instruction);
    
    toast({
      title: "Instruction saved!",
      description: "AI agent will follow this instruction in future calls",
    });
    
    setInstruction("");
    setIsInstructionExpanded(false);
  };

  const handleTemplateClick = (template: string) => {
    setInstruction(template);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/calls")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Calls</span>
        </Button>

      {/* Call Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{call.customer_name}</p>
              <p className="text-sm text-muted-foreground">{call.phone}</p>
              {bookingPhone && bookingPhone !== call.phone && (
                <p className="text-xs text-muted-foreground">Booking: {bookingPhone}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Date & Time</p>
              <p className="font-semibold">
                {new Date(call.call_date).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">{Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}</span>
          </div>
          <Badge className={call.status === "completed" ? "bg-green-500" : "bg-red-500"}>
            {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
          </Badge>
        </div>
        </CardContent>
      </Card>

      {/* Improve AI Agent Card */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💡</span>
                <h3 className="font-semibold">Improve AI Agent Response</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsInstructionExpanded(!isInstructionExpanded)}
              >
                {isInstructionExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {!isInstructionExpanded ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Notice an issue with this call? Add instruction to your AI agent
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setIsInstructionExpanded(true)}
                  >
                    + Add Instruction
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/dashboard/agent-setup")}
                  >
                    ⚙️ Agent Settings
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Quick templates:</p>
                  <div className="space-y-2">
                    {quickTemplates.map((template, index) => (
                      <button
                        key={index}
                        onClick={() => handleTemplateClick(template)}
                        className="w-full text-left text-sm p-2 rounded-lg border hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        • {template}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Or write custom instruction:
                  </label>
                  <Textarea
                    placeholder="Example: When customer asks about prices, always mention our special offers first..."
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsInstructionExpanded(false);
                      setInstruction("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveInstruction}
                    disabled={!instruction.trim()}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Save Instruction
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transcript Card with Internal Scroll */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📝</span>
            Transcript
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Scrollable transcript container */}
          <div 
            className="space-y-3 overflow-y-auto pr-2"
            style={{ 
              maxHeight: "calc(100vh - 600px)",
              minHeight: "300px" 
            }}
          >
            {call.recording_url && (
              <div className="mb-6">
                <p className="text-sm font-semibold mb-2">Call Recording</p>
                <audio controls className="w-full">
                  <source src={call.recording_url} type="audio/mpeg" />
                </audio>
              </div>
            )}
            <div className="whitespace-pre-wrap text-sm">
              {call.transcript || "No transcript available"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Call Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm">
              <strong>Outcome:</strong> {call.summary || 'No summary available'}
            </p>
            <p className="text-sm">
              <strong>Action Items:</strong> Send SMS reminder on Thursday
            </p>
            <p className="text-sm">
              <strong>Customer Satisfaction:</strong> Positive interaction, all questions answered
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}