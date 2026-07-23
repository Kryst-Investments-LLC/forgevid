"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  MessageCircle,
  Book,
  Video,
  FileText,
  HelpCircle,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Mic,
  CreditCard,
  Loader2,
} from "lucide-react";

type TicketStatus = null | "loading" | "success" | "error";
type TicketForm = {
  subject: string;
  description: string;
  priority: string;
  category: string;
  name: string;
  email: string;
};

type HealthChecks = { database?: boolean };

function HelpPage() {
  const [activeTab, setActiveTab] = useState<string>("faq");
  const [faqCategory, setFaqCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [aiHint, setAiHint] = useState<string>("");
  const [ticketForm, setTicketForm] = useState<TicketForm>({
    subject: "",
    description: "",
    priority: "medium",
    category: "general",
    name: "",
    email: "",
  });
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Live system status (Status tab)
  const [statusLoading, setStatusLoading] = useState<boolean>(true);
  const [statusOk, setStatusOk] = useState<boolean | null>(null);
  const [healthChecks, setHealthChecks] = useState<HealthChecks | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/monitoring/health");
        let checks: HealthChecks | null = null;
        try {
          const data = await res.json();
          checks = data?.checks ?? null;
        } catch {
          // body may be missing/unparseable; the status code alone still tells us enough
        }
        if (!cancelled) {
          setStatusOk(res.ok);
          setHealthChecks(checks);
          setLastChecked(new Date());
        }
      } catch {
        if (!cancelled) {
          setStatusOk(false);
          setHealthChecks(null);
          setLastChecked(new Date());
        }
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // AI Hint Mockup (simulating intent prediction)
  useEffect(() => {
    if (!searchQuery) return setAiHint("");
    const intents: Record<string, string> = {
      "video": "Looks like you’re trying to generate a video — check our AI Video Guide!",
      "billing": "Need help with billing? Visit the Billing & Credits section.",
      "export": "Exporting issues? Try our supported format guide.",
      "team": "Collaboration features are under the Team Workspace tab.",
    };
    const match = Object.keys(intents).find((k) => searchQuery.toLowerCase().includes(k));
    setAiHint(match ? intents[match] : "Searching knowledge base...");
  }, [searchQuery]);

  // Voice Search (Web Speech API)
  const handleVoiceSearch = () => {
    if (!("webkitSpeechRecognition" in window)) return alert("Voice search not supported.");
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();
    setIsListening(true);
    recognition.onresult = (e: any) => {
      setSearchQuery(e.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
  };

  const faqItems = [
    { question: "How do I create my first AI-generated video?", answer: "Open AI Studio and use the AI Creator (or describe your idea to the AI Video Assistant). It turns your prompt into a script, voiceover, footage and a finished video.", category: "Getting Started" },
    { question: "What video formats and lengths can I make?", answer: "Vertical (9:16) for TikTok/Reels/Shorts, square and landscape, up to your plan's max duration. Downloads are standard MP4 (H.264).", category: "Getting Started" },
    { question: "How does ForgeVid build the video?", answer: "It writes a script from your prompt, generates a voiceover, pulls matching stock footage, and renders it together — you can refine scenes in the Scene Editor before finishing.", category: "AI Features" },
    { question: "Where do my generated videos go?", answer: "Every video you generate is saved to My Videos, where you can play, download, or delete it.", category: "AI Features" },
  ];

  const filteredFAQ = faqItems.filter((item) =>
    (item.question + item.answer).toLowerCase().includes(searchQuery.toLowerCase()) &&
    (faqCategory === "all" || item.category === faqCategory)
  );

  return (
    <div className="relative text-gray-100">
      {/* Neural ambient gradient backdrop */}
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.25),transparent_70%)] pointer-events-none"
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <div className="relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
            How can ForgeVid assist you today?
          </h1>
          <p className="text-lg text-gray-400">
            Smart answers. Real-time support. AI-powered assistance — all in one futuristic help center.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="max-w-3xl mx-auto flex items-center bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 shadow-lg mb-10"
        >
          <div className="flex items-center w-full relative">
            <Search className="absolute left-4 text-gray-400 w-5 h-5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask ForgeVid anything..."
              className="pl-12 bg-transparent border-none text-white placeholder-gray-400 text-lg"
            />
            <Button
              onClick={handleVoiceSearch}
              variant="ghost"
              className={`ml-2 transition ${isListening ? "text-red-400 animate-pulse" : "text-gray-400"}`}
              aria-label="Start voice search"
            >
              <Mic className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>

        {/* AI Hint */}
        {aiHint && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-blue-400 mb-10"
          >
            🤖 {aiHint}
          </motion.p>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
          <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/10">
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          {/* FAQ Section */}
          <TabsContent value="faq">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {filteredFAQ.map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <Card className="bg-white/10 backdrop-blur-xl border border-white/10 text-white">
                    <CardHeader>
                      <CardTitle>{item.question}</CardTitle>
                      <Badge variant="outline" className="mt-2 text-blue-300 border-blue-400/30">
                        {item.category}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-300">{item.answer}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>

          {/* Support Ticket Form */}
          <TabsContent value="support">
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-xl mx-auto bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-lg"
              onSubmit={async (e) => {
                e.preventDefault();
                setTicketStatus("loading");
                setTicketError(null);
                try {
                  const res = await fetch("/api/support-ticket", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(ticketForm),
                  });
                  if (!res.ok) throw new Error("Failed to submit ticket");
                  setTicketStatus("success");
                  setTicketForm({
                    subject: "",
                    description: "",
                    priority: "medium",
                    category: "general",
                    name: "",
                    email: "",
                  });
                } catch (err: any) {
                  setTicketStatus("error");
                  setTicketError(err.message || "Unknown error");
                }
              }}
            >
              <h2 className="text-2xl font-bold mb-4 text-blue-300">Submit a Support Ticket</h2>
              <div className="grid grid-cols-1 gap-4">
                <Input
                  required
                  placeholder="Your Name"
                  value={ticketForm.name}
                  onChange={e => setTicketForm(f => ({ ...f, name: e.target.value }))}
                  className="bg-transparent border-white/20 text-white"
                />
                <Input
                  required
                  type="email"
                  placeholder="Your Email"
                  value={ticketForm.email}
                  onChange={e => setTicketForm(f => ({ ...f, email: e.target.value }))}
                  className="bg-transparent border-white/20 text-white"
                />
                <Input
                  required
                  placeholder="Subject"
                  value={ticketForm.subject}
                  onChange={e => setTicketForm(f => ({ ...f, subject: e.target.value }))}
                  className="bg-transparent border-white/20 text-white"
                />
                <Textarea
                  required
                  placeholder="Describe your issue..."
                  value={ticketForm.description}
                  onChange={e => setTicketForm(f => ({ ...f, description: e.target.value }))}
                  className="bg-transparent border-white/20 text-white"
                  rows={4}
                />
                <div className="flex gap-4">
                  <select
                    value={ticketForm.priority}
                    onChange={e => setTicketForm(f => ({ ...f, priority: e.target.value }))}
                    className="bg-transparent border border-white/20 text-white rounded px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <select
                    value={ticketForm.category}
                    onChange={e => setTicketForm(f => ({ ...f, category: e.target.value }))}
                    className="bg-transparent border border-white/20 text-white rounded px-3 py-2"
                  >
                    <option value="general">General</option>
                    <option value="billing">Billing</option>
                    <option value="technical">Technical</option>
                    <option value="feature">Feature Request</option>
                  </select>
                </div>
                <Button
                  type="submit"
                  disabled={ticketStatus === "loading"}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mt-4"
                >
                  {ticketStatus === "loading" ? "Submitting..." : "Submit Ticket"}
                </Button>
                {ticketStatus === "success" && (
                  <p className="text-green-400 mt-2">Ticket submitted successfully!</p>
                )}
                {ticketStatus === "error" && (
                  <p className="text-red-400 mt-2">{ticketError}</p>
                )}
              </div>
            </motion.form>
          </TabsContent>

          {/* System Status Visualization */}
          <TabsContent value="status">
            <Card className="bg-white/10 backdrop-blur-xl border border-white/10">
              <CardHeader>
                <CardTitle
                  className={`flex items-center ${
                    statusLoading ? "text-gray-400" : statusOk ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {statusLoading ? (
                    <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                  ) : (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className={`w-3 h-3 rounded-full mr-3 ${statusOk ? "bg-green-400" : "bg-red-400"}`}
                    />
                  )}
                  {statusLoading
                    ? "Checking status..."
                    : statusOk
                    ? "All Systems Operational"
                    : "Degraded Performance"}
                </CardTitle>
                <CardDescription>
                  Live ForgeVid infrastructure monitor
                  {lastChecked && !statusLoading && (
                    <> &mdash; last checked {lastChecked.toLocaleTimeString()}</>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statusLoading ? (
                  <p className="text-gray-400 text-sm">Checking service health...</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between items-center border-b border-white/10 py-3">
                      <span>Application</span>
                      <Badge className={statusOk ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                        {statusOk ? "Operational" : "Degraded"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/10 py-3">
                      <span>Database</span>
                      <Badge
                        className={
                          healthChecks?.database ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        }
                      >
                        {healthChecks?.database ? "Operational" : "Degraded"}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resources */}
          <TabsContent value="resources">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[
                {
                  title: "Create a video",
                  description: "Open AI Studio and generate a new video from a prompt.",
                  href: "/dashboard/ai",
                  icon: Video,
                },
                {
                  title: "Your videos",
                  description: "Browse, play, download, or delete videos you've already generated.",
                  href: "/dashboard/videos",
                  icon: FileText,
                },
                {
                  title: "Pricing & plans",
                  description: "Compare plans and see what's included at each tier.",
                  href: "/pricing",
                  icon: Book,
                },
                {
                  title: "Billing",
                  description: "Manage your subscription, payment method, and invoices.",
                  href: "/dashboard/billing",
                  icon: CreditCard,
                },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="block h-full">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="h-full"
                  >
                    <Card className="bg-white/10 backdrop-blur-xl border border-white/10 text-white h-full cursor-pointer hover:border-blue-400/40 transition-colors">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <item.icon className="w-5 h-5 text-blue-400" />
                          {item.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-300">{item.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Link>
              ))}
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="h-full"
              >
                <button
                  type="button"
                  onClick={() => setActiveTab("support")}
                  className="block h-full w-full text-left"
                >
                  <Card className="bg-white/10 backdrop-blur-xl border border-white/10 text-white h-full cursor-pointer hover:border-blue-400/40 transition-colors">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-blue-400" />
                        Contact support
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-300">Open a support ticket and we&apos;ll get back to you.</p>
                    </CardContent>
                  </Card>
                </button>
              </motion.div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
export default HelpPage;
